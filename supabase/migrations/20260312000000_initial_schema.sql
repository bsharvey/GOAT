-- GOAT Platform — Supabase PostgreSQL Schema
-- Run this in Supabase SQL Editor to create all tables

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- USERS (Auth & RBAC)
-- ============================================
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  username text unique not null,
  email text unique not null,
  password_hash text not null,
  role text not null default 'artist' check (role in ('admin', 'manager', 'artist', 'viewer')),
  first_name text,
  last_name text,
  avatar text,
  phone text,
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  address_country text,
  currency text default 'USD',
  language text default 'en',
  email_notifications boolean default true,
  sms_notifications boolean default false,
  is_active boolean default true,
  last_login timestamptz,
  email_verified boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- ARTISTS
-- ============================================
create table if not exists artists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade not null,
  name text not null,
  email text,
  phone text,
  bio text,
  avatar text,
  -- Social media
  social_website text,
  social_spotify text,
  social_apple_music text,
  social_youtube text,
  social_instagram text,
  social_twitter text,
  social_facebook text,
  -- Address
  address_street text,
  address_city text,
  address_state text,
  address_zip text,
  address_country text,
  -- Tax info
  tax_id text,
  tax_id_type text check (tax_id_type in ('SSN', 'EIN', 'VAT', 'OTHER')),
  tax_id_country text,
  -- Bank info
  bank_name text,
  bank_account text,
  bank_routing text,
  bank_swift text,
  bank_iban text,
  -- Metadata
  tags text[] default '{}',
  genre text[] default '{}',
  total_earnings numeric(12,2) default 0,
  pending_earnings numeric(12,2) default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_artists_user on artists(user_id);
create index if not exists idx_artists_name on artists using gin(to_tsvector('english', name));

-- ============================================
-- CONTRACTS
-- ============================================
create table if not exists contracts (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  contract_number text unique not null,
  type text not null check (type in ('recording', 'publishing', 'distribution', 'licensing', 'management', 'other')),
  status text default 'draft' check (status in ('draft', 'pending', 'active', 'expired', 'terminated', 'suspended')),
  start_date date not null,
  end_date date,
  -- Terms
  duration_months integer not null,
  exclusivity boolean default false,
  territory text[] default '{}',
  -- Renewal
  auto_renew boolean default false,
  renewal_period text check (renewal_period in ('monthly', 'quarterly', 'semi-annual', 'annual')),
  renewal_notice_days integer default 30,
  -- Payment terms
  payment_frequency text default 'quarterly' check (payment_frequency in ('monthly', 'quarterly', 'semi-annual', 'annual', 'on-demand')),
  payment_days integer default 30,
  reporting_period text default 'quarterly',
  currency text default 'USD',
  notes text,
  -- Audit
  created_by uuid references users(id),
  approved_by uuid references users(id),
  approved_at timestamptz,
  terminated_at timestamptz,
  terminated_by uuid references users(id),
  termination_reason text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Contract-Artist junction (many-to-many)
create table if not exists contract_artists (
  contract_id uuid references contracts(id) on delete cascade,
  artist_id uuid references artists(id) on delete cascade,
  primary key (contract_id, artist_id)
);

-- Contract royalty rates
create table if not exists contract_royalties (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid references contracts(id) on delete cascade not null,
  type text not null check (type in ('mechanical', 'performance', 'synchronization', 'digital', 'physical', 'other')),
  rate numeric(5,2) not null,
  rate_type text default 'percentage' check (rate_type in ('percentage', 'fixed', 'tiered')),
  basis text default 'net' check (basis in ('gross', 'net', 'wholesale', 'retail')),
  min_guarantee numeric(12,2) default 0,
  recoupable boolean default true
);

-- Contract advances
create table if not exists contract_advances (
  id uuid primary key default uuid_generate_v4(),
  contract_id uuid references contracts(id) on delete cascade not null,
  amount numeric(12,2) not null,
  currency text default 'USD',
  date timestamptz default now(),
  description text,
  recoupable boolean default true
);

-- ============================================
-- ROYALTIES
-- ============================================
create table if not exists royalties (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references artists(id) on delete cascade not null,
  contract_id uuid references contracts(id),
  work_title text not null,
  work_type text not null check (work_type in ('song', 'album', 'video', 'book', 'software', 'other')),
  period_start date not null,
  period_end date not null,
  currency text default 'USD',
  amount numeric(12,2) not null,
  pending_amount numeric(12,2) default 0,
  paid_amount numeric(12,2) default 0,
  royalty_rate numeric(5,2) not null,
  -- Sales data
  units_sold integer default 0,
  total_revenue numeric(12,2) default 0,
  streams integer default 0,
  downloads integer default 0,
  -- Source
  source text not null check (source in ('spotify', 'apple', 'youtube', 'amazon', 'physical', 'digital', 'other')),
  source_platform text,
  source_region text,
  source_report_id text,
  source_import_date timestamptz,
  -- Status
  status text default 'pending' check (status in ('pending', 'approved', 'paid', 'disputed', 'cancelled')),
  notes text,
  -- Audit
  created_by uuid references users(id),
  approved_by uuid references users(id),
  approved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_royalties_artist on royalties(artist_id);
create index if not exists idx_royalties_status on royalties(status);
create index if not exists idx_royalties_source on royalties(source);
create index if not exists idx_royalties_period on royalties(artist_id, period_start desc);

-- ============================================
-- PAYMENTS
-- ============================================
create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  artist_id uuid references artists(id) on delete cascade not null,
  total_amount numeric(12,2) not null,
  currency text default 'USD',
  payment_date timestamptz default now(),
  status text default 'pending' check (status in ('pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded')),
  method text not null check (method in ('bank_transfer', 'paypal', 'stripe', 'check', 'cash', 'other')),
  transaction_id text unique,
  reference_number text,
  -- Bank details
  bank_name text,
  bank_account text,
  bank_routing text,
  bank_swift text,
  bank_iban text,
  -- Amounts
  processing_fees numeric(12,2) default 0,
  taxes numeric(12,2) default 0,
  net_amount numeric(12,2) not null,
  notes text,
  -- Audit
  created_by uuid references users(id),
  processed_by uuid references users(id),
  processed_at timestamptz,
  completed_at timestamptz,
  failure_reason text,
  -- Refund
  refund_amount numeric(12,2),
  refund_date timestamptz,
  refund_reason text,
  refund_transaction_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Payment-Royalty junction (which royalties a payment covers)
create table if not exists payment_royalties (
  payment_id uuid references payments(id) on delete cascade,
  royalty_id uuid references royalties(id) on delete cascade,
  amount numeric(12,2) not null,
  primary key (payment_id, royalty_id)
);

create index if not exists idx_payments_artist on payments(artist_id);
create index if not exists idx_payments_status on payments(status);

-- ============================================
-- Updated_at trigger (auto-update timestamps)
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger users_updated_at before update on users for each row execute function update_updated_at();
create trigger artists_updated_at before update on artists for each row execute function update_updated_at();
create trigger contracts_updated_at before update on contracts for each row execute function update_updated_at();
create trigger royalties_updated_at before update on royalties for each row execute function update_updated_at();
create trigger payments_updated_at before update on payments for each row execute function update_updated_at();
