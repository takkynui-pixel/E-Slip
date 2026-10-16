import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import AppShell from '@/components/AppShell';
export const dynamic = 'force-dynamic';
export default async function MeLayout({ children }: { children: React.ReactNode }) {
  const u = await currentUser(); if (!u) redirect('/login');
  return <AppShell role="employee" email={u.email ?? ''}>{children}</AppShell>;
}
