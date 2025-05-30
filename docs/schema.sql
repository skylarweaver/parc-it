-- Supabase Schema for Parc-It!
-- This file defines the main tables for the Parc-It! app.

-- Table: office_requests
CREATE TABLE office_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  emoji text NOT NULL,
  description text NOT NULL,
  signature jsonb NOT NULL, -- group signature/proof (stub for now)
  group_id uuid NOT NULL, -- for future multi-group support
  public_signal text NOT NULL, -- hash of message or similar
  group_members text[] NOT NULL, -- array of github usernames
  doxxed_member_id uuid REFERENCES group_members(id), -- nullable, for doxxed requests
  deleted boolean NOT NULL DEFAULT false,
  metadata jsonb -- optional, for future extensibility
);

-- Table: group_members
CREATE TABLE group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  github_username text UNIQUE NOT NULL,
  avatar_url text NOT NULL,
  public_key text NOT NULL, -- first RSA key from GitHub
  last_key_fetch timestamptz NOT NULL DEFAULT now(),
  is_admin boolean NOT NULL DEFAULT false
);

-- Table: admins
CREATE TABLE admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  public_key text NOT NULL, -- hardcoded in backend for admin check
  github_username text
);
