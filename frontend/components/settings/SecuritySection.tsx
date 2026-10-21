"use client";

import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, Key, Laptop, Smartphone, 
    Tablet, Globe, Trash2, Check, AlertCircle, 
    RefreshCw, Clock, Lock, KeyRound, Link2, Unlink, Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';

interface SecuritySectionProps {
    onPasswordChanged?: () => void;
}

export function SecuritySection({ onPasswordChanged }: SecuritySectionProps) {
    const { user, updateUser } = useAuth();

    // Password state
    const [changingPassword, setChangingPassword] = useState(false);
    const [hasUsablePassword, setHasUsablePassword] = useState<boolean>(user?.has_usable_password ?? true);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_new_password: '',
    });

    // Social accounts state
    const [socialAccounts, setSocialAccounts] = useState<any[]>([]);
    const [loadingSocial, setLoadingSocial] = useState(true);
    const [disconnectingProvider, setDisconnectingProvider] = useState<string | null>(null);

    // Sessions state
    const [sessions, setSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
    const [revokingAllOthers, setRevokingAllOthers] = useState(false);

    const loadData = async () => {
        setLoadingSessions(true);
        setLoadingSocial(true);
        try {
            const [sessionData, socialData] = await Promise.all([
                api.getUserSessions().catch(() => []),
                api.getConnectedSocialAccounts().catch(() => ({ accounts: [], has_usable_password: true }))
            ]);
            setSessions(sessionData);
            if (socialData?.accounts) {
                setSocialAccounts(socialData.accounts);
            }
            if (typeof socialData?.has_usable_password === 'boolean') {
                setHasUsablePassword(socialData.has_usable_password);
            }
        } catch (err: any) {
            console.error('Failed to load security data:', err);
        } finally {
            setLoadingSessions(false);
            setLoadingSocial(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    const handleChangePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordData.current_password || !passwordData.new_password) {
            toast.error('Please fill in all password fields');
            return;
        }
        if (passwordData.new_password.length < 8) {
            toast.error('New password must be at least 8 characters long');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_new_password) {
            toast.error('New passwords do not match');
            return;
        }

        setChangingPassword(true);
        try {
            await api.changeMyPassword(passwordData.current_password, passwordData.new_password);
            setPasswordData({ current_password: '', new_password: '', confirm_new_password: '' });
            toast.success('Password updated successfully');
            if (onPasswordChanged) onPasswordChanged();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleSetMasterPassword = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!passwordData.new_password) {
            toast.error('Please enter a master password');
            return;
        }
        if (passwordData.new_password.length < 8) {
            toast.error('Password must be at least 8 characters long');
            return;
        }
        if (passwordData.new_password !== passwordData.confirm_new_password) {
            toast.error('Passwords do not match');
            return;
        }

        setChangingPassword(true);
        try {
            await api.setInitialMasterPassword(passwordData.new_password);
            setPasswordData({ current_password: '', new_password: '', confirm_new_password: '' });
            setHasUsablePassword(true);
            updateUser({ has_usable_password: true });
            toast.success('Master password set successfully! You can now log in with email and password.');
            if (onPasswordChanged) onPasswordChanged();
        } catch (err: any) {
            toast.error(err.message || 'Failed to set password');
        } finally {
            setChangingPassword(false);
        }
    };

    const handleDisconnectProvider = async (provider: string) => {
        if (!hasUsablePassword && socialAccounts.length <= 1) {
            toast.error('Cannot disconnect your only authentication method. Please set a master password first.');
            return;
        }

        const ok = confirm(`Disconnect your ${provider.toUpperCase()} account from ENQUEbet?`);
        if (!ok) return;

        setDisconnectingProvider(provider);
        try {
            await api.disconnectSocialAccount(provider);
            setSocialAccounts(prev => prev.filter(a => a.provider.toLowerCase() !== provider.toLowerCase()));
            toast.success(`${provider.toUpperCase()} account disconnected`);
        } catch (err: any) {
            toast.error(err.message || `Failed to disconnect ${provider}`);
        } finally {
            setDisconnectingProvider(null);
        }
    };

    const handleConnectProvider = (provider: string) => {
        if (provider === 'github') {
            const githubClientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
            if (!githubClientId) {
                toast.error('GitHub Client ID is not configured.');
                return;
            }
            const array = new Uint8Array(16);
            window.crypto.getRandomValues(array);
            const state = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
            sessionStorage.setItem('oauth_state', state);
            const redirectUri = `${window.location.origin}/auth/callback`;
            window.location.href = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
                githubClientId
            )}&scope=read:user%20user:email&state=${encodeURIComponent(state)}&redirect_uri=${encodeURIComponent(redirectUri)}`;
        } else if (provider === 'google') {
            const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
            if (!googleClientId) {
                toast.error('Google Client ID is not configured.');
                return;
            }
            if (window.google?.accounts?.id) {
                window.google.accounts.id.prompt();
            } else {
                toast.loading('Loading Google services...', { duration: 1500 });
            }
        }
    };

    const handleRevokeSession = async (sessionId: string) => {
        setRevokingSessionId(sessionId);
        try {
            await api.revokeUserSession(sessionId);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            toast.success('Device session revoked');
        } catch (err: any) {
            toast.error(err.message || 'Failed to revoke session');
        } finally {
            setRevokingSessionId(null);
        }
    };

    const handleRevokeAllOthers = async () => {
        const ok = confirm('Revoke all other device sessions? You will stay logged in on this device.');
        if (!ok) return;

        setRevokingAllOthers(true);
        try {
            await api.revokeAllOtherSessions();
            setSessions(prev => prev.filter(s => s.is_current));
            toast.success('All other device sessions have been revoked');
        } catch (err: any) {
            toast.error(err.message || 'Failed to revoke other sessions');
        } finally {
            setRevokingAllOthers(false);
        }
    };

    const getDeviceIcon = (type: string) => {
        if (type === 'mobile') return Smartphone;
        if (type === 'tablet') return Tablet;
        return Laptop;
    };

    const googleAccount = socialAccounts.find(a => a.provider.toLowerCase() === 'google');
    const githubAccount = socialAccounts.find(a => a.provider.toLowerCase() === 'github');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-[#1e2335] pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#1864ff]" />
                    Password & Security
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                    Update your account credentials, manage connected developer accounts, and review active sessions.
                </p>
            </div>

            {/* Password Card (Set Master Password or Change Password) */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-5">
                {!hasUsablePassword ? (
                    <>
                        <div className="flex items-center gap-2">
                            <KeyRound className="w-4 h-4 text-amber-400" />
                            <h3 className="text-sm font-bold text-white">Set Master Password</h3>
                        </div>
                        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 leading-relaxed">
                            Your builder profile was created via third-party social login. Set a master password to allow standard email & password login and enable disconnecting your social identity if desired.
                        </div>

                        <form onSubmit={handleSetMasterPassword} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                        Master Password
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                        placeholder="Min. 8 characters"
                                        className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                        Confirm Master Password
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.confirm_new_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_new_password: e.target.value })}
                                        placeholder="Re-enter master password"
                                        className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    aria-busy={changingPassword}
                                    className="btn-brand px-4 py-2 text-xs font-semibold rounded-xl text-white flex items-center gap-1.5 transition-all active:scale-[0.98] touch-manipulation focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                                >
                                    {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                                    <span>{changingPassword ? 'Setting Master Password...' : 'Create Master Password'}</span>
                                </button>
                            </div>
                        </form>
                    </>
                ) : (
                    <>
                        <div className="flex items-center gap-2">
                            <Key className="w-4 h-4 text-[#1864ff]" />
                            <h3 className="text-sm font-bold text-white">Change Password</h3>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                    Current Password
                                </label>
                                <input
                                    type="password"
                                    value={passwordData.current_password}
                                    onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                                    placeholder="Enter current password"
                                    className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                        New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.new_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                                        placeholder="Min. 8 characters"
                                        className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                        Confirm New Password
                                    </label>
                                    <input
                                        type="password"
                                        value={passwordData.confirm_new_password}
                                        onChange={(e) => setPasswordData({ ...passwordData, confirm_new_password: e.target.value })}
                                        placeholder="Re-enter new password"
                                        className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end pt-1">
                                <button
                                    type="submit"
                                    disabled={changingPassword}
                                    aria-busy={changingPassword}
                                    className="btn-brand px-4 py-2 text-xs font-semibold rounded-xl text-white flex items-center gap-1.5 transition-all active:scale-[0.98] touch-manipulation focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                                >
                                    {changingPassword ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                                    <span>{changingPassword ? 'Updating Password...' : 'Update Password'}</span>
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>

            {/* Connected Builder Accounts */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-5">
                <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-[#1864ff]" />
                    <h3 className="text-sm font-bold text-white">Connected Builder Accounts</h3>
                </div>
                <p className="text-xs text-text-secondary -mt-3">
                    Connect external accounts to authenticate with a single click and tether your builder identity.
                </p>

                <div className="space-y-3 pt-1">
                    {/* Google Row */}
                    <div className="p-4 rounded-xl bg-[#08090E] border border-[#1e2335] flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0c0f1b] border border-[#1e263c] flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4" viewBox="0 0 24 24">
                                    <path fill="#EA4335" d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z" />
                                    <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z" />
                                    <path fill="#FBBC05" d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.1-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.2c0 2.8.7 5.5 1.9 7.8l3.7-2.9z" />
                                    <path fill="#34A853" d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.3 7.5 23.5 12 23.5z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">Google</h4>
                                <p className="text-[11px] text-text-secondary flex items-center gap-1.5 mt-0.5">
                                    {googleAccount ? (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                            <span>Connected as {googleAccount.provider_email || googleAccount.display_name || 'Active'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                                            <span>Not connected</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {googleAccount ? (
                            <button
                                type="button"
                                disabled={disconnectingProvider === 'google'}
                                aria-busy={disconnectingProvider === 'google'}
                                onClick={() => handleDisconnectProvider('google')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-[#1e2335] hover:border-rose-500/30 flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
                            >
                                {disconnectingProvider === 'google' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                                <span>{disconnectingProvider === 'google' ? 'Disconnecting...' : 'Disconnect'}</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleConnectProvider('google')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-hover text-slate-200 hover:text-white border border-[#1e2335] flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-[#1864ff]"
                            >
                                <Link2 className="w-3.5 h-3.5 text-[#1864ff]" />
                                <span>Connect</span>
                            </button>
                        )}
                    </div>

                    {/* GitHub Row */}
                    <div className="p-4 rounded-xl bg-[#08090E] border border-[#1e2335] flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#0c0f1b] border border-[#1e263c] flex items-center justify-center shrink-0">
                                <svg className="w-4 h-4 fill-current text-white shrink-0" viewBox="0 0 24 24">
                                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                                </svg>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-white">GitHub</h4>
                                <p className="text-[11px] text-text-secondary flex items-center gap-1.5 mt-0.5">
                                    {githubAccount ? (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                            <span>Connected as {githubAccount.extra_data?.github_login ? `@${githubAccount.extra_data.github_login}` : githubAccount.provider_email || 'Active'}</span>
                                        </>
                                    ) : (
                                        <>
                                            <span className="w-1.5 h-1.5 rounded-full bg-slate-500 shrink-0" />
                                            <span>Not connected</span>
                                        </>
                                    )}
                                </p>
                            </div>
                        </div>

                        {githubAccount ? (
                            <button
                                type="button"
                                disabled={disconnectingProvider === 'github'}
                                aria-busy={disconnectingProvider === 'github'}
                                onClick={() => handleDisconnectProvider('github')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-[#1e2335] hover:border-rose-500/30 flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50"
                            >
                                {disconnectingProvider === 'github' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlink className="w-3.5 h-3.5" />}
                                <span>{disconnectingProvider === 'github' ? 'Disconnecting...' : 'Disconnect'}</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => handleConnectProvider('github')}
                                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-surface-hover text-slate-200 hover:text-white border border-[#1e2335] flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-[#1864ff]"
                            >
                                <Link2 className="w-3.5 h-3.5 text-[#1864ff]" />
                                <span>Connect</span>
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Where You're Logged In (Active Sessions) */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1e2335] pb-4">
                    <div>
                        <div className="flex items-center gap-2">
                            <Laptop className="w-4 h-4 text-[#1864ff]" />
                            <h3 className="text-sm font-bold text-white">Active Login Sessions</h3>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                            Devices currently authenticated with access to this account. You can revoke any unrecognized device immediately.
                        </p>
                    </div>

                    {sessions.filter(s => !s.is_current).length > 0 && (
                        <button
                            type="button"
                            disabled={revokingAllOthers}
                            aria-busy={revokingAllOthers}
                            onClick={handleRevokeAllOthers}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 transition-all active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-rose-500 shrink-0 self-start sm:self-auto flex items-center gap-1.5"
                        >
                            {revokingAllOthers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            <span>{revokingAllOthers ? 'Revoking Sessions...' : 'Log Out All Other Devices'}</span>
                        </button>
                    )}
                </div>

                {loadingSessions ? (
                    <div className="p-8 text-center text-xs text-text-secondary">
                        <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-[#1864ff]" />
                        Inspecting active device sessions...
                    </div>
                ) : sessions.length === 0 ? (
                    <div className="p-6 text-center rounded-xl bg-[#08090E] border border-[#1e2335] text-xs text-text-secondary">
                        No active sessions recorded.
                    </div>
                ) : (
                    <div className="space-y-3">
                        {sessions.map((s) => {
                            const DeviceIcon = getDeviceIcon(s.device_type);
                            const isCurrent = s.is_current;

                            return (
                                <div
                                    key={s.id}
                                    className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all ${
                                        isCurrent 
                                            ? 'bg-[#0F111A] border-[#1864ff]/40 shadow-sm' 
                                            : 'bg-[#08090E] border-[#1e2335]'
                                    }`}
                                >
                                    <div className="flex items-start gap-3 min-w-0">
                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                                            isCurrent 
                                                ? 'bg-[#1864ff]/15 border-[#1864ff]/30 text-[#1864ff]' 
                                                : 'bg-surface border-border text-slate-400'
                                        }`}>
                                            <DeviceIcon className="w-4 h-4" />
                                        </div>

                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-xs font-bold text-white">
                                                    {s.device_name || 'Authorized Device'}
                                                </span>
                                                {isCurrent && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold font-mono flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                                        Active Now · This Device
                                                    </span>
                                                )}
                                            </div>

                                            <div className="text-[11px] text-text-secondary flex items-center gap-3 mt-1 flex-wrap">
                                                {s.ip_address && (
                                                    <span className="font-mono text-slate-400">
                                                        IP: {s.ip_address}
                                                    </span>
                                                )}
                                                {s.location_city && (
                                                    <span className="flex items-center gap-1">
                                                        <Globe className="w-3 h-3" />
                                                        {s.location_city}
                                                    </span>
                                                )}
                                                <span className="flex items-center gap-1 text-slate-400">
                                                    <Clock className="w-3 h-3" />
                                                    Last active: {new Date(s.last_active).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {!isCurrent && (
                                        <button
                                            type="button"
                                            disabled={revokingSessionId === s.id}
                                            aria-busy={revokingSessionId === s.id}
                                            onClick={() => handleRevokeSession(s.id)}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-[#1e2335] hover:border-rose-500/30 flex items-center gap-1.5 transition-all active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-rose-500 self-end sm:self-auto"
                                        >
                                            {revokingSessionId === s.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Trash2 className="w-3.5 h-3.5 text-rose-400" />}
                                            <span>{revokingSessionId === s.id ? 'Revoking...' : 'Revoke'}</span>
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
