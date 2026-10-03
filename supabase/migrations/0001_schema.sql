-- Khalil Electronics — installment & recovery system
-- Supabase / Postgres schema. Run with `supabase db push`.

create extension if not exists "pgcrypto";

-- ---------- enums ----------
create type user_role       as enum ('owner','sales','avo','accountant','manager');
create type sale_type       as enum ('direct','installment');
create type agreement_state as enum ('pending_verification','open','closed','cancelled');
create type inst_state      as enum ('upcoming','due','short','paid','overdue','default');
create type pay_mode        as enum ('cash','bank','jazzcash','easypaisa');
create type verify_state    as enum ('pending','approved','rejected');
create type msg_channel     as enum ('whatsapp','sms');
create type msg_state       as enum ('queued','sent','delivered','failed');
create type money_account   as enum ('cash_in_hand','meezan_bank','jazzcash');

-- ---------- people ----------
create table profiles (
  id          uuid primary key references auth.users on delete cascade,
  full_name   text not null,
  role        user_role not null default 'sales',
  cell        text,
  zone        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table employees (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid unique references profiles on delete set null,
  full_name   text not null,
  role        user_role not null,
  cell        text,
  cnic        text,
  salary      numeric(12,2) not null default 0,
  joined_on   date,
  active      boolean not null default true
);

create sequence customer_acc_seq start 100100;

create table customers (
  id          uuid primary key default gen_random_uuid(),
  acc_no      text unique not null default nextval('customer_acc_seq')::text,
  full_name   text not null,
  father_name text,
  cnic        text unique,
  cell        text not null,
  cell2       text,
  address     text,
  area        text,
  occupation  text,
  avo_id      uuid references profiles on delete set null,
  blacklisted boolean not null default false,
  created_at  timestamptz not null default now(),
  created_by  uuid references profiles
);
create index on customers (avo_id);
create index on customers using gin (to_tsvector('simple', full_name || ' ' || coalesce(cell,'') || ' ' || acc_no));

create table guarantors (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers on delete cascade,
  slot        smallint not null check (slot in (1,2)),
  full_name   text not null,
  father_name text,
  cnic        text,
  cell        text,
  address     text,
  relation    text,
  unique (customer_id, slot)
);

create table verifications (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid not null references customers on delete cascade,
  avo_id      uuid not null references profiles,
  status      verify_state not null default 'pending',
  visited_at  timestamptz,
  house_type  text,              -- owned / rented
  notes       text,
  photo_paths text[] default '{}', -- Supabase Storage: verifications/<customer_id>/...
  lat         double precision,
  lng         double precision,
  created_at  timestamptz not null default now()
);

-- ---------- catalogue & purchasing ----------
create table categories (id serial primary key, name text unique not null);

create table vendors (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  cell      text,
  address   text,
  opening_balance numeric(12,2) not null default 0
);

create table products (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  category_id int references categories,
  vendor_id   uuid references vendors,
  model       text,
  cost        numeric(12,2) not null default 0,
  price       numeric(12,2) not null default 0,
  stock       int not null default 0,
  min_stock   int not null default 0
);

create table purchases (
  id         uuid primary key default gen_random_uuid(),
  vendor_id  uuid not null references vendors,
  bill_no    text,
  bill_date  date not null default current_date,
  total      numeric(12,2) not null default 0,
  notes      text
);

create table purchase_items (
  id          uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases on delete cascade,
  product_id  uuid not null references products,
  qty         int not null check (qty > 0),
  unit_cost   numeric(12,2) not null
);

create table vendor_payments (
  id        uuid primary key default gen_random_uuid(),
  vendor_id uuid not null references vendors,
  amount    numeric(12,2) not null check (amount > 0),
  account   money_account not null,
  paid_on   date not null default current_date,
  notes     text
);

-- ---------- sales ----------
create table agreements (
  id           uuid primary key default gen_random_uuid(),
  agreement_no serial unique,
  customer_id  uuid not null references customers,
  sale_type    sale_type not null,
  plan_months  smallint check (plan_months in (10,12) or plan_months is null),
  total_price  numeric(12,2) not null,
  advance      numeric(12,2) not null default 0,
  monthly      numeric(12,2) not null default 0,
  opened_on    date not null default current_date,
  first_due    date,                  -- 1st of the month after opening
  status       agreement_state not null default 'pending_verification',
  sales_officer_id uuid references profiles,
  closed_on    date,
  created_at   timestamptz not null default now()
);
create index on agreements (customer_id);

create table agreement_items (
  id           uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements on delete cascade,
  product_id   uuid not null references products,
  qty          int not null default 1,
  unit_price   numeric(12,2) not null,
  serial_no    text                    -- IMEI / serial
);

-- one row per month per agreement
create table installments (
  id           uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references agreements on delete cascade,
  seq          smallint not null,       -- 1..plan_months
  due_month    date not null,           -- always the 1st of the month
  due_amount   numeric(12,2) not null,  -- base monthly
  carry_in     numeric(12,2) not null default 0, -- shortfall (+) or credit (−) from previous
  paid         numeric(12,2) not null default 0,
  status       inst_state not null default 'upcoming',
  unique (agreement_id, seq)
);
create index on installments (due_month, status);

create table receipts (
  id             uuid primary key default gen_random_uuid(),
  receipt_no     serial unique,
  agreement_id   uuid not null references agreements,
  installment_id uuid references installments,
  customer_id    uuid not null references customers,
  amount         numeric(12,2) not null check (amount > 0),
  mode           pay_mode not null default 'cash',
  account        money_account not null default 'cash_in_hand',
  collected_by   uuid references profiles,
  collected_at   timestamptz not null default now(),
  lat            double precision,
  lng            double precision,
  notes          text
);
create index on receipts (collected_at);
create index on receipts (collected_by);

-- ---------- money out ----------
create table expenses (
  id        uuid primary key default gen_random_uuid(),
  category  text not null,
  description text,
  amount    numeric(12,2) not null check (amount > 0),
  account   money_account not null,
  spent_on  date not null default current_date,
  created_by uuid references profiles
);

-- ---------- messaging ----------
create table message_templates (
  key   text primary key,         -- reminder, received, overdue, announcement
  channel msg_channel not null,
  body  text not null             -- {{name}} {{amount}} {{month}} {{balance}}
);

create table messages (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers,
  channel     msg_channel not null,
  template    text references message_templates,
  body        text not null,
  status      msg_state not null default 'queued',
  provider_id text,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
