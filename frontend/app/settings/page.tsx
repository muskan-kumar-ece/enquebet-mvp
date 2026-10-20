"use client";

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import toast from 'react-hot-toast';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';
import { BrandLogo } from '@/components/ui/BrandLogo';

import { SettingsNav, SettingsTab } from '@/components/settings/SettingsNav';
import { AccountSection } from '@/components/settings/AccountSection';
import { SecuritySection } from '@/components/settings/SecuritySection';
import { TimeManagementSection } from '@/components/settings/TimeManagementSection';
import { ProfessionalDashboardSection } from '@/components/settings/ProfessionalDashboardSection';
import { SavedItemsSection } from '@/components/settings/SavedItemsSection';
import { SafetySection } from '@/components/settings/SafetySection';
import { AboutSection } from '@/components/settings/AboutSection';
import { LegalSection } from '@/components/settings/LegalSection';
import { DangerZoneModal } from '@/components/settings/DangerZoneModal';

function SettingsContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user, loading: authLoading } = useRequireAuth();
    const { logout, updateUser } = useAuth();

    const paramTab = (searchParams.get('tab') as SettingsTab) || 'account';
    const validTabs: SettingsTab[] = [
        'account', 'security', 'time', 'professional', 
        'saved', 'safety', 'about', 'legal', 'danger'
    ];
    const activeTab: SettingsTab = validTabs.includes(paramTab) ? paramTab : 'account';

    const handleSelectTab = (tab: SettingsTab) => {
        const url = tab === 'account' ? '/settings' : `/settings?tab=${tab}`;
        router.replace(url, { scroll: false });
    };

    const handleUpdateUser = async (data: any) => {
        const updated = await api.updateMe(data);
        updateUser(updated);
    };

    const handleUpdateAvailability = async (status: string) => {
        const updated = await api.updateMe({ availability_status: status });
        updateUser(updated);
    };

    const handleLogout = async (allDevices: boolean = false) => {
        try {
            if (allDevices) {
                await api.revokeAllOtherSessions();
            }
            await logout();
        } catch {
            try {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
            } catch {
                // ignore
            }
        }
        toast.success(allDevices ? 'Signed out from all devices' : 'Signed out');
        router.push('/auth/login');
    };

    const handleAccountDeleted = async () => {
        try {
            await logout();
        } catch {
            try {
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                localStorage.removeItem('user');
            } catch {
                // ignore
            }
        }
        router.push('/auth/register');
    };

    const handlePostsDeleted = () => {
        // Refresh or notify
    };

    if (authLoading || !user) {
        return (
            <div className="min-h-screen bg-[#08090E] flex items-center justify-center">
                <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span className="w-2 h-2 rounded-full bg-[#1864ff] animate-ping" />
                    <span>Loading settings ecosystem...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#08090E] text-slate-100">
            {/* Background Grid */}
            <div className="fixed inset-0 bg-blueprint-grid opacity-15 pointer-events-none" />

            <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
                {/* Top Brand Dock */}
                <div className="p-4 rounded-2xl bg-[#0B0D14]/90 border border-[#1E2335] backdrop-blur-md flex items-center justify-between shadow-lg">
                    <BrandLogo size="sm" mode="vector" withText={true} />

                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 hidden sm:inline-block">
                            Logged in as:
                        </span>
                        <span className="text-xs font-bold text-white font-mono px-2 py-0.5 rounded bg-surface border border-border">
                            @{user.username}
                        </span>
                    </div>
                </div>

                {/* Master Layout: Sidebar + Active Section */}
                <div className="flex flex-col lg:flex-row gap-6 items-start">
                    {/* Left Navigation */}
                    <SettingsNav
                        activeTab={activeTab}
                        onSelectTab={handleSelectTab}
                    />

                    {/* Right Active Panel */}
                    <main className="flex-1 w-full min-w-0 bg-[#08090E] rounded-2xl">
                        {activeTab === 'account' && (
                            <AccountSection
                                user={user}
                                onUpdateUser={handleUpdateUser}
                                onLogout={handleLogout}
                            />
                        )}

                        {activeTab === 'security' && (
                            <SecuritySection />
                        )}

                        {activeTab === 'time' && (
                            <TimeManagementSection
                                user={user}
                                onUpdateUser={handleUpdateUser}
                            />
                        )}

                        {activeTab === 'professional' && (
                            <ProfessionalDashboardSection
                                user={user}
                                onUpdateAvailability={handleUpdateAvailability}
                            />
                        )}

                        {activeTab === 'saved' && (
                            <SavedItemsSection />
                        )}

                        {activeTab === 'safety' && (
                            <SafetySection
                                user={user}
                                onUpdateUser={handleUpdateUser}
                            />
                        )}

                        {activeTab === 'about' && (
                            <AboutSection />
                        )}

                        {activeTab === 'legal' && (
                            <LegalSection />
                        )}

                        {activeTab === 'danger' && (
                            <DangerZoneModal
                                onAccountDeleted={handleAccountDeleted}
                                onPostsDeleted={handlePostsDeleted}
                            />
                        )}
                    </main>
                </div>
            </div>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#08090E] flex items-center justify-center">
                <div className="text-xs text-text-secondary">Loading settings...</div>
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}
