-- 1. Ensure the schema exists
CREATE SCHEMA IF NOT EXISTS charge_recup;

-- 2. Quote the schema name and keep case consistent
CREATE TYPE charge_recup.session_type AS ENUM ('MUSCU', 'TRAINING', 'COMBO', 'MATCH', 'OTHER');

CREATE TABLE "charge_recup".daily_entries (
  id           TEXT          PRIMARY KEY,
  player_name  VARCHAR(40)   NOT NULL,
  name_key     VARCHAR(60)   NOT NULL,
  entry_date   DATE          NOT NULL,

  sleep        SMALLINT      NOT NULL CHECK (sleep    BETWEEN 1 AND 5),
  fatigue      SMALLINT      NOT NULL CHECK (fatigue  BETWEEN 1 AND 5),
  soreness     SMALLINT      NOT NULL CHECK (soreness BETWEEN 1 AND 5),
  stress       SMALLINT      NOT NULL CHECK (stress   BETWEEN 1 AND 5),
  mood         SMALLINT      NOT NULL CHECK (mood     BETWEEN 1 AND 5),

  is_rest      BOOLEAN       NOT NULL DEFAULT FALSE,

  created_at   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP(3)  NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT daily_entries_name_key_entry_date_key UNIQUE (name_key, entry_date)
);

-- 3. Include the schema prefix on the table being indexed
CREATE INDEX daily_entries_entry_date_idx ON charge_recup.daily_entries (entry_date);

CREATE TABLE charge_recup.training_sessions (
  id        TEXT                          PRIMARY KEY,
  -- 4. Reference the table inside the "charge-recup" schema
  entry_id  TEXT                          NOT NULL REFERENCES charge_recup.daily_entries (id) ON DELETE CASCADE ON UPDATE CASCADE,
  position  SMALLINT                      NOT NULL CHECK (position IN (0, 1)),
  -- 5. Reference the enum type inside the "charge-recup" schema
  type      charge_recup.session_type,
  rpe       SMALLINT                      NOT NULL CHECK (rpe     BETWEEN 0 AND 10),
  minutes   SMALLINT                      NOT NULL CHECK (minutes BETWEEN 1 AND 300),

  CONSTRAINT training_sessions_entry_id_position_key UNIQUE (entry_id, position)
);
