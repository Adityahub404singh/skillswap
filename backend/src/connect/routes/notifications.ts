import { Router } from "express";
import type { Pool } from "pg";
import { requireConnectUser, type ConnectRequest } from "../shared/auth.js";

export function notificationsRouter(pool: Pool) {
  const router=Router(); router.use(requireConnectUser);
  router.get("/", async (req:ConnectRequest,res)=>{
    const r=await pool.query(
      `SELECT id,type,title,body,href,read_at,created_at
       FROM connect_notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100`,
      [req.connectUser!.id]);
    res.json({items:r.rows,unreadCount:r.rows.filter(x=>!x.read_at).length});
  });
  router.post("/:id/read", async (req:ConnectRequest,res)=>{
    const r=await pool.query(
      `UPDATE connect_notifications SET read_at=COALESCE(read_at,NOW())
       WHERE id=$1 AND user_id=$2 RETURNING id,read_at`,
      [req.params.id,req.connectUser!.id]);
    if(!r.rowCount) return res.status(404).json({message:"Notification not found"});
    res.json({notification:r.rows[0]});
  });
  router.post("/read-all", async (req:ConnectRequest,res)=>{
    await pool.query(`UPDATE connect_notifications SET read_at=NOW() WHERE user_id=$1 AND read_at IS NULL`,[req.connectUser!.id]);
    res.json({success:true});
  });
  return router;
}
