"use client";

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';

function OAuthCallbackContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { setAuthSession } = useAuth();

    const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
    const [errorMessage, setErrorMessage] = useState('');
    const [providerName, setProviderName] = useState('GitHub');

    useEffect(() => {
        const processOAuthCallback = async () => {
            const code = searchParams.get('code');
            const state = searchParams.get('state');
            const error = searchParams.get('error');
            const errorDesc = searchParams.get('error_description');

            if (error) {
                setStatus('error');
                setErrorMessage(errorDesc || error || 'Authorization was cancelled or denied.');
                return;
            }

            if (!code) {
                setStatus('error');
                setErrorMessage('No authorization code was received from the authentication provider.');
                return;
            }

            // CSRF State parameter verification
            const storedState = sessionStorage.getItem('oauth_state');
            if (storedState && state && storedState !== state) {
                setStatus('error');
                setErrorMessage('Security verification failed (Mismatched CSRF state). Please initiate login again.');
                return;
            }

            try {
                // Clear state after reading
                sessionStorage.removeItem('oauth_state');

                const currentOrigin = window.location.origin;
                const redirectUri = `${currentOrigin}/auth/callback`;

                const result = await api.loginWithGithub(code, redirectUri);
                setAuthSession(result);
                setStatus('success');

                setTimeout(() => {
                    router.push('/');
                }, 800);
            } catch (err: any) {
                setStatus('error');
                setErrorMessage(err.message || 'Failed to complete OAuth authentication with provider.');
            }
        };

        processOAuthCallback();
    }, [searchParams, router, setAuthSession]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-blueprint-grid relative overflow-x-hidden">
            {/* Background cyber ambient gradients */}
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[520px] h-[360px] bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none -z-10" />

            <div className="w-full max-w-md relative z-10 animate-fade-in my-6">
                <div className="text-center mb-6 flex flex-col items-center">
                    <Link href="/" className="mb-3 inline-block hover:scale-105 transition-transform">
                        <div className="p-2.5 rounded-2xl bg-[#0c0f1b] border border-[#1e263c] shadow-xl">
                            <BrandLogo size="md" mode="vector" priority />
                        </div>
                    </Link>
                </div>

                <div className="card border-border-default/90 shadow-2xl bg-surface-elevation-1/95 backdrop-blur-md p-6 sm:p-8 text-center space-y-5">
                    {status === 'processing' && (
                        <div className="space-y-4 py-4">
                            <div className="relative inline-flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full border-2 border-brand-primary/20 border-t-brand-primary animate-spin" />
                                <Loader2 className="w-6 h-6 text-brand-primary absolute animate-pulse" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-white tracking-tight">
                                    Verifying Builder Identity
                                </h2>
                                <p className="text-xs text-text-secondary">
                                    Handshaking credentials and securely establishing your ENQUEbet session...
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="space-y-4 py-4 animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h2 className="text-lg font-bold text-white tracking-tight">
                                    Identity Verified!
                                </h2>
                                <p className="text-xs text-text-secondary">
                                    Redirecting you to your builder workspace...
                                </p>
                            </div>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="space-y-4 py-2 animate-fade-in">
                            <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
                                <AlertCircle className="w-8 h-8" />
                            </div>
                            <div className="space-y-1.5">
                                <h2 className="text-lg font-bold text-white tracking-tight">
                                    Authentication Failed
                                </h2>
                                <p className="text-xs text-rose-300/90 bg-rose-950/30 border border-rose-900/40 p-3 rounded-xl text-left leading-relaxed">
                                    {errorMessage}
                                </p>
                            </div>

                            <div className="pt-2">
                                <Link
                                    href="/auth/login"
                                    className="btn-primary w-full !py-2.5 font-semibold text-xs flex items-center justify-center gap-2"
                                >
                                    <span>Return to Sign In</span>
                                    <ArrowRight className="w-4 h-4" />
                                </Link>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function OAuthCallbackPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-blueprint-grid">
                <Loader2 className="w-8 h-8 animate-spin text-[#1864ff]" />
            </div>
        }>
            <OAuthCallbackContent />
        </Suspense>
    );
}
