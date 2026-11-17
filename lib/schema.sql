CREATE TABLE IF NOT EXISTS cows (
  id          INTEGER PRIMARY KEY,
  tag         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name        TEXT,
  breed       TEXT,
  group_name  TEXT,
  stage       TEXT NOT NULL DEFAULT 'milking',
  birth_date  TEXT,
  notes       TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS health_checks (
  id          INTEGER PRIMARY KEY,
  cow_id      INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  date        TEXT NOT NULL,
  time        TEXT,
  condition   TEXT NOT NULL,
  temperature REAL,
  symptoms    TEXT NOT NULL DEFAULT '[]',
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS health_checks_cow ON health_checks(cow_id, date, time, id);

CREATE TABLE IF NOT EXISTS treatments (
  id              INTEGER PRIMARY KEY,
  cow_id          INTEGER NOT NULL REFERENCES cows(id) ON DELETE CASCADE,
  start_date      TEXT NOT NULL,
  medicine        TEXT NOT NULL,
  dose            REAL,
  unit            TEXT NOT NULL DEFAULT 'ml',
  route           TEXT,
  times_per_day   INTEGER NOT NULL DEFAULT 1,
  days            INTEGER NOT NULL DEFAULT 1,
  withdrawal_days INTEGER NOT NULL DEFAULT 0,
  note            TEXT,
  created_at      TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS treatments_cow ON treatments(cow_id, start_date);
CREATE INDEX IF NOT EXISTS treatments_start ON treatments(start_date);

CREATE TABLE IF NOT EXISTS feed_logs (
  id          INTEGER PRIMARY KEY,
  date        TEXT NOT NULL,
  session     TEXT NOT NULL,
  group_name  TEXT,
  cow_id      INTEGER REFERENCES cows(id) ON DELETE CASCADE,
  head_count  INTEGER NOT NULL DEFAULT 1,
  items       TEXT NOT NULL DEFAULT '[]',
  note        TEXT,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS feed_logs_date ON feed_logs(date);
CREATE INDEX IF NOT EXISTS feed_logs_group ON feed_logs(group_name COLLATE NOCASE, session);
CREATE INDEX IF NOT EXISTS feed_logs_cow ON feed_logs(cow_id);

CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY,
  email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name          TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'worker',
  password_hash TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash  TEXT PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at  TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS sessions_user ON sessions(user_id);
