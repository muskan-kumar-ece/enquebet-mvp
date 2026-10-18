"use client";

import React, { useState } from 'react';
import { AlertTriangle, Trash2, Lock, X, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';

interface DangerZoneModalProps {
    onAccountDeleted: () => void;
    onPostsDeleted: () => void;
}

export function DangerZoneModal({ onAccountDeleted, onPostsDeleted }: DangerZoneModalProps) {
    const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
    const [showDeletePostsModal, setShowDeletePostsModal] = useState(false);

    // Form inputs for account deletion
    const [confirmPhrase, setConfirmPhrase] = useState('');
    const [password, setPassword] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [deletingPosts, setDeletingPosts] = useState(false);

    const requiredPhrase = "DELETE MY ENQUEBET ACCOUNT";
    const isPhraseValid = confirmPhrase.trim() === requiredPhrase;
    const canSubmitDelete = isPhraseValid && password.length >= 1;

    const handleDeleteAccount = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!canSubmitDelete) return;

        setDeletingAccount(true);
        try {
            await api.deleteMeSecurely(password, confirmPhrase);
            toast.success('Account permanently deleted');
            setShowDeleteAccountModal(false);
            onAccountDeleted();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete account');
        } finally {
            setDeletingAccount(false);
        }
    };

    const handleDeleteAllPosts = async () => {
        setDeletingPosts(true);
        try {
            await api.deleteMyPosts();
            toast.success('All posts deleted');
            setShowDeletePostsModal(false);
            onPostsDeleted();
        } catch (err: any) {
            toast.error(err.message || 'Failed to delete posts');
        } finally {
            setDeletingPosts(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-rose-500/20 pb-4">
                <h2 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    Danger Zone
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                    Irreversible actions that result in permanent data deletion. Proceed with extreme caution.
                </p>
            </div>

            {/* Warning Banner */}
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="text-xs text-rose-300 leading-relaxed">
                    <strong>Permanent Erasure Notice:</strong> Actions in this zone cannot be reversed by ENQUEbet staff. Deleting your account invalidates your cryptographic Proof of Work records, revokes all repository collaboration ownership, and forfeits your reputation points.
                </div>
            </div>

            {/* Danger Actions Cards */}
            <div className="space-y-4">
                {/* Delete All Posts */}
                <div className="p-5 rounded-2xl bg-[#0b0d14] border border-[#1e2335] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-white">Delete All Posts & Updates</h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                            Permanently removes all engineering articles, media attachments, and comments you authored.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowDeletePostsModal(true)}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-surface hover:bg-rose-500/10 text-slate-300 hover:text-rose-400 border border-[#1e2335] hover:border-rose-500/30 transition-all shrink-0 self-start sm:self-auto"
                    >
                        Delete All Posts
                    </button>
                </div>

                {/* Delete Entire Account */}
                <div className="p-5 rounded-2xl bg-[#0b0d14] border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h3 className="text-sm font-bold text-white">Permanently Delete Account</h3>
                        <p className="text-xs text-text-secondary mt-0.5">
                            Completely wipe your builder identity, dossier credentials, and active device sessions from the database.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowDeleteAccountModal(true)}
                        className="px-4 py-2 text-xs font-semibold rounded-xl bg-rose-500 hover:bg-rose-600 text-white shadow-lg shadow-rose-500/20 transition-all shrink-0 self-start sm:self-auto"
                    >
                        Delete Account
                    </button>
                </div>
            </div>

            {/* Gated Multi-Step Account Deletion Modal */}
            {showDeleteAccountModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-lg bg-[#0F111A] border-2 border-rose-500/40 rounded-2xl p-6 shadow-2xl space-y-5 animate-in fade-in duration-200">
                        <div className="flex items-start justify-between gap-4 border-b border-[#1e2335] pb-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                                    <Trash2 className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-white">Permanently Delete Account?</h3>
                                    <span className="text-[10px] text-rose-400 font-mono font-bold uppercase tracking-wider">
                                        Destructive · Cannot be undone
                                    </span>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowDeleteAccountModal(false)}
                                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-surface"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Consequences Checklist */}
                        <div className="p-4 rounded-xl bg-[#08090E] border border-rose-500/20 space-y-2 text-xs text-slate-300">
                            <span className="font-bold text-rose-400 block mb-1">
                                By deleting this account, you acknowledge that:
                            </span>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>All personal credentials, career timeline, and skills will be erased.</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>Cryptographic Proof of Work claims cannot be re-assigned.</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span>Your reputation score and verified builder tier are forfeited.</span>
                            </div>
                        </div>

                        <form onSubmit={handleDeleteAccount} className="space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    To confirm, type <span className="text-rose-400 font-mono font-bold select-all">{requiredPhrase}</span>:
                                </label>
                                <input
                                    type="text"
                                    value={confirmPhrase}
                                    onChange={(e) => setConfirmPhrase(e.target.value)}
                                    placeholder={requiredPhrase}
                                    className="w-full text-xs font-mono px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-semibold text-slate-300 block mb-1">
                                    Enter your account password:
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Your password"
                                    className="w-full text-xs px-3 py-2 rounded-xl bg-[#08090E] border border-[#1e2335] text-white focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                                    required
                                />
                            </div>

                            <div className="flex items-center gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setShowDeleteAccountModal(false)}
                                    className="flex-1 py-2 text-xs font-semibold rounded-xl bg-surface hover:bg-surface-hover border border-[#1e2335] text-slate-300 hover:text-white transition-all"
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    disabled={!canSubmitDelete || deletingAccount}
                                    className="flex-1 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-30 disabled:cursor-not-allowed text-white shadow-lg shadow-rose-600/30 transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    <span>{deletingAccount ? 'Erasing Account...' : 'Permanently Delete'}</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Posts Deletion Confirmation Modal */}
            {showDeletePostsModal && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-[#0F111A] border border-[#1e2335] rounded-2xl p-6 shadow-2xl space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                                <Trash2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-white">Delete All Posts?</h3>
                                <p className="text-xs text-text-secondary">This action cannot be undone.</p>
                            </div>
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed">
                            Are you sure you want to permanently delete all your posts and published updates? Comments, bookmarks, and likes associated with them will also be removed.
                        </p>

                        <div className="flex items-center gap-3 pt-2">
                            <button
                                type="button"
                                onClick={() => setShowDeletePostsModal(false)}
                                className="flex-1 py-2 text-xs font-semibold rounded-xl bg-surface hover:bg-surface-hover border border-[#1e2335] text-slate-300 hover:text-white transition-all"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                disabled={deletingPosts}
                                onClick={handleDeleteAllPosts}
                                className="flex-1 py-2 text-xs font-bold rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white transition-all"
                            >
                                {deletingPosts ? 'Deleting...' : 'Confirm Delete All'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
