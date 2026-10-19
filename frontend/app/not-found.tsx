"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
    Terminal,
    ArrowLeft,
    Home,
    Copy,
    Check,
    Compass,
    Sparkles,
    AlertTriangle,
    CornerDownLeft,
    ExternalLink
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotFound() {
    const router = useRouter();
    const currentPath = usePathname() || '/unknown-route';

    const [copied, setCopied] = useState(false);
    const [commandInput, setCommandInput] = useState('');
    const [terminalOutput, setTerminalOutput] = useState<string[]>([
        'ENQUEbet Kernel v2.0.4 [x86_64-pc-linux-gnu]',
        'Type "help" for valid execution targets, or click quick commands below.',
    ]);
    const [currentTime, setCurrentTime] = useState<string>('');
    const terminalEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setCurrentTime(new Date().toISOString());
    }, []);

    // Global keyboard shortcuts: Esc or Ctrl+H navigates home
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' || ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'h')) {
                e.preventDefault();
                router.push('/');
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [router]);

    const handleCopyTelemetry = () => {
        const telemetry = {
            error_code: 'ERR_ROUTE_NOT_FOUND',
            status: 404,
            requested_path: currentPath,
            timestamp: currentTime || new Date().toISOString(),
            cluster: 'ap-south-1',
            client_platform: typeof window !== 'undefined' ? window.navigator.userAgent : 'Unknown',
            resolver: 'AppRouter.lookup() -> NULL',
        };

        if (typeof window !== 'undefined') {
            navigator.clipboard.writeText(JSON.stringify(telemetry, null, 2));
            setCopied(true);
            toast.success('Diagnostic telemetry copied to clipboard');
            setTimeout(() => setCopied(false), 2500);
        }
    };

    const executeCommand = (cmdStr: string) => {
        const cmd = cmdStr.trim().toLowerCase();
        if (!cmd) return;

        const newLogs = [...terminalOutput, `enquebet:terminal$ ${cmdStr}`];

        if (cmd === 'help') {
            newLogs.push('Available routines:');
            newLogs.push('  home, main         - Return to dashboard (/)');
            newLogs.push('  back               - Navigate to previous frame');
            newLogs.push('  collab             - Browse open collaborations (/collaboration)');
            newLogs.push('  resources          - View component & tool catalog (/resources)');
            newLogs.push('  research           - Read engineering preprints (/research)');
            newLogs.push('  ping               - Run cluster ICMP latency probe');
            newLogs.push('  clear              - Purge terminal buffer');
            newLogs.push('  /path              - Direct route dispatch');
        } else if (cmd === 'home' || cmd === 'main' || cmd === 'cd ~' || cmd === 'git checkout main') {
            newLogs.push('Deploying route jump to root [ / ]...');
            setTerminalOutput(newLogs);
            setTimeout(() => router.push('/'), 300);
            return;
        } else if (cmd === 'back' || cmd === 'history.back()' || cmd === 'cd ..') {
            newLogs.push('Reverting to previous frame...');
            setTerminalOutput(newLogs);
            setTimeout(() => router.back(), 300);
            return;
        } else if (cmd === 'collab' || cmd === 'cd /collaboration' || cmd.includes('/collaboration')) {
            newLogs.push('Opening collaboration squads (/collaboration)...');
            setTerminalOutput(newLogs);
            setTimeout(() => router.push('/collaboration'), 300);
            return;
        } else if (cmd === 'resources' || cmd === 'cd /resources' || cmd.includes('/resources')) {
            newLogs.push('Mounting engineering catalog (/resources)...');
            setTerminalOutput(newLogs);
            setTimeout(() => router.push('/resources'), 300);
            return;
        } else if (cmd === 'research' || cmd === 'cd /research' || cmd.includes('/research')) {
            newLogs.push('Opening research preprints (/research)...');
            setTerminalOutput(newLogs);
            setTimeout(() => router.push('/research'), 300);
            return;
        } else if (cmd === 'ping') {
            newLogs.push('64 bytes from api.enquebet.net (13.232.84.12): icmp_seq=1 ttl=56 time=18.4ms');
            newLogs.push('64 bytes from api.enquebet.net (13.232.84.12): icmp_seq=2 ttl=56 time=17.9ms');
            newLogs.push('--- api.enquebet.net ping statistics: 0% packet loss, rtt min/avg/max = 17.9/18.1/18.4 ms');
        } else if (cmd === 'clear') {
            setTerminalOutput(['Buffer purged. Ready.']);
            setCommandInput('');
            return;
        } else if (cmd.startsWith('/')) {
            newLogs.push(`Attempting jump to ${cmd}...`);
            setTerminalOutput(newLogs);
            setTimeout(() => router.push(cmd), 300);
            return;
        } else {
            newLogs.push(`bash: command not recognized: "${cmd}". Type "help" for registered commands.`);
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
                                enquebet-kernel :: v2.0.4 — [bash: 404_ROUTE_NOT_FOUND]
                            </span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                STATUS: 404_NOT_FOUND
                            </span>
                        </div>
                    </div>

                    {/* Terminal Body */}
                    <div className="p-5 sm:p-7 space-y-6">
                        {/* ASCII Art & Hero Description */}
                        <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-4 border-b border-[#1e2230]/60">
                            <pre className="text-zinc-500 text-[10px] sm:text-xs leading-none select-none font-bold">
{` _  _    ___  _  _   
| || |  / _ \\| || |  
| || |_| | | | || |_ 
|__   _| |_| |__   _|
   |_|  \\___/   |_|  `}
                            </pre>

                            <div className="space-y-1">
                                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                                    <span>RESOURCE_UNRESOLVED</span>
                                    <span className="text-xs font-normal text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded">
                                        EXIT_CODE: 1
                                    </span>
                                </h1>
                                <p className="text-xs sm:text-sm text-zinc-400 font-sans leading-relaxed">
                                    The requested route cannot be matched in the current Next.js App Router manifest.
                                </p>
                            </div>
                        </div>

                        {/* Diagnostic Telemetry Grid */}
                        <div className="rounded-xl bg-[#090a0f] border border-[#1e2230] p-4 text-xs space-y-2">
                            <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                <Terminal className="w-3.5 h-3.5 text-[#4f8fff]" />
                                <span>Diagnostic Telemetry Snapshot</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-4 text-zinc-400">
                                <div>
                                    <span className="text-zinc-600">REQUEST_PATH : </span>
                                    <span className="text-[#4f8fff] font-bold truncate">{currentPath}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-600">TIMESTAMP    : </span>
                                    <span className="text-zinc-300">{currentTime || 'UTC Syncing...'}</span>
                                </div>
                                <div>
                                    <span className="text-zinc-600">CLUSTER_NODE : </span>
                                    <span className="text-emerald-400">ap-south-1 (Mumbai Production)</span>
                                </div>
                                <div>
                                    <span className="text-zinc-600">RESOLVER     : </span>
                                    <span className="text-zinc-300">AppRouter.matchRoute() → NULL</span>
                                </div>
                            </div>
                        </div>

                        {/* Interactive Mini-CLI */}
                        <div className="rounded-xl bg-[#090a0f] border border-[#1e2230] p-4 space-y-3">
                            <div className="flex items-center justify-between text-xs text-zinc-500">
                                <span className="font-bold uppercase tracking-wider text-[11px]">
                                    Interactive Diagnostic Prompt
                                </span>
                                <span className="text-[11px] text-zinc-500">Type command or click quick routine</span>
                            </div>

                            {/* Quick Routine Chips */}
                            <div className="flex flex-wrap items-center gap-1.5">
                                {[
                                    { label: 'git checkout main', cmd: 'git checkout main' },
                                    { label: 'curl -I /collaboration', cmd: 'collab' },
                                    { label: 'curl -I /resources', cmd: 'resources' },
                                    { label: 'curl -I /research', cmd: 'research' },
                                    { label: 'history.back()', cmd: 'back' },
                                    { label: 'ping', cmd: 'ping' },
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

                            {/* Terminal Logs Window */}
                            <div className="bg-[#050608] border border-[#1b2030] rounded-lg p-3 text-xs font-mono text-zinc-300 space-y-1 max-h-36 overflow-y-auto">
                                {terminalOutput.map((line, idx) => (
                                    <div key={idx} className={line.startsWith('enquebet:terminal$') ? 'text-[#4f8fff] font-bold' : line.includes('ERROR') || line.includes('not recognized') ? 'text-rose-400' : 'text-zinc-400'}>
                                        {line}
                                    </div>
                                ))}
                                <div ref={terminalEndRef} />
                            </div>

                            {/* CLI Input */}
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault();
                                    executeCommand(commandInput);
                                }}
                                className="flex items-center gap-2 pt-1"
                            >
                                <span className="text-emerald-400 text-xs font-bold">enquebet:terminal$</span>
                                <input
                                    type="text"
                                    value={commandInput}
                                    onChange={(e) => setCommandInput(e.target.value)}
                                    placeholder="type 'help', route path, or command..."
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
                                <Link
                                    href="/"
                                    className="btn-brand text-xs sm:text-sm font-semibold px-4 py-2 rounded-xl inline-flex items-center gap-2"
                                >
                                    <Home className="w-4 h-4" />
                                    <span>Return to Dashboard</span>
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => router.back()}
                                    className="px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold bg-[#161a26] border border-[#272d40] text-zinc-300 hover:bg-[#1f2538] hover:text-white transition-all inline-flex items-center gap-2"
                                >
                                    <ArrowLeft className="w-4 h-4" />
                                    <span>Previous Frame</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={handleCopyTelemetry}
                                className="px-3 py-2 rounded-xl text-xs font-semibold bg-[#161a26] border border-[#272d40] text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-all inline-flex items-center gap-1.5"
                                title="Copy Diagnostic JSON"
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-emerald-400">Copied</span>
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-3.5 h-3.5" />
                                        <span>Copy Telemetry</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Terminal Status Footer */}
                    <div className="px-5 py-2.5 bg-[#090a0f] border-t border-[#1e2230] flex items-center justify-between text-[11px] text-zinc-500">
                        <span>Shortcut: Press <kbd className="px-1.5 py-0.5 rounded bg-[#161a26] border border-[#272d40] text-zinc-300">Esc</kbd> or <kbd className="px-1.5 py-0.5 rounded bg-[#161a26] border border-[#272d40] text-zinc-300">Ctrl+H</kbd> to return home</span>
                        <span className="font-mono">ENQUEbet Architecture Matrix</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
