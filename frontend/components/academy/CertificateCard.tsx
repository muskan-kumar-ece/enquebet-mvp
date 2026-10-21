'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Award, ShieldCheck, Copy, Check, ExternalLink, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { CourseCompletion } from '@/types/academy';

interface CertificateCardProps {
    certificate: CourseCompletion;
}

export default function CertificateCard({ certificate }: CertificateCardProps) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(certificate.certificate_code);
        setCopied(true);
        toast.success('Certificate code copied to clipboard!');
        setTimeout(() => setCopied(false), 2000);
    };

    const formattedDate = certificate.completed_at
        ? new Date(certificate.completed_at).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : 'Completed';

    return (
        <div className="relative rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/[0.05] via-[#0c0d15] to-[#08090f] p-6 sm:p-10 shadow-2xl overflow-hidden">
            {/* Ambient decorative watermark */}
            <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-amber-500/5 blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto">
                {/* Header Badge */}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30 mb-6">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span>Verified Academic Milestone</span>
                </div>

                <div className="text-[11px] font-mono tracking-widest uppercase text-zinc-500 mb-2">
                    ENQUEbet Academy
                </div>

                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
                    Certificate of Engineering Completion
                </h2>

                <p className="text-xs text-zinc-400 mb-6">
                    This certifies that the recipient has successfully completed all curriculum modules and practical
                    assignments for
                </p>

                {/* Course Title Box */}
                <div className="w-full p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] mb-6">
                    <div className="text-sm sm:text-base font-bold text-white mb-1">
                        {certificate.course_title}
                    </div>
                    <div className="text-xs font-mono text-zinc-400">
                        Awarded to <span className="text-[#60a5fa] font-semibold">{certificate.learner_name || certificate.learner_username}</span>
                    </div>
                </div>

                {/* Certificate Code & Verification Details */}
                <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-xl bg-black/40 border border-[#1b1e2c] mb-6">
                    <div className="text-left">
                        <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-500">
                            Verification Credential
                        </div>
                        <div className="font-mono text-xs sm:text-sm font-semibold text-amber-300">
                            {certificate.certificate_code}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleCopy}
                            className="btn-outline text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? 'Copied' : 'Copy Code'}</span>
                        </button>

                        <Link
                            href={`/courses/certificates/${certificate.certificate_code}`}
                            className="btn-brand text-xs px-2.5 py-1.5 inline-flex items-center gap-1.5"
                        >
                            <span>Public Verification</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                    </div>
                </div>

                {/* Date & Disclaimer */}
                <div className="text-[11px] font-mono text-zinc-500 mb-4">
                    Issued on {formattedDate}
                </div>

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[11px] text-zinc-400 leading-relaxed text-left">
                    <span className="font-semibold text-zinc-300">Educational Boundary Notice:</span> This credential certifies
                    academic mastery of course coursework. Practical builder reputation points and tamper-evident Proof of Work
                    credentials remain strictly governed by verified deliverable reviews in collaborative Workspaces.
                </div>
            </div>
        </div>
    );
}
