"use client";

import { Home, Search, Plus, MessageSquare, Bell, User, Bot, GraduationCap, Download, ShoppingCart, FileText, Settings, Users, Menu, X, Kanban, Activity } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWebSocket } from '@/lib/contexts/WebSocketContext';
import { useState, useEffect } from 'react';
import { BrandLogo } from '@/components/ui/BrandLogo';

const coreNavItems = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Search', href: '/search' },
    { icon: Plus, label: 'Post', href: '/create' },
    { icon: MessageSquare, label: 'Messages', href: '/messages' },
    { icon: Bell, label: 'Notifications', href: '/notifications' },
    { icon: Users, label: 'Build With', href: '/collaboration' },
    { icon: Kanban, label: 'Workspaces', href: '/workspaces' },
    { icon: User, label: 'Profile', href: '/profile' },
];

const extraNavItems = [
    { icon: Bot, label: 'Quebet AI', href: '/ai' },
    { icon: GraduationCap, label: 'Courses', href: '/courses' },
    { icon: Download, label: 'Resources', href: '/resources' },
    { icon: Activity, label: 'Pulse', href: '/updates' },
    { icon: ShoppingCart, label: 'Shop', href: '/shop' },
    { icon: FileText, label: 'Research', href: '/research' },
];

export default function Sidebar() {
    const pathname = usePathname();
    const { unreadCount } = useWebSocket();
    const [mobileOpen, setMobileOpen] = useState(false);
    const [prevPathname, setPrevPathname] = useState(pathname);

    // Close mobile sidebar on route change
    if (pathname !== prevPathname) {
        setPrevPathname(pathname);
        setMobileOpen(false);
    }

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
                    <Icon className={`w-5 h-5 ${isActive ? 'text-brand-light' : ''}`} />
                    {item.href === '/notifications' && unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-brand-primary text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center leading-none ring-2 ring-bg-primary">
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
            <div className="p-4 sm:p-5 pb-3 sm:pb-4 flex items-center justify-between shrink-0 border-b border-border-default/40">
                <Link href="/" className="flex items-center gap-3 group" onClick={() => setMobileOpen(false)}>
                    <BrandLogo size="md" mode="vector" />
                    <div>
                        <div className="text-lg font-black tracking-tight text-white flex items-center">
                            <span>ENQUE</span>
                            <span className="text-[#1864FF] font-black ml-0.5">
                                bet
                            </span>
                        </div>
                        <span className="block text-[10px] text-zinc-500 font-mono font-medium tracking-wider uppercase -mt-0.5">Build Together</span>
                    </div>
                </Link>

                {/* Close button — mobile only */}
                <button
                    type="button"
                    onClick={() => setMobileOpen(false)}
                    className="lg:hidden p-2 rounded-lg hover:bg-bg-hover active:bg-bg-hover-light active:scale-90 text-text-muted transition-all select-none touch-manipulation cursor-pointer"
                    aria-label="Close menu"
                >
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Core Navigation */}
            <nav className="px-3 py-2 space-y-0.5 flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {coreNavItems.map(renderNavItem)}

                {/* Divider */}
                <div className="py-3">
                    <div className="border-t border-border-default" />
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-semibold mt-3 mb-1 px-3">Explore</p>
                </div>

                {extraNavItems.map(renderNavItem)}
            </nav>

            {/* Settings */}
            <div className="p-3 shrink-0 border-t border-border-default bg-bg-primary pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <Link
                    href="/settings"
                    className={`nav-item ${pathname === '/settings' ? 'nav-item-active' : ''}`}
                    onClick={() => setMobileOpen(false)}
                >
                    <Settings className={`w-5 h-5 ${pathname === '/settings' ? 'text-brand-light' : ''}`} />
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
                    type="button"
                    onClick={() => setMobileOpen(true)}
                    className="p-2 -ml-2 rounded-lg hover:bg-bg-hover active:bg-bg-hover-light active:scale-90 transition-all select-none touch-manipulation cursor-pointer"
                    aria-label="Open menu"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <Link href="/" className="flex items-center gap-2">
                    <BrandLogo size="sm" mode="vector" />
                    <div className="font-black text-sm tracking-tight text-white flex items-center">
                        <span>ENQUE</span>
                        <span className="text-[#1864FF] ml-0.5">bet</span>
                    </div>
                </Link>

                {/* Notification badge on mobile bar */}
                {unreadCount > 0 && (
                    <Link href="/notifications" className="ml-auto relative p-2">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-1 right-1 bg-brand-primary text-white text-[9px] font-bold rounded-full w-3.5 h-3.5 flex items-center justify-center leading-none">
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
                    fixed left-0 top-0 h-[100dvh] w-64 bg-bg-primary border-r border-border-default overflow-hidden flex flex-col z-50
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
