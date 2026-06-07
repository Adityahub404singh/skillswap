require('dotenv').config({path:'.env'});
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL});
const sqls = [
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false",
  "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verify_token TEXT"
];
Promise.all(sqls.map(s => p.query(s)))
  .then(() => { console.log('DB columns added!'); p.end(); })
  .catch(e => { console.log('ERR:', e.message); p.end(); });
