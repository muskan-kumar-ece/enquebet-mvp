"use client";

import { useState, useEffect } from 'react';
import { Terminal, RefreshCw, Home, AlertTriangle, Bug } from 'lucide-react';

interface GlobalErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function RootGlobalError({ error, reset }: GlobalErrorProps) {
    const [currentTime, setCurrentTime] = useState('');

    useEffect(() => {
        setCurrentTime(new Date().toISOString());
        console.error('[Root Global Fault]:', error);
    }, [error]);

    return (
        <html lang="en">
            <body className="bg-[#090a0f] text-white min-h-screen flex items-center justify-center p-4 font-mono select-none antialiased">
                <div className="w-full max-w-2xl bg-[#0d1017] border border-[#1e2230] rounded-2xl shadow-2xl overflow-hidden">
                    {/* Terminal Header */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#090a0f] border-b border-[#1e2230]">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                            <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                            <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            <span className="ml-3 text-xs text-zinc-400 font-medium">
                                enquebet-root-kernel :: [FATAL_LAYOUT_FAULT]
                            </span>
                        </div>
                        <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                            STATUS: 500_FATAL
                        </span>
                    </div>

                    {/* Terminal Body */}
                    <div className="p-6 space-y-5">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                                <AlertTriangle className="w-6 h-6" />
                            </div>
                            <div>
                                <h1 className="text-base font-bold text-white">
                                    Root Layout Pipeline Crash
                                </h1>
                                <p className="text-xs text-zinc-400 font-sans mt-0.5">
                                    The root application container encountered an unrecoverable exception.
                                </p>
                            </div>
                        </div>

                        {/* Diagnostics */}
                        <div className="p-4 rounded-xl bg-[#050608] border border-[#1e2230] text-xs space-y-1.5 text-zinc-400">
                            <div>
                                <span className="text-zinc-600">ERROR_NAME : </span>
                                <span className="text-rose-400 font-bold">{error.name || 'FatalError'}</span>
                            </div>
                            <div>
                                <span className="text-zinc-600">MESSAGE    : </span>
                                <span className="text-white">{error.message || 'No details provided'}</span>
                            </div>
                            {error.digest && (
                                <div>
                                    <span className="text-zinc-600">DIGEST     : </span>
                                    <span className="text-[#4f8fff]">{error.digest}</span>
                                </div>
                            )}
                            <div>
                                <span className="text-zinc-600">TIMESTAMP  : </span>
                                <span className="text-zinc-300">{currentTime || 'Syncing...'}</span>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => reset()}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#1864ff] hover:bg-[#1554d4] text-white transition-colors inline-flex items-center gap-2 shadow-sm"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Reboot Runtime</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        window.location.href = '/';
                                    }
                                }}
                                className="px-4 py-2 rounded-xl text-xs font-semibold bg-[#161a26] border border-[#272d40] text-zinc-300 hover:text-white transition-colors inline-flex items-center gap-2"
                            >
                                <Home className="w-4 h-4" />
                                <span>Hard Reload to Home</span>
                            </button>
                        </div>
                    </div>
                </div>
            </body>
        </html>
    );
}
