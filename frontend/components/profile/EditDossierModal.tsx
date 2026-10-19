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

const COLLAB_PREFERENCE_OPTIONS = [
    'AI Systems & Models',
    'Open Source Ventures',
    'Full-Stack Architecture',
    'Robotics & Hardware / BOM',
    'Campus Hackathons',
    'Contract Engineering'
];

export default function EditDossierModal({ isOpen, onClose, user, onSaved }: EditDossierModalProps) {
    const [availabilityStatus, setAvailabilityStatus] = useState(user?.availability_status || 'open_to_collaborate');
    const [headline, setHeadline] = useState(user?.headline || '');
    const [pinnedProofIds, setPinnedProofIds] = useState<string[]>(user?.pinned_proof_ids || []);
    const [collaborationPreferences, setCollaborationPreferences] = useState<string[]>(user?.collaboration_preferences || []);
    const [availableProofs, setAvailableProofs] = useState<any[]>([]);
    const [loadingProofs, setLoadingProofs] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form tab: 'dossier' | 'add_experience' | 'add_education' | 'add_project' | 'add_certification'
    const [activeTab, setActiveTab] = useState<'dossier' | 'add_experience' | 'add_education' | 'add_project' | 'add_certification'>('dossier');

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

    // Project form state
    const [projTitle, setProjTitle] = useState('');
    const [projDesc, setProjDesc] = useState('');
    const [projRole, setProjRole] = useState('');
    const [projTechStack, setProjTechStack] = useState('');
    const [projType, setProjType] = useState<'personal' | 'collaborative' | 'verified_pow'>('personal');
    const [projLiveUrl, setProjLiveUrl] = useState('');
    const [projRepoUrl, setProjRepoUrl] = useState('');
    const [projPowCode, setProjPowCode] = useState('');

    // Certification form state
    const [certName, setCertName] = useState('');
    const [certIssuer, setCertIssuer] = useState('');
    const [certDate, setCertDate] = useState('');
    const [certUrl, setCertUrl] = useState('');
    const [certId, setCertId] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAvailabilityStatus(user?.availability_status || 'open_to_collaborate');
            setHeadline(user?.headline || '');
            setPinnedProofIds(user?.pinned_proof_ids || []);
            setCollaborationPreferences(user?.collaboration_preferences || []);
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
                pinned_proof_ids: pinnedProofIds,
                collaboration_preferences: collaborationPreferences
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

    const toggleCollabPreference = (pref: string) => {
        if (collaborationPreferences.includes(pref)) {
            setCollaborationPreferences(collaborationPreferences.filter((p) => p !== pref));
        } else {
            setCollaborationPreferences([...collaborationPreferences, pref]);
        }
    };

    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projTitle.trim()) {
            toast.error('Project title is required');
            return;
        }
        setSaving(true);
        try {
            const currentProjects = Array.isArray(user?.projects) ? [...user.projects] : [];
            const newProj = {
                id: String(Date.now()),
                title: projTitle.trim(),
                description: projDesc.trim(),
                role: projRole.trim() || undefined,
                tech_stack: projTechStack.split(',').map((s) => s.trim()).filter(Boolean),
                project_type: projType,
                live_url: projLiveUrl.trim() || undefined,
                repo_url: projRepoUrl.trim() || undefined,
                linked_pow_code: projPowCode.trim() || undefined,
            };
            currentProjects.unshift(newProj);
            await api.updateProfile({ projects: currentProjects });
            toast.success('Project added to showcase!');
            setProjTitle('');
            setProjDesc('');
            setProjRole('');
            setProjTechStack('');
            setProjLiveUrl('');
            setProjRepoUrl('');
            setProjPowCode('');
            setActiveTab('dossier');
            onSaved();
        } catch (err: any) {
            toast.error(err.message || 'Failed to add project');
        } finally {
            setSaving(false);
        }
    };

    const handleCreateCertification = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!certName.trim() || !certIssuer.trim()) {
            toast.error('Certificate name and issuer are required');
            return;
        }
        setSaving(true);
        try {
            const currentCerts = Array.isArray(user?.certifications) ? [...user.certifications] : [];
            const newCert = {
                id: String(Date.now()),
                name: certName.trim(),
                issuer: certIssuer.trim(),
                issue_date: certDate.trim() || undefined,
                credential_url: certUrl.trim() || undefined,
                credential_id: certId.trim() || undefined,
            };
            currentCerts.unshift(newCert);
            await api.updateProfile({ certifications: currentCerts });
            toast.success('Certification added!');
            setCertName('');
            setCertIssuer('');
            setCertDate('');
            setCertUrl('');
            setCertId('');
            setActiveTab('dossier');
            onSaved();
        } catch (err: any) {
            toast.error(err.message || 'Failed to add certification');
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
            <div className="w-full max-w-2xl rounded-2xl border border-[#1e2230] bg-[#0d1017] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#1e2230]">
                    <div>
                        <h2 className="text-base font-bold text-white tracking-tight">Edit Builder Dossier</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                            Manage availability, preferences, pinned Proof of Work, projects, and credentials.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-[#141824] transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Sub-nav Tabs */}
                <div className="flex overflow-x-auto border-b border-[#1e2230] px-6 gap-5 text-xs">
                    <button
                        onClick={() => setActiveTab('dossier')}
                        className={`py-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'dossier'
                                ? 'border-[#1864ff] text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        Preferences & Pins
                    </button>
                    <button
                        onClick={() => setActiveTab('add_project')}
                        className={`py-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'add_project'
                                ? 'border-[#1864ff] text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        + Add Project
                    </button>
                    <button
                        onClick={() => setActiveTab('add_experience')}
                        className={`py-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'add_experience'
                                ? 'border-[#1864ff] text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        + Add Role
                    </button>
                    <button
                        onClick={() => setActiveTab('add_education')}
                        className={`py-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'add_education'
                                ? 'border-[#1864ff] text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        + Add Education
                    </button>
                    <button
                        onClick={() => setActiveTab('add_certification')}
                        className={`py-3 font-semibold border-b-2 whitespace-nowrap transition-colors ${
                            activeTab === 'add_certification'
                                ? 'border-[#1864ff] text-white'
                                : 'border-transparent text-zinc-400 hover:text-zinc-200'
                        }`}
                    >
                        + Add Certificate
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

                            {/* Collaboration Preferences */}
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 uppercase tracking-wider mb-1.5">
                                    Collaboration Preferences
                                </label>
                                <p className="text-xs text-zinc-400 mb-2.5">
                                    Select the engineering domains and project types you are interested in collaborating on.
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {COLLAB_PREFERENCE_OPTIONS.map((pref) => {
                                        const isSelected = collaborationPreferences.includes(pref);
                                        return (
                                            <button
                                                key={pref}
                                                type="button"
                                                onClick={() => toggleCollabPreference(pref)}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                                                    isSelected
                                                        ? 'bg-[#1864ff]/20 border-[#1864ff] text-white'
                                                        : 'bg-[#141824] border-[#23283a] text-zinc-400 hover:text-zinc-200 hover:border-[#333b54]'
                                                }`}
                                            >
                                                {isSelected ? '✓ ' : '+ '}{pref}
                                            </button>
                                        );
                                    })}
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

                    {/* Add Project Form */}
                    {activeTab === 'add_project' && (
                        <form onSubmit={handleCreateProject} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                    Project Title *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={projTitle}
                                    onChange={(e) => setProjTitle(e.target.value)}
                                    placeholder="e.g. Distributed Consensus Engine"
                                    className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                    Description *
                                </label>
                                <textarea
                                    rows={3}
                                    required
                                    value={projDesc}
                                    onChange={(e) => setProjDesc(e.target.value)}
                                    placeholder="Summary of what was built, architecture, and impact."
                                    className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff] resize-none"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Your Role
                                    </label>
                                    <input
                                        type="text"
                                        value={projRole}
                                        onChange={(e) => setProjRole(e.target.value)}
                                        placeholder="e.g. Lead Architect / Core Developer"
                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Project Type
                                    </label>
                                    <select
                                        value={projType}
                                        onChange={(e: any) => setProjType(e.target.value)}
                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    >
                                        <option value="personal">Personal Project</option>
                                        <option value="collaborative">Collaborative Venture</option>
                                        <option value="verified_pow">Verified Proof of Work</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                    Tech Stack (comma-separated)
                                </label>
                                <input
                                    type="text"
                                    value={projTechStack}
                                    onChange={(e) => setProjTechStack(e.target.value)}
                                    placeholder="Next.js, Python, PostgreSQL, PyTorch"
                                    className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        GitHub / Repo URL
                                    </label>
                                    <input
                                        type="url"
                                        value={projRepoUrl}
                                        onChange={(e) => setProjRepoUrl(e.target.value)}
                                        placeholder="https://github.com/..."
                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Live Demo URL
                                    </label>
                                    <input
                                        type="url"
                                        value={projLiveUrl}
                                        onChange={(e) => setProjLiveUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                    Linked Proof of Work Code (optional)
                                </label>
                                <input
                                    type="text"
                                    value={projPowCode}
                                    onChange={(e) => setProjPowCode(e.target.value)}
                                    placeholder="e.g. ENQ-2026-XXXX"
                                    className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff] font-mono"
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
                                    className="px-5 py-2 rounded-xl bg-[#1864ff] hover:bg-[#2563eb] text-white text-xs font-semibold"
                                >
                                    {saving ? 'Adding...' : 'Save Project'}
                                </button>
                            </div>
                        </form>
                    )}

                    {/* Add Certification Form */}
                    {activeTab === 'add_certification' && (
                        <form onSubmit={handleCreateCertification} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                    Certification / License Name *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={certName}
                                    onChange={(e) => setCertName(e.target.value)}
                                    placeholder="e.g. AWS Certified Solutions Architect"
                                    className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Issuing Organization *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={certIssuer}
                                        onChange={(e) => setCertIssuer(e.target.value)}
                                        placeholder="e.g. Amazon Web Services / Coursera"
                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Issue Date / Year
                                    </label>
                                    <input
                                        type="text"
                                        value={certDate}
                                        onChange={(e) => setCertDate(e.target.value)}
                                        placeholder="e.g. Oct 2025"
                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Credential URL
                                    </label>
                                    <input
                                        type="url"
                                        value={certUrl}
                                        onChange={(e) => setCertUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                                        Credential ID (optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={certId}
                                        onChange={(e) => setCertId(e.target.value)}
                                        placeholder="e.g. AWS-839210"
                                        className="w-full px-3.5 py-2 rounded-xl bg-[#141824] border border-[#23283a] text-white text-sm focus:outline-none focus:border-[#1864ff]"
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
                                    className="px-5 py-2 rounded-xl bg-[#1864ff] hover:bg-[#2563eb] text-white text-xs font-semibold"
                                >
                                    {saving ? 'Adding...' : 'Save Certificate'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>

                {/* Footer for Dossier Preferences */}
                {activeTab === 'dossier' && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#1e2230] bg-[#090b12]">
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
