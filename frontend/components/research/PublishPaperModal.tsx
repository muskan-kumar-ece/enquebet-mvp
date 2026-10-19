'use client';

import React, { useState, useEffect } from 'react';
import {
    X,
    Cpu,
    Plus,
    Trash2,
    FlaskConical,
    Users,
    FileText,
    ShieldCheck,
    Check,
    ExternalLink,
    ArrowRight,
    ArrowLeft,
    Sparkles,
    AlertCircle,
    Loader2
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/contexts/AuthContext';
import { RESEARCH_FIELDS, ResearchPaper, HardwareBOMItem } from '@/lib/researchData';

interface PublishPaperModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaperCreated: (newPaper: ResearchPaper) => void;
}

interface AuthorEntry {
    full_name: string;
    email: string;
    affiliation: string;
    orcid: string;
    is_corresponding: boolean;
}

const COMMON_VENOPAI_PARTS = [
    { name: 'ESP32-S3-WROOM-1 Dual-Core LX7', slug: 'esp32-s3-wroom-1-n16r8', role: 'Edge Inference Host Node' },
    { name: 'Raspberry Pi Pico RP2040 Dual ARM Cortex-M0+', slug: 'raspberry-pi-pico', role: 'Real-Time IO Coprocessor' },
    { name: 'STM32F405 Flight Management Unit', slug: 'stm32f405-flight-controller', role: 'Realtime Autopilot Controller' },
    { name: 'MPU-6050 6-Axis Accelerometer & Gyro', slug: 'mpu-6050-6-axis-sensor', role: 'Inertial Measurement' },
    { name: 'HC-SR04 Ultrasonic Distance Sensor', slug: 'hc-sr04-ultrasonic-sensor', role: 'Proximity Ranging' },
    { name: 'Logic Level Converter 4-Channel Bi-Directional', slug: 'logic-level-converter-4ch', role: 'Bus Voltage Shift' },
];

export default function PublishPaperModal({
    isOpen,
    onClose,
    onPaperCreated,
}: PublishPaperModalProps) {
    const { user } = useAuth();
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

    // Step 1: Paper Overview
    const [title, setTitle] = useState('');
    const [field, setField] = useState('AI_ML');
    const [abstract, setAbstract] = useState('');
    const [keywordsInput, setKeywordsInput] = useState('');
    const [doi, setDoi] = useState('');

    // Step 2: Multi-Authors
    const [authors, setAuthors] = useState<AuthorEntry[]>([]);
    const [newAuthorName, setNewAuthorName] = useState('');
    const [newAuthorEmail, setNewAuthorEmail] = useState('');
    const [newAuthorAffiliation, setNewAuthorAffiliation] = useState('');
    const [newAuthorOrcid, setNewAuthorOrcid] = useState('');
    const [newAuthorCorresponding, setNewAuthorCorresponding] = useState(false);

    // Step 3: Methodology
    const [methodology, setMethodology] = useState('');
    const [testbenchEnv, setTestbenchEnv] = useState('');

    // Step 4: Artifacts & Hardware BOM
    const [pdfUrl, setPdfUrl] = useState('');
    const [codeUrl, setCodeUrl] = useState('');
    const [datasetUrl, setDatasetUrl] = useState('');
    const [demoUrl, setDemoUrl] = useState('');
    const [hardwareBOM, setHardwareBOM] = useState<HardwareBOMItem[]>([]);
    const [newCompName, setNewCompName] = useState('');
    const [newCompQty, setNewCompQty] = useState(1);
    const [newCompRole, setNewCompRole] = useState('');

    // Step 5: Declarations
    const [declaredAuthorship, setDeclaredAuthorship] = useState(false);
    const [declaredOpenAccess, setDeclaredOpenAccess] = useState(false);
    const [declaredEthics, setDeclaredEthics] = useState(false);

    const [isSubmitting, setIsSubmitting] = useState(false);

    // Initialize author 1 from user context on open
    useEffect(() => {
        if (isOpen && user && authors.length === 0) {
            setAuthors([
                {
                    full_name: user.full_name || user.username,
                    email: user.email || '',
                    affiliation: user.college || 'Independent Engineering Researcher',
                    orcid: '',
                    is_corresponding: true,
                }
            ]);
        }
    }, [isOpen, user]);

    if (!isOpen) return null;

    const handleAddAuthor = () => {
        if (!newAuthorName.trim()) {
            toast.error('Author full name is required.');
            return;
        }
        setAuthors([
            ...authors,
            {
                full_name: newAuthorName.trim(),
                email: newAuthorEmail.trim(),
                affiliation: newAuthorAffiliation.trim() || 'Independent Researcher',
                orcid: newAuthorOrcid.trim(),
                is_corresponding: newAuthorCorresponding,
            }
        ]);
        setNewAuthorName('');
        setNewAuthorEmail('');
        setNewAuthorAffiliation('');
        setNewAuthorOrcid('');
        setNewAuthorCorresponding(false);
    };

    const handleRemoveAuthor = (index: number) => {
        if (authors.length <= 1) {
            toast.error('At least one author is required.');
            return;
        }
        setAuthors(authors.filter((_, i) => i !== index));
    };

    const handleAddBOMItem = () => {
        if (!newCompName.trim()) return;
        setHardwareBOM([
            ...hardwareBOM,
            {
                name: newCompName.trim(),
                quantity: newCompQty > 0 ? newCompQty : 1,
                role: newCompRole.trim() || undefined,
            }
        ]);
        setNewCompName('');
        setNewCompQty(1);
        setNewCompRole('');
    };

    const handleSelectPresetBOM = (preset: typeof COMMON_VENOPAI_PARTS[0]) => {
        if (hardwareBOM.some(p => p.name === preset.name)) {
            toast('Component already in BOM', { icon: 'ℹ️' });
            return;
        }
        setHardwareBOM([
            ...hardwareBOM,
            {
                name: preset.name,
                slug: preset.slug,
                quantity: 1,
                role: preset.role,
            }
        ]);
    };

    const handleRemoveBOMItem = (index: number) => {
        setHardwareBOM(hardwareBOM.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (title.trim().length < 5) {
            toast.error('Title must be at least 5 characters long.');
            setStep(1);
            return;
        }
        if (abstract.trim().length < 30) {
            toast.error('Abstract must be at least 30 characters long.');
            setStep(1);
            return;
        }
        if (!declaredAuthorship || !declaredOpenAccess || !declaredEthics) {
            toast.error('Please accept all IEEE publication declarations before submitting.');
            setStep(5);
            return;
        }

        setIsSubmitting(true);
        try {
            const keywords = keywordsInput
                .split(',')
                .map(k => k.trim())
                .filter(Boolean);

            const payload = {
                title: title.trim(),
                abstract: abstract.trim(),
                methodology_summary: methodology.trim() || undefined,
                field,
                doi: doi.trim() || undefined,
                pdf_url: pdfUrl.trim() || undefined,
                code_repo_url: codeUrl.trim() || undefined,
                dataset_url: datasetUrl.trim() || undefined,
                live_demo_url: demoUrl.trim() || undefined,
                hardware_bom: hardwareBOM,
                keywords,
                authors: authors.map((a, i) => ({
                    full_name: a.full_name,
                    email: a.email,
                    affiliation: a.affiliation,
                    orcid: a.orcid,
                    order: i + 1,
                    is_corresponding: a.is_corresponding,
                })),
            };

            const createdPaper = await api.createResearchPaper(payload);
            toast.success('Research paper submitted for IEEE review & screening! Check status in your Research Dossier.');
            onPaperCreated(createdPaper);
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Failed to submit paper. Make sure you are logged in.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                className="w-full max-w-2xl max-h-[90vh] bg-[#0c0d15] border border-[#1b1e2c] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-5 border-b border-[#1b1e2c] flex items-center justify-between gap-4 bg-[#0c0d15]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-[#1864ff]/10 text-[#4f8fff] border border-[#1864ff]/20">
                            <FlaskConical className="w-4 h-4" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white font-mono">Author IEEE Living Preprint</h2>
                            <p className="text-xs text-zinc-400">
                                Submit academic papers with multi-author indexing, VenopAI BOM, and reproducible benchmarks.
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-lg border border-[#1b1e2c] bg-white/[0.02] text-zinc-400 hover:text-white hover:bg-white/[0.06] transition"
                        aria-label="Close modal"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* 5-Step Wizard Navigation */}
                <div className="flex items-center border-b border-[#1b1e2c] bg-[#090a0f] px-4 text-xs font-mono overflow-x-auto">
                    {[
                        { stepNum: 1, label: '1. Overview' },
                        { stepNum: 2, label: '2. Authors' },
                        { stepNum: 3, label: '3. Methodology' },
                        { stepNum: 4, label: '4. Artifacts & BOM' },
                        { stepNum: 5, label: '5. Declarations' },
                    ].map(({ stepNum, label }) => (
                        <button
                            key={stepNum}
                            type="button"
                            onClick={() => setStep(stepNum as any)}
                            className={`py-3 px-3 border-b-2 whitespace-nowrap transition cursor-pointer ${
                                step === stepNum ? 'border-[#1864ff] text-white font-bold' : 'border-transparent text-zinc-400 hover:text-zinc-200'
                            }`}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* STEP 1: Paper Overview */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                                    Paper Title <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Real-Time Edge Neural Compression on Heterogeneous RISC-V Silicon"
                                    className="w-full px-3.5 py-2 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs sm:text-sm focus:outline-none focus:border-[#1864ff] font-sans"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                                <div>
                                    <label className="block text-xs text-zinc-300 mb-1.5">
                                        Engineering Discipline <span className="text-rose-400">*</span>
                                    </label>
                                    <select
                                        value={field}
                                        onChange={(e) => setField(e.target.value)}
                                        className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                    >
                                        {RESEARCH_FIELDS.filter(f => f.id !== 'ALL').map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs text-zinc-300 mb-1.5">
                                        DOI / ArXiv ID (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={doi}
                                        onChange={(e) => setDoi(e.target.value)}
                                        placeholder="e.g. 10.1109/2026.0042 or arXiv:2403.0042"
                                        className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                                    Abstract (min 30 characters) <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    rows={5}
                                    value={abstract}
                                    onChange={(e) => setAbstract(e.target.value)}
                                    placeholder="Write formal IEEE abstract summarizing core problem statement, proposed methodology, benchmark findings, and primary contributions..."
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs sm:text-sm focus:outline-none focus:border-[#1864ff] leading-relaxed font-sans"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-mono text-zinc-300 mb-1.5">
                                    Index Terms / Keywords (Comma separated)
                                </label>
                                <input
                                    type="text"
                                    value={keywordsInput}
                                    onChange={(e) => setKeywordsInput(e.target.value)}
                                    placeholder="e.g. Edge AI, Quantization, RISC-V Silicon, Embedded Inference"
                                    className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs font-mono focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Authors & Affiliations */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
                                    Authors & Institutional Affiliations
                                </h3>
                                <span className="text-[11px] font-mono text-zinc-500">
                                    {authors.length} Author(s) configured
                                </span>
                            </div>

                            {/* Authors Roster */}
                            <div className="space-y-2">
                                {authors.map((author, index) => (
                                    <div
                                        key={index}
                                        className="p-3 rounded-xl bg-[#090a0f] border border-[#1e2335] flex items-center justify-between gap-3 text-xs font-mono"
                                    >
                                        <div className="min-w-0 flex items-center gap-2">
                                            <span className="w-5 h-5 rounded-full bg-[#1864ff]/20 text-[#4f8fff] flex items-center justify-center font-bold text-[10px] shrink-0">
                                                {index + 1}
                                            </span>
                                            <div>
                                                <div className="font-bold text-white flex items-center gap-1.5">
                                                    <span>{author.full_name}</span>
                                                    {author.is_corresponding && (
                                                        <span className="text-amber-400 text-[10px]" title="Corresponding Author">★</span>
                                                    )}
                                                    {author.orcid && (
                                                        <span className="text-emerald-400 text-[10px]">(iD)</span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-zinc-400 truncate">
                                                    {author.affiliation} {author.email && `· ${author.email}`}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => handleRemoveAuthor(index)}
                                            className="text-zinc-500 hover:text-rose-400 p-1"
                                            title="Remove Author"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Add Author Sub-Form */}
                            <div className="p-4 rounded-xl bg-[#08090f] border border-[#1e2335] space-y-3 font-mono">
                                <span className="text-xs font-bold text-zinc-300">Add Co-Author</span>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                    <input
                                        type="text"
                                        value={newAuthorName}
                                        onChange={(e) => setNewAuthorName(e.target.value)}
                                        placeholder="Full Name (e.g. Marcus Vance)"
                                        className="px-3 py-1.5 rounded-lg bg-[#0c0d15] border border-[#1e2335] text-xs text-white"
                                    />
                                    <input
                                        type="email"
                                        value={newAuthorEmail}
                                        onChange={(e) => setNewAuthorEmail(e.target.value)}
                                        placeholder="Institutional Email"
                                        className="px-3 py-1.5 rounded-lg bg-[#0c0d15] border border-[#1e2335] text-xs text-white"
                                    />
                                    <input
                                        type="text"
                                        value={newAuthorAffiliation}
                                        onChange={(e) => setNewAuthorAffiliation(e.target.value)}
                                        placeholder="University / Organization Affiliation"
                                        className="px-3 py-1.5 rounded-lg bg-[#0c0d15] border border-[#1e2335] text-xs text-white"
                                    />
                                    <input
                                        type="text"
                                        value={newAuthorOrcid}
                                        onChange={(e) => setNewAuthorOrcid(e.target.value)}
                                        placeholder="ORCID iD (0000-0002-XXXX-XXXX)"
                                        className="px-3 py-1.5 rounded-lg bg-[#0c0d15] border border-[#1e2335] text-xs text-white"
                                    />
                                </div>

                                <div className="flex items-center justify-between pt-1">
                                    <label className="inline-flex items-center gap-2 text-xs text-zinc-400 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={newAuthorCorresponding}
                                            onChange={(e) => setNewAuthorCorresponding(e.target.checked)}
                                            className="rounded bg-[#0c0d15] border-[#1e2335] text-[#1864ff]"
                                        />
                                        <span>Mark as Corresponding Author</span>
                                    </label>

                                    <button
                                        type="button"
                                        onClick={handleAddAuthor}
                                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#1864ff]/20 text-[#4f8fff] hover:bg-[#1864ff]/30 text-xs font-semibold cursor-pointer"
                                    >
                                        <Plus className="w-3 h-3" />
                                        <span>Add Author</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Methodology & Reproducibility */}
                    {step === 3 && (
                        <div className="space-y-4 font-mono">
                            <div>
                                <label className="block text-xs text-zinc-300 mb-1.5">
                                    Methodology & Technical Architecture (Markdown Supported)
                                </label>
                                <textarea
                                    rows={6}
                                    value={methodology}
                                    onChange={(e) => setMethodology(e.target.value)}
                                    placeholder="Detail mathematical bounds, runtime scheduling algorithms, layer decomposition, and hardware pipeline specifics..."
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs leading-relaxed font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs text-zinc-300 mb-1.5">
                                    Testbench Environment Specifications
                                </label>
                                <input
                                    type="text"
                                    value={testbenchEnv}
                                    onChange={(e) => setTestbenchEnv(e.target.value)}
                                    placeholder="e.g. Ubuntu 24.04, PyTorch 2.5, ESP32-S3 custom dev board, CUDA 12.4"
                                    className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs"
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: Artifacts & Hardware BOM */}
                    {step === 4 && (
                        <div className="space-y-4 font-mono">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-zinc-300 mb-1.5">
                                        Full Text PDF Manuscript URL
                                    </label>
                                    <input
                                        type="url"
                                        value={pdfUrl}
                                        onChange={(e) => setPdfUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-zinc-300 mb-1.5">
                                        GitHub Code Repository URL
                                    </label>
                                    <input
                                        type="url"
                                        value={codeUrl}
                                        onChange={(e) => setCodeUrl(e.target.value)}
                                        placeholder="https://github.com/..."
                                        className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-zinc-300 mb-1.5">
                                        Dataset URL (Zenodo / HuggingFace)
                                    </label>
                                    <input
                                        type="url"
                                        value={datasetUrl}
                                        onChange={(e) => setDatasetUrl(e.target.value)}
                                        placeholder="https://zenodo.org/..."
                                        className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs text-zinc-300 mb-1.5">
                                        Live Interactive Demo URL
                                    </label>
                                    <input
                                        type="url"
                                        value={demoUrl}
                                        onChange={(e) => setDemoUrl(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full px-3 py-2 rounded-xl bg-[#090a0f] border border-[#1b1e2c] text-white text-xs"
                                    />
                                </div>
                            </div>

                            {/* VenopAI Hardware BOM */}
                            <div className="pt-2 border-t border-[#1e2335] space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                                        <Cpu className="w-3.5 h-3.5 text-[#1864ff]" />
                                        <span>VenopAI Hardware Bill of Materials</span>
                                    </span>
                                    <span className="text-[11px] text-zinc-500">
                                        {hardwareBOM.length} Part(s)
                                    </span>
                                </div>

                                {/* Preset components */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="text-[10px] text-zinc-500">Quick add:</span>
                                    {COMMON_VENOPAI_PARTS.slice(0, 3).map((preset) => (
                                        <button
                                            key={preset.name}
                                            type="button"
                                            onClick={() => handleSelectPresetBOM(preset)}
                                            className="px-2 py-0.5 rounded bg-[#121624] hover:bg-[#1a2034] text-[10px] text-zinc-300 border border-[#1e2335] transition"
                                        >
                                            + {preset.name.split(' ')[0]}
                                        </button>
                                    ))}
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={newCompName}
                                        onChange={(e) => setNewCompName(e.target.value)}
                                        placeholder="Component Name (e.g. ESP32-S3)"
                                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#090a0f] border border-[#1e2335] text-xs text-white"
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        value={newCompQty}
                                        onChange={(e) => setNewCompQty(Number(e.target.value))}
                                        className="w-16 px-2 py-1.5 rounded-lg bg-[#090a0f] border border-[#1e2335] text-xs text-white text-center"
                                        placeholder="Qty"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddBOMItem}
                                        className="px-3 py-1.5 rounded-lg bg-[#1864ff] text-white text-xs font-semibold"
                                    >
                                        Add
                                    </button>
                                </div>

                                {hardwareBOM.length > 0 && (
                                    <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                        {hardwareBOM.map((part, idx) => (
                                            <div
                                                key={idx}
                                                className="p-2 rounded-lg bg-[#090a0f] border border-[#1e2335] flex items-center justify-between text-xs"
                                            >
                                                <span>{part.name} (x{part.quantity})</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveBOMItem(idx)}
                                                    className="text-zinc-500 hover:text-rose-400"
                                                >
                                                    <X className="w-3 h-3" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* STEP 5: Declarations & Submit */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl bg-[#090a0f] border border-[#1e2335] space-y-3 font-mono text-xs">
                                <h3 className="font-bold text-white text-sm">
                                    IEEE & ENQUEbet Academic Declarations
                                </h3>

                                <label className="flex items-start gap-2.5 text-zinc-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={declaredAuthorship}
                                        onChange={(e) => setDeclaredAuthorship(e.target.checked)}
                                        className="mt-0.5 rounded bg-[#0c0d15] border-[#1e2335] text-[#1864ff]"
                                    />
                                    <span>
                                        <strong>Authorship Integrity:</strong> All listed authors made substantial scientific contributions, consented to publication, and approved the submitted manuscript.
                                    </span>
                                </label>

                                <label className="flex items-start gap-2.5 text-zinc-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={declaredOpenAccess}
                                        onChange={(e) => setDeclaredOpenAccess(e.target.checked)}
                                        className="mt-0.5 rounded bg-[#0c0d15] border-[#1e2335] text-[#1864ff]"
                                    />
                                    <span>
                                        <strong>Open Access & Provenance:</strong> I agree to make this living preprint freely accessible under Creative Commons Attribution licenses for research reproduction.
                                    </span>
                                </label>

                                <label className="flex items-start gap-2.5 text-zinc-300 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={declaredEthics}
                                        onChange={(e) => setDeclaredEthics(e.target.checked)}
                                        className="mt-0.5 rounded bg-[#0c0d15] border-[#1e2335] text-[#1864ff]"
                                    />
                                    <span>
                                        <strong>Ethics & Methodology:</strong> The methodology contains no malicious exploits, respects institutional ethics standards, and provides truthful data measurements.
                                    </span>
                                </label>
                            </div>

                            {/* Brief Summary of Submission */}
                            <div className="p-4 rounded-xl bg-[#121624] border border-[#1e2335] text-xs font-mono space-y-1.5 text-zinc-300">
                                <div><strong className="text-white">Title:</strong> {title || '(No title entered)'}</div>
                                <div><strong className="text-white">Authors:</strong> {authors.map(a => a.full_name).join(', ')}</div>
                                <div><strong className="text-white">Discipline:</strong> {field}</div>
                                <div><strong className="text-white">BOM Components:</strong> {hardwareBOM.length} parts</div>
                            </div>
                        </div>
                    )}

                    {/* Step Navigation Footer */}
                    <div className="flex items-center justify-between pt-4 border-t border-[#1b1e2c] font-mono text-xs">
                        {step > 1 ? (
                            <button
                                type="button"
                                onClick={() => setStep((step - 1) as any)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#1e2335] text-zinc-300 hover:text-white"
                            >
                                <ArrowLeft className="w-3.5 h-3.5" />
                                <span>Previous Step</span>
                            </button>
                        ) : <div />}

                        {step < 5 ? (
                            <button
                                type="button"
                                onClick={() => {
                                    if (step === 1 && (!title.trim() || !abstract.trim())) {
                                        toast.error('Title and Abstract are required.');
                                        return;
                                    }
                                    setStep((step + 1) as any);
                                }}
                                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white font-semibold cursor-pointer"
                            >
                                <span>Continue</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                            </button>
                        ) : (
                            <button
                                type="submit"
                                disabled={isSubmitting || !declaredAuthorship || !declaredOpenAccess || !declaredEthics}
                                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-[#1864ff] hover:bg-[#1864ff]/90 text-white font-bold cursor-pointer disabled:opacity-50 transition-all shadow-md"
                            >
                                {isSubmitting ? (
                                    <>
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        <span>Submitting Manuscript...</span>
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-3.5 h-3.5" />
                                        <span>Submit for IEEE Screening</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>
                </form>
            </div>
        </div>
    );
}
