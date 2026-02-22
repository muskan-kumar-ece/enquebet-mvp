"use client";

import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import RightPanel from '@/components/layout/RightPanel';
import MobileBottomNav from '@/components/layout/MobileBottomNav';

/** Routes that should render without the sidebar chrome. */
const BARE_ROUTES = ['/auth/login', '/auth/register'];

export function LayoutShell({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isBare = BARE_ROUTES.some((r) => pathname?.startsWith(r));

    if (isBare) {
        return <>{children}</>;
    }

    return (
        <div className="flex min-h-screen">
            {/* Left Sidebar */}
            <Sidebar />

            {/* Main Content — responsive margins */}
            <main className="flex-1 pt-14 pb-16 lg:pt-0 lg:pb-0 lg:ml-64 xl:mr-80">
                {children}
            </main>

            {/* Right Panel — hidden on smaller screens */}
            <div className="hidden xl:block">
                <RightPanel />
            </div>

            {/* Mobile Bottom Navigation */}
            <MobileBottomNav />
        </div>
    );
}
