const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_GiTnzt29kPjM@ep-odd-frog-am5juiin-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });
pool.query("UPDATE users SET avatar = NULL WHERE avatar LIKE 'data:%'").then(r => { console.log('Cleared base64 avatars from', r.rowCount, 'users'); process.exit(0); }).catch(e => { console.error(e.message); process.exit(1); });
