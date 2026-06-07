import cron from 'node-cron';
import { db } from '../db.js';
import { sessionsTable } from '../schema/sessions.js';
import { usersTable } from '../schema/users.js';
import { transactionsTable } from '../schema/transactions.js';
import { eq, and, lte, sql } from 'drizzle-orm';

export function startStaleSessionCleanup() {
  cron.schedule('0 * * * *', async () => {
    try {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const staleSessions = await db.select().from(sessionsTable)
        .where(and(eq(sessionsTable.status, 'requested'), lte(sessionsTable.createdAt, yesterday)));

      for (const session of staleSessions) {
        await db.update(sessionsTable)
          .set({ status: 'cancelled', cancelReason: 'Auto-cancelled: Mentor did not respond' })
          .where(eq(sessionsTable.id, session.id));
        await db.update(usersTable)
          .set({ credits: sql`${usersTable.credits} + ${session.creditsAmount}` })
          .where(eq(usersTable.id, session.studentId));
        await db.insert(transactionsTable).values({
          userId: session.studentId, type: 'refund', amount: session.creditsAmount,
          description: `Auto-Refund: Mentor unresponsive for ${session.skill}`, sessionId: session.id,
        } as any);
      }
    } catch (e) {
      console.error('Cron Error:', e);
    }
  });
}