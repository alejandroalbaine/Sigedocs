CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(180) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(160) NOT NULL,
  role VARCHAR(80) NOT NULL CHECK (role IN ('Archivista / Gestor', 'Administrativo', 'Auditor Jurídico', 'Administrador')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  profile JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(profile) = 'object'),
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT users_email_lowercase CHECK (email = LOWER(email))
);

CREATE INDEX IF NOT EXISTS users_active_role_idx ON users (role) WHERE is_active = TRUE;

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS users_set_updated_at ON users;
CREATE TRIGGER users_set_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TABLE IF NOT EXISTS auth_events (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  attempted_email VARCHAR(180) NOT NULL,
  event_type VARCHAR(30) NOT NULL CHECK (event_type IN ('login_success', 'login_failure', 'logout')),
  ip_address INET,
  user_agent VARCHAR(500),
  event_data JSONB NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(event_data) = 'object'),
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS auth_events_user_time_idx ON auth_events (user_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS auth_events_type_time_idx ON auth_events (event_type, occurred_at DESC);
