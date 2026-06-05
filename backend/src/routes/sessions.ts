import { Router } from 'express';
import { db } from '../db.js';
import { sessionsTable } from '../schema/sessions.js';
import { requireAuth, type AuthRequest } from '../middlewares/auth.js';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const data = req.body;
    const mId = Number(data.mentorId);
    
    if (isNaN(mId)) {
      throw new Error("Invalid Mentor ID");
    }

    const [session] = await db.insert(sessionsTable).values({
      mentorId: mId,
      studentId: req.userId!,
      skill: data.skill || "General",
      scheduledDate: data.scheduledDate ? new Date(data.scheduledDate) : new Date(),
      duration: Number(data.duration) || 60,
      status: 'pending',
      creditsAmount: Number(data.creditsAmount) || 10,
      message: data.message
    }).returning();
    
    res.status(201).json(session);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

export default router;