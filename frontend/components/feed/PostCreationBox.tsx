"use client";

import { useRouter } from 'next/navigation';
import { ImageIcon, Video, FileText, Sparkles } from 'lucide-react';
import { useAuth } from '@/lib/contexts/AuthContext';

interface PostCreationBoxProps {
    onPostCreated?: () => void;
}

export default function PostCreationBox({ onPostCreated }: PostCreationBoxProps) {
    const router = useRouter();
    const { user } = useAuth();

    const handleCreateClick = () => {
        router.push('/create');
    };

    const initials = user?.full_name
        ? user.full_name.charAt(0).toUpperCase()
        : user?.username?.charAt(0).toUpperCase() || '?';

    return (
        <div className="card">
            <div className="flex gap-3 items-center">
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-purple to-purple-dark shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-purple/20 overflow-hidden">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        initials
                    )}
                </div>
                <div className="flex-1">
                    <button
                        onClick={handleCreateClick}
                        className="input w-full text-left text-text-muted cursor-pointer hover:border-purple/50 transition-all"
                    >
                        <span className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-purple/60" />
                            What&apos;s your next big idea?
                        </span>
                    </button>
                </div>
            </div>

            <div className="flex gap-1 mt-3 pt-3 border-t border-border-default">
                <button onClick={() => router.push('/create?media=image')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/5 transition-all text-sm">
                    <ImageIcon className="w-4 h-4" />
                    <span>Image</span>
                </button>
                <button onClick={() => router.push('/create?media=video')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/5 transition-all text-sm">
                    <Video className="w-4 h-4" />
                    <span>Video</span>
                </button>
                <button onClick={() => router.push('/create?media=document')} className="flex items-center gap-2 px-3 py-2 rounded-lg text-text-muted hover:text-primary hover:bg-primary/5 transition-all text-sm">
                    <FileText className="w-4 h-4" />
                    <span>Document</span>
                </button>
            </div>
        </div>
    );
}
