'use client';

import React, { useState } from 'react';
import {
    X,
    Cpu,
    Plus,
    Trash2,
    FlaskConical
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { RESEARCH_FIELDS, ResearchPaper, HardwareBOMItem } from '@/lib/researchData';

interface PublishPaperModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPaperCreated: (newPaper: ResearchPaper) => void;
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
    const [step, setStep] = useState<1 | 2 | 3>(1);

    // Form fields
    const [title, setTitle] = useState('');
    const [field, setField] = useState('AI_ML');
    const [abstract, setAbstract] = useState('');
    const [methodology, setMethodology] = useState('');
    const [doi, setDoi] = useState('');

    // Artifact links
    const [pdfUrl, setPdfUrl] = useState('');
    const [codeUrl, setCodeUrl] = useState('');
    const [datasetUrl, setDatasetUrl] = useState('');
    const [demoUrl, setDemoUrl] = useState('');

    // Hardware BOM
    const [hardwareBOM, setHardwareBOM] = useState<HardwareBOMItem[]>([]);
    const [newCompName, setNewCompName] = useState('');
    const [newCompQty, setNewCompQty] = useState(1);
    const [newCompRole, setNewCompRole] = useState('');

    // Open Lab Positions
    const [openRoles, setOpenRoles] = useState<string[]>([]);
    const [newRole, setNewRole] = useState('');

    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

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

    const handleAddRole = () => {
        if (!newRole.trim()) return;
        if (openRoles.includes(newRole.trim())) return;
        setOpenRoles([...openRoles, newRole.trim()]);
        setNewRole('');
    };

    const handleRemoveRole = (role: string) => {
        setOpenRoles(openRoles.filter(r => r !== role));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (title.trim().length < 5) {
            toast.error('Title must be at least 5 characters long.');
            return;
        }
        if (abstract.trim().length < 30) {
            toast.error('Abstract must be at least 30 characters long.');
            return;
        }

        setIsSubmitting(true);
        try {
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
                open_collaborator_roles: openRoles,
            };

            const createdPaper = await api.createResearchPaper(payload);
            toast.success('Research paper submitted for admin verification! It will appear in the catalog once approved.');
            onPaperCreated(createdPaper);
            onClose();
        } catch (err: any) {
            toast.error(err.message || 'Failed to publish research paper. Make sure you are logged in.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
            <div
                className="w-full max-w-2xl max-h-[90vh] bg-[#0c0d15] border border-[#1b1e2c] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className="p-5 border-b border-[#1b1e2c] flex items-center justify-between gap-4 bg-[#0c0d15]">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-white/[0.04] text-zinc-300 border border-white/[0.06]">
                            <FlaskConical className="w-4 h-4 text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">Publish Living Preprint</h2>
                            <p className="text-xs text-zinc-400">
                                Open access research with executable code and VenopAI hardware integration.
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

                {/* Stepper Tabs */}
                <div className="flex items-center border-b border-[#1b1e2c] bg-[#090a0f] px-6 text-xs font-medium">
                    <button
                        onClick={() => setStep(1)}
                        className={`py-3 px-3 border-b-2 transition ${
                            step === 1 ? 'border-[#1864ff] text-white font-semibold' : 'border-transparent text-zinc-400'
                        }`}
                    >
                        1. Paper Details
                    </button>
                    <button
                        onClick={() => setStep(2)}
                        className={`py-3 px-3 border-b-2 transition ${
                            step === 2 ? 'border-[#1864ff] text-white font-semibold' : 'border-transparent text-zinc-400'
                        }`}
                    >
                        2. Code & Artifacts
                    </button>
                    <button
                        onClick={() => setStep(3)}
                        className={`py-3 px-3 border-b-2 transition ${
                            step === 3 ? 'border-[#1864ff] text-white font-semibold' : 'border-transparent text-zinc-400'
                        }`}
                    >
                        3. VenopAI Hardware & Roles
                    </button>
                </div>

                {/* Modal Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* STEP 1: Paper & Hypothesis */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Paper Title <span className="text-rose-400">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g. Real-Time Edge Neural Compression on Heterogeneous RISC-V Silicon"
                                    className="w-full px-3 py-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs sm:text-sm focus:outline-none focus:border-[#1864ff]"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                        Field / Discipline <span className="text-rose-400">*</span>
                                    </label>
                                    <select
                                        value={field}
                                        onChange={(e) => setField(e.target.value)}
                                        className="w-full px-3 py-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                    >
                                        {RESEARCH_FIELDS.filter(f => f.id !== 'ALL').map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.label}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                        DOI / ArXiv ID (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={doi}
                                        onChange={(e) => setDoi(e.target.value)}
                                        placeholder="e.g. 10.1145/2026.0042 or arXiv:2403.0042"
                                        className="w-full px-3 py-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Abstract <span className="text-rose-400">*</span>
                                </label>
                                <textarea
                                    rows={4}
                                    value={abstract}
                                    onChange={(e) => setAbstract(e.target.value)}
                                    placeholder="Summarize the core hypothesis, methodology, and empirical findings..."
                                    className="w-full px-3 py-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs sm:text-sm focus:outline-none focus:border-[#1864ff] leading-relaxed"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Methodology & Experimental Benchmarks (Optional)
                                </label>
                                <textarea
                                    rows={3}
                                    value={methodology}
                                    onChange={(e) => setMethodology(e.target.value)}
                                    placeholder="Describe testing rigs, simulation parameters, or toolchains..."
                                    className="w-full px-3 py-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs sm:text-sm focus:outline-none focus:border-[#1864ff] leading-relaxed"
                                />
                            </div>

                            <div className="flex justify-end pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="btn-brand text-xs font-semibold px-4 py-2"
                                >
                                    Continue to Artifacts &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Code, Demos & Artifacts */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    GitHub / Code Repository URL
                                </label>
                                <input
                                    type="url"
                                    value={codeUrl}
                                    onChange={(e) => setCodeUrl(e.target.value)}
                                    placeholder="https://github.com/my-org/my-research-repo"
                                    className="w-full px-3 py-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                />
                                <p className="text-[11px] text-zinc-500 mt-1">
                                    Allows peer researchers to run reproducibility audits directly.
                                </p>
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Interactive Live Demo URL
                                </label>
                                <input
                                    type="url"
                                    value={demoUrl}
                                    onChange={(e) => setDemoUrl(e.target.value)}
                                    placeholder="https://demo.enquebet.org/my-study"
                                    className="w-full px-3 py-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Dataset URL (Zenodo, Kaggle, etc.)
                                </label>
                                <input
                                    type="url"
                                    value={datasetUrl}
                                    onChange={(e) => setDatasetUrl(e.target.value)}
                                    placeholder="https://zenodo.org/record/12345"
                                    className="w-full px-3 py-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-medium text-zinc-300 mb-1.5">
                                    Full PDF Document URL (Optional)
                                </label>
                                <input
                                    type="url"
                                    value={pdfUrl}
                                    onChange={(e) => setPdfUrl(e.target.value)}
                                    placeholder="https://arxiv.org/pdf/2403.0042.pdf"
                                    className="w-full px-3 py-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                />
                            </div>

                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="btn-outline text-xs font-medium px-3.5 py-2"
                                >
                                    &larr; Back
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setStep(3)}
                                    className="btn-brand text-xs font-semibold px-4 py-2"
                                >
                                    Continue to Hardware &rarr;
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: VenopAI Hardware & Lab Roles */}
                    {step === 3 && (
                        <div className="space-y-4">
                            {/* VenopAI Hardware BOM Generator */}
                            <div className="p-4 rounded-xl bg-[#0f111a] border border-[#1b1e2c] space-y-3">
                                <div className="flex items-center gap-2 text-white font-semibold text-xs">
                                    <Cpu className="w-4 h-4 text-blue-400" />
                                    <span>VenopAI Hardware Bill of Materials (BOM)</span>
                                </div>
                                <p className="text-xs text-zinc-400">
                                    If this paper requires physical electronics, specify components so builders
                                    can procure them directly from the VenopAI catalog.
                                </p>

                                {/* Quick Presets */}
                                <div>
                                    <span className="text-[11px] font-medium text-zinc-400 block mb-1.5">
                                        Quick Add Verified Parts:
                                    </span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {COMMON_VENOPAI_PARTS.map((p, idx) => (
                                            <button
                                                key={idx}
                                                type="button"
                                                onClick={() => handleSelectPresetBOM(p)}
                                                className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white/[0.03] text-zinc-300 border border-white/[0.06] hover:bg-white/[0.08] transition"
                                            >
                                                + {p.name.split(' ')[0]} {p.name.split(' ')[1]}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Custom Component Input */}
                                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-[#1b1e2c]">
                                    <input
                                        type="text"
                                        value={newCompName}
                                        onChange={(e) => setNewCompName(e.target.value)}
                                        placeholder="Component name"
                                        className="sm:col-span-6 px-3 py-1.5 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                    />
                                    <input
                                        type="number"
                                        min={1}
                                        value={newCompQty}
                                        onChange={(e) => setNewCompQty(parseInt(e.target.value) || 1)}
                                        placeholder="Qty"
                                        className="sm:col-span-2 px-2 py-1.5 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                    />
                                    <input
                                        type="text"
                                        value={newCompRole}
                                        onChange={(e) => setNewCompRole(e.target.value)}
                                        placeholder="Circuit role"
                                        className="sm:col-span-3 px-3 py-1.5 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddBOMItem}
                                        className="sm:col-span-1 p-1.5 rounded-lg bg-[#1864ff] text-white font-bold flex items-center justify-center hover:bg-[#1554d6]"
                                        title="Add component"
                                    >
                                        <Plus className="w-4 h-4" />
                                    </button>
                                </div>

                                {/* Current BOM List */}
                                {hardwareBOM.length > 0 && (
                                    <div className="space-y-1.5 pt-2">
                                        {hardwareBOM.map((item, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center justify-between p-2 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-xs"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-white">{item.name}</span>
                                                    <span className="px-1.5 py-0.2 rounded font-mono text-[10px] bg-white/[0.04] text-zinc-300">
                                                        x{item.quantity}
                                                    </span>
                                                    {item.role && <span className="text-zinc-500">({item.role})</span>}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveBOMItem(idx)}
                                                    className="text-zinc-500 hover:text-rose-400 p-1"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Open Lab Positions */}
                            <div className="p-4 rounded-xl bg-[#0f111a] border border-[#1b1e2c] space-y-3">
                                <div className="text-xs font-semibold text-white">
                                    Collaborative Lab Opportunities (Optional)
                                </div>
                                <p className="text-xs text-zinc-400">
                                    Invite other builders to join this paper workspace for replication, testing, or hardware fabrication.
                                </p>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={newRole}
                                        onChange={(e) => setNewRole(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddRole();
                                            }
                                        }}
                                        placeholder="e.g. FPGA Synthesis Lead, Lab Bench Tester"
                                        className="flex-1 px-3 py-1.5 rounded-lg bg-[#090a0f] border border-[#1b1e2c] text-white text-xs focus:outline-none focus:border-[#1864ff]"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddRole}
                                        className="btn-outline text-xs font-medium px-3 py-1.5"
                                    >
                                        Add Role
                                    </button>
                                </div>

                                {openRoles.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {openRoles.map((role, idx) => (
                                            <span
                                                key={idx}
                                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-white/[0.04] text-zinc-300 border border-white/[0.06]"
                                            >
                                                <span>{role}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveRole(role)}
                                                    className="text-zinc-500 hover:text-white"
                                                >
                                                    &times;
                                                </button>
                                            </span>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between pt-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(2)}
                                    className="btn-outline text-xs font-medium px-3.5 py-2"
                                >
                                    &larr; Back
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="btn-brand text-xs font-semibold px-5 py-2.5 disabled:opacity-50"
                                >
                                    {isSubmitting ? 'Publishing...' : 'Publish Living Paper'}
                                </button>
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </div>
    );
}
