import { redirect } from 'next/navigation';
import { currentUser, rolesOf } from '@/lib/auth';
import AppShell from '@/components/AppShell';
export const dynamic = 'force-dynamic';
export default async function HrLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser(); if (!u) redirect('/login');
  const r = await rolesOf(u.id); if (!r.includes('hr') && !r.includes('admin')) redirect('/me');
  return <AppShell role="hr" email={u.email ?? ''}>{children}</AppShell>;
}
