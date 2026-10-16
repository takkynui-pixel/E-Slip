import Link from 'next/link';
import NavLinks, { type NavItem } from './NavLinks';
const HR: NavItem[] = [
  { href: '/hr', label: 'งวดเงินเดือน' }, { href: '/hr/import', label: 'นำเข้างวดเงินเดือน' }, { href: '/hr/employees', label: 'พนักงาน' },
];
const ME: NavItem[] = [{ href: '/me', label: 'สลิปเงินเดือนของฉัน' }];
export default function AppShell({ role, email, children }: { role: 'hr' | 'employee'; email: string; children: React.ReactNode }) {
  return <div className="outer"><div className="shell">
    <header className="topbar">
      <Link href="/" className="logo"><img src="/logo.png" alt="VTA Service" /></Link>
      <NavLinks items={role === 'hr' ? HR : ME} />
      <div className="actions">
        <form action="/api/auth/signout" method="post"><button className="signout">ออกจากระบบ</button></form>
        <div className="avatar" title={email}>{(email[0] ?? 'U').toUpperCase()}</div>
      </div>
    </header>
    <main>{children}</main>
  </div></div>;
}
