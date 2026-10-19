export interface ResourceItem {
    id: string;
    slug: string;
    title: string;
    description: string;
    category: string;
    category_display?: string;
    file_type: string;
    file_type_display?: string;
    file_url?: string;
    file_size_bytes?: number;
    original_filename?: string;
    external_link?: string;
    tags: string[];
    downloads_count: number;
    views_count: number;
    status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED';
    status_display?: string;
    rejection_reason?: string;
    reviewed_at?: string;
    reviewed_by?: {
        id: string;
        username: string;
        full_name?: string;
    };
    uploader: {
        id: string;
        username: string;
        full_name?: string;
        profile_image?: string;
        headline?: string;
        college?: string;
    };
    created_at: string;
}

export const RESOURCE_CATEGORIES = [
    { id: 'ALL', label: 'All Catalog' },
    { id: 'SYSTEM_DESIGN_SPECS', label: 'System Design & Architecture' },
    { id: 'BOOKS_TEXTBOOKS', label: 'Books & Textbooks' },
    { id: 'WHITEPAPERS', label: 'Technical Whitepapers' },
    { id: 'SLIDES_LECTURES', label: 'Lecture Slides & Notes' },
    { id: 'STARTERS_CODE', label: 'Starter Kits & Templates' },
    { id: 'CHEATSHEETS', label: 'Cheat Sheets & Handbooks' },
    { id: 'DATASETS', label: 'Datasets & Benchmarks' },
] as const;

export const FILE_TYPES = [
    { id: 'ALL', label: 'All Formats' },
    { id: 'PDF', label: 'PDF', icon: 'FileText' },
    { id: 'DOCX', label: 'DOCX / Word', icon: 'File' },
    { id: 'MARKDOWN', label: 'Markdown', icon: 'Code' },
    { id: 'TXT', label: 'Plain Text', icon: 'FileCode' },
    { id: 'PPTX', label: 'Slides (.pptx)', icon: 'Presentation' },
    { id: 'EPUB', label: 'EPUB', icon: 'BookOpen' },
    { id: 'ZIP', label: 'Code Archive (.zip)', icon: 'Archive' },
    { id: 'LINK', label: 'External Resource', icon: 'ExternalLink' },
] as const;

export function formatBytes(bytes?: number): string {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileTypeBadgeStyle(fileType: string): { bg: string; text: string; border: string; label: string } {
    switch (fileType?.toUpperCase()) {
        case 'PDF':
            return {
                bg: 'bg-rose-500/10',
                text: 'text-rose-400',
                border: 'border-rose-500/20',
                label: 'PDF',
            };
        case 'DOCX':
            return {
                bg: 'bg-blue-500/10',
                text: 'text-blue-400',
                border: 'border-blue-500/20',
                label: 'DOCX',
            };
        case 'PPTX':
            return {
                bg: 'bg-amber-500/10',
                text: 'text-amber-400',
                border: 'border-amber-500/20',
                label: 'PPTX',
            };
        case 'MARKDOWN':
        case 'TXT':
            return {
                bg: 'bg-zinc-500/10',
                text: 'text-zinc-300',
                border: 'border-zinc-500/20',
                label: fileType.toUpperCase(),
            };
        case 'EPUB':
            return {
                bg: 'bg-violet-500/10',
                text: 'text-violet-400',
                border: 'border-violet-500/20',
                label: 'EPUB',
            };
        case 'ZIP':
            return {
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-400',
                border: 'border-emerald-500/20',
                label: 'ZIP ARCHIVE',
            };
        case 'LINK':
        default:
            return {
                bg: 'bg-cyan-500/10',
                text: 'text-cyan-400',
                border: 'border-cyan-500/20',
                label: 'EXTERNAL LINK',
            };
    }
}

// Initial Curated Resources for Fallback / Seed Display
export const CURATED_SEED_RESOURCES: ResourceItem[] = [
    {
        id: 'res-seed-01',
        slug: 'high-throughput-distributed-systems-design-manual',
        title: 'High-Throughput Distributed Systems Design Manual',
        description: 'Exhaustive engineering blueprint detailing Raft consensus, vector clocks, multi-leader replication, and LSM-tree storage engines with battle-tested Go and Rust benchmarks.',
        category: 'SYSTEM_DESIGN_SPECS',
        category_display: 'System Design & Architecture',
        file_type: 'PDF',
        file_type_display: 'PDF Document',
        file_url: 'https://raw.githubusercontent.com/enquebet/spec-samples/main/distributed-systems-manual.pdf',
        file_size_bytes: 4823440,
        original_filename: 'distributed-systems-manual-v3.pdf',
        tags: ['distributed-systems', 'consensus', 'raft', 'lsm-tree', 'concurrency'],
        downloads_count: 342,
        views_count: 1205,
        status: 'APPROVED',
        status_display: 'Approved & Public',
        uploader: {
            id: 'seed-usr-1',
            username: 'alex_systems',
            full_name: 'Alexandre Mercer',
            profile_image: '',
            headline: 'Staff Infrastructure Engineer | Distributed Systems',
            college: 'Carnegie Mellon University',
        },
        created_at: '2026-09-12T10:00:00Z',
    },
    {
        id: 'res-seed-02',
        slug: 'embedded-firmware-architecture-word-handbook',
        title: 'Embedded Firmware Architecture & FreeRTOS Handbook',
        description: 'Production-ready Word guide (.docx) covering hardware abstraction layers (HAL), interrupt latency management, DMA ring buffers, and MISRA-C compliance patterns.',
        category: 'BOOKS_TEXTBOOKS',
        category_display: 'Books & Textbooks',
        file_type: 'DOCX',
        file_type_display: 'Word Document (.docx)',
        file_url: 'https://raw.githubusercontent.com/enquebet/spec-samples/main/firmware-freertos-guide.docx',
        file_size_bytes: 2948210,
        original_filename: 'firmware-freertos-architecture-guide.docx',
        tags: ['embedded', 'freertos', 'arm-cortex', 'c', 'hardware'],
        downloads_count: 189,
        views_count: 670,
        status: 'APPROVED',
        status_display: 'Approved & Public',
        uploader: {
            id: 'seed-usr-2',
            username: 'priya_embedded',
            full_name: 'Priya Narang',
            profile_image: '',
            headline: 'Robotics & Hardware Architect',
            college: 'IIT Bombay',
        },
        created_at: '2026-09-20T14:30:00Z',
    },
    {
        id: 'res-seed-03',
        slug: 'sparse-transformer-quantization-whitepaper',
        title: 'Sparse Transformer Quantization on Edge Silicon (VenopAI)',
        description: 'Empirical whitepaper measuring 4-bit INT4 transformer inference on RISC-V edge silicon, thermal dissipation curves, and power budget benchmarks.',
        category: 'WHITEPAPERS',
        category_display: 'Technical Whitepapers',
        file_type: 'PDF',
        file_type_display: 'PDF Document',
        file_url: 'https://raw.githubusercontent.com/enquebet/spec-samples/main/venopai-quant-whitepaper.pdf',
        file_size_bytes: 3120000,
        original_filename: 'venopai-transformer-quantization-wp.pdf',
        tags: ['venopai', 'risc-v', 'edge-ai', 'quantization', 'hardware'],
        downloads_count: 420,
        views_count: 1890,
        status: 'APPROVED',
        status_display: 'Approved & Public',
        uploader: {
            id: 'seed-usr-3',
            username: 'dr_quantum',
            full_name: 'Dr. Elena Rostova',
            profile_image: '',
            headline: 'Principal AI Systems Researcher',
            college: 'MIT',
        },
        created_at: '2026-09-28T09:15:00Z',
    },
    {
        id: 'res-seed-04',
        slug: 'modern-compiler-design-lecture-slides',
        title: 'Modern Compiler Design & LLVM IR Code Generation Slides',
        description: 'Complete slide deck (.pptx) covering SSA form, dominator trees, loop invariant code motion, and custom LLVM backend target synthesis for university courses.',
        category: 'SLIDES_LECTURES',
        category_display: 'Lecture Slides & Notes',
        file_type: 'PPTX',
        file_type_display: 'Presentation Slides (.pptx)',
        file_url: 'https://raw.githubusercontent.com/enquebet/spec-samples/main/compiler-llvm-course.pptx',
        file_size_bytes: 8400120,
        original_filename: 'cs420-compiler-design-llvm.pptx',
        tags: ['compilers', 'llvm', 'ir-optimization', 'slides', 'education'],
        downloads_count: 275,
        views_count: 910,
        status: 'APPROVED',
        status_display: 'Approved & Public',
        uploader: {
            id: 'seed-usr-4',
            username: 'dev_krishna',
            full_name: 'Krishna V.',
            profile_image: '',
            headline: 'Compiler & Systems Hacker',
            college: 'Stanford University',
        },
        created_at: '2026-10-02T16:00:00Z',
    },
    {
        id: 'res-seed-05',
        slug: 'zero-knowledge-snarks-math-cheatsheet',
        title: 'Zero-Knowledge Cryptography: PLONK & Groth16 Cheatsheet',
        description: 'Concise reference text document breaking down elliptic curve pairings, Schwartz-Zippel lemma, polynomial commitments (KZG), and arithmetization formulas.',
        category: 'CHEATSHEETS',
        category_display: 'Cheat Sheets & Handbooks',
        file_type: 'TXT',
        file_type_display: 'Plain Text',
        file_url: 'https://raw.githubusercontent.com/enquebet/spec-samples/main/zk-plonk-cheatsheet.txt',
        file_size_bytes: 45000,
        original_filename: 'zk-cryptography-quick-reference.txt',
        tags: ['zk-proofs', 'plonk', 'groth16', 'kzg', 'math'],
        downloads_count: 512,
        views_count: 1450,
        status: 'APPROVED',
        status_display: 'Approved & Public',
        uploader: {
            id: 'seed-usr-5',
            username: 'turing_crypt',
            full_name: 'Sophia Chen',
            profile_image: '',
            headline: 'Applied Cryptographer & Zero-Knowledge Researcher',
            college: 'UC Berkeley',
        },
        created_at: '2026-10-08T11:20:00Z',
    },
    {
        id: 'res-seed-06',
        slug: 'high-frequency-trading-engine-starter-kit',
        title: 'Rust Low-Latency Limit Order Book Starter Kit',
        description: 'Complete codebase archive (.zip) featuring lock-free ring buffers, cache-line aligned order books, binary protocol decoders, and deterministic backtesting suite.',
        category: 'STARTERS_CODE',
        category_display: 'Starter Kits & Templates',
        file_type: 'ZIP',
        file_type_display: 'Code Archive (.zip)',
        file_url: 'https://raw.githubusercontent.com/enquebet/spec-samples/main/rust-order-book-starter.zip',
        file_size_bytes: 6512300,
        original_filename: 'rust-hft-orderbook-v1.zip',
        tags: ['rust', 'hft', 'orderbook', 'low-latency', 'starter-kit'],
        downloads_count: 630,
        views_count: 2240,
        status: 'APPROVED',
        status_display: 'Approved & Public',
        uploader: {
            id: 'seed-usr-1',
            username: 'alex_systems',
            full_name: 'Alexandre Mercer',
            profile_image: '',
            headline: 'Staff Infrastructure Engineer | Distributed Systems',
            college: 'Carnegie Mellon University',
        },
        created_at: '2026-10-11T13:45:00Z',
    },
];
