"use client";

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import RightPanel from '@/components/layout/RightPanel';
import MobileBottomNav from '@/components/layout/MobileBottomNav';
import { useNavigationUI } from '@/lib/contexts/NavigationContext';

/** Routes that should render without the sidebar chrome. */
const BARE_ROUTES = ['/auth/login', '/auth/register'];

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { hideMobileNav } = useNavigationUI();
    const isBare = BARE_ROUTES.some((r) => pathname?.startsWith(r));

    if (isBare) {
        return <>{children}</>;
    }

    // RightPanel is strictly reserved for the Home social feed
    const showRightPanel = pathname === '/';

    return (
        <div className="flex min-h-screen">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content — responsive margins; right margin only on Home feed */}
            <main className={`flex-1 min-w-0 pt-14 ${hideMobileNav ? 'pb-0' : 'pb-16'} lg:pt-0 lg:pb-0 lg:ml-64 ${showRightPanel ? 'xl:mr-80' : ''}`}>
                {children}
            </main>

            {/* Right Panel — rendered ONLY on Home page */}
            {showRightPanel && (
                <div className="hidden xl:block">
                    <RightPanel />
                </div>
            )}

            {/* Mobile Bottom Navigation */}
            {!hideMobileNav && <MobileBottomNav />}
        </div>
    );
}
