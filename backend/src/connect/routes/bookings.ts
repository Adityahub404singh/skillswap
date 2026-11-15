import { Router } from "express";
import type { Pool } from "pg";
import { requireConnectUser, type ConnectRequest } from "../shared/auth.js";
import { cancelBooking, listMyBookings, approveBooking, rejectBooking, rescheduleBooking } from "../services/connect.js";

export function bookingsRouter(pool: Pool) {
  const router = Router();
  router.use(requireConnectUser);

  router.get("/me", async (req: ConnectRequest,res) => {
    const items = await listMyBookings(pool, req.connectUser!.id);
    res.json({ items });
  });

  router.post("/:id/approve", async (req: ConnectRequest,res) => {
    try { res.json({ booking: await approveBooking(pool,req.params.id,req.connectUser!.id) }); }
    catch(e:any){ res.status(e.status||400).json({message:e.message}); }
  });
  router.post("/:id/reject", async (req: ConnectRequest,res) => {
    try { res.json({ booking: await rejectBooking(pool,req.params.id,req.connectUser!.id) }); }
    catch(e:any){ res.status(e.status||400).json({message:e.message}); }
  });
  router.post("/:id/cancel", async (req: ConnectRequest,res) => {
    try { res.json({ booking: await cancelBooking(pool,req.params.id,req.connectUser!.id) }); }
    catch(e:any){ res.status(e.status||400).json({message:e.message}); }
  });
  router.post("/:id/reschedule", async (req: ConnectRequest,res) => {
    try {
      const startAt = new Date(req.body?.startAt);
      if (!Number.isFinite(startAt.getTime()) || startAt <= new Date()) return res.status(400).json({message:"Choose a future date and time"});
      res.json({ booking: await rescheduleBooking(pool,req.params.id,req.connectUser!.id,startAt) });
    } catch(e:any){ res.status(e.status||400).json({message:e.message}); }
  });
  return router;
}
