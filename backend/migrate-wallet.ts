import "dotenv/config";
import { pool } from "./src/db.js";

async function migrateWallet() {
  const client = await pool.connect();

  try {
    console.log("Starting SkillSwap wallet migration...");
    await client.query("BEGIN");

    // Ensure the balance column exists even if an older database missed it.
    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS earned_balance INTEGER NOT NULL DEFAULT 0
    `);

    // This table makes the data backfill a one-time operation.
    await client.query(`
      CREATE TABLE IF NOT EXISTS app_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    // Create the withdrawal ledger.
    await client.query(`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id),
        requested_amount INTEGER NOT NULL CHECK (requested_amount >= 1000),
        platform_fee INTEGER NOT NULL CHECK (platform_fee >= 0),
        reserve_amount INTEGER NOT NULL DEFAULT 0 CHECK (reserve_amount >= 0),
        payout_amount INTEGER NOT NULL CHECK (payout_amount > 0),
        upi_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'requested'
          CHECK (status IN ('requested', 'processing', 'paid', 'review', 'rejected')),
        payout_reference TEXT,
        admin_note TEXT,
        requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
        processed_at TIMESTAMP,
        paid_at TIMESTAMP,
        reserve_release_at TIMESTAMP,
        reserve_status TEXT NOT NULL DEFAULT 'not_applicable'
          CHECK (reserve_status IN ('not_applicable', 'awaiting_payout', 'locked', 'released')),
        reserve_released_at TIMESTAMP,
        resolved_at TIMESTAMP
      )
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS withdrawals_user_id_idx
      ON withdrawals(user_id)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS withdrawals_status_idx
      ON withdrawals(status)
    `);
    await client.query(`
      CREATE INDEX IF NOT EXISTS withdrawals_reserve_release_idx
      ON withdrawals(reserve_status, reserve_release_at)
    `);

    const marker = "20261109_wallet_earned_balance_v1";
    const alreadyApplied = await client.query(
      "SELECT name FROM app_migrations WHERE name = $1",
      [marker],
    );

    if (alreadyApplied.rowCount === 0) {
      console.log("Backfilling legacy cleared teaching earnings...");

      // Legacy balance = cleared earned transactions minus previous gross
      // withdrawal deductions. This is run once only; it will not overwrite
      // earned_balance on later deployments.
      await client.query(`
        UPDATE users u
        SET earned_balance = GREATEST(
          0,
          COALESCE((
            SELECT SUM(t.amount)
            FROM transactions t
            WHERE t.user_id = u.id
              AND t.type = 'earned'
              AND t.amount > 0
          ), 0)
          -
          COALESCE((
            SELECT SUM(ABS(t.amount))
            FROM transactions t
            WHERE t.user_id = u.id
              AND t.type = 'withdrawal_pending'
              AND t.amount < 0
          ), 0)
        )
      `);

      await client.query(
        "INSERT INTO app_migrations(name) VALUES ($1)",
        [marker],
      );
      console.log("Legacy earned balances backfilled.");
    } else {
      console.log("Legacy earned-balance backfill already applied; skipping.");
    }

    await client.query("COMMIT");
    console.log("Wallet migration completed successfully.");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("Wallet migration failed; changes rolled back.", error);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateWallet().catch((error) => {
  console.error("Unexpected wallet migration error:", error);
  process.exitCode = 1;
});
