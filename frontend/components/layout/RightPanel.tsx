"use client";

import { useState, useEffect } from 'react';
import { MapPin, GraduationCap, Bell, Users } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/lib/contexts/AuthContext';
import { api } from '@/lib/api';

export default function RightPanel() {
    const { user, loading: authLoading } = useAuth();
    const [notifications, setNotifications] = useState<any[]>([]);
    const [loadingNotifs, setLoadingNotifs] = useState(true);

    useEffect(() => {
        if (!authLoading && user) {
            api.getNotifications()
                .then((data) => setNotifications(Array.isArray(data) ? data.slice(0, 5) : []))
                .catch(() => setNotifications([]))
                .finally(() => setLoadingNotifs(false));
        } else {
            setLoadingNotifs(false);
        }
    }, [authLoading, user]);

    // Build bio parts from real user fields
    const bioParts: string[] = [];
    if (user?.bio) bioParts.push(user.bio);
    if (user?.college) bioParts.push(user.college);
    if (user?.location) bioParts.push(user.location);

    const displayBio = bioParts.length > 0 ? bioParts.join(' | ') : null;
    const skills = user?.skills && user.skills.length > 0 ? user.skills : null;

    // Initials for avatar fallback
    const initials = user?.full_name
        ? user.full_name.split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2)
        : user?.username?.slice(0, 2).toUpperCase() || '?';

    return (
        <aside className="fixed right-0 top-0 h-screen w-80 bg-bg-primary border-l border-border-default overflow-y-auto hidden xl:block">
            <div className="p-5 space-y-5">
                {/* Profile Card — real user data */}
                <div className="card relative overflow-hidden">
                    {/* Subtle gradient background */}
                    <div className="absolute inset-0 bg-gradient-to-b from-purple/5 to-transparent pointer-events-none" />
                    <div className="relative flex flex-col items-center">
                        {user?.avatar_url || user?.profile_image ? (
                            <img
                                src={user.avatar_url || user.profile_image}
                                alt={user.full_name || user.username}
                                className="w-20 h-20 rounded-full mb-3 border-4 border-purple/20 object-cover shadow-lg shadow-purple/10"
                            />
                        ) : (
                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple to-purple-dark mb-3 border-4 border-purple/20 flex items-center justify-center text-xl font-bold shadow-lg shadow-purple/10">
                                {authLoading ? '' : initials}
                            </div>
                        )}

                        {authLoading ? (
                            <div className="animate-pulse space-y-2 w-full">
                                <div className="h-5 bg-bg-hover rounded w-2/3 mx-auto" />
                                <div className="h-3 bg-bg-hover rounded w-full" />
                            </div>
                        ) : user ? (
                            <>
                                <h3 className="font-bold text-base">{user.full_name || user.username}</h3>
                                <p className="text-text-muted text-xs">@{user.username}</p>

                                {displayBio && (
                                    <p className="text-text-secondary text-xs text-center mt-2 leading-relaxed">{displayBio}</p>
                                )}

                                {/* Stats */}
                                <div className="flex gap-6 mt-3 text-sm">
                                    <div className="text-center">
                                        <div className="font-bold text-sm">{user.followers_count ?? 0}</div>
                                        <div className="text-text-muted text-[10px] uppercase tracking-wider">Followers</div>
                                    </div>
                                    <div className="text-center">
                                        <div className="font-bold text-sm">{user.following_count ?? 0}</div>
                                        <div className="text-text-muted text-[10px] uppercase tracking-wider">Following</div>
                                    </div>
                                </div>

                                {/* Real Skills */}
                                {skills && (
                                    <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                                        {skills.slice(0, 5).map((skill) => (
                                            <span key={skill} className="pill text-xs">{skill}</span>
                                        ))}
                                    </div>
                                )}

                                {/* Location & College badges */}
                                <div className="flex flex-col gap-0.5 mt-2.5 text-[11px] text-text-muted">
                                    {user.location && (
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {user.location}
                                        </span>
                                    )}
                                    {user.college && (
                                        <span className="flex items-center gap-1">
                                            <GraduationCap className="w-3 h-3" /> {user.college}
                                        </span>
                                    )}
                                </div>

                                <Link href="/profile" className="text-purple text-xs mt-3 hover:text-purple-light transition-colors font-medium">
                                    View Profile
                                </Link>
                            </>
                        ) : (
                            <p className="text-text-secondary text-sm mt-2">
                                <Link href="/auth/login" className="text-purple hover:underline">Login</Link> to see your profile
                            </p>
                        )}
                    </div>
                </div>

                {/* Recent Activity / Notifications — real data */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-gradient-to-br from-orange-500 to-amber-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Bell className="w-3.5 h-3.5 text-white" />
                            </div>
                            <h3 className="font-semibold text-sm">Activity</h3>
                        </div>
                        <Link href="/notifications" className="text-purple text-xs hover:text-purple-light transition-colors font-medium">
                            View all
                        </Link>
                    </div>

                    <div className="space-y-2">
                        {loadingNotifs ? (
                            <div className="animate-pulse space-y-2">
                                {[1, 2, 3].map((i) => (
                                    <div key={i} className="bg-bg-card rounded-lg p-3">
                                        <div className="h-3 bg-bg-hover rounded w-full mb-1" />
                                        <div className="h-3 bg-bg-hover rounded w-2/3" />
                                    </div>
                                ))}
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="bg-bg-card/50 rounded-xl p-5 text-center">
                                <Bell className="w-8 h-8 text-text-muted mx-auto mb-2 opacity-40" />
                                <p className="text-text-muted text-xs">No recent activity</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`bg-bg-card/50 rounded-lg p-3 transition-colors hover:bg-bg-hover ${!notif.is_read ? 'border-l-2 border-purple' : ''}`}
                                >
                                    <p className="text-[0.8125rem] line-clamp-2 leading-snug">
                                        {notif.message || notif.content || 'New notification'}
                                    </p>
                                    <p className="text-text-muted text-[10px] mt-1">
                                        {notif.created_at
                                            ? new Date(notif.created_at).toLocaleDateString()
                                            : ''}
                                    </p>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
}
