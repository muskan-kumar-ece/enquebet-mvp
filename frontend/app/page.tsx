"use client";

import { useState, useEffect } from 'react';
import { useRequireAuth } from '@/lib/hooks/useRequireAuth';
import PostCreationBox from '@/components/feed/PostCreationBox';
import FeedTabs from '@/components/feed/FeedTabs';
import PostCard from '@/components/feed/PostCard';
import { api } from '@/lib/api';
import { FeedSkeleton } from '@/components/ui/skeletons';

export default function HomePage() {
  const { user, loading: authLoading } = useRequireAuth();
  const [activeTab, setActiveTab] = useState('public');
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
      // Map tab to view_type for API
      const viewTypes: { [key: string]: string } = {
        public: 'public',
        college: 'college',
        openidea: 'openidea',
      };

      const response = await api.getPosts({
        view_type: viewTypes[tab],
        page
      });

      if (append) {
        setPosts(prev => [...prev, ...(response.results || response)]);
      } else {
        setPosts(response.results || response);
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
      fetchPosts(activeTab);
    }
  }, [activeTab, authLoading, user]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
  };

  const handlePostCreated = () => {
    // Refresh feed after new post
    fetchPosts(activeTab);
  };

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full min-h-screen p-4 sm:p-6">
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
        <div className="card text-center py-12 mt-4">
          <div className="text-red-500 mb-2">{error}</div>
          <button onClick={() => fetchPosts(activeTab)} className="btn-primary">
            Try Again
          </button>
        </div>
      ) : posts.length === 0 ? (
        <div className="card text-center py-12 mt-4">
          <p className="text-text-secondary">
            No posts yet. Be the first to share an idea!
          </p>
        </div>
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
                onRefresh={() => fetchPosts(activeTab)}
              />
            );
          })}

          {/* Load More Button */}
          {nextPage && (
            <div className="flex justify-center pt-4">
              <button
                onClick={() => fetchPosts(activeTab, currentPage + 1, true)}
                disabled={loadingMore}
                className="btn-outline px-8"
              >
                {loadingMore ? 'Loading...' : 'Load More Posts'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
