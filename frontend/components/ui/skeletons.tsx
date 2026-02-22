export function PostCardSkeleton() {
    return (
        <div className="card animate-pulse">
            {/* Header skeleton */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-bg-hover shrink-0"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-bg-hover rounded w-32"></div>
                    <div className="h-3 bg-bg-hover rounded w-24"></div>
                </div>
            </div>

            {/* Content skeleton */}
            <div className="space-y-3 mb-4">
                <div className="h-6 bg-bg-hover rounded w-3/4"></div>
                <div className="h-4 bg-bg-hover rounded w-full"></div>
                <div className="h-4 bg-bg-hover rounded w-5/6"></div>
            </div>

            {/* Tags skeleton */}
            <div className="flex gap-2 mb-4">
                <div className="h-6 bg-bg-hover rounded-full w-16"></div>
                <div className="h-6 bg-bg-hover rounded-full w-20"></div>
                <div className="h-6 bg-bg-hover rounded-full w-14"></div>
            </div>

            {/* Actions skeleton */}
            <div className="flex items-center gap-6 pt-4 border-t border-border-default">
                <div className="h-5 bg-bg-hover rounded w-12"></div>
                <div className="h-5 bg-bg-hover rounded w-12"></div>
                <div className="h-5 bg-bg-hover rounded w-16"></div>
            </div>
        </div>
    );
}

export function FeedSkeleton({ count = 3 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array.from({ length: count }).map((_, i) => (
                <PostCardSkeleton key={i} />
            ))}
        </div>
    );
}

export function CommentSkeleton() {
    return (
        <div className="flex gap-3 animate-pulse">
            <div className="w-10 h-10 rounded-full bg-bg-hover shrink-0"></div>
            <div className="flex-1 space-y-2">
                <div className="bg-bg-hover rounded-lg p-4">
                    <div className="h-4 bg-bg-card rounded w-24 mb-2"></div>
                    <div className="h-3 bg-bg-card rounded w-full"></div>
                    <div className="h-3 bg-bg-card rounded w-3/4 mt-1"></div>
                </div>
                <div className="h-3 bg-bg-hover rounded w-20 ml-4"></div>
            </div>
        </div>
    );
}

export function NotificationSkeleton() {
    return (
        <div className="card animate-pulse">
            <div className="flex gap-4">
                <div className="w-6 h-6 bg-bg-hover rounded shrink-0 mt-1"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-bg-hover rounded w-3/4"></div>
                    <div className="h-3 bg-bg-hover rounded w-32"></div>
                </div>
                <div className="w-2 h-2 bg-bg-hover rounded-full shrink-0 mt-2"></div>
            </div>
        </div>
    );
}

export function ConversationSkeleton() {
    return (
        <div className="p-4 border-b border-border-default animate-pulse">
            <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-full bg-bg-hover shrink-0"></div>
                <div className="flex-1 space-y-2">
                    <div className="h-4 bg-bg-hover rounded w-32"></div>
                    <div className="h-3 bg-bg-hover rounded w-48"></div>
                </div>
            </div>
        </div>
    );
}

export function ProfileSkeleton() {
    return (
        <div className="card animate-pulse">
            <div className="flex flex-col items-center">
                {/* Profile Picture */}
                <div className="w-32 h-32 rounded-full bg-bg-hover mb-4"></div>

                {/* Name */}
                <div className="h-8 bg-bg-hover rounded w-48 mb-2"></div>
                <div className="h-4 bg-bg-hover rounded w-32 mb-4"></div>
                <div className="h-4 bg-bg-hover rounded w-64 mb-4"></div>

                {/* Location & College */}
                <div className="flex gap-4 mb-6">
                    <div className="h-4 bg-bg-hover rounded w-28"></div>
                    <div className="h-4 bg-bg-hover rounded w-36"></div>
                </div>

                {/* Stats */}
                <div className="flex gap-8 mb-6">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="text-center">
                            <div className="h-8 bg-bg-hover rounded w-12 mb-1"></div>
                            <div className="h-3 bg-bg-hover rounded w-16"></div>
                        </div>
                    ))}
                </div>

                {/* Skills */}
                <div className="w-full mb-6">
                    <div className="h-5 bg-bg-hover rounded w-20 mb-3"></div>
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-6 bg-bg-hover rounded-full w-20"></div>
                        ))}
                    </div>
                </div>

                {/* Button */}
                <div className="h-10 bg-bg-hover rounded w-32"></div>
            </div>
        </div>
    );
}
