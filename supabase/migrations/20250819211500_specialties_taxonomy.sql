-- ======================================================================
-- Specialties Taxonomy System Migration
-- Migration: 20250819211500_specialties_taxonomy.sql
-- Description: Implements hierarchical specialties taxonomy with vendor relationships
-- Safe to re-run: uses IF EXISTS checks and idempotent patterns
-- ======================================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS ltree;

-- ======================================================================
-- DROP LEGACY (SAFE) - Drop in reverse dependency order
-- ======================================================================
DROP TABLE IF EXISTS specialty_suggestions CASCADE;
DROP TABLE IF EXISTS vendor_specialties CASCADE;
DROP TABLE IF EXISTS specialty_aliases CASCADE;
DROP TABLE IF EXISTS specialties CASCADE;

-- ======================================================================
-- SPECIALTIES (taxonomy)
-- ======================================================================
CREATE TABLE specialties (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text NOT NULL,
  slug         text GENERATED ALWAYS AS (regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g')) STORED,
  parent_id    uuid REFERENCES specialties(id) ON DELETE CASCADE,
  -- ltree path (e.g., 'home-improvement.plumbing.drain-cleaning')
  path         ltree,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- Uniqueness: same name cannot repeat under the same parent
CREATE UNIQUE INDEX uq_specialties_parent_name ON specialties(parent_id, name);
-- Path & slug helpers
CREATE UNIQUE INDEX uq_specialties_path ON specialties USING gist (path);
CREATE INDEX ix_specialties_slug ON specialties(slug);
CREATE INDEX ix_specialties_parent ON specialties(parent_id);

-- Keep updated_at fresh
CREATE OR REPLACE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_specialties_updated_at
BEFORE UPDATE ON specialties
FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Path maintenance function
CREATE OR REPLACE FUNCTION update_specialty_path() RETURNS trigger AS $$
BEGIN
  IF NEW.parent_id IS NULL THEN
    NEW.path = NEW.name::ltree;
  ELSE
    SELECT parent.path || NEW.name::ltree INTO NEW.path
    FROM specialties parent
    WHERE parent.id = NEW.parent_id;
  END IF;
  RETURN NEW;
END$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_specialties_path
BEFORE INSERT OR UPDATE ON specialties
FOR EACH ROW EXECUTE FUNCTION update_specialty_path();

-- ======================================================================
-- SPECIALTY ALIASES (search optimization)
-- ======================================================================
CREATE TABLE specialty_aliases (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id uuid NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  alias        text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX uq_specialty_aliases_alias ON specialty_aliases(alias);
CREATE INDEX ix_specialty_aliases_specialty ON specialty_aliases(specialty_id);

-- ======================================================================
-- VENDOR SPECIALTIES (many-to-many relationship)
-- ======================================================================
CREATE TABLE vendor_specialties (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id  uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  specialty_id uuid NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  is_primary   boolean NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_user_id, specialty_id)
);

CREATE INDEX ix_vendor_specialties_user ON vendor_specialties(app_user_id);
CREATE INDEX ix_vendor_specialties_specialty ON vendor_specialties(specialty_id);

-- ======================================================================
-- SPECIALTY SUGGESTIONS (vendor submissions)
-- ======================================================================
CREATE TABLE specialty_suggestions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_user_id    uuid REFERENCES app_users(id) ON DELETE SET NULL,
  proposed_name  text NOT NULL,
  parent_id      uuid REFERENCES specialties(id) ON DELETE SET NULL,
  details        text,
  status         text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
  reviewed_at    timestamptz,
  reviewer_id    uuid REFERENCES app_users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ix_specialty_suggestions_status ON specialty_suggestions(status);
CREATE INDEX ix_specialty_suggestions_user ON specialty_suggestions(app_user_id);
CREATE INDEX ix_specialty_suggestions_parent ON specialty_suggestions(parent_id);

-- ======================================================================
-- SEED DATA (common specialties)
-- ======================================================================
INSERT INTO specialties (name, parent_id) VALUES
-- Home Improvement
('Home Improvement', NULL),
('Plumbing', (SELECT id FROM specialties WHERE name='Home Improvement')),
('Electrical', (SELECT id FROM specialties WHERE name='Home Improvement')),
('HVAC', (SELECT id FROM specialties WHERE name='Home Improvement')),
('Roofing', (SELECT id FROM specialties WHERE name='Home Improvement')),
('Painting', (SELECT id FROM specialties WHERE name='Home Improvement')),
('Carpentry', (SELECT id FROM specialties WHERE name='Home Improvement')),
('Landscaping', (SELECT id FROM specialties WHERE name='Home Improvement')),

-- Plumbing sub-specialties
('Drain Cleaning', (SELECT id FROM specialties WHERE name='Plumbing')),
('Pipe Repair', (SELECT id FROM specialties WHERE name='Plumbing')),
('Water Heater Installation', (SELECT id FROM specialties WHERE name='Plumbing')),
('Fixture Installation', (SELECT id FROM specialties WHERE name='Plumbing')),

-- Electrical sub-specialties
('Wiring', (SELECT id FROM specialties WHERE name='Electrical')),
('Panel Upgrades', (SELECT id FROM specialties WHERE name='Electrical')),
('Lighting Installation', (SELECT id FROM specialties WHERE name='Electrical')),
('EV Charger Installation', (SELECT id FROM specialties WHERE name='Electrical')),

-- Technology
('Technology', NULL),
('Computer Repair', (SELECT id FROM specialties WHERE name='Technology')),
('Software Development', (SELECT id FROM specialties WHERE name='Technology')),
('Web Design', (SELECT id FROM specialties WHERE name='Technology')),
('IT Support', (SELECT id FROM specialties WHERE name='Technology')),

-- Health & Wellness
('Health & Wellness', NULL),
('Personal Training', (SELECT id FROM specialties WHERE name='Health & Wellness')),
('Massage Therapy', (SELECT id FROM specialties WHERE name='Health & Wellness')),
('Nutrition Counseling', (SELECT id FROM specialties WHERE name='Health & Wellness')),
('Yoga Instruction', (SELECT id FROM specialties WHERE name='Health & Wellness')),

-- Professional Services
('Professional Services', NULL),
('Legal Services', (SELECT id FROM specialties WHERE name='Professional Services')),
('Accounting', (SELECT id FROM specialties WHERE name='Professional Services')),
('Consulting', (SELECT id FROM specialties WHERE name='Professional Services')),
('Marketing', (SELECT id FROM specialties WHERE name='Professional Services'));

-- Add some aliases for better search
INSERT INTO specialty_aliases (specialty_id, alias) VALUES
((SELECT id FROM specialties WHERE name='Plumbing'), 'plumber'),
((SELECT id FROM specialties WHERE name='Plumbing'), 'pipe work'),
((SELECT id FROM specialties WHERE name='Electrical'), 'electrician'),
((SELECT id FROM specialties WHERE name='Electrical'), 'electrical work'),
((SELECT id FROM specialties WHERE name='HVAC'), 'heating and cooling'),
((SELECT id FROM specialties WHERE name='HVAC'), 'air conditioning'),
((SELECT id FROM specialties WHERE name='Computer Repair'), 'pc repair'),
((SELECT id FROM specialties WHERE name='Computer Repair'), 'laptop repair'),
((SELECT id FROM specialties WHERE name='Personal Training'), 'fitness trainer'),
((SELECT id FROM specialties WHERE name='Personal Training'), 'workout coach');

-- ======================================================================
-- RLS POLICIES
-- ======================================================================
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialty_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE specialty_suggestions ENABLE ROW LEVEL SECURITY;

-- Specialties: public read, admin write
CREATE POLICY "Specialties are viewable by everyone" ON specialties
  FOR SELECT USING (true);

CREATE POLICY "Specialties are insertable by admins" ON specialties
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN app_users au ON ur.app_user_id = au.id 
      WHERE au.auth_user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Specialties are updatable by admins" ON specialties
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN app_users au ON ur.app_user_id = au.id 
      WHERE au.auth_user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Aliases: public read, admin write
CREATE POLICY "Aliases are viewable by everyone" ON specialty_aliases
  FOR SELECT USING (true);

CREATE POLICY "Aliases are manageable by admins" ON specialty_aliases
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN app_users au ON ur.app_user_id = au.id 
      WHERE au.auth_user_id = auth.uid() AND ur.role = 'admin'
    )
  );

-- Vendor Specialties: users can manage their own
CREATE POLICY "Users can view vendor specialties" ON vendor_specialties
  FOR SELECT USING (true);

CREATE POLICY "Users can manage their own specialties" ON vendor_specialties
  FOR ALL USING (
    app_user_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_user_id = auth.uid()
    )
  );

-- Suggestions: users can create, admins can manage
CREATE POLICY "Users can view their own suggestions" ON specialty_suggestions
  FOR SELECT USING (
    app_user_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_user_id = auth.uid()
    ) OR
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN app_users au ON ur.app_user_id = au.id 
      WHERE au.auth_user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "Users can create suggestions" ON specialty_suggestions
  FOR INSERT WITH CHECK (
    app_user_id IN (
      SELECT au.id FROM app_users au WHERE au.auth_user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all suggestions" ON specialty_suggestions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_roles ur 
      JOIN app_users au ON ur.app_user_id = au.id 
      WHERE au.auth_user_id = auth.uid() AND ur.role = 'admin'
    )
  );

COMMIT;
