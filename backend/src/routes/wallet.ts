import { Router } from 'express';
import { db } from '../db.js';
import { eq, desc, sql } from 'drizzle-orm';
import { requireAuth, type AuthRequest } from '../middlewares/auth.js';
import { pgTable, serial, integer, text, timestamp, real, boolean } from 'drizzle-orm/pg-core';

const transactionsTable = pgTable('transactions', {
  id:          serial('id').primaryKey(),
  userId:      integer('user_id').notNull(),
  amount:      integer('amount').notNull(),
  type:        text('type').notNull(),
  description: text('description').notNull(),
  sessionId:   integer('session_id'),
  createdAt:   timestamp('created_at').notNull().defaultNow(),
});

const usersTable = pgTable('users', {
  id:      serial('id').primaryKey(),
  name:    text('name').notNull(),
  email:   text('email').notNull(),
  credits: integer('credits').notNull().default(0),
});

const router = Router();

// GET /api/wallet — balance + stats (used by useGetWallet)
router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) return res.status(404).json({ error: 'User not found' });

    const txs = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, req.userId!));

    const totalEarned = txs
      .filter(t => ['earned', 'bonus', 'referral', 'refund'].includes(t.type) && t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);

    const totalSpent = txs
      .filter(t => ['spent', 'withdrawal'].includes(t.type) || t.amount < 0)
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    res.json({
      balance:     user.credits,
      userId:      user.id,
      totalEarned,
      totalSpent,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wallet/transactions — transaction list (used by useGetTransactions)
router.get('/transactions', requireAuth, async (req: AuthRequest, res) => {
  try {
    const txs = await db.select().from(transactionsTable)
      .where(eq(transactionsTable.userId, req.userId!))
      .orderBy(desc(transactionsTable.createdAt));
    res.json(txs);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/wallet/history — same but wrapped (legacy)
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

// POST /api/wallet/withdraw
router.post('/withdraw', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { amount, upiId } = req.body;
    if (!amount || !upiId) return res.status(400).json({ error: 'amount and upiId required' });
    if (amount < 500) return res.status(400).json({ error: 'Minimum 500 credits required' });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.credits < amount) return res.status(400).json({ error: 'Insufficient credits' });

    await db.update(usersTable)
      .set({ credits: sql`${usersTable.credits} - ${amount}` })
      .where(eq(usersTable.id, req.userId!));

    await db.insert(transactionsTable).values({
      userId:      req.userId!,
      type:        'withdrawal',
      amount:      -amount,
      description: `Withdrawal to UPI: ${upiId}`,
    });

    res.json({ success: true, message: `₹${amount} withdrawal requested. Processing in 24-48 hours.` });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
