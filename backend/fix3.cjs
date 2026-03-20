const { Pool } = require('pg');
const pool = new Pool({ 
  connectionString: 'postgresql://neondb_owner:npg_GiTnzt29kPjM@ep-odd-frog-am5juiin-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
});

pool.query(`
  ALTER TABLE skills 
  ADD COLUMN IF NOT EXISTS mentor_count integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_by integer,
  ADD COLUMN IF NOT EXISTS created_at timestamp DEFAULT now()
`).then(() => { 
  console.log('DONE! skills table fixed.'); 
  pool.end(); 
}).catch(e => { 
  console.error(e.message); 
  pool.end(); 
});
