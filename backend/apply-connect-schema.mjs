import "dotenv/config";
import pg from "pg";
import { readFile } from "node:fs/promises";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL missing. No changes made.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10000,
});

const client = await pool.connect();
let transactionStarted = false;

try {
  const sql = await readFile(
    new URL("./connect_schema_setup.sql", import.meta.url),
    "utf8"
  );

  const identity = await client.query(`
    SELECT current_database() AS database_name,
           current_schema() AS schema_name
  `);

  console.log("Target database:", identity.rows[0].database_name);
  console.log("Target schema:", identity.rows[0].schema_name);

  const before = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name LIKE 'connect_%'
    ORDER BY table_name
  `);

  console.log("Existing Connect tables:", before.rows.map(r => r.table_name));

  const statements = sql
    .replace(/^\uFEFF/, "")
    .replace(/^\s*BEGIN\s*;/i, "")
    .replace(/COMMIT\s*;\s*$/i, "")
    .split(";")
    .map(s => s.trim())
    .filter(Boolean);

  await client.query("BEGIN");
  transactionStarted = true;

  for (const statement of statements) {
    await client.query(statement);
  }

  await client.query("COMMIT");
  transactionStarted = false;

  const after = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = current_schema()
      AND table_name LIKE 'connect_%'
    ORDER BY table_name
  `);

  console.log("Connect tables after setup:", after.rows.map(r => r.table_name));

  if (after.rows.length !== 10) {
    throw new Error(`Expected 10 Connect tables; found ${after.rows.length}.`);
  }

  console.log("Connect schema setup completed successfully.");
} catch (error) {
  if (transactionStarted) {
    await client.query("ROLLBACK").catch(() => {});
  }
  console.error("Migration failed:", error.code || "", error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
