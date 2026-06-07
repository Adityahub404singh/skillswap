import { pool } from './src/db.js';
async function check() {
  try {
    const skills = await pool.query('SELECT COUNT(*) FROM skills');
    const users = await pool.query('SELECT COUNT(*) FROM users');
    console.log('--- DATABASE STATS ---');
    console.log('Skills count in DB:', skills.rows[0].count);
    console.log('Users count in DB:', users.rows[0].count);
    process.exit();
  } catch (e) {
    console.log('Error: Database connection issue. Check your db credentials.');
  }
}
check();