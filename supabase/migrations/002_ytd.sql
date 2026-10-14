-- 002: ยอดสะสม (YTD) คำนวณจากงวดในระบบ
alter table payroll_records
  add column if not exists tax numeric(12,2) not null default 0,
  add column if not exists sso numeric(12,2) not null default 0,
  add column if not exists pvf numeric(12,2) not null default 0;

-- ยอดสะสมของทุกคน ณ งวดที่ระบุ (รวมงวดนั้นเอง) ภายในปีเดียวกัน — เรียกจากเซิร์ฟเวอร์ตอนสร้าง PDF
create or replace function ytd_for_period(p_period uuid)
returns table (employee_id uuid, income numeric, tax numeric, sso numeric, pvf numeric)
language sql stable security definer set search_path = public as $$
  with cur as (select period_key from payroll_periods where id = p_period)
  select r.employee_id, sum(r.total_income), sum(r.tax), sum(r.sso), sum(r.pvf)
  from payroll_records r
  join payroll_periods p on p.id = r.period_id, cur
  where left(p.period_key,4) = left(cur.period_key,4)
    and p.period_key <= cur.period_key
    and (p.status in ('approved','published')   -- งวด draft ของงวดก่อนไม่นับ
         or p.id = p_period)                    -- งวดปัจจุบันนับเสมอ (แม้ยังเป็น draft ตอนพรีวิว)
  group by r.employee_id
$$;
revoke all on function ytd_for_period(uuid) from public, anon, authenticated;  -- ให้เรียกได้เฉพาะ service role
