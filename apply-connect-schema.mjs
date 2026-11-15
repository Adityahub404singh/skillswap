import "dotenv/config";
import pg from "pg";
import { readFile } from "node:fs/promises";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error("DATABASE_URL is missing. No changes were made.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
  max: 1,
  connectionTimeoutMillis: 10000,
});

const sql = await readFile(
  new URL("./connect_schema_setup.sql", import.meta.url),
  "utf8"
);

const client = await pool.connect();

try {
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

  await client.query(sql);

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

  console.log("Connect schema setup completed.");
} catch (error) {
  console.error("Connect schema setup failed:", error.code || "", error.message);
  process.exitCode = 1;
} finally {
  client.release();
  await pool.end();
}
