import { Router } from 'express';
import { db } from '../db.js';
import { eq, desc } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../middlewares/auth.js';
import { pgTable, serial, integer, text, timestamp } from 'drizzle-orm/pg-core';

// Reference to existing transactions table
const transactionsTable = pgTable('transactions', {
  id: serial('id').primaryKey(),
  userId: integer('user_id').notNull(),
  amount: integer('amount').notNull(),
  type: text('type').notNull(),
  description: text('description').notNull(),
  sessionId: integer('session_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

const router = Router();

router.get('/history', requireAuth, async (req: AuthRequest, res) => {
  try {
    const history = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, req.userId!))
      .orderBy(desc(transactionsTable.createdAt));
    res.json({ success: true, transactions: history });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;