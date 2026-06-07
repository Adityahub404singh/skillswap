require('dotenv').config({path:'.env'});
const {Pool} = require('pg');
const p = new Pool({connectionString: process.env.DATABASE_URL});
const sql = "CREATE TABLE IF NOT EXISTS notifications (id SERIAL PRIMARY KEY, user_id INTEGER NOT NULL, type VARCHAR(30) NOT NULL, title VARCHAR(200) NOT NULL, message TEXT NOT NULL, is_read BOOLEAN NOT NULL DEFAULT false, action_url VARCHAR(300), created_at TIMESTAMP NOT NULL DEFAULT NOW()); CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);";
p.query(sql)
  .then(() => { console.log('notifications table CREATED!'); p.end(); })
  .catch(e => { console.log('ERR:', e.message); p.end(); });
