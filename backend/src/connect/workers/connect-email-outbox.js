/**
 * SkillSwap Connect transactional email outbox worker.
 * Provide an existing-user email resolver and a server-side mail provider.
 */
const SUBJECTS = {
  booking_request: 'New SkillSwap Connect booking request',
  booking_pending: 'Your SkillSwap Connect booking request was received',
  booking_confirmed: 'Your SkillSwap Connect booking is confirmed',
  booking_confirmed_host: 'A participant joined your SkillSwap Connect activity',
  booking_rejected: 'Your SkillSwap Connect request was declined',
  booking_cancelled: 'A SkillSwap Connect booking was cancelled',
  activity_cancelled: 'A SkillSwap Connect activity was cancelled',
  reschedule_request: 'A new SkillSwap Connect session time was proposed',
  reschedule_rejected: 'Your SkillSwap Connect reschedule proposal was declined',
  reschedule_confirmed: 'Your SkillSwap Connect session time was updated',
  reschedule_confirmed_host: 'Your SkillSwap Connect session time was updated',
  new_message: 'You have a new SkillSwap Connect message',
  session_reminder: 'Reminder: Your SkillSwap Connect session is coming up',
};
function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function renderConnectEmail(eventType,payload={},recipientName='there') {
  const title=payload.title||SUBJECTS[eventType]||'SkillSwap Connect update';
  const body=payload.body||'There is a new update in your SkillSwap Connect workspace.';
  const subject=SUBJECTS[eventType]||`SkillSwap Connect: ${title}`;
  const a=payload.appointment||{};
  const details = a.title ? [
    `Activity: ${a.title}`, `Host: ${a.hostName||'Host'}`,
    `Participant: ${a.participantName||'Participant'}`,
    `When: ${a.startAt||'To be confirmed'} (${a.timezone||'UTC'})`,
    `Duration: ${a.durationMinutes||60} minutes`,
    `Format: ${a.deliveryMode||'online'}`,
    a.location ? `Venue: ${a.location}` : '',
    a.joinUrl ? `Join: ${a.joinUrl}` : ''
  ].filter(Boolean) : [];
  const text=`Hi ${recipientName},\n\n${title}\n\n${body}\n\n${details.join('\n')}\n\nOpen SkillSwap Connect for details.\n\nSkillSwap Connect`;
  const detailHtml=details.map(x=>`<p style="margin:7px 0">${escapeHtml(x)}</p>`).join('');
  const joinHtml=a.joinUrl?`<p style="margin:24px 0"><a href="${escapeHtml(a.joinUrl)}" style="background:#5b45c6;color:#fff;padding:13px 20px;border-radius:8px;text-decoration:none">Join session</a></p>`:'';
  const html=`<!doctype html><html><body style="margin:0;background:#f6f6fb;font-family:Arial,sans-serif;color:#292644"><div style="max-width:560px;margin:32px auto;background:#fff;border:1px solid #e9e7f1;border-radius:16px;overflow:hidden"><div style="padding:22px 26px;background:#30206e;color:#fff;font-weight:700">SkillSwap CONNECT</div><div style="padding:28px"><p style="color:#77758e">Hi ${escapeHtml(recipientName)},</p><h2 style="font-size:21px;color:#292644">${escapeHtml(title)}</h2><p style="font-size:15px;line-height:1.7;color:#6f6e85">${escapeHtml(body)}</p>${a.title?`<div style="padding:16px;background:#f3f1fc;border-radius:10px">${detailHtml}</div>`:''}${joinHtml}<p style="margin-top:26px;color:#8b899e;font-size:12px">Open your SkillSwap Connect workspace to view or respond.</p></div></div></body></html>`;
  return {subject,text,html};
}
export async function processConnectEmailOutbox({pool,resolveUserEmail,sendEmail,hydratePayload,batchSize=20,maxAttempts=8}) {
  if(!pool?.connect) throw new Error('A PostgreSQL pool is required');
  if(typeof resolveUserEmail!=='function') throw new Error('resolveUserEmail callback is required');
  if(typeof sendEmail!=='function') throw new Error('sendEmail callback is required');
  const client=await pool.connect(); let jobs=[];
  try {
    await client.query('BEGIN');
    const r=await client.query(
      `WITH picked AS (
         SELECT id FROM connect_email_outbox
         WHERE (status='pending' AND available_at<=NOW())
            OR (status='processing' AND locked_at<NOW()-INTERVAL '10 minutes')
         ORDER BY created_at LIMIT $1 FOR UPDATE SKIP LOCKED
       )
       UPDATE connect_email_outbox o
       SET status='processing',locked_at=NOW(),attempts=attempts+1,updated_at=NOW()
       FROM picked WHERE o.id=picked.id RETURNING o.*`,
      [Math.max(1,Math.min(Number(batchSize)||20,100))]
    );
    jobs=r.rows; await client.query('COMMIT');
  } catch(e) { await client.query('ROLLBACK'); throw e; }
  finally { client.release(); }
  const summary={claimed:jobs.length,sent:0,failed:0,skipped:0};
  for(const job of jobs) {
    try {
      const recipient=await resolveUserEmail(String(job.user_id));
      if(!recipient?.email) {
        await pool.query(`UPDATE connect_email_outbox SET status='skipped',last_error='No email address found for SkillSwap user',locked_at=NULL,updated_at=NOW() WHERE id=$1`,[job.id]);
        summary.skipped++; continue;
      }
      let payload=typeof job.payload==='string'?JSON.parse(job.payload):job.payload;
      if (typeof hydratePayload === 'function') payload = await hydratePayload(payload, job, recipient) || payload;
      await sendEmail({to:recipient.email,...renderConnectEmail(job.event_type,payload,recipient.name||'there'),eventType:job.event_type,payload});
      await pool.query(`UPDATE connect_email_outbox SET status='sent',sent_at=NOW(),locked_at=NULL,last_error=NULL,updated_at=NOW() WHERE id=$1`,[job.id]);
      summary.sent++;
    } catch(error) {
      const attempts=Number(job.attempts)||1, terminal=attempts>=maxAttempts;
      const delay=Math.min(60,2**Math.min(attempts,6));
      await pool.query(`UPDATE connect_email_outbox SET status=$2,available_at=NOW()+($3::int*INTERVAL '1 minute'),locked_at=NULL,last_error=$4,updated_at=NOW() WHERE id=$1`,
        [job.id,terminal?'failed':'pending',delay,String(error?.message||error).slice(0,1000)]);
      summary.failed++;
    }
  }
  return summary;
}
