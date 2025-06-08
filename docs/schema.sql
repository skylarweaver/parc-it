-- Supabase Schema for Parc-It!
-- This file defines the main tables for the Parc-It! app.

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

-- Table: office_requests
CREATE TABLE office_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  emoji text NOT NULL,
  description text NOT NULL,
  signature jsonb, -- now nullable
  group_id uuid, -- for future multi-group support, now nullable
  public_signal text NOT NULL, -- hash of message or similar
  group_members text[], -- now nullable
  doxxed_member_id uuid REFERENCES group_members(id), -- nullable, for doxxed requests
  deleted boolean NOT NULL DEFAULT false,
  metadata jsonb -- optional, for future extensibility
);

-- Add index on deleted column
CREATE INDEX office_requests_deleted_idx ON office_requests (deleted);

-- Table: request_upvotes (for anonymous upvoting with nullifiers)
CREATE TABLE request_upvotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES office_requests(id) ON DELETE CASCADE,
  nullifier text NOT NULL, -- for now this will just be the public key (not anonymous upvoting)
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, nullifier)
);

-- Table: plonky2_timings (for tracking cryptographic operation timings)
CREATE TABLE plonky2_timings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operation text NOT NULL,
  duration_ms integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
