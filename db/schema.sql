-- Schéma PostgreSQL de Charge & Récup.
-- Équivalent exact de prisma/schema.prisma, avec en plus des contraintes CHECK
-- qui protègent les données même si elles sont écrites hors de l'application.
--
-- Usage possible :  psql "$DATABASE_URL" -f db/schema.sql
-- Ou laisser Prisma créer les tables :  npx prisma db push  (sans les CHECK).

CREATE TYPE "SessionType" AS ENUM ('MUSCU', 'TRAINING', 'COMBO', 'MATCH', 'OTHER');

CREATE TABLE daily_entries (
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

CREATE INDEX daily_entries_entry_date_idx ON daily_entries (entry_date);

CREATE TABLE training_sessions (
  id        TEXT           PRIMARY KEY,
  entry_id  TEXT           NOT NULL REFERENCES daily_entries (id) ON DELETE CASCADE ON UPDATE CASCADE,
  position  SMALLINT       NOT NULL CHECK (position IN (0, 1)),
  type      "SessionType",
  rpe       SMALLINT       NOT NULL CHECK (rpe     BETWEEN 0 AND 10),
  minutes   SMALLINT       NOT NULL CHECK (minutes BETWEEN 1 AND 300),

  CONSTRAINT training_sessions_entry_id_position_key UNIQUE (entry_id, position)
);

-- Charge d'une journée = somme de (rpe * minutes) sur ses séances ; repos = 0.
-- Exemple de requête : charge par joueur et par jour.
--
--   SELECT e.player_name, e.entry_date,
--          CASE WHEN e.is_rest THEN 0 ELSE COALESCE(SUM(s.rpe * s.minutes), 0) END AS load_of_previous_day
--   FROM daily_entries e
--   LEFT JOIN training_sessions s ON s.entry_id = e.id
--   GROUP BY e.id
--   ORDER BY e.entry_date DESC, e.player_name;
