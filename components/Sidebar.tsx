'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase-browser';
import {
  LayoutDashboard,
  Building2,
  Users,
  MessageSquare,
  LogOut,
} from 'lucide-react';

const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/accounts', label: 'Accounts', icon: Building2 },
  { href: '/contacts', label: 'Contacts', icon: Users },
  { href: '/messages', label: 'Messages', icon: MessageSquare },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  return (
    <aside className="w-56 min-h-screen bg-edge-950 border-r border-edge-800/50 flex flex-col">
      {/* Brand */}
      <div className="p-5 border-b border-edge-800/50">
        <h1 className="font-display text-xl text-edge-100">EDGE</h1>
        <p className="text-edge-600 text-[10px] uppercase tracking-[0.2em] mt-0.5">
          Pipeline System
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-all duration-150 ${
                active
                  ? 'bg-edge-800/60 text-accent border border-edge-700/30'
                  : 'text-edge-400 hover:text-edge-200 hover:bg-edge-900/50'
              }`}
            >
              <Icon size={16} strokeWidth={active ? 2 : 1.5} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-edge-800/50">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-md text-sm text-edge-500 
                     hover:text-edge-300 hover:bg-edge-900/50 transition-all duration-150 w-full"
        >
          <LogOut size={16} strokeWidth={1.5} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
