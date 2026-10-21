"use client";

import React, { useState } from 'react';
import { User, Mail, Sparkles, LogOut, Check, AlertCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface AccountSectionProps {
    user: any;
    onUpdateUser: (data: any) => Promise<void>;
    onLogout: (allDevices?: boolean) => Promise<void>;
}

export function AccountSection({ user, onUpdateUser, onLogout }: AccountSectionProps) {
    const [saving, setSaving] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [loggingOut, setLoggingOut] = useState(false);

    const [formData, setFormData] = useState({
        username: user?.username || '',
        email: user?.email || '',
        full_name: user?.full_name || '',
        headline: user?.headline || '',
        bio: user?.bio || '',
        availability_status: user?.availability_status || 'open_to_collaborate',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await onUpdateUser(formData);
            toast.success('Account profile updated successfully');
        } catch (err: any) {
            toast.error(err.message || 'Failed to update account profile');
        } finally {
            setSaving(false);
        }
    };

    const handleConfirmLogout = async (allDevices: boolean = false) => {
        setLoggingOut(true);
        try {
            await onLogout(allDevices);
        } catch (err: any) {
            toast.error('Logout failed');
            setLoggingOut(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-[#1e2335] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <User className="w-5 h-5 text-[#1864ff]" />
                        Account & Identity
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                        Manage your verified builder username, primary email, headline, and bio.
                    </p>
                </div>

                <button
                    type="button"
                    onClick={() => setShowLogoutModal(true)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-xl bg-surface hover:bg-surface-hover active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-rose-500 border border-[#1e2335] text-slate-300 hover:text-white flex items-center gap-2 transition-all shrink-0 self-start sm:self-auto"
                >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Log Out</span>
                </button>
            </div>

            {/* Profile Form */}
            <form onSubmit={handleSubmit} className="space-y-5">
                <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                        Primary Credentials
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                Username
                            </label>
                            <div className="relative">
                                <span className="absolute left-3 top-2.5 text-xs text-text-secondary">@</span>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full text-xs pl-7 pr-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                                Email Address
                            </label>
                            <div className="relative">
                                <Mail className="w-3.5 h-3.5 absolute left-3 top-2.5 text-text-secondary" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                                    required
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Full Name
                        </label>
                        <input
                            type="text"
                            value={formData.full_name}
                            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                            placeholder="Your full name or pseudonym"
                            className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                        />
                    </div>
                </div>

                {/* Professional Dossier Summary */}
                <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-4">
                    <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                        Builder Dossier Intro
                    </h3>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Headline / Focus Area
                        </label>
                        <input
                            type="text"
                            value={formData.headline}
                            onChange={(e) => setFormData({ ...formData, headline: e.target.value })}
                            placeholder="e.g. Distributed Systems Engineer · Building AI Workflows"
                            className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff]"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Builder Bio
                        </label>
                        <textarea
                            rows={3}
                            value={formData.bio}
                            onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                            placeholder="Share your engineering background, active projects, and technical stack..."
                            className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white placeholder-text-secondary/50 focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff] resize-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                            Current Availability Status
                        </label>
                        <select
                            value={formData.availability_status}
                            onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
                            className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-[#1864ff] focus:ring-1 focus:ring-[#1864ff] cursor-pointer"
                        >
                            <option value="open_to_collaborate">Open to Collaborate</option>
                            <option value="open_to_cofound">Open to Co-found</option>
                            <option value="hiring">Hiring Builders</option>
                            <option value="open_to_work">Open to Work</option>
                            <option value="focused">Focused on Building</option>
                        </select>
                    </div>
                </div>

                <div className="flex justify-end">
                    <button
                        type="submit"
                        disabled={saving}
                        aria-busy={saving}
                        className="btn-brand px-5 py-2 text-xs font-semibold rounded-xl text-white flex items-center gap-2 transition-all active:scale-[0.98] touch-manipulation focus-visible:ring-2 focus-visible:ring-brand disabled:opacity-50"
                    >
                        {saving ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Saving Changes...</span>
                            </>
                        ) : (
                            <>
                                <Check className="w-3.5 h-3.5" />
                                <span>Save Account</span>
                            </>
                        )}
                    </button>
                </div>
            </form>

            {/* Logout Modal */}
            {showLogoutModal && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#0F111A] border border-[#1e2335] rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Confirm Log Out</h3>
                                <p className="text-xs text-text-secondary">Choose your sign-out preference</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                            Are you sure you want to sign out of ENQUEbet? You can sign out of this device only or revoke all active sessions across all devices.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-2 pt-2">
                            <button
                                type="button"
                                disabled={loggingOut}
                                aria-busy={loggingOut}
                                onClick={() => handleConfirmLogout(false)}
                                className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white transition-all active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-[#1864ff] disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                                <span>{loggingOut ? 'Signing out...' : 'Sign Out This Device'}</span>
                            </button>

                            <button
                                type="button"
                                disabled={loggingOut}
                                aria-busy={loggingOut}
                                onClick={() => handleConfirmLogout(true)}
                                className="flex-1 px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 transition-all active:scale-95 touch-manipulation focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 flex items-center justify-center gap-1.5"
                            >
                                {loggingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-300" /> : null}
                                <span>Sign Out All Devices</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => setShowLogoutModal(false)}
                            className="w-full py-2 text-xs font-semibold text-slate-400 hover:text-white active:scale-95 transition-all touch-manipulation"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
