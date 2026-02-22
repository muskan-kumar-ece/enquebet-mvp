"use client";

import { Home, Search, Plus, MessageSquare, Bell, User } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';

const bottomNavItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Search', href: '/search' },
    { icon: Plus, label: 'Post', href: '/create' },
    { icon: MessageSquare, label: 'Chat', href: '/messages' },
    { icon: Bell, label: 'Alerts', href: '/notifications' },
    { icon: User, label: 'Profile', href: '/profile' },
];

export default function MobileBottomNav() {
    const pathname = usePathname();
    const { unreadCount } = useWebSocket();

    return (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-md border-t border-border-default safe-area-bottom">
            <div className="flex items-center justify-around h-14">
                {bottomNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 rounded-lg transition-colors ${
                                isActive
                                    ? 'text-purple'
                                    : 'text-text-muted hover:text-text-primary'
                            }`}
                        >
                            <span className="relative">
                                <Icon className="w-5 h-5" />
                                {item.href === '/notifications' && unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1.5 bg-purple text-white text-[8px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </span>
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </Link>
                    );
                })}
            </div>
        </nav>
    );
}
