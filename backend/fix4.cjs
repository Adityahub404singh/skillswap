const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_GiTnzt29kPjM@ep-odd-frog-am5juiin-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

pool.query(`
  ALTER TABLE ratings 
  ADD COLUMN IF NOT EXISTS rater_id integer,
  ADD COLUMN IF NOT EXISTS mentor_id integer
`).then(() => { 
  console.log('DONE! ratings table fixed.'); 
  pool.end(); 
}).catch(e => { 
  console.error(e.message); 
  pool.end(); 
});
