import type { Request, Response, NextFunction } from "express";
export type ConnectUser={id:string,email:string|null};
export type ConnectRequest=Request & {connectUser?:ConnectUser;userId?:number;userEmail?:string};
export function requireConnectUser(req:ConnectRequest,res:Response,next:NextFunction){
  // The existing SkillSwap requireAuth middleware should run BEFORE this adapter.
  // If your app exposes req.userId/req.userEmail, this normalizes that identity.
  const id=req.connectUser?.id || (typeof req.userId==="number"?String(req.userId):"");
  if(!id) return res.status(401).json({success:false,message:"Please sign in to continue"});
  req.connectUser={id,email:req.userEmail||null}; next();
}
