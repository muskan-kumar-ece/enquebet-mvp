"use client";

import React, { useState, useEffect } from 'react';
import { 
    ShieldCheck, Key, Laptop, Smartphone, 
    Tablet, Globe, Trash2, Check, AlertCircle, 
    RefreshCw, Clock, Lock
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface SecuritySectionProps {
    onPasswordChanged?: () => void;
}

export function SecuritySection({ onPasswordChanged }: SecuritySectionProps) {
    // Password state
    const [changingPassword, setChangingPassword] = useState(false);
    const [passwordData, setPasswordData] = useState({
        current_password: '',
        new_password: '',
        confirm_new_password: '',
    });

    // Sessions state
    const [sessions, setSessions] = useState<any[]>([]);
    const [loadingSessions, setLoadingSessions] = useState(true);
    const [revokingSessionId, setRevokingSessionId] = useState<string | null>(null);
    const [revokingAllOthers, setRevokingAllOthers] = useState(false);

    const loadSessions = async () => {
        setLoadingSessions(true);
        try {
            const data = await api.getUserSessions();
            setSessions(data);
        } catch (err: any) {
            console.error('Failed to load user sessions:', err);
        } finally {
            setLoadingSessions(false);
        }
    };

    useEffect(() => {
        loadSessions();
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

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-[#1e2335] pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-[#1864ff]" />
                    Password & Security
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                    Update your account password and review all recognized devices where you are currently logged in.
                </p>
            </div>

            {/* Change Password Card */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-5">
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
                            className="btn-brand px-4 py-2 text-xs font-semibold rounded-xl text-white flex items-center gap-1.5 transition-all disabled:opacity-50"
                        >
                            <Lock className="w-3.5 h-3.5" />
                            <span>{changingPassword ? 'Updating Password...' : 'Update Password'}</span>
                        </button>
                    </div>
                </form>
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
                            onClick={handleRevokeAllOthers}
                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/20 text-rose-300 transition-all shrink-0 self-start sm:self-auto"
                        >
                            {revokingAllOthers ? 'Revoking...' : 'Log Out All Other Devices'}
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
                                            onClick={() => handleRevokeSession(s.id)}
                                            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-[#1e2335] hover:border-rose-500/30 flex items-center gap-1.5 transition-all self-end sm:self-auto"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
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
