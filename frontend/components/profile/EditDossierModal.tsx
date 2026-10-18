"use client";

import React, { useState, useEffect } from 'react';
import { X, Check, ShieldCheck, Briefcase, GraduationCap, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import toast from 'react-hot-toast';

interface EditDossierModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    onSaved: () => void;
}

const AVAILABILITY_OPTIONS = [
    { value: 'open_to_cofound', label: 'Open for Co-founding', desc: 'Looking for technical or business co-founders' },
    { value: 'open_to_collaborate', label: 'Open to Collaborate', desc: 'Available for exciting hackathons or side projects' },
    { value: 'hiring', label: 'Hiring Builders', desc: 'Actively recruiting contributors or team members' },
    { value: 'open_to_work', label: 'Open to Work', desc: 'Open to internships, contract, or full-time roles' },
    { value: 'focused', label: 'Deep Focus Mode', desc: 'Heads-down building current venture, low bandwidth' }
];

export default function EditDossierModal({ isOpen, onClose, user, onSaved }: EditDossierModalProps) {
    const [availabilityStatus, setAvailabilityStatus] = useState(user?.availability_status || 'open_to_collaborate');
    const [headline, setHeadline] = useState(user?.headline || '');
    const [pinnedProofIds, setPinnedProofIds] = useState<string[]>(user?.pinned_proof_ids || []);
    const [availableProofs, setAvailableProofs] = useState<any[]>([]);
    const [loadingProofs, setLoadingProofs] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form tab: 'dossier' | 'add_experience' | 'add_education'
    const [activeTab, setActiveTab] = useState<'dossier' | 'add_experience' | 'add_education'>('dossier');

    // Experience form state
    const [expCompany, setExpCompany] = useState('');
    const [expRole, setExpRole] = useState('');
    const [expLocation, setExpLocation] = useState('');
    const [expRemote, setExpRemote] = useState(false);
    const [expStartDate, setExpStartDate] = useState('');
    const [expEndDate, setExpEndDate] = useState('');
    const [expCurrent, setExpCurrent] = useState(false);
    const [expDesc, setExpDesc] = useState('');
    const [expSkills, setExpSkills] = useState('');

    // Education form state
    const [eduInstitution, setEduInstitution] = useState('');
    const [eduDegree, setEduDegree] = useState('');
    const [eduField, setEduField] = useState('');
    const [eduStartYear, setEduStartYear] = useState('');
    const [eduEndYear, setEduEndYear] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAvailabilityStatus(user?.availability_status || 'open_to_collaborate');
            setHeadline(user?.headline || '');
            setPinnedProofIds(user?.pinned_proof_ids || []);
            fetchAvailableProofs();
        }
    }, [isOpen, user]);

    const fetchAvailableProofs = async () => {
        setLoadingProofs(true);
        try {
            const data = await api.getUserProofs();
            setAvailableProofs(data || []);
        } catch {
            // Non-critical if user has no proofs yet
        } finally {
            setLoadingProofs(false);
        }
    };

    if (!isOpen) return null;

    const toggleProofPin = (proofId: string) => {
        if (pinnedProofIds.includes(proofId)) {
            setPinnedProofIds(pinnedProofIds.filter((id) => id !== proofId));
        } else {
            if (pinnedProofIds.length >= 4) {
                toast.error('You can pin up to 4 Proofs of Work.');
                return;
            }
            setPinnedProofIds([...pinnedProofIds, proofId]);
        }
    };

    const handleSaveDossier = async () => {
        setSaving(true);
        try {
            await api.updateDossierPreferences({
                availability_status: availabilityStatus,
                headline: headline.trim(),
                pinned_proof_ids: pinnedProofIds
            });
            toast.success('Dossier updated successfully!');
            onSaved();
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Failed to update dossier');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateExperience = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!expCompany || !expRole || !expStartDate) {
            toast.error('Please fill company, role, and start date');
            return;
        }
        setSaving(true);
        try {
            const skillsArray = expSkills
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);

            await api.createExperience({
                company_name: expCompany,
                role_title: expRole,
                location: expLocation,
                is_remote: expRemote,
                start_date: expStartDate,
                end_date: expCurrent ? null : expEndDate || null,
                is_current: expCurrent,
                description: expDesc,
                skills_used: skillsArray
            });

            toast.success('Experience role added!');
            // Reset form
            setExpCompany('');
            setExpRole('');
            setExpLocation('');
            setExpStartDate('');
            setExpEndDate('');
            setExpDesc('');
            setExpSkills('');
            setActiveTab('dossier');
            onSaved();
        } catch (err: any) {
            toast.error(err.message || 'Failed to add experience');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateEducation = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!eduInstitution || !eduDegree || !eduStartYear) {
            toast.error('Please fill institution, degree, and start year');
            return;
        }
        setSaving(true);
        try {
            await api.createEducation({
                institution: eduInstitution,
                degree: eduDegree,
                field_of_study: eduField,
                start_year: parseInt(eduStartYear, 10),
                end_year: eduEndYear ? parseInt(eduEndYear, 10) : null
            });

            toast.success('Academic credential added!');
            setEduInstitution('');
            setEduDegree('');
            setEduField('');
            setEduStartYear('');
            setEduEndYear('');
            setActiveTab('dossier');
            onSaved();
        } catch (err: any) {
            toast.error(err.message || 'Failed to add education');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <div className="w-full max-w-2xl rounded-3xl border border-white/[0.1] bg-[#0c0c16] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.08]">
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">Edit Builder Dossier</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Manage availability beacon, headline, and pinned cryptographic Proofs of Work.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-nav Tabs */}
                <div className="flex border-b border-border px-6 gap-6 text-sm">
                    <button
                        onClick={() => setActiveTab('dossier')}
                        className={`py-3 font-semibold border-b-2 transition-colors ${
                            activeTab === 'dossier'
                                ? 'border-brand text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Preferences & Pins
                    </button>
                    <button
                        onClick={() => setActiveTab('add_experience')}
                        className={`py-3 font-semibold border-b-2 transition-colors ${
                            activeTab === 'add_experience'
                                ? 'border-brand text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        + Add Experience
                    </button>
                    <button
                        onClick={() => setActiveTab('add_education')}
                        className={`py-3 font-semibold border-b-2 transition-colors ${
                            activeTab === 'add_education'
                                ? 'border-brand text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        + Add Education
                    </button>
                </div>

                {/* Scrollable Modal Body */}
                <div className="p-6 overflow-y-auto space-y-6 flex-1">
                    {activeTab === 'dossier' && (
                        <>
                            {/* Headline */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2">
                                    Builder Headline
                                </label>
                                <input
                                    type="text"
                                    value={headline}
                                    onChange={(e) => setHeadline(e.target.value)}
                                    maxLength={200}
                                    placeholder="e.g. Founding AI Engineer · Distributed Systems @ IIT Bombay"
                                    className="w-full px-4 py-2.5 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors"
                                />
                                <div className="text-[11px] text-zinc-500 text-right mt-1">
                                    {headline.length}/200
                                </div>
                            </div>

                            {/* Availability Beacon */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-2.5">
                                    Availability Beacon
                                </label>
                                <div className="space-y-2">
                                    {AVAILABILITY_OPTIONS.map((opt) => (
                                        <label
                                            key={opt.value}
                                            onClick={() => setAvailabilityStatus(opt.value)}
                                            className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                                                availabilityStatus === opt.value
                                                    ? 'bg-brand/10 border-brand/40 text-white'
                                                    : 'bg-surface/50 border-border text-zinc-300 hover:bg-surface'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="availability"
                                                checked={availabilityStatus === opt.value}
                                                onChange={() => setAvailabilityStatus(opt.value)}
                                                className="mt-1 accent-brand"
                                            />
                                            <div>
                                                <div className="text-sm font-semibold">{opt.label}</div>
                                                <div className="text-xs text-zinc-400 mt-0.5">{opt.desc}</div>
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Pinned Proof of Work Showcase */}
                            <div>
                                <div className="flex items-center justify-between mb-2.5">
                                    <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                                        Pinned Proof of Work Cards
                                    </label>
                                    <span className="text-xs text-zinc-400 font-mono">
                                        {pinnedProofIds.length}/4 selected
                                    </span>
                                </div>

                                {loadingProofs ? (
                                    <div className="text-xs text-zinc-500 py-3">Loading your proofs...</div>
                                ) : availableProofs.length === 0 ? (
                                    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] text-xs text-zinc-400 text-center">
                                        No Proof of Work tokens minted yet. Complete a project workspace to mint your first token!
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                                        {availableProofs.map((p) => {
                                            const isPinned = pinnedProofIds.includes(p.id);
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => toggleProofPin(p.id)}
                                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                                        isPinned
                                                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-200'
                                                            : 'bg-white/[0.02] border-white/[0.06] text-zinc-300 hover:bg-white/[0.04]'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2.5 truncate">
                                                        <ShieldCheck className={`w-4 h-4 ${isPinned ? 'text-emerald-400' : 'text-zinc-500'}`} />
                                                        <span className="text-xs font-mono font-bold">{p.verification_code}</span>
                                                        <span className="text-xs text-zinc-300 truncate">{p.project_title}</span>
                                                    </div>
                                                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded ${isPinned ? 'bg-emerald-500/20 text-emerald-300' : 'text-zinc-500'}`}>
                                                        {isPinned ? 'Pinned' : 'Pin'}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </>
                    )}

                    {/* Add Experience Form */}
                    {activeTab === 'add_experience' && (
                        <form onSubmit={handleCreateExperience} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Role / Title *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={expRole}
                                        onChange={(e) => setExpRole(e.target.value)}
                                        placeholder="e.g. Lead Backend Architect"
                                        className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Company / Venture *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={expCompany}
                                        onChange={(e) => setExpCompany(e.target.value)}
                                        placeholder="e.g. Stealth AI Startup"
                                        className="w-full px-3.5 py-2 rounded-lg bg-surface border border-border text-white text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Start Date *
                                    </label>
                                    <input
                                        type="date"
                                        required
                                        value={expStartDate}
                                        onChange={(e) => setExpStartDate(e.target.value)}
                                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        End Date
                                    </label>
                                    <input
                                        type="date"
                                        disabled={expCurrent}
                                        value={expEndDate}
                                        onChange={(e) => setExpEndDate(e.target.value)}
                                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff] disabled:opacity-40"
                                    />
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="currentRole"
                                    checked={expCurrent}
                                    onChange={(e) => setExpCurrent(e.target.checked)}
                                    className="accent-[#1864ff]"
                                />
                                <label htmlFor="currentRole" className="text-xs text-zinc-300 cursor-pointer">
                                    I am currently working in this role
                                </label>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                    Location
                                </label>
                                <input
                                    type="text"
                                    value={expLocation}
                                    onChange={(e) => setExpLocation(e.target.value)}
                                    placeholder="e.g. San Francisco, CA or Remote"
                                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                    Skills / Tech Stack (comma separated)
                                </label>
                                <input
                                    type="text"
                                    value={expSkills}
                                    onChange={(e) => setExpSkills(e.target.value)}
                                    placeholder="Rust, PostgreSQL, Next.js, Docker"
                                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                    Description & Impact
                                </label>
                                <textarea
                                    rows={3}
                                    value={expDesc}
                                    onChange={(e) => setExpDesc(e.target.value)}
                                    placeholder="Describe your architectural decisions, key deliverables, and scale achieved."
                                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff] resize-none"
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('dossier')}
                                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-brand px-5 py-2 text-xs font-semibold"
                                >
                                    {saving ? 'Adding...' : 'Save Experience'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Add Education Form */}
                    {activeTab === 'add_education' && (
                        <form onSubmit={handleCreateEducation} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                    Institution / University *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={eduInstitution}
                                    onChange={(e) => setEduInstitution(e.target.value)}
                                    placeholder="e.g. Indian Institute of Technology Bombay"
                                    className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Degree *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={eduDegree}
                                        onChange={(e) => setEduDegree(e.target.value)}
                                        placeholder="e.g. Bachelor of Technology"
                                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Field of Study
                                    </label>
                                    <input
                                        type="text"
                                        value={eduField}
                                        onChange={(e) => setEduField(e.target.value)}
                                        placeholder="e.g. Computer Science & Engineering"
                                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Start Year *
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min={1970}
                                        max={2035}
                                        value={eduStartYear}
                                        onChange={(e) => setEduStartYear(e.target.value)}
                                        placeholder="2022"
                                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        End Year (or Expected)
                                    </label>
                                    <input
                                        type="number"
                                        min={1970}
                                        max={2035}
                                        value={eduEndYear}
                                        onChange={(e) => setEduEndYear(e.target.value)}
                                        placeholder="2026"
                                        className="w-full px-3.5 py-2 rounded-xl bg-white/[0.04] border border-white/[0.08] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setActiveTab('dossier')}
                                    className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="btn-brand px-5 py-2 text-xs font-semibold"
                                >
                                    {saving ? 'Adding...' : 'Save Education'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer for Dossier Preferences */}
                {activeTab === 'dossier' && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-white/[0.08] bg-[#090910]">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={handleSaveDossier}
                            disabled={saving}
                            className="btn-primary px-5 py-2 text-sm font-semibold"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
