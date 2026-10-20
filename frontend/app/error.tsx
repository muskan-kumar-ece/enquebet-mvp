"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    RefreshCw,
    Home,
    Copy,
    Check,
    ChevronDown,
    ChevronRight,
    CornerDownLeft,
    AlertOctagon,
    Bug
} from 'lucide-react';
import toast from 'react-hot-toast';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function GlobalErrorPage({ error, reset }: ErrorProps) {
    const router = useRouter();
    const [copied, setCopied] = useState(false);
    const [showStackTrace, setShowStackTrace] = useState(false);
    const [commandInput, setCommandInput] = useState('');
    const [currentTime] = useState(() => (typeof window !== 'undefined' ? new Date().toISOString() : ''));
    const [terminalOutput, setTerminalOutput] = useState<string[]>([
        'CRITICAL: Uncaught exception caught by React Error Boundary.',
        'Kernel state preserved. Choose a recovery routine below.',
    ]);
    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Log the error to developer console
        console.error('[ENQUEbet System Fault]:', error);
    }, [error]);

    const handleCopyReport = () => {
        const crashReport = {
            error_code: '500_SYSTEM_FAULT',
            name: error.name || 'RuntimeError',
            message: error.message || 'Unknown runtime error',
            digest: error.digest || 'ENQ-UNASSIGNED',
            stack: error.stack || 'No call stack captured in client runtime',
            timestamp: currentTime || new Date().toISOString(),
            cluster: 'ap-south-1',
            client_platform: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
        };

        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(JSON.stringify(crashReport, null, 2));
            setCopied(true);
            toast.success('Crash telemetry copied to clipboard');
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const executeCommand = (cmdStr: string) => {
        const cmd = cmdStr.trim().toLowerCase();
        if (!cmd) return;

        const newLogs = [...terminalOutput, `enquebet:fault-handler$ ${cmdStr}`];

        if (cmd === 'help') {
            newLogs.push('Available recovery routines:');
            newLogs.push('  reboot, retry      - Call reset() to reinvoke component lifecycle');
            newLogs.push('  home, main         - Return to dashboard (/)');
            newLogs.push('  trace, stack       - Toggle call stack inspection');
            newLogs.push('  copy               - Copy crash telemetry JSON');
            newLogs.push('  clear              - Purge terminal buffer');
        } else if (cmd === 'reboot' || cmd === 'retry' || cmd === 'system.reboot()') {
            newLogs.push('Executing runtime lifecycle reset...');
            setTerminalOutput(newLogs);
            setTimeout(() => reset(), 300);
            return;
        } else if (cmd === 'home' || cmd === 'main' || cmd === 'git checkout main') {
            newLogs.push('Navigating to root [ / ]...');
            setTerminalOutput(newLogs);
            setTimeout(() => router.push('/'), 300);
            return;
        } else if (cmd === 'trace' || cmd === 'stack' || cmd === 'cat stack.trace') {
            setShowStackTrace((prev) => !prev);
            newLogs.push(`Toggled stack trace viewer: ${!showStackTrace ? 'OPEN' : 'CLOSED'}`);
        } else if (cmd === 'copy') {
            handleCopyReport();
            newLogs.push('Copied diagnostic crash report to clipboard.');
        } else if (cmd === 'clear') {
            setTerminalOutput(['Buffer purged.']);
            setCommandInput('');
            return;
        } else {
            newLogs.push(`bash: unknown command: "${cmd}". Type "help" for options.`);
        }

        setTerminalOutput(newLogs);
        setCommandInput('');
        setTimeout(() => {
            terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 50);
    };

    return (
        <div className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 flex items-center justify-center bg-blueprint-grid">
            <div className="w-full max-w-3xl animate-scale-in">
                {/* Developer Window Shell */}
                <div className="bg-[#0d1017] border border-[#1e2230] rounded-2xl shadow-2xl overflow-hidden font-mono">
                    {/* Window Title Bar */}
                    <div className="flex items-center justify-between px-4 py-3 bg-[#090a0f] border-b border-[#1e2230] select-none">
                        <div className="flex items-center gap-2">
                            <span className="w-3 h-3 rounded-full bg-rose-500/80 border border-rose-600/40" />
                            <span className="w-3 h-3 rounded-full bg-amber-500/80 border border-amber-600/40" />
                            <span className="w-3 h-3 rounded-full bg-emerald-500/80 border border-emerald-600/40" />
                            <span className="ml-3 text-xs text-zinc-400 font-medium">
                                enquebet-kernel :: v2.0.4 — [panic: UNCAUGHT_RUNTIME_EXCEPTION]
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                                STATUS: 500_SYSTEM_FAULT
                            </span>
                        </div>
                    </div>

                    {/* Window Body */}
                    <div className="p-5 sm:p-7 space-y-6">
                        {/* Header & Description */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-4 border-b border-[#1e2230]/60">
                            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                                <AlertOctagon className="w-7 h-7" />
                            </div>

                            <div className="space-y-1">
                                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <span>SYSTEM_FAULT_DETECTED</span>
                                    <span className="text-xs font-normal text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                                        EXIT_CODE: 1
                                    </span>
                                </h1>
                                <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
                                    An unhandled exception occurred in the component render pipeline. The runtime has trapped the error to protect application integrity.
                                </p>
                            </div>
                        </div>

                        {/* Error Telemetry Grid */}
                        <div className="rounded-xl bg-[#090a0f] border border-[#1e2230] p-4 text-xs space-y-2">
                            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Bug className="w-3.5 h-3.5 text-rose-400" />
                                <span>Fault Diagnostics Telemetry</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-zinc-400">
                                <div>
                                    <span className="text-zinc-600">EXCEPTION_NAME : </span>
                                    <span className="text-rose-400 font-bold">{error.name || 'RuntimeError'}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-600">TIMESTAMP      : </span>
                                    <span className="text-zinc-300">{currentTime || 'Syncing...'}</span>
                                </div>
                                <div className="sm:col-span-2">
                                    <span className="text-zinc-600">ERROR_MESSAGE  : </span>
                                    <span className="text-white font-medium break-words">
                                        {error.message || 'No specific error message provided by runtime.'}
                                    </span>
                                </div>
                                {error.digest && (
                                    <div className="sm:col-span-2">
                                        <span className="text-zinc-600">DIGEST_HASH    : </span>
                                        <span className="text-[#4f8fff] font-mono">{error.digest}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Collapsible Call Stack Inspection */}
                        <div className="rounded-xl bg-[#090a0f] border border-[#1e2230] overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setShowStackTrace(!showStackTrace)}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/[0.02] transition-colors"
                            >
                                <span className="flex items-center gap-2">
                                    {showStackTrace ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                    <span>Call Stack & Trace Inspector</span>
                                </span>
                                <span className="text-[10px] text-zinc-500 font-mono">
                                    {showStackTrace ? '[Collapse Trace]' : '[Inspect Stack Trace]'}
                                </span>
                            </button>

                            {showStackTrace && (
                                <div className="p-4 bg-[#050608] border-t border-[#1e2230] text-[11px] text-zinc-400 font-mono overflow-x-auto max-h-48 overflow-y-auto leading-relaxed">
                                    <pre className="whitespace-pre-wrap break-all text-zinc-300">
                                        {error.stack || `${error.name}: ${error.message}\n    at <client-side execution boundary>`}
                                    </pre>
                                </div>
                            )}
                        </div>

                        {/* Interactive Diagnostic Terminal */}
                        <div className="rounded-xl bg-[#090a0f] border border-[#1e2230] p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span className="font-bold uppercase tracking-wider text-[11px]">
                                    Recovery Console
                                </span>
                                <span className="text-[11px] text-zinc-500">Click routine or type command</span>
                            </div>

                            {/* Quick Routine Chips */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { label: 'system.reboot()', cmd: 'reboot' },
                                    { label: 'git checkout main', cmd: 'home' },
                                    { label: 'cat stack.trace', cmd: 'trace' },
                                    { label: 'copy telemetry', cmd: 'copy' },
                                ].map((chip) => (
                                    <button
                                        key={chip.label}
                                        type="button"
                                        onClick={() => executeCommand(chip.cmd)}
                                        className="text-[11px] px-2.5 py-1 rounded-lg bg-[#141824] border border-[#23283a] text-zinc-300 hover:text-white hover:border-[#1864ff] hover:bg-[#1864ff]/10 transition-all font-mono"
                                    >
                                        $ {chip.label}
                                    </button>
                                ))}
                            </div>

                            {/* Logs Box */}
                            <div className="bg-[#050608] border border-[#1b2030] rounded-lg p-3 text-xs font-mono text-zinc-300 space-y-1 max-h-28 overflow-y-auto">
                                {terminalOutput.map((line, idx) => (
                                    <div key={idx} className={line.startsWith('enquebet:') ? 'text-[#4f8fff] font-bold' : line.includes('CRITICAL') ? 'text-rose-400' : 'text-zinc-400'}>
                                        {line}
                                    </div>
                                ))}
                                <div ref={terminalEndRef} />
                            </div>

                            {/* Input Prompt */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    executeCommand(commandInput);
                                }}
                                className="flex items-center gap-2 pt-1"
                            >
                                <span className="text-emerald-400 text-xs font-bold">enquebet:fault-handler$</span>
                                <input
                                    type="text"
                                    value={commandInput}
                                    onChange={(e) => setCommandInput(e.target.value)}
                                    placeholder="type 'reboot', 'home', 'trace', or 'help'..."
                                    className="flex-1 bg-transparent border-none text-xs text-white placeholder-zinc-600 focus:outline-none font-mono"
                                />
                                <button
                                    type="submit"
                                    className="p-1 rounded bg-[#161a26] border border-[#272d40] text-zinc-400 hover:text-white transition-colors"
                                    title="Execute command"
                                >
                                    <CornerDownLeft className="w-3.5 h-3.5" />
                                </button>
                            </form>
                        </div>

                        {/* Standard Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                            <div className="flex flex-wrap items-center gap-2.5">
                                <button
                                    type="button"
                                    onClick={() => reset()}
                                    className="btn-brand text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2"
                                >
                                    <RefreshCw className="w-4 h-4" />
                                    <span>Execute Runtime Reset</span>
                                </button>

                                <Link
                                    href="/"
                                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#161a26] border border-[#272d40] text-zinc-300 hover:bg-[#1f2538] hover:text-white transition-all inline-flex items-center gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    <span>Return to Dashboard</span>
                                </Link>
                            </div>

                            <button
                                type="button"
                                onClick={handleCopyReport}
                                className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#161a26] border border-[#272d40] text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-all inline-flex items-center gap-1.5"
                                title="Copy Crash Telemetry"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Crash Telemetry</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Window Status Footer */}
                    <div className="px-5 py-2.5 bg-[#090a0f] border-t border-[#1e2230] flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Recovery Protocol: Click "Execute Runtime Reset" to re-mount tree</span>
                        <span className="font-mono">ENQUEbet Fault Interceptor</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
