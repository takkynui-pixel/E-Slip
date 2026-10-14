import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { admin } from '@/lib/supabase/admin';
import { requireHr, audit } from '@/lib/auth';

// คอลัมน์ที่ต้องมี: รหัสพนักงาน | ชื่อ | อีเมล | ธนาคาร | เลขบัญชี  (ไฟล์ .xlsx หรือ .csv)
const mask = (s: string) => { const d = s.replace(/\D/g, ''); return d.length > 4 ? 'x'.repeat(d.length - 4) + d.slice(-4) : d ? 'xxxx' : ''; };

export async function POST(req: Request) {
  const user = await requireHr(); if (!user) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const file = (await req.formData()).get('file') as File | null;
  if (!file) return NextResponse.json({ error: 'ไม่มีไฟล์' }, { status: 400 });
  const wb = XLSX.read(Buffer.from(await file.arrayBuffer()), { type: 'buffer' });
  const rows: any[] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
  const bad: string[] = [], out: any[] = [];
  for (const r of rows) {
    const code = String(r['รหัสพนักงาน'] ?? '').trim(); if (!code) continue;
    const email = String(r['อีเมล'] ?? '').trim().toLowerCase();
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) { bad.push(`${code}: อีเมลไม่ถูกต้อง`); continue; }
    out.push({ emp_code: code, full_name: String(r['ชื่อ'] ?? '').trim(), email: email || null,
      bank_name: String(r['ธนาคาร'] ?? '').trim() || null, bank_account_masked: mask(String(r['เลขบัญชี'] ?? '')) || null });
  }
  if (out.length) {
    const { error } = await admin().from('employees').upsert(out, { onConflict: 'emp_code' });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await audit(user.id, 'import_employees', undefined, { imported: out.length, rejected: bad.length });
  return NextResponse.json({ ok: true, imported: out.length, rejected: bad });
}
