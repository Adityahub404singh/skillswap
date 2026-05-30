const b = require('bcryptjs');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: 'postgresql://neondb_owner:npg_GiTnzt29kPjM@ep-odd-frog-am5juiin-pooler.c-5.us-east-1.aws.neon.tech/neondb?sslmode=require', ssl: { rejectUnauthorized: false } });
b.hash('123456', 10).then(h => pool.query('UPDATE users SET password_hash =  WHERE email = ', [h, 'bmadityas@gmail.com'])).then(() => { console.log('Password reset to 123456!'); process.exit(0); }).catch(e => { console.error(e); process.exit(1); });
