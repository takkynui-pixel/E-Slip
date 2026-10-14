-- e-Payslip schema (Supabase / Postgres) — ทดสอบใน SQL Editor ของโปรเจกต์ทดลองก่อน
create extension if not exists pgcrypto;

create type app_role as enum ('employee','hr','admin');

create table employees (
  id uuid primary key default gen_random_uuid(),
  emp_code text unique not null,
  full_name text not null,
  email text,
  bank_name text,
  bank_account_masked text,            -- เก็บแบบปิดบังแล้วเท่านั้น (เช่น xxx-x-xx123-4)
  user_id uuid unique references auth.users(id),
  active boolean not null default true
);

create table user_roles (
  user_id uuid references auth.users(id) on delete cascade,
  role app_role not null,
  primary key (user_id, role)
);

create table payroll_periods (
  id uuid primary key default gen_random_uuid(),
  period_key text unique not null,     -- เช่น 20260901 (ปีเดือนงวด จากคอลัมน์ BN)
  label text not null,
  pay_date date,
  status text not null default 'draft' check (status in ('draft','approved','published')),
  source_file text, imported_by uuid, imported_at timestamptz default now(),
  approved_by uuid, approved_at timestamptz
);

create table payroll_records (
  id uuid primary key default gen_random_uuid(),
  period_id uuid not null references payroll_periods(id) on delete cascade,
  employee_id uuid not null references employees(id),
  slip_data jsonb not null,            -- ข้อมูลที่ map แล้ว (ตรงกับช่องในเทมเพลต)
  total_income numeric(12,2) not null, total_deduct numeric(12,2) not null, net_income numeric(12,2) not null,
  unique (period_id, employee_id)
);

create table payslips (
  id uuid primary key default gen_random_uuid(),
  record_id uuid unique not null references payroll_records(id) on delete cascade,
  pdf_path text,                       -- path ใน bucket 'payslips' (private)
  pdf_status text not null default 'pending' check (pdf_status in ('pending','done','failed')),
  email_status text not null default 'pending' check (email_status in ('pending','queued','sent','delivered','bounced','failed')),
  email_provider_id text, last_error text, updated_at timestamptz default now()
);

create table audit_logs (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  actor uuid, action text not null, target text, detail jsonb
);

-- ---------- helper ----------
create or replace function has_role(r app_role) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from user_roles where user_id = auth.uid() and role = r)
$$;

-- ---------- RLS ----------
alter table employees enable row level security;
alter table user_roles enable row level security;
alter table payroll_periods enable row level security;
alter table payroll_records enable row level security;
alter table payslips enable row level security;
alter table audit_logs enable row level security;

create policy emp_self on employees for select using (user_id = auth.uid() or has_role('hr') or has_role('admin'));
create policy emp_hr_write on employees for all using (has_role('hr') or has_role('admin')) with check (has_role('hr') or has_role('admin'));
create policy roles_admin on user_roles for all using (has_role('admin')) with check (has_role('admin'));
create policy roles_self on user_roles for select using (user_id = auth.uid());

create policy per_hr on payroll_periods for all using (has_role('hr') or has_role('admin')) with check (has_role('hr') or has_role('admin'));
create policy per_emp_read on payroll_periods for select using (status = 'published');

create policy rec_hr on payroll_records for all using (has_role('hr') or has_role('admin')) with check (has_role('hr') or has_role('admin'));
create policy rec_self on payroll_records for select using (
  employee_id in (select id from employees where user_id = auth.uid())
  and period_id in (select id from payroll_periods where status = 'published'));

create policy slip_hr on payslips for all using (has_role('hr') or has_role('admin')) with check (has_role('hr') or has_role('admin'));
create policy slip_self on payslips for select using (
  record_id in (select r.id from payroll_records r join employees e on e.id = r.employee_id
                join payroll_periods p on p.id = r.period_id
                where e.user_id = auth.uid() and p.status = 'published'));

create policy audit_read on audit_logs for select using (has_role('admin') or has_role('hr'));
-- audit_logs: ไม่มี policy insert/update/delete สำหรับผู้ใช้ — เขียนผ่านเซิร์ฟเวอร์ (service role) เท่านั้น

-- ---------- Storage (bucket ส่วนตัว) ----------
insert into storage.buckets (id, name, public) values ('payslips','payslips',false) on conflict do nothing;
-- ไฟล์ตั้งชื่อ {period_id}/{emp_code}.pdf ; พนักงานโหลดผ่าน signed URL ที่ API สร้างหลังเช็กสิทธิ์
-- (ไม่ต้องเปิด policy อ่าน storage ให้ผู้ใช้โดยตรง = ปลอดภัยกว่า)
