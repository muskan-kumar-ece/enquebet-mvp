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
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0f111a] border border-[#1e2335] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_16px_rgba(0,0,0,0.3)]">
            <div className="flex gap-3 items-center">
                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#1864ff] to-[#0f4bcc] shrink-0 flex items-center justify-center text-sm font-bold text-white shadow-md shadow-[#1864ff]/20 overflow-hidden ring-1 ring-white/20">
                    {user?.avatar_url ? (
                        <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                        initials
                    )}
                </div>
                <div className="flex-1">
                    <button
                        onClick={handleCreateClick}
                        className="w-full text-left bg-[#141724] border border-[#23283c] hover:border-[#1864ff]/60 px-4 py-2.5 rounded-xl transition-all group flex items-center justify-between"
                    >
                        <span className="flex items-center gap-2 text-zinc-400 text-xs sm:text-sm">
                            <Sparkles className="w-4 h-4 text-[#4f8fff] transition-colors" />
                            What are you building next? Share a project, idea, or role...
                        </span>
                        <span className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-400 bg-[#0c0e17] border border-zinc-800 rounded">
                            New +
                        </span>
                    </button>
                </div>
            </div>

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#1a1f30]">
                <div className="flex items-center gap-1.5">
                    <button
                        onClick={() => router.push('/create?media=image')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-zinc-800 transition-all flex items-center gap-1.5"
                    >
                        <ImageIcon className="w-3.5 h-3.5 text-[#4f8fff]" />
                        <span>Screenshot</span>
                    </button>
                    <button
                        onClick={() => router.push('/create?media=video')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-zinc-800 transition-all flex items-center gap-1.5"
                    >
                        <Video className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Demo Clip</span>
                    </button>
                    <button
                        onClick={() => router.push('/create?media=document')}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/[0.04] border border-transparent hover:border-zinc-800 transition-all flex items-center gap-1.5"
                    >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>Spec Doc</span>
                    </button>
                </div>

                <button
                    onClick={handleCreateClick}
                    className="btn-primary text-xs px-3.5 py-1.5 font-semibold"
                >
                    Create Post
                </button>
            </div>
        </div>
    );
}
