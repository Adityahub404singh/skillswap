import { Router } from "express";
import type { Pool } from "pg";
import { requireConnectUser, type ConnectRequest } from "../shared/auth.js";
import { getMeetingForBooking } from "../services/jitsi.js";

export function meetingsRouter(pool:Pool){
  const router=Router(); router.use(requireConnectUser);
  router.get("/:bookingId",async(req:ConnectRequest,res)=>{
    try { res.json({meeting:await getMeetingForBooking(pool,req.params.bookingId,req.connectUser!.id)}); }
    catch(e:any){ res.status(e.status||403).json({message:e.message||"Meeting unavailable"}); }
  });
  return router;
}
