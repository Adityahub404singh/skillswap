CREATE TABLE IF NOT EXISTS payment_orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),

  razorpay_order_id TEXT NOT NULL UNIQUE,
  razorpay_payment_id TEXT UNIQUE,

  package_id TEXT NOT NULL,
  credits INTEGER NOT NULL CHECK (credits > 0),
  amount_paise INTEGER NOT NULL CHECK (amount_paise > 0),

  currency TEXT NOT NULL DEFAULT 'INR',

  status TEXT NOT NULL DEFAULT 'created'
    CHECK (status IN ('created', 'credited', 'failed')),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  credited_at TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS
  payment_orders_razorpay_order_unique
  ON payment_orders(razorpay_order_id);

CREATE UNIQUE INDEX IF NOT EXISTS
  payment_orders_razorpay_payment_unique
  ON payment_orders(razorpay_payment_id);