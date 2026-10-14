import { redirect } from 'next/navigation';
import { currentUser, rolesOf } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export default async function Home() {
  const u = await currentUser(); if (!u) redirect('/login');
  const r = await rolesOf(u.id);
  redirect(r.includes('hr') || r.includes('admin') ? '/hr' : '/me');
}
