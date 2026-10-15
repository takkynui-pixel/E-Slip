import { NextResponse } from 'next/server';
import { createHash } from 'node:crypto';
import { admin } from '@/lib/supabase/admin';
import { audit } from '@/lib/auth';
import { sendMessages, resetMsg, authLink } from '@/lib/email';

// ลืมรหัสผ่าน: ตอบ ok เสมอ (ไม่เปิดเผยว่าอีเมลนี้มีในระบบหรือไม่) + หน่วง 60 วินาทีต่ออีเมล
export async function POST(req: Request) {
  const ok = NextResponse.json({ ok: true });
  const { email } = await req.json().catch(() => ({}));
  const addr = String(email ?? '').trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(addr)) return ok;
  const db = admin();
  const key = createHash('sha256').update(addr).digest('hex').slice(0, 16);                // ไม่เก็บอีเมลดิบใน log
  const { count } = await db.from('audit_logs').select('id', { count: 'exact', head: true })
    .eq('action', 'forgot_password').eq('target', key).gte('at', new Date(Date.now() - 60_000).toISOString());
  if (count) return ok;                                                                    // เช็กก่อนสร้างลิงก์ กันลิงก์เก่าถูกทำให้เป็นโมฆะ
  await audit(null, 'forgot_password', key);
  const g: any = await db.auth.admin.generateLink({ type: 'recovery', email: addr });
  if (g.error || !g.data?.properties?.hashed_token) return ok;
  try { await sendMessages([resetMsg(addr, authLink(g.data.properties.hashed_token, 'recovery'))]); } catch {}
  return ok;
}
