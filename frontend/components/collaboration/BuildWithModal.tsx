'use client';

import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Briefcase, Clock, Link as LinkIcon, Send, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';

interface BuildWithModalProps {
    isOpen: boolean;
    onClose: () => void;
    postId: string;
    postTitle: string;
    postRequirements?: string[] | { role?: string; skill?: string }[];
    onRequestSent?: () => void;
}

const DEFAULT_ROLES = [
    'Full-Stack Developer',
    'Frontend Engineer',
    'Backend Engineer',
    'Mobile Developer',
    'UI/UX Designer',
    'AI / ML Engineer',
    'DevOps / Cloud',
    'Product / Growth',
];

const COMMITMENT_OPTIONS = [
    { id: '< 5 hrs/wk', label: '< 5 hrs/wk', desc: 'Advisory / Light' },
    { id: '5–10 hrs/wk', label: '5–10 hrs/wk', desc: 'Part-time' },
    { id: '10–20 hrs/wk', label: '10–20 hrs/wk', desc: 'Core Builder' },
    { id: '20+ hrs/wk', label: '20+ hrs/wk', desc: 'Dedicated' },
];

export const BuildWithModal: React.FC<BuildWithModalProps> = ({
    isOpen,
    onClose,
    postId,
    postTitle,
    postRequirements = [],
    onRequestSent,
}) => {
    // Parse roles from post requirements
    const parsedRoles = React.useMemo(() => {
        const roles: string[] = [];
        if (Array.isArray(postRequirements)) {
            postRequirements.forEach((req) => {
                if (typeof req === 'string' && req.trim()) {
                    roles.push(req.trim());
                } else if (req && typeof req === 'object') {
                    if (req.role) roles.push(req.role);
                    else if (req.skill) roles.push(req.skill);
                }
            });
        }
        // Merge with defaults while avoiding duplicates
        const combined = Array.from(new Set([...roles, ...DEFAULT_ROLES]));
        return combined.slice(0, 10);
    }, [postRequirements]);

    const [selectedRole, setSelectedRole] = useState<string>(() => parsedRoles[0] || 'Full-Stack Developer');
    const [customRole, setCustomRole] = useState<string>('');
    const [pitch, setPitch] = useState<string>('');
    const [commitment, setCommitment] = useState<string>('5–10 hrs/wk');
    const [portfolioUrl, setPortfolioUrl] = useState<string>('');
    
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<boolean>(false);

    const isSubmittingRef = useRef<boolean>(false);
    const modalRef = useRef<HTMLDivElement>(null);

    const handleClose = () => {
        if (isSubmitting) return;
        setSelectedRole(parsedRoles[0] || 'Full-Stack Developer');
        setCustomRole('');
        setPitch('');
        setCommitment('5–10 hrs/wk');
        setPortfolioUrl('');
        setError(null);
        setSuccess(false);
        isSubmittingRef.current = false;
        onClose();
    };

    // Handle Escape key to close modal
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !isSubmitting) {
                handleClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isSubmitting]);

    if (!isOpen) return null;

    const effectiveRole = selectedRole === 'Custom' ? customRole.trim() : selectedRole;
    const isPitchValid = pitch.trim().length >= 20;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isSubmittingRef.current) return;

        if (!effectiveRole) {
            setError('Please select or specify the role you would like to contribute.');
            return;
        }

        if (pitch.trim().length < 20) {
            setError('Please write at least 20 characters explaining how you can help.');
            return;
        }

        if (portfolioUrl.trim()) {
            try {
                new URL(portfolioUrl.trim().startsWith('http') ? portfolioUrl.trim() : `https://${portfolioUrl.trim()}`);
            } catch {
                setError('Please provide a valid URL for your portfolio or GitHub profile.');
                return;
            }
        }

        setError(null);
        setIsSubmitting(true);
        isSubmittingRef.current = true;

        const clientRequestId = typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `req_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const normalizedUrl = portfolioUrl.trim()
            ? (portfolioUrl.trim().startsWith('http') ? portfolioUrl.trim() : `https://${portfolioUrl.trim()}`)
            : '';

        try {
            await api.sendCollaborationRequest(postId, {
                role: effectiveRole,
                pitch: pitch.trim(),
                weekly_commitment: commitment,
                portfolio_url: normalizedUrl,
                client_request_id: clientRequestId,
            });

            setSuccess(true);
            if (onRequestSent) {
                onRequestSent();
            }
            setTimeout(() => {
                onClose();
            }, 1200);
        } catch (err: any) {
            const msg = err?.message || 'Failed to send collaboration request. Please try again.';
            if (msg.includes('already sent') || msg.includes('already a member')) {
                // If it's already sent, treat gracefully
                setSuccess(true);
                if (onRequestSent) onRequestSent();
                setTimeout(() => onClose(), 1200);
            } else {
                setError(msg);
                setIsSubmitting(false);
                isSubmittingRef.current = false;
            }
        }
    };

    return (
        <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
            role="dialog"
            aria-modal="true"
            aria-labelledby="build-with-dialog-title"
        >
            <div 
                ref={modalRef}
                className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            >
                {/* Header */}
                <div className="flex items-start justify-between p-5 border-b border-slate-800/80 bg-slate-900/60">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 shrink-0">
                            <Sparkles className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 id="build-with-dialog-title" className="text-lg font-bold text-white leading-tight">
                                Build With
                            </h2>
                            <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">
                                {postTitle}
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                        aria-label="Close dialog"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body / Form */}
                {success ? (
                    <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 animate-in zoom-in-75 duration-300">
                            <CheckCircle2 className="w-8 h-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-white">Collaboration Request Sent!</h3>
                            <p className="text-sm text-slate-400 mt-1 max-w-sm">
                                The project creator has been notified with your pitch and role. You will be alerted when they respond.
                            </p>
                        </div>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5">
                        {error && (
                            <div className="flex items-start gap-2.5 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                                <span>{error}</span>
                            </div>
                        )}

                        {/* Step 1: Role Selection */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                                <span>Your Role or Track *</span>
                            </label>
                            <div className="flex flex-wrap gap-1.5">
                                {parsedRoles.map((role) => (
                                    <button
                                        key={role}
                                        type="button"
                                        onClick={() => setSelectedRole(role)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                            selectedRole === role
                                                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                                        }`}
                                    >
                                        {role}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => setSelectedRole('Custom')}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        selectedRole === 'Custom'
                                            ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/30'
                                            : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/60'
                                    }`}
                                >
                                    + Custom
                                </button>
                            </div>

                            {selectedRole === 'Custom' && (
                                <input
                                    type="text"
                                    value={customRole}
                                    onChange={(e) => setCustomRole(e.target.value)}
                                    placeholder="Enter your specialized role (e.g. Smart Contract Auditor)"
                                    className="w-full mt-2 px-3.5 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    maxLength={100}
                                    autoFocus
                                />
                            )}
                        </div>

                        {/* Step 2: Pitch / Why you want to build this */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                                    <span>Why you want to build this? *</span>
                                </label>
                                <span className={`text-[11px] ${pitch.trim().length >= 20 ? 'text-slate-400' : 'text-amber-400'}`}>
                                    {pitch.trim().length} / 1000 min 20
                                </span>
                            </div>
                            <textarea
                                value={pitch}
                                onChange={(e) => setPitch(e.target.value)}
                                rows={4}
                                maxLength={1000}
                                placeholder="Explain what relevant experience you bring, which part of this project you want to build, and why you are excited..."
                                className="w-full px-3.5 py-2.5 text-xs bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                            />
                            <p className="text-[11px] text-slate-500">
                                Specific pitches that highlight past projects or exact architecture have a 3x higher acceptance rate.
                            </p>
                        </div>

                        {/* Step 3: Weekly Commitment */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Weekly Commitment *</span>
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {COMMITMENT_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setCommitment(opt.id)}
                                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                                            commitment === opt.id
                                                ? 'bg-blue-600/10 border-blue-500 text-white'
                                                : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                                        }`}
                                    >
                                        <span className="text-xs font-semibold text-white">{opt.label}</span>
                                        <span className="text-[10px] text-slate-400 mt-0.5">{opt.desc}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Step 4: Portfolio or Proof of Work Link */}
                        <div className="space-y-2">
                            <label className="flex items-center gap-2 text-xs font-semibold text-slate-300 uppercase tracking-wider">
                                <LinkIcon className="w-3.5 h-3.5 text-blue-400" />
                                <span>Portfolio / GitHub / Proof of Work (Optional)</span>
                            </label>
                            <input
                                type="url"
                                value={portfolioUrl}
                                onChange={(e) => setPortfolioUrl(e.target.value)}
                                placeholder="https://github.com/yourusername or portfolio link"
                                className="w-full px-3.5 py-2 text-xs bg-slate-800/80 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                maxLength={500}
                            />
                        </div>

                        {/* Submit CTA */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={isSubmitting || !effectiveRole || !isPitchValid}
                                className="w-full py-3 px-4 rounded-xl font-semibold text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span>Submitting Proposal...</span>
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        <span>Submit Build With Proposal</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
};

export default BuildWithModal;
