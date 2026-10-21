"use client";

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import PostCreationBox from '@/components/feed/PostCreationBox';
import FeedTabs from '@/components/feed/FeedTabs';
import PostCard from '@/components/feed/PostCard';
import { api } from '@/lib/api';
import { autoFetchCoordinates, requestUserCoordinates, GeoCoordinates } from '@/lib/geo';
import { FeedSkeleton } from '@/components/ui/skeletons';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { Users, GraduationCap, Sparkles, Globe, Lightbulb, MapPin, RefreshCw, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function HomePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [activeTab, setActiveTab] = useState('for_you');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [coords, setCoords] = useState<GeoCoordinates | null>(null);
  const [syncingLocation, setSyncingLocation] = useState(false);

  const fetchPosts = useCallback(async (tab: string, page = 1, append = false, overrideCoords?: GeoCoordinates | null) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
    }
    setError('');

    try {
      const activeCoords = overrideCoords !== undefined ? overrideCoords : coords;
      const geoParams = activeCoords
        ? { lat: activeCoords.latitude, lng: activeCoords.longitude }
        : {};

      let response: any;
      if (tab === 'for_you') {
        response = await api.getPosts({ mode: 'for_you', page, ...geoParams });
      } else if (tab === 'following') {
        response = await api.getPosts({ mode: 'following', page, ...geoParams });
      } else {
        // Legacy view_types: public, college, openidea
        response = await api.getPosts({ view_type: tab, page, ...geoParams });
      }

      const incomingItems = response.results || (Array.isArray(response) ? response : []);

      if (append) {
        // Prevent duplicate cards when paginating
        setPosts((prev) => {
          const existingIds = new Set(prev.map((p) => p.id));
          const uniqueItems = incomingItems.filter((p: any) => !existingIds.has(p.id));
          return [...prev, ...uniqueItems];
        });
      } else {
        setPosts(incomingItems);
      }

      // Handle pagination
      setNextPage(response.next || null);
      setCurrentPage(page);
    } catch (err: any) {
      setError(err.message || 'Failed to load posts');
      if (!append) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [coords]);

  // Load cached coordinates or silently sync if browser permission is already granted.
  // NEVER triggers an unsolicited browser permission dialog on mount.
  useEffect(() => {
    autoFetchCoordinates().then((c) => {
      if (c) {
        setCoords(c);
      }
    });
  }, []);

  const handleDetectOrSyncLocation = async () => {
    setSyncingLocation(true);
    try {
      const resolved = await requestUserCoordinates({ forceRefresh: true });
      if (resolved) {
        setCoords(resolved);
        fetchPosts(activeTab, 1, false, resolved);
        toast.success(resolved.city ? `Location: ${resolved.city}` : 'GPS coordinates captured');
      } else {
        toast.error('Location permission was denied or unavailable');
      }
    } catch {
      toast.error('Could not detect location');
    } finally {
      setSyncingLocation(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchPosts(activeTab, 1, false);
    }
  }, [activeTab, authLoading, user, fetchPosts]);

  const handleTabChange = (tab: string) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setPosts([]);
    setCurrentPage(1);
    setNextPage(null);
  };

  const handlePostCreated = () => {
    // Refresh feed after new post
    fetchPosts(activeTab, 1, false);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary animate-pulse text-sm">Loading feed...</div>
      </div>
    );
  }

  // Render contextual empty states based on the active tab
  const renderEmptyState = () => {
    if (activeTab === 'following') {
      return (
        <div className="card text-center py-12 px-6 mt-4 border border-border-default">
          <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-3 text-brand-light">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-primary mb-1">Your Following Feed is Empty</h3>
          <p className="text-text-secondary text-sm max-w-sm mx-auto mb-5 leading-relaxed">
            You haven&apos;t followed any builders yet. Follow builders to track their projects and ideas right here.
          </p>
          <div className="flex justify-center gap-3">
            <button onClick={() => handleTabChange('for_you')} className="btn-primary text-xs px-5 py-2">
              Explore For You
            </button>
            <Link href="/search" className="btn-outline text-xs px-5 py-2">
              Find Builders
            </Link>
          </div>
        </div>
      );
    }

    if (activeTab === 'college') {
      const hasCollege = Boolean(user?.college && user.college.trim().length > 0);
      return (
        <div className="card text-center py-12 px-6 mt-4 border border-border-default">
          <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-3 text-primary">
            <GraduationCap className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-primary mb-1">
            {hasCollege ? `No posts from ${user?.college} yet` : 'No College Specified'}
          </h3>
          <p className="text-text-secondary text-sm max-w-sm mx-auto mb-5 leading-relaxed">
            {hasCollege
              ? 'Be the first from your campus to share an idea or project with fellow students!'
              : 'Add your university in your profile settings to view and collaborate on campus projects.'}
          </p>
          {!hasCollege ? (
            <Link href="/profile" className="btn-primary text-xs px-5 py-2 inline-flex items-center gap-1.5">
              <span>Add College to Profile</span>
            </Link>
          ) : (
            <button onClick={() => handleTabChange('public')} className="btn-outline text-xs px-5 py-2">
              Browse Public Feed
            </button>
          )}
        </div>
      );
    }

    if (activeTab === 'for_you') {
      return (
        <div className="card text-center py-12 px-6 mt-4 border border-border-default">
          <div className="w-12 h-12 rounded-full bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center mx-auto mb-3 text-brand-light">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-text-primary mb-1">No Recommended Projects Yet</h3>
          <p className="text-text-secondary text-sm max-w-sm mx-auto mb-5 leading-relaxed">
            Add skills and interests to your builder profile to receive personalized project recommendations!
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/profile" className="btn-primary text-xs px-5 py-2">
              Complete Profile
            </Link>
            <button onClick={() => handleTabChange('public')} className="btn-outline text-xs px-5 py-2">
              View Public Posts
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="card text-center py-12 px-6 mt-4 border border-border-default">
        <p className="text-text-secondary text-sm">No posts yet. Be the first to share a project or idea!</p>
      </div>
    );
  };

  return (
    <div className="flex flex-col w-full min-h-screen p-4 sm:p-6 pb-24 bg-blueprint-grid">
      {/* Platform Brand Dock */}
      <div className="flex items-center justify-between mb-5 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <BrandLogo size="sm" mode="vector" withText={true} />
          <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wider text-zinc-400 bg-white/[0.04] border border-white/[0.08] rounded-full">
            Mainnet Feed
          </span>
        </div>
        <div className="flex items-center gap-2">
          {coords ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-[#121522] border border-[#23283c] text-zinc-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{coords.city || 'Nearby Active'}</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.06]">
              Discovery Protocol
            </span>
          )}
        </div>
      </div>

      {/* Post Creation Box */}
      <PostCreationBox onPostCreated={handlePostCreated} />

      {/* Sticky Feed Tabs */}
      <div className="sticky top-14 lg:top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-[#090a0f]/90 backdrop-blur-md border-b border-[#1b2030] py-2 mt-4">
        <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />

        {/* Location Status Banner */}
        {coords ? (
          <div className="flex items-center justify-between text-xs text-zinc-400 px-3 py-2 mt-2.5 bg-[#0f111a] border border-[#1e2335] rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-zinc-300 truncate">
              <span className="w-2 h-2 rounded-full bg-[#1864ff] shrink-0 animate-pulse" />
              <span className="truncate text-xs">
                Local telemetry active · Projects near <strong className="text-white font-semibold">{coords.city || `${coords.latitude}, ${coords.longitude}`}</strong>
              </span>
            </div>
            <button
              type="button"
              onClick={handleDetectOrSyncLocation}
              disabled={syncingLocation}
              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1.5 transition-all px-2.5 py-1 rounded-lg hover:bg-white/[0.05] active:bg-white/[0.08] active:scale-95 border border-transparent hover:border-zinc-800 shrink-0 ml-2 font-mono disabled:opacity-50 select-none touch-manipulation cursor-pointer"
              title="Refresh GPS Location"
            >
              {syncingLocation ? (
                <Loader2 className="w-3 h-3 animate-spin text-[#1864ff]" />
              ) : (
                <RefreshCw className="w-3 h-3" />
              )}
              Sync
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-between text-xs px-3 py-2 mt-2.5 bg-[#0f111a] border border-[#1e2335] rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-zinc-300 truncate">
              <MapPin className="w-3.5 h-3.5 text-[#4f8fff] shrink-0" />
              <span className="truncate text-xs">Prioritize collegiate & regional builder ventures</span>
            </div>
            <button
              type="button"
              onClick={handleDetectOrSyncLocation}
              disabled={syncingLocation}
              className="btn-primary text-[11px] px-3 py-1 shrink-0 font-medium ml-2 flex items-center gap-1.5 disabled:opacity-50"
            >
              {syncingLocation ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : null}
              Detect Location
            </button>
          </div>
        )}
      </div>

      {/* Posts Feed */}
      {loading ? (
        <FeedSkeleton count={3} />
      ) : error ? (
        <div className="card text-center py-12 mt-4 border border-border-default">
          <div className="text-red-400 mb-3 text-sm">{error}</div>
          <button onClick={() => fetchPosts(activeTab, 1, false)} className="btn-primary text-xs px-5 py-2">
            Try Again
          </button>
        </div>
      ) : posts.length === 0 ? (
        renderEmptyState()
      ) : (
        <div className="flex flex-col gap-4 md:gap-6 w-full mt-4">
          {posts.map((post) => {
            const imageAttachments: string[] = (post.attachments || [])
              .filter((a: any) => a.file_type === 'image' && a.file_url)
              .map((a: any) => a.file_url);

            const directImage = post.image || post.image_url || (typeof post.media === 'string' ? post.media : undefined);
            const allImages = imageAttachments.length > 0
              ? imageAttachments
              : (directImage ? [directImage] : []);

            return (
              <PostCard
                key={post.id}
                id={post.id}
                author={post.user?.full_name || post.user?.username || 'Anonymous'}
                authorAvatar={post.user?.avatar_url || post.user?.profile_image}
                timeAgo={new Date(post.created_at).toLocaleDateString()}
                title={post.title}
                description={post.description}
                tags={post.tags || []}
                requirements={post.requirements || []}
                likes={post.likes_count || 0}
                comments={post.comments_count || 0}
                is_liked={post.is_liked || false}
                is_saved={post.is_saved || false}
                images={allImages}
                image={allImages[0]}
                city={post.city}
                distance_km={post.distance_km}
                is_remote={post.is_remote}
                view_type={post.view_type}
                college={post.college}
                category={post.category}
                onRefresh={() => fetchPosts(activeTab, currentPage, false)}
              />
            );
          })}

          {/* Load More Button */}
          {nextPage && (
            <div className="flex justify-center pt-4">
              <button
                type="button"
                onClick={() => fetchPosts(activeTab, currentPage + 1, true)}
                disabled={loadingMore}
                data-loading={loadingMore}
                aria-busy={loadingMore}
                className="btn-outline px-8 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 select-none touch-manipulation"
              >
                {loadingMore && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0 text-white" />}
                <span>{loadingMore ? 'Loading More Posts...' : 'Load More Posts'}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
