"use client";

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';

// Pulse Components
import { PulseHeader } from '@/components/updates/PulseHeader';
import { PulseNavigationTabs, PulseTab } from '@/components/updates/PulseNavigationTabs';
import { TodaysBriefingView } from '@/components/updates/TodaysBriefingView';
import { TechnologyLifecycleRadar } from '@/components/updates/TechnologyLifecycleRadar';
import { OpportunitiesRadar } from '@/components/updates/OpportunitiesRadar';
import { PulseCard } from '@/components/updates/PulseCard';
import { PulseDetailDrawer } from '@/components/updates/PulseDetailDrawer';
import { PulseContextSidebar } from '@/components/updates/PulseContextSidebar';
import { BuildProjectModal } from '@/components/updates/BuildProjectModal';
import { PulsePreferencesModal } from '@/components/updates/PulsePreferencesModal';
import { PostUpdateModal } from '@/components/updates/PostUpdateModal';
import DeveloperErrorState from '@/components/ui/DeveloperErrorState';
import DeveloperEmptyState from '@/components/ui/DeveloperEmptyState';

import { 
    RefreshCw, 
    AlertCircle, 
    Sparkles, 
    Trash2, 
    Loader2, 
    Bookmark, 
    Compass, 
    Filter,
    Layers
} from 'lucide-react';
import toast from 'react-hot-toast';

function PulseContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { user, isAdmin, isStaff } = useAuth();
    const canManageUpdates = Boolean(isAdmin || isStaff);

    // Active Navigation Tab
    const tabParam = (searchParams.get('tab') as PulseTab) || 'briefing';
    const [activeTab, setActiveTab] = useState<PulseTab>(tabParam);
    const [activeCategory, setActiveCategory] = useState<string>(searchParams.get('category') || 'all');
    const [searchQuery, setSearchQuery] = useState<string>('');

    // Briefing Data State
    const [briefingData, setBriefingData] = useState<{
        date: string;
        total_recent: number;
        top_story: any | null;
        daily_developments: any[];
    }>({
        date: '',
        total_recent: 0,
        top_story: null,
        daily_developments: [],
    });

    // Feed Data States
    const [updates, setUpdates] = useState<any[]>([]);
    const [lifecycleItems, setLifecycleItems] = useState<any[]>([]);
    const [opportunities, setOpportunities] = useState<any[]>([]);
    const [savedUpdates, setSavedUpdates] = useState<any[]>([]);

    // User Preferences State
    const [followedCategories, setFollowedCategories] = useState<string[]>([]);
    const [followedTechnologies, setFollowedTechnologies] = useState<string[]>([
        'Next.js', 'Python', 'Rust', 'RISC-V', 'PyTorch'
    ]);

    // Statistics
    const [stats, setStats] = useState({
        total_count: 0,
        pinned_count: 0,
        top_story_count: 0,
        opportunities_count: 0,
        lifecycle_count: 0,
    });

    // Loading & Error States
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modals & Drawers
    const [selectedUpdate, setSelectedUpdate] = useState<any | null>(null);
    const [buildUpdate, setBuildUpdate] = useState<any | null>(null);
    const [isBuildModalOpen, setIsBuildModalOpen] = useState(false);
    const [isPreferencesModalOpen, setIsPreferencesModalOpen] = useState(false);
    const [isPostModalOpen, setIsPostModalOpen] = useState(false);
    const [editingUpdate, setEditingUpdate] = useState<any | null>(null);
    const [deletingUpdate, setDeletingUpdate] = useState<any | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // 1. Fetch Today's Briefing
    const fetchBriefing = useCallback(async () => {
        try {
            const data = await api.getPulseBriefing();
            setBriefingData(data);
        } catch (err) {
            console.error('Failed to load briefing:', err);
        }
    }, []);

    // 2. Fetch Stats
    const fetchStats = useCallback(async () => {
        try {
            const data = await api.getPlatformUpdateStats();
            setStats({
                total_count: data.total_count || 0,
                pinned_count: data.pinned_count || 0,
                top_story_count: data.top_story_count || 0,
                opportunities_count: data.opportunities_count || 0,
                lifecycle_count: data.lifecycle_count || 0,
            });
        } catch (err) {
            console.error('Failed to load stats:', err);
        }
    }, []);

    // 3. Fetch Preferences
    const fetchPreferences = useCallback(async () => {
        if (!user) return;
        try {
            const data = await api.getPulsePreferences();
            if (data) {
                if (Array.isArray(data.followed_categories)) setFollowedCategories(data.followed_categories);
                if (Array.isArray(data.followed_technologies) && data.followed_technologies.length > 0) {
                    setFollowedTechnologies(data.followed_technologies);
                }
            }
        } catch {
            // Ignore if anonymous
        }
    }, [user]);

    // 4. Fetch Primary Feed based on active tab
    const fetchFeed = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            if (activeTab === 'briefing') {
                await fetchBriefing();
            } else if (activeTab === 'lifecycle') {
                const res = await api.getPulseLifecycle({ search: searchQuery });
                const list = Array.isArray(res) ? res : res?.results || [];
                setLifecycleItems(list);
            } else if (activeTab === 'opportunities') {
                const res = await api.getPulseOpportunities({ search: searchQuery });
                const list = Array.isArray(res) ? res : res?.results || [];
                setOpportunities(list);
            } else if (activeTab === 'my_pulse') {
                const res = await api.getPlatformUpdates({ tab: 'saved', search: searchQuery });
                const list = Array.isArray(res) ? res : res?.results || [];
                setSavedUpdates(list);
            } else {
                // 'explore' tab
                const res = await api.getPlatformUpdates({
                    category: activeCategory,
                    search: searchQuery,
                });
                const list = Array.isArray(res) ? res : res?.results || [];
                setUpdates(list);
            }

            // Also load background opportunities & lifecycle for sidebar
            api.getPulseOpportunities().then((res) => {
                const list = Array.isArray(res) ? res : res?.results || [];
                setOpportunities(list);
            }).catch(() => {});

            api.getPulseLifecycle().then((res) => {
                const list = Array.isArray(res) ? res : res?.results || [];
                setLifecycleItems(list);
            }).catch(() => {});

            // Handle URL selected param
            const selectedParam = searchParams.get('selected');
            if (selectedParam && !selectedUpdate) {
                api.getPlatformUpdate(selectedParam)
                    .then((item) => setSelectedUpdate(item))
                    .catch(() => {});
            }
        } catch (err: any) {
            console.error('Failed to load pulse data:', err);
            setError(err.message || 'Failed to load intelligence feed');
        } finally {
            setLoading(false);
        }
    }, [activeTab, activeCategory, searchQuery, searchParams, fetchBriefing]);

    useEffect(() => {
        fetchFeed();
    }, [fetchFeed]);

    useEffect(() => {
        fetchStats();
        fetchPreferences();
    }, [fetchStats, fetchPreferences]);

    // Handle Tab Change
    const handleTabChange = (tab: PulseTab) => {
        setActiveTab(tab);
        const params = new URLSearchParams(window.location.search);
        params.set('tab', tab);
        router.replace(`/updates?${params.toString()}`);
    };

    // Handle Category Change
    const handleCategoryChange = (cat: string) => {
        setActiveCategory(cat);
        const params = new URLSearchParams(window.location.search);
        if (cat !== 'all') {
            params.set('category', cat);
        } else {
            params.delete('category');
        }
        router.replace(`/updates?${params.toString()}`);
    };

    // Toggle Bookmark
    const handleToggleSave = async (slugOrId: string) => {
        if (!user) {
            toast.error('Sign in to save updates to My Pulse');
            return;
        }
        try {
            const res = await api.toggleSavePulseUpdate(slugOrId);
            toast.success(res.is_saved ? 'Saved to My Pulse' : 'Removed from saved');
            // If in saved tab, refetch
            if (activeTab === 'my_pulse') {
                fetchFeed();
            }
        } catch {
            toast.error('Could not save update');
        }
    };

    // Save Preferences
    const handleSavePreferences = async (categories: string[], techs: string[]) => {
        setFollowedCategories(categories);
        setFollowedTechnologies(techs);
        if (user) {
            await api.updatePulsePreferences({
                followed_categories: categories,
                followed_technologies: techs,
            });
        }
    };

    // Open Build Task Modal
    const handleOpenBuildModal = (updateItem: any) => {
        setBuildUpdate(updateItem);
        setIsBuildModalOpen(true);
    };

    // Delete Update Handler
    const handleDeleteConfirm = async () => {
        if (!deletingUpdate) return;
        setIsDeleting(true);
        try {
            await api.deletePlatformUpdate(deletingUpdate.slug || deletingUpdate.id);
            toast.success('Update deleted');
            setDeletingUpdate(null);
            if (selectedUpdate?.id === deletingUpdate.id) {
                setSelectedUpdate(null);
            }
            fetchFeed();
            fetchStats();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete update');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#090a0f] text-zinc-100 px-4 py-8 md:px-8 max-w-7xl mx-auto">
            {/* Header with Search & Branding */}
            <PulseHeader
                isAdmin={canManageUpdates}
                totalUpdates={stats.total_count}
                pinnedCount={stats.pinned_count}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onOpenPostModal={() => {
                    setEditingUpdate(null);
                    setIsPostModalOpen(true);
                }}
                onOpenPreferencesModal={() => setIsPreferencesModalOpen(true)}
            />

            {/* Navigation Tabs (5 Connected Experiences) */}
            <PulseNavigationTabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                activeCategory={activeCategory}
                onCategoryChange={handleCategoryChange}
                totalOpportunities={stats.opportunities_count}
                totalLifecycle={stats.lifecycle_count}
                savedCount={savedUpdates.length}
            />

            {/* Error State */}
            {error && (
                <div className="mb-6">
                    <DeveloperErrorState
                        title="Pulse Ingestion Stream Interrupted"
                        message={error}
                        errorCode="ERR_STREAM_INTERRUPTED"
                        onRetry={() => { fetchFeed(); }}
                    />
                </div>
            )}

            {/* Main Adaptive Layout: 68% Content + 32% Context Sidebar */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                {/* Main Column */}
                <main className="lg:col-span-8 space-y-6">
                    {loading ? (
                        <div className="space-y-4 py-8">
                            <div className="h-44 rounded-3xl bg-[#0d1017] border border-[#1e2335] animate-pulse" />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="h-48 rounded-2xl bg-[#0d1017] border border-[#1e2335] animate-pulse" />
                                <div className="h-48 rounded-2xl bg-[#0d1017] border border-[#1e2335] animate-pulse" />
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* EXPERIENCE 1: TODAY'S BRIEFING */}
                            {activeTab === 'briefing' && (
                                <TodaysBriefingView
                                    topStory={briefingData.top_story}
                                    dailyDevelopments={briefingData.daily_developments}
                                    dateStr={briefingData.date}
                                    totalRecent={briefingData.total_recent}
                                    isAdmin={canManageUpdates}
                                    onOpenDetail={(item) => setSelectedUpdate(item)}
                                    onToggleSave={handleToggleSave}
                                    onOpenBuildModal={handleOpenBuildModal}
                                />
                            )}

                            {/* EXPERIENCE 2: EXPLORE UPDATES FEED */}
                            {activeTab === 'explore' && (
                                <div className="space-y-4">
                                    {updates.length === 0 ? (
                                        <DeveloperEmptyState
                                            title="No Dispatches Found"
                                            description="No updates match your active category and search filter."
                                            commandHint={`SELECT * FROM platform_updates WHERE category = '${activeCategory}'`}
                                            actionLabel="Reset Filters"
                                            onAction={() => {
                                                setActiveCategory('all');
                                                setSearchQuery('');
                                            }}
                                        />
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {updates.map((item) => (
                                                <PulseCard
                                                    key={item.id}
                                                    update={item}
                                                    isAdmin={canManageUpdates}
                                                    onOpenDetail={(u) => setSelectedUpdate(u)}
                                                    onEdit={(u) => {
                                                        setEditingUpdate(u);
                                                        setIsPostModalOpen(true);
                                                    }}
                                                    onDelete={(u) => setDeletingUpdate(u)}
                                                    onToggleSave={handleToggleSave}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* EXPERIENCE 3: LEARN & ADAPT (LIFECYCLE) */}
                            {activeTab === 'lifecycle' && (
                                <TechnologyLifecycleRadar
                                    items={lifecycleItems}
                                    loading={loading}
                                    onOpenDetail={(item) => setSelectedUpdate(item)}
                                />
                            )}

                            {/* EXPERIENCE 4: OPPORTUNITIES RADAR */}
                            {activeTab === 'opportunities' && (
                                <OpportunitiesRadar
                                    items={opportunities}
                                    loading={loading}
                                    onOpenDetail={(item) => setSelectedUpdate(item)}
                                />
                            )}

                            {/* EXPERIENCE 5: MY PULSE (PERSONALIZED & SAVED) */}
                            {activeTab === 'my_pulse' && (
                                <div className="space-y-6">
                                    <div className="bg-[#0d1017] border border-[#1e2335] rounded-2xl p-5 space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-mono text-[#60a5fa]">
                                            <Bookmark className="w-4 h-4 text-[#1864ff]" />
                                            <span>MY PULSE INTELLIGENCE & BOOKMARKS</span>
                                        </div>
                                        <h2 className="text-xl font-bold text-white font-mono">
                                            Your Saved Dispatches & Reading List
                                        </h2>
                                        <p className="text-xs text-zinc-400">
                                            Bookmarked technical briefs, deprecation advisories, and career opportunities saved for later study.
                                        </p>
                                    </div>

                                    {savedUpdates.length === 0 ? (
                                        <DeveloperEmptyState
                                            title="No Saved Intelligence"
                                            description="You haven't bookmarked any updates yet. Click the bookmark icon on any card to save it here."
                                            commandHint="SELECT * FROM saved_pulse_updates WHERE user_id = auth.uid()"
                                            actionLabel="Explore Today's Briefing"
                                            onAction={() => handleTabChange('briefing')}
                                        />
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {savedUpdates.map((item) => (
                                                <PulseCard
                                                    key={item.id}
                                                    update={item}
                                                    isAdmin={canManageUpdates}
                                                    onOpenDetail={(u) => setSelectedUpdate(u)}
                                                    onToggleSave={handleToggleSave}
                                                />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </main>

                {/* Right Contextual Sidebar */}
                <aside className="lg:col-span-4 sticky top-6">
                    <PulseContextSidebar
                        followedTechnologies={followedTechnologies}
                        onUpdatePreferences={async (techs) => {
                            await handleSavePreferences(followedCategories, techs);
                        }}
                        opportunities={opportunities}
                        lifecycleItems={lifecycleItems}
                        onSelectUpdate={(u) => setSelectedUpdate(u)}
                        activeTab={activeTab}
                        onTabChange={handleTabChange}
                    />
                </aside>
            </div>

            {/* 3-Level Progressive Disclosure Drawer */}
            <PulseDetailDrawer
                update={selectedUpdate}
                isOpen={Boolean(selectedUpdate)}
                onClose={() => {
                    setSelectedUpdate(null);
                    const params = new URLSearchParams(window.location.search);
                    params.delete('selected');
                    router.replace(`/updates?${params.toString()}`);
                }}
                onToggleSave={handleToggleSave}
                onOpenBuildModal={handleOpenBuildModal}
            />

            {/* Build Project Modal */}
            <BuildProjectModal
                update={buildUpdate}
                isOpen={isBuildModalOpen}
                onClose={() => setIsBuildModalOpen(false)}
            />

            {/* Preferences Modal */}
            <PulsePreferencesModal
                isOpen={isPreferencesModalOpen}
                onClose={() => setIsPreferencesModalOpen(false)}
                followedCategories={followedCategories}
                followedTechnologies={followedTechnologies}
                onSavePreferences={handleSavePreferences}
            />

            {/* Admin Studio Post/Edit Modal */}
            {canManageUpdates && (
                <PostUpdateModal
                    isOpen={isPostModalOpen}
                    onClose={() => {
                        setIsPostModalOpen(false);
                        setEditingUpdate(null);
                    }}
                    onSuccess={() => {
                        fetchFeed();
                        fetchStats();
                    }}
                    initialData={editingUpdate}
                />
            )}

            {/* Delete Confirmation Modal */}
            {deletingUpdate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
                    <div className="bg-[#0d1017] border border-[#1e2335] rounded-3xl p-6 max-w-md w-full space-y-4 text-zinc-100 shadow-2xl">
                        <div className="flex items-center gap-3 text-rose-400">
                            <div className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <h3 className="text-base font-bold text-white font-mono">
                                Delete Pulse Dispatch?
                            </h3>
                        </div>

                        <p className="text-xs text-zinc-300 leading-relaxed">
                            Are you sure you want to permanently delete <strong className="text-white">&ldquo;{deletingUpdate.title}&rdquo;</strong>? This action cannot be undone.
                        </p>

                        <div className="flex items-center justify-end gap-2 pt-2">
                            <button
                                onClick={() => setDeletingUpdate(null)}
                                className="px-4 py-2 rounded-xl text-xs font-mono text-zinc-400 hover:text-white"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteConfirm}
                                disabled={isDeleting}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-mono font-medium disabled:opacity-50 cursor-pointer"
                            >
                                {isDeleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                <span>Delete Dispatch</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function UpdatesPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-[#090a0f] flex items-center justify-center">
                <div className="text-zinc-500 font-mono text-xs animate-pulse">Loading ENQUEbet Pulse...</div>
            </div>
        }>
            <PulseContent />
        </Suspense>
    );
}
