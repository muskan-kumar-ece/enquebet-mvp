"use client";

import React, { useState } from 'react';
import { FileText, Shield, Scale, AlertCircle, CheckCircle2 } from 'lucide-react';

type LegalTab = 'tos' | 'privacy' | 'conduct' | 'security';

export function LegalSection() {
    const [selectedTab, setSelectedTab] = useState<LegalTab>('tos');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="border-b border-[#1e2335] pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#1864ff]" />
                    Legal & Compliance
                </h2>
                <p className="text-xs text-text-secondary mt-0.5">
                    Platform agreements, privacy governance, community standards, and security disclosure policies.
                </p>
            </div>

            {/* Segmented Sub-Nav */}
            <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#08090E] border border-[#1e2335] overflow-x-auto scrollbar-none">
                {[
                    { id: 'tos', label: 'Terms of Service', icon: Scale },
                    { id: 'privacy', label: 'Privacy Policy', icon: Shield },
                    { id: 'conduct', label: 'Code of Conduct', icon: CheckCircle2 },
                    { id: 'security', label: 'Security & Bug Bounty', icon: AlertCircle },
                ].map((item) => {
                    const Icon = item.icon;
                    const isSelected = selectedTab === item.id;
                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => setSelectedTab(item.id as LegalTab)}
                            className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-2 whitespace-nowrap transition-all ${
                                isSelected
                                    ? 'bg-[#1864ff] text-white shadow-sm'
                                    : 'text-slate-400 hover:text-white hover:bg-surface'
                            }`}
                        >
                            <Icon className="w-3.5 h-3.5" />
                            <span>{item.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Legal Document Reader */}
            <div className="p-6 rounded-2xl bg-[#0b0d14] border border-[#1e2335] space-y-6 text-xs text-slate-300 leading-relaxed">
                {selectedTab === 'tos' && (
                    <div className="space-y-4">
                        <div className="border-b border-[#1e2335] pb-3">
                            <h3 className="text-sm font-bold text-white">Terms of Service</h3>
                            <span className="text-[10px] text-text-secondary">Effective Date: October 2026 · Version 1.2</span>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">1. Builder Collaboration & Project Ownership</h4>
                            <p>
                                By creating a project or joining a collaborative workspace on ENQUEbet, contributors retain intellectual property rights to their individual commits and pull requests, unless an explicit repository license or agreement is entered into with the project owner. ENQUEbet does not claim ownership over user deliverables.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">2. Proof of Work Cryptographic Verification</h4>
                            <p>
                                When project owners formalize a sprint completion, a cryptographic SHA-256 certificate is generated. Users acknowledge that verification certificates, task delivery records, and peer review feedback are recorded as immutable proof of authentic work.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">3. Acceptable Use</h4>
                            <p>
                                Users agree not to submit malicious software, automated scraping scripts, unauthorized copyrighted code, or engage in coordinated vote-manipulation on peer reputation scores.
                            </p>
                        </div>
                    </div>
                )}

                {selectedTab === 'privacy' && (
                    <div className="space-y-4">
                        <div className="border-b border-[#1e2335] pb-3">
                            <h3 className="text-sm font-bold text-white">Privacy Policy</h3>
                            <span className="text-[10px] text-text-secondary">Last Updated: October 2026 · Compliance: GDPR & CCPA</span>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">1. Information We Collect</h4>
                            <p>
                                We collect account authentication details (email, username, hashed passwords), user dossier credentials (skills, education, career experience), and project execution telemetry (commits, deliverables, review comments).
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">2. Public vs Private Dossiers</h4>
                            <p>
                                Users may toggle Private Dossier Mode in their Safety Settings. When enabled, contact details and detailed career credentials are restricted strictly to mutual followers. Public Proof of Work certificates display verified code hashes and contributor usernames.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">3. Data Deletion & Export</h4>
                            <p>
                                In compliance with GDPR and CCPA, users have the right to export their complete builder dossier at any time and request permanent deletion of their account and personal credentials.
                            </p>
                        </div>
                    </div>
                )}

                {selectedTab === 'conduct' && (
                    <div className="space-y-4">
                        <div className="border-b border-[#1e2335] pb-3">
                            <h3 className="text-sm font-bold text-white">Community Code of Conduct</h3>
                            <span className="text-[10px] text-text-secondary">Standard for Meritocratic Engineering</span>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">1. Authentic Peer Review Integrity</h4>
                            <p>
                                Peer reviews must reflect genuine assessments of code execution, reliability, and team collaboration. Any attempt to solicit fake reviews, create dummy bot accounts, or trade positive scores is strictly forbidden and results in immediate reputation disqualification.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">2. Mutual Respect & Inclusivity</h4>
                            <p>
                                We welcome student engineers, career switchers, and seasoned founders alike. Harassment, derogatory feedback in pull requests, and abusive direct messages will result in immediate workspace removal and platform banning.
                            </p>
                        </div>
                    </div>
                )}

                {selectedTab === 'security' && (
                    <div className="space-y-4">
                        <div className="border-b border-[#1e2335] pb-3">
                            <h3 className="text-sm font-bold text-white">Security & Responsible Disclosure</h3>
                            <span className="text-[10px] text-text-secondary">Bug Bounty & Vulnerability Reporting</span>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">1. Reporting Vulnerabilities</h4>
                            <p>
                                We deeply value security researchers. If you identify a potential security vulnerability (e.g. Broken Object Level Authorization, XSS, or Token leakage), please report it to <code>security@enquebet.com</code> with steps to reproduce.
                            </p>
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-white">2. Safe Harbor Policy</h4>
                            <p>
                                As long as research is conducted in good faith, does not degrade platform availability, and does not compromise other builders' data, we will not pursue legal action against security researchers.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
