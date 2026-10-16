'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
export type NavItem = { href: string; label: string; match?: string[] };
export default function NavLinks({ items }: { items: NavItem[] }) {
  const p = usePathname();
  const on = (i: NavItem) => (i.match ?? [i.href]).some(m => (m === '/hr' ? p === '/hr' || p.startsWith('/hr/periods') : p === m || p.startsWith(m + '/')));
  return <nav className="nav">{items.map(i => <Link key={i.href} href={i.href} className={on(i) ? 'active' : ''}>{i.label}</Link>)}</nav>;
}
