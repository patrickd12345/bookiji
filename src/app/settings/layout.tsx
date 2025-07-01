'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: '👤'
  },
  {
    title: 'Notifications',
    href: '/settings/notifications',
    icon: '🔔'
  },
  {
    title: 'Beta Program',
    href: '/settings/beta-program',
    icon: '⚡'
  },
  {
    title: 'Privacy & Security',
    href: '/settings/privacy',
    icon: '🔒'
  },
  {
    title: 'Preferences',
    href: '/settings/preferences',
    icon: '⚙️'
  }
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white border-r border-gray-200">
        <div className="p-6">
          <h2 className="text-2xl font-bold text-gray-800">Settings</h2>
        </div>
        <nav className="px-4 pb-6">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center px-4 py-3 mb-1 text-sm rounded-lg transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="mr-3">{item.icon}</span>
                {item.title}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 py-6">
        {children}
      </div>
    </div>
  );
} 