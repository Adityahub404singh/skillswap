import { Router } from "express";
import type { Pool } from "pg";
import { activitiesRouter } from "./activities.js";
import { bookingsRouter } from "./bookings.js";
import { notificationsRouter } from "./notifications.js";
import { messagesRouter } from "./messages.js";
import { meetingsRouter } from "./meetings.js";
import { requireAuth, type AuthRequest } from "../../../middlewares/auth.js";
import type { Request,Response,NextFunction } from "express";

// Example only: mount these routers only after merging with your existing route index.
// Existing auth middleware is reused; it must run before requireConnectUser.
function bridgeAuth(req:Request,res:Response,next:NextFunction){
  requireAuth(req as AuthRequest,res,()=>next());
}
export function createParticipantConnectRouter(pool:Pool){
 const r=Router();
 r.use(bridgeAuth);
 r.use("/activities",activitiesRouter(pool)); // public GET routes are behind auth in this example; see note below.
 r.use("/bookings",bookingsRouter(pool));
 r.use("/notifications",notificationsRouter(pool));
 r.use("/conversations",messagesRouter(pool));
 r.use("/meetings",meetingsRouter(pool));
 return r;
}
// IMPORTANT: Keep public GET /activities and GET /activities/:slug outside bridgeAuth.
// Merge route-by-route into your existing Connect router to preserve public discovery.
