"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';

interface SocialAuthButtonsProps {
    disabled?: boolean;
    onActionStart?: () => void;
    onActionEnd?: () => void;
}

declare global {
    interface Window {
        google?: any;
    }
}

export function SocialAuthButtons({ disabled, onActionStart, onActionEnd }: SocialAuthButtonsProps) {
    const router = useRouter();
    const { setAuthSession } = useAuth();
    const [loadingProvider, setLoadingProvider] = useState<'google' | 'github' | null>(null);

    const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';
    const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || '';

    const handleGoogleCredentialResponse = useCallback(async (response: any) => {
        if (!response?.credential) return;

        setLoadingProvider('google');
        if (onActionStart) onActionStart();

        try {
            const result = await api.loginWithGoogle(response.credential);
            setAuthSession(result);
            toast.success(result.created ? 'Welcome to ENQUEbet! Profile forged.' : 'Welcome back, Builder!');
            router.push('/');
        } catch (err: any) {
            toast.error(err.message || 'Google authentication failed');
            setLoadingProvider(null);
            if (onActionEnd) onActionEnd();
        }
    }, [onActionStart, onActionEnd, router, setAuthSession]);

    // Initialize Google One Tap / Button if client ID is configured
    useEffect(() => {
        if (!googleClientId || typeof window === 'undefined') return;

        // Check if script already exists
        if (!document.getElementById('google-client-script')) {
            const script = document.createElement('script');
            script.id = 'google-client-script';
            script.src = 'https://accounts.google.com/gsi/client';
            script.async = true;
            script.defer = true;
            script.onload = () => {
                if (window.google?.accounts?.id) {
                    window.google.accounts.id.initialize({
                        client_id: googleClientId,
                        callback: handleGoogleCredentialResponse,
                        auto_select: false,
                        cancel_on_tap_outside: true,
                    });
                }
            };
            document.head.appendChild(script);
        } else if (window.google?.accounts?.id) {
            window.google.accounts.id.initialize({
                client_id: googleClientId,
                callback: handleGoogleCredentialResponse,
                auto_select: false,
                cancel_on_tap_outside: true,
            });
        }
    }, [googleClientId, handleGoogleCredentialResponse]);

    const handleGoogleClick = () => {
        if (!googleClientId) {
            toast.error('Google Client ID is not configured. Please add NEXT_PUBLIC_GOOGLE_CLIENT_ID to .env.local');
            return;
        }

        if (window.google?.accounts?.id) {
            // Trigger Google sign-in prompt
            window.google.accounts.id.prompt((notification: any) => {
                if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
                    // Fallback to render button or retry
                }
            });
        } else {
            toast.loading('Loading Google services...', { duration: 2000 });
        }
    };

    const handleGithubClick = () => {
        if (!githubClientId) {
            toast.error('GitHub Client ID is not configured. Please add NEXT_PUBLIC_GITHUB_CLIENT_ID to .env.local');
            return;
        }

        setLoadingProvider('github');
        if (onActionStart) onActionStart();

        // Generate cryptographic random state for CSRF defense
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');

        sessionStorage.setItem('oauth_state', state);

        const currentOrigin = window.location.origin;
        const redirectUri = `${currentOrigin}/auth/callback`;

        const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
            githubClientId
        )}&scope=read:user%20user:email&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;

        window.location.href = authUrl;
    };

    const isBusy = Boolean(loadingProvider) || disabled;

    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                {/* Google CTA */}
                <button
                    type="button"
                    onClick={handleGoogleClick}
                    disabled={isBusy}
                    aria-label="Continue with Google"
                    className="relative flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#0c0f1b] hover:bg-[#121629] active:bg-[#161c33] active:scale-[0.97] border border-[#1e263c] hover:border-[#2d3856] text-slate-200 hover:text-white text-xs font-semibold tracking-wide transition-all duration-150 shadow-lg shadow-black/40 hover:shadow-brand-primary/10 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation"
                >
                    {loadingProvider === 'google' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#1864ff]" />
                    ) : (
                        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                            <path
                                fill="#EA4335"
                                d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                            />
                            <path
                                fill="#4285F4"
                                d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
                            />
                            <path
                                fill="#FBBC05"
                                d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-2.9z"
                            />
                            <path
                                fill="#34A853"
                                d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z"
                            />
                        </svg>
                    )}
                    <span>Google</span>
                </button>

                {/* GitHub CTA */}
                <button
                    type="button"
                    onClick={handleGithubClick}
                    disabled={isBusy}
                    aria-label="Continue with GitHub"
                    className="relative flex items-center justify-center gap-2.5 px-4 py-2.5 rounded-xl bg-[#0c0f1b] hover:bg-[#121629] active:bg-[#161c33] active:scale-[0.97] border border-[#1e263c] hover:border-[#2d3856] text-slate-200 hover:text-white text-xs font-semibold tracking-wide transition-all duration-150 shadow-lg shadow-black/40 hover:shadow-brand-primary/10 group cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none touch-manipulation"
                >
                    {loadingProvider === 'github' ? (
                        <Loader2 className="w-4 h-4 animate-spin text-[#1864ff]" />
                    ) : (
                        <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
                            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                        </svg>
                    )}
                    <span>GitHub</span>
                </button>
            </div>

            {/* Cyber Divider */}
            <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-[#1e263c] w-full" />
                <span className="bg-[#0b0e1a] px-3 text-[10px] uppercase font-mono tracking-wider text-slate-500 absolute">
                    or continue with email
                </span>
            </div>
        </div>
    );
}
