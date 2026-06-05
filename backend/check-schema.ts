import pg from 'pg';
import * as dotenv from 'dotenv';
dotenv.config();

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

async function main() {
  await client.connect();
  
  // Show ALL table columns with exact names
  const tables = ['sessions', 'users', 'transactions', 'ratings'];
  for (const table of tables) {
    const cols = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns 
      WHERE table_name=$1 ORDER BY ordinal_position
    `, [table]);
    console.log(`\n=== ${table} ===`);
    cols.rows.forEach((r: any) => console.log(`  ${r.column_name} (${r.data_type})`));
  }
  
  await client.end();
}

main().catch(e => { console.error('Error:', e.message); process.exit(1); });
