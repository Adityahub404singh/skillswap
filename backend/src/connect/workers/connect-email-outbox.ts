import type { Pool } from "pg";
type Mailer=(m:{to:string;subject:string;text:string;html?:string})=>Promise<void>;
export async function processConnectEmailOutbox(pool:Pool,send:Mailer,batchSize=20){
  const c=await pool.connect(); let sent=0;
  try{
    await c.query("BEGIN");
    const r=await c.query(`SELECT id,to_email,subject,text_body,html_body,attempts
      FROM connect_email_outbox WHERE status='pending' AND available_at<=NOW()
      ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT $1`,[batchSize]);
    await c.query("COMMIT");
    for(const row of r.rows){
      try{
        await send({to:row.to_email,subject:row.subject,text:row.text_body,html:row.html_body||undefined});
        await pool.query(`UPDATE connect_email_outbox SET status='sent',sent_at=NOW(),last_error=NULL WHERE id=$1`,[row.id]); sent++;
      }catch(e:any){
        await pool.query(`UPDATE connect_email_outbox SET attempts=attempts+1,last_error=$2,
          status=CASE WHEN attempts+1>=8 THEN 'failed' ELSE 'pending' END,
          available_at=NOW()+LEAST((attempts+1)*INTERVAL '2 minutes',INTERVAL '2 hours')
          WHERE id=$1`,[row.id,String(e?.message||e).slice(0,1000)]);
      }
    }
    return {processed:r.rowCount||0,sent};
  }finally{c.release();}
}
