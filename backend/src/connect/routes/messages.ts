import { Router } from "express";
import type { Pool } from "pg";
import { requireConnectUser, type ConnectRequest } from "../shared/auth.js";

export function messagesRouter(pool:Pool){
  const router=Router(); router.use(requireConnectUser);
  router.get("/:conversationId",async(req:ConnectRequest,res)=>{
    const member=await pool.query(`SELECT 1 FROM connect_conversation_members WHERE conversation_id=$1 AND user_id=$2`,[req.params.conversationId,req.connectUser!.id]);
    if(!member.rowCount) return res.status(403).json({message:"You are not a member of this conversation"});
    const rows=await pool.query(`SELECT m.id,m.sender_user_id,m.body,m.created_at,u.name AS sender_name
      FROM connect_messages m LEFT JOIN users u ON u.id=m.sender_user_id
      WHERE m.conversation_id=$1 ORDER BY m.created_at ASC LIMIT 200`,[req.params.conversationId]);
    res.json({items:rows.rows});
  });
  router.post("/:conversationId",async(req:ConnectRequest,res)=>{
    const body=String(req.body?.body||"").trim();
    if(!body || body.length>4000) return res.status(400).json({message:"Message must be 1–4000 characters"});
    const member=await pool.query(`SELECT 1 FROM connect_conversation_members WHERE conversation_id=$1 AND user_id=$2`,[req.params.conversationId,req.connectUser!.id]);
    if(!member.rowCount) return res.status(403).json({message:"You are not a member of this conversation"});
    const r=await pool.query(`INSERT INTO connect_messages(conversation_id,sender_user_id,body) VALUES($1,$2,$3) RETURNING *`,[req.params.conversationId,req.connectUser!.id,body]);
    res.status(201).json({message:r.rows[0]});
  });
  return router;
}
