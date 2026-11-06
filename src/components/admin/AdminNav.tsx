'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Globe, CreditCard, Layers, Tag, ScrollText, ShieldAlert, Settings, LifeBuoy } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/users', label: 'Users', icon: Users },
  { href: '/admin/analytics', label: 'Analytics', icon: Globe },
  { href: '/admin/payments', label: 'Payments', icon: CreditCard },
  { href: '/admin/plans', label: 'Plans', icon: Layers },
  { href: '/admin/coupons', label: 'Coupons', icon: Tag },
  { href: '/admin/support', label: 'Support', icon: LifeBuoy },
  { href: '/admin/audit', label: 'Audit Log', icon: ScrollText },
  { href: '/admin/security', label: 'Security & MFA', icon: ShieldAlert },
  { href: '/admin/settings', label: 'Settings', icon: Settings },
];

export const AdminNav: React.FC = () => {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto py-2 -mx-2 px-2 scrollbar-none">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-brand-50 dark:bg-brand-950/60 text-brand font-bold border border-brand-200/60 dark:border-brand-800/60 shadow-xs'
                : 'text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-surface/60'
            }`}
          >
            <Icon size={14} className={isActive ? 'text-brand' : 'text-muted'} />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
};
