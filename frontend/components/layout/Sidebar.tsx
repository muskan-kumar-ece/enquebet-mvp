"use client";

import { Home, Search, Plus, MessageSquare, Bell, User, Bot, GraduationCap, Download, RefreshCw, ShoppingCart, FileText, Settings, Users, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import { useState, useEffect } from 'react';

const coreNavItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Search', href: '/search' },
    { icon: Plus, label: 'Post', href: '/create' },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: Users, label: 'Build With', href: '/collaboration' },
    { icon: User, label: 'Profile', href: '/profile' },
];

const extraNavItems = [
    { icon: Bot, label: 'Quebet AI', href: '/ai' },
    { icon: GraduationCap, label: 'Courses', href: '/courses' },
    { icon: Download, label: 'Resources', href: '/resources' },
    { icon: RefreshCw, label: 'Updates', href: '/updates' },
    { icon: ShoppingCart, label: 'Shop', href: '/shop' },
    { icon: FileText, label: 'Research', href: '/research' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { unreadCount } = useWebSocket();
    const [mobileOpen, setMobileOpen] = useState(false);

    // Close mobile sidebar on route change
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Prevent body scroll when mobile sidebar is open
    useEffect(() => {
        if (mobileOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => { document.body.style.overflow = ''; };
    }, [mobileOpen]);

    const renderNavItem = (item: typeof coreNavItems[0]) => {
        const Icon = item.icon;
        const isActive = pathname === item.href;

        return (
            <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
                onClick={() => setMobileOpen(false)}
            >
                <span className="relative">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-purple' : ''}`} />
                    {item.href === '/notifications' && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-purple text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none ring-2 ring-bg-primary">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </span>
                <span>{item.label}</span>
            </Link>
        );
    };

    const sidebarContent = (
        <>
            {/* Logo */}
            <div className="p-5 pb-4 flex items-center justify-between">
                <Link href="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
                    <div className="w-10 h-10 bg-gradient-to-br from-purple to-purple-dark rounded-xl flex items-center justify-center shadow-lg shadow-purple/20 group-hover:shadow-purple/30 transition-shadow">
                        <span className="text-xl font-black tracking-tight text-white">E</span>
                    </div>
                    <div>
                        <span className="text-lg font-bold tracking-tight">ENQUEbet</span>
                        <span className="block text-[10px] text-text-muted font-medium tracking-wider uppercase -mt-0.5">Build Together</span>
                    </div>
                </Link>

                {/* Close button — mobile only */}
                <button
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden p-2 rounded-lg hover:bg-bg-hover text-text-muted transition-colors"
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Core Navigation */}
            <nav className="px-3 space-y-0.5 flex-1">
                {coreNavItems.map(renderNavItem)}

                {/* Divider */}
                <div className="py-3">
                    <div className="border-t border-border-default" />
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mt-3 mb-1 px-3">Explore</p>
                </div>

                {extraNavItems.map(renderNavItem)}
            </nav>

            {/* Settings */}
            <div className="p-3 mt-auto border-t border-border-default">
                <Link
                    href="/settings"
                    className={`nav-item ${pathname === '/settings' ? 'nav-item-active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                >
                    <Settings className={`w-5 h-5 ${pathname === '/settings' ? 'text-purple' : ''}`} />
                    <span>Settings</span>
                </Link>
            </div>
        </>
    );

    return (
        <>
            {/* Mobile top bar */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-bg-primary/95 backdrop-blur-md border-b border-border-default h-14 flex items-center px-4 gap-3">
                <button
                    onClick={() => setMobileOpen(true)}
                    className="p-2 -ml-2 rounded-lg hover:bg-bg-hover transition-colors"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <Link href="/" className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple to-purple-dark rounded-lg flex items-center justify-center">
                        <span className="text-sm font-black text-white">E</span>
                    </div>
                    <span className="font-bold text-base">ENQUEbet</span>
                </Link>

                {/* Notification badge on mobile bar */}
                {unreadCount > 0 && (
                    <Link href="/notifications" className="ml-auto relative p-2">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 bg-purple text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    </Link>
                )}
            </div>

            {/* Mobile overlay */}
            {mobileOpen && (
                <div
                    className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                    onClick={() => setMobileOpen(false)}
                />
            )}

            {/* Sidebar — desktop: always visible; mobile: slide-in drawer */}
            <aside
                className={`
                    fixed left-0 top-0 h-screen w-64 bg-bg-primary border-r border-border-default overflow-y-auto flex flex-col z-50
                    transition-transform duration-300 ease-in-out
                    lg:translate-x-0 lg:z-30
                    ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
                `}
            >
                {sidebarContent}
            </aside>
        </>
    );
}
