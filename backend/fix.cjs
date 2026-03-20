const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_GiTnzt29kPjM@ep-odd-frog-am5juiin-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

pool.query(`
  ALTER TABLE users 
  ALTER COLUMN skills_teach TYPE jsonb USING to_jsonb(skills_teach),
  ALTER COLUMN skills_learn TYPE jsonb USING to_jsonb(skills_learn)
`).then(() => { 
  console.log('DONE! Columns fixed.'); 
  pool.end(); 
}).catch(e => { 
  console.error(e.message); 
  pool.end(); 
});
