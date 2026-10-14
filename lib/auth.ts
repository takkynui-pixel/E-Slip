import 'server-only';
import { supabaseServer } from './supabase/server';
import { admin } from './supabase/admin';

export async function currentUser() {
  const sb = await supabaseServer();
  const { data } = await sb.auth.getUser();      // getUser() ตรวจกับเซิร์ฟเวอร์ Auth จริง (ไม่เชื่อ cookie เฉยๆ)
  return data.user;
}
export async function rolesOf(userId: string): Promise<string[]> {
  const { data } = await admin().from('user_roles').select('role').eq('user_id', userId);
  return (data ?? []).map((r: any) => r.role);
}
/** ใช้ใน API route: คืน user ถ้าเป็น hr/admin ไม่เช่นนั้นคืน null */
export async function requireHr() {
  const u = await currentUser(); if (!u) return null;
  const roles = await rolesOf(u.id);
  return roles.includes('hr') || roles.includes('admin') ? u : null;
}
export async function audit(actor: string | null, action: string, target?: string, detail?: any) {
  await admin().from('audit_logs').insert({ actor, action, target, detail });
}
