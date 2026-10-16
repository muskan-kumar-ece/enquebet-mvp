"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import PostCreationBox from '@/components/feed/PostCreationBox';
import FeedTabs from '@/components/feed/FeedTabs';
import PostCard from '@/components/feed/PostCard';
import { api } from '@/lib/api';
import { FeedSkeleton } from '@/components/ui/skeletons';
import { Users, GraduationCap, Sparkles, Globe, Lightbulb } from 'lucide-react';

export default function HomePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [activeTab, setActiveTab] = useState('for_you');
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState('');
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const fetchPosts = async (tab: string, page = 1, append = false) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      setCurrentPage(1);
    }
    setError('');

    try {
      let response: any;
      if (tab === 'for_you') {
        response = await api.getPosts({ mode: 'for_you', page });
      } else if (tab === 'following') {
        response = await api.getPosts({ mode: 'following', page });
      } else {
        // Legacy view_types: public, college, openidea
        response = await api.getPosts({ view_type: tab, page });
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
  };

  useEffect(() => {
    if (!authLoading && user) {
      fetchPosts(activeTab, 1, false);
    }
  }, [activeTab, authLoading, user]);

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
          <div className="w-12 h-12 rounded-full bg-purple/10 border border-purple/20 flex items-center justify-center mx-auto mb-3 text-purple-light">
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
          <div className="w-12 h-12 rounded-full bg-purple/10 border border-purple/20 flex items-center justify-center mx-auto mb-3 text-purple-light">
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
    <div className="flex flex-col w-full min-h-screen p-4 sm:p-6 pb-24">
      {/* Post Creation Box */}
      <PostCreationBox onPostCreated={handlePostCreated} />

      {/* Sticky Feed Tabs */}
      <div className="sticky top-14 lg:top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-[#0b0b10]/80 backdrop-blur-md border-b border-[#252533] py-2">
        <FeedTabs activeTab={activeTab} onTabChange={handleTabChange} />
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
            const imageUrl =
              post.image ||
              post.image_url ||
              post.media ||
              (post.attachments && post.attachments.length > 0
                ? post.attachments.find((a: any) => a.file_type === 'image')?.file_url
                : undefined);

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
                likes={post.likes_count || 0}
                comments={post.comments_count || 0}
                is_liked={post.is_liked || false}
                is_saved={post.is_saved || false}
                image={imageUrl}
                onRefresh={() => fetchPosts(activeTab, currentPage, false)}
              />
            );
          })}

          {/* Load More Button */}
          {nextPage && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchPosts(activeTab, currentPage + 1, true)}
                disabled={loadingMore}
                className="btn-outline px-8 py-2.5 text-xs font-semibold"
              >
                {loadingMore ? 'Loading More...' : 'Load More Posts'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
