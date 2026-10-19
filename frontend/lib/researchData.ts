// Living Research Types & Canonical Deeptech Repositories
// ENQUEbet Research Ecosystem (Living Papers, VenopAI Hardware BOM, Reproducibility)

export interface HardwareBOMItem {
    name: string;
    slug?: string;
    quantity: number;
    role?: string;
    datasheet_url?: string;
    category?: string;
    estimated_price_paise?: number;
}

export interface PaperAuthor {
    id?: string;
    full_name: string;
    email?: string;
    affiliation?: string;
    orcid?: string;
    order?: number;
    is_corresponding?: boolean;
    contribution_statement?: string;
    is_confirmed?: boolean;
    user_id?: string;
}

export interface PaperVersion {
    id: string;
    version_number: number;
    pdf_url: string;
    changelog?: string;
    submitted_at: string;
}

export interface ResearchAuthor {
    id: string;
    username: string;
    full_name?: string;
    profile_image?: string;
    headline?: string;
    college?: string;
    campus_domain?: string;
    city?: string;
    reputation_score?: number;
}

export interface ReproducibilityReview {
    id: string;
    reviewer: ResearchAuthor;
    verdict: 'VERIFIED_REPRODUCED' | 'PARTIALLY_REPRODUCED' | 'FAILED_TO_REPRODUCE' | 'METHODOLOGY_VALID';
    rigor_score: number;
    clarity_score: number;
    reproducibility_score: number;
    evaluation_notes: string;
    environment_details?: string;
    evidence_url?: string;
    created_at: string;
}

export interface ResearchPaper {
    id: string;
    paper_code: string;
    slug: string;
    title: string;
    abstract: string;
    methodology_summary?: string;
    field: string;
    field_display?: string;
    status: 'DRAFT' | 'SUBMITTED' | 'PENDING_APPROVAL' | 'UNDER_REVIEW' | 'REVISION_REQUIRED' | 'ACCEPTED' | 'PREPRINT' | 'PEER_REVIEWED' | 'REPRODUCED' | 'REJECTED' | 'WITHDRAWN';
    status_display?: string;
    rejection_reason?: string;
    reviewed_at?: string;
    author_feedback?: string;
    internal_editorial_notes?: string;
    screening_checklist?: Record<string, any>;
    primary_author: ResearchAuthor;
    authors?: PaperAuthor[];
    versions?: PaperVersion[];
    pdf_url?: string;
    code_repo_url?: string;
    dataset_url?: string;
    live_demo_url?: string;
    hardware_bom: HardwareBOMItem[];
    associated_workspace?: string;
    workspace_summary?: {
        id: string;
        title: string;
        collaborators_count: number;
    };
    open_collaborator_roles: string[];
    citations_count: number;
    reproducibility_score: number;
    views_count: number;
    downloads_count: number;
    doi?: string;
    keywords?: string[];
    published_at: string;
    updated_at?: string;
    reproducibility_reviews?: ReproducibilityReview[];
    bibtex?: string;
    has_code?: boolean;
    has_dataset?: boolean;
    has_demo?: boolean;
    has_bom?: boolean;
    hardware_bom_count?: number;
    reviews_count?: number;
}

export const RESEARCH_FIELDS = [
    { id: 'ALL', label: 'All Disciplines' },
    { id: 'AI_ML', label: 'AI & Neural Systems' },
    { id: 'ROBOTICS_EMBEDDED', label: 'Robotics & Hardware' },
    { id: 'QUANTUM', label: 'Quantum Computing' },
    { id: 'BIOTECH', label: 'Bioengineering & Health' },
    { id: 'CLEAN_ENERGY', label: 'Clean Energy' },
    { id: 'CRYPTOGRAPHY', label: 'Cryptography' },
    { id: 'AEROSPACE', label: 'Aerospace & Systems' },
] as const;

export const CANONICAL_RESEARCH_PAPERS: ResearchPaper[] = [
    {
        id: 'res-canon-01',
        paper_code: 'ENQ-RES-2026-0042',
        slug: 'real-time-edge-neural-compression-on-heterogeneous-risc-v-silicon',
        title: 'Real-Time Edge Neural Compression on Heterogeneous RISC-V Silicon with Dynamic INT4 Quantization',
        abstract: 'Deploying sub-billion parameter vision-language models directly on resource-constrained embedded edge nodes requires aggressive weight compression without degrading temporal attention fidelity. We present a cycle-accurate dynamic INT4 sparse quantization runtime implemented on custom RISC-V vector extensions. Across 10,000 edge inference cycles, our pipeline achieves 8.4x throughput elevation and 71% thermal dissipation reduction compared to standard float16 baselines.',
        methodology_summary: 'Evaluated against cycle-accurate Verilator RTL benches using physical ESP32-S3 and STM32H7 microcontrollers. Vector SIMD kernels were compiled via LLVM 18 with custom autotuning.',
        field: 'ROBOTICS_EMBEDDED',
        field_display: 'Robotics, Hardware & Embedded Systems',
        status: 'REPRODUCED',
        status_display: 'Empirically Verified & Reproduced',
        primary_author: {
            id: 'author-01',
            username: 'elena_rostova',
            full_name: 'Dr. Elena Rostova',
            profile_image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            headline: 'Embedded Systems Lead & RISC-V Architect',
            college: 'Indian Institute of Technology (IIT)',
            campus_domain: 'iit.ac.in',
            city: 'Bengaluru, India',
            reputation_score: 940,
        },
        pdf_url: 'https://arxiv.org/abs/2403.0042',
        code_repo_url: 'https://github.com/enquebet-labs/edge-quant-riscv',
        dataset_url: 'https://zenodo.org/record/8492014',
        live_demo_url: 'https://edge-quant.enquebet.org',
        hardware_bom: [
            {
                name: 'ESP32-S3-WROOM-1 Microcontroller Dual-Core XTensa LX7',
                slug: 'esp32-s3-wroom-1-n16r8',
                quantity: 2,
                role: 'Edge Inference Host Node',
                datasheet_url: 'https://venopai.in/datasheets/esp32-s3.pdf',
                estimated_price_paise: 38900
            },
            {
                name: 'MPU-6050 6-Axis Accelerometer & Gyroscope Sensor',
                slug: 'mpu-6050-6-axis-sensor',
                quantity: 1,
                role: 'High-Frequency Telemetry Capture',
                datasheet_url: 'https://venopai.in/datasheets/mpu-6050.pdf',
                estimated_price_paise: 14900
            },
            {
                name: 'Logic Level Converter 4-Channel Bi-Directional',
                slug: 'logic-level-converter-4ch',
                quantity: 2,
                role: '3.3V to 5V Bus Level Shift',
                datasheet_url: 'https://venopai.in/datasheets/logic-shifter.pdf',
                estimated_price_paise: 7900
            }
        ],
        open_collaborator_roles: ['FPGA Vector Kernel Engineer', 'Thermal Characterization Lead'],
        citations_count: 38,
        reproducibility_score: 4.9,
        views_count: 1420,
        downloads_count: 340,
        doi: '10.1145/enquebet.2026.0042',
        keywords: ['risc-v', 'edge-ai', 'quantization', 'embedded-systems', 'hardware-bom'],
        published_at: '2026-10-04T12:00:00Z',
        has_code: true,
        has_dataset: true,
        has_demo: true,
        has_bom: true,
        hardware_bom_count: 3,
        reviews_count: 3,
        reproducibility_reviews: [
            {
                id: 'rev-01',
                reviewer: {
                    id: 'rev-user-01',
                    username: 'kavya_nair',
                    full_name: 'Kavya Nair',
                    headline: 'Hardware Verification Specialist',
                    college: 'BITS Pilani',
                    campus_domain: 'bits-pilani.ac.in',
                    reputation_score: 880,
                },
                verdict: 'VERIFIED_REPRODUCED',
                rigor_score: 5,
                clarity_score: 5,
                reproducibility_score: 5,
                evaluation_notes: 'Successfully synthesized the Verilog vector unit on Artix-7 and verified latency benchmarks on ESP32-S3 hardware via VenopAI parts. Timing closure met at 240MHz with 0 setup violations.',
                environment_details: 'Ubuntu 24.04 LTS, Vivado 2024.1, ESP32-S3 DevKitC-1 with ESP-IDF v5.2',
                evidence_url: 'https://github.com/kavya-nair/repro-enquebet-0042',
                created_at: '2026-10-08T09:30:00Z'
            }
        ],
        bibtex: `@article{rostova2026edgequant,
  author = {Dr. Elena Rostova},
  title = {Real-Time Edge Neural Compression on Heterogeneous RISC-V Silicon with Dynamic INT4 Quantization},
  journal = {ENQUEbet Living Research Repository},
  year = {2026},
  eprint = {ENQ-RES-2026-0042},
  doi = {10.1145/enquebet.2026.0042},
  url = {https://enquebet.com/research/real-time-edge-neural-compression-on-heterogeneous-risc-v-silicon}
}`
    },
    {
        id: 'res-canon-02',
        paper_code: 'ENQ-RES-2026-0078',
        slug: 'decentralized-swarm-consensus-for-autonomous-micro-aerial-vehicles',
        title: 'Decentralized Swarm Consensus in GPS-Denied Environments using Optical Flow & Ultra-Wideband Meshes',
        abstract: 'Coordinated flight in micro-aerial vehicle (MAV) swarms traditionally relies on external RTK-GPS or central motion capture grids. We propose an asynchronous distributed consensus protocol that couples optical flow divergence estimation with peer-to-peer UWB ranging. In trials across 12 quadrotors inside subterranean obstacles, the swarm sustained 99.4% formation coherence at speeds reaching 4.2 m/s.',
        methodology_summary: 'Conducted in abandoned quarry tunnels using ROS2 Humble and custom PX4 flight stacks. Peer telemetry synchronized over 802.15.4 UWB mesh at 100Hz.',
        field: 'AEROSPACE',
        field_display: 'Aerospace & Swarms',
        status: 'PEER_REVIEWED',
        status_display: 'Peer-Reviewed & Audited',
        primary_author: {
            id: 'author-02',
            username: 'aarav_sharma',
            full_name: 'Aarav Sharma',
            profile_image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
            headline: 'Autonomous Flight Researcher & Robotics Builder',
            college: 'IIT Madras',
            campus_domain: 'iitm.ac.in',
            city: 'Chennai, India',
            reputation_score: 875,
        },
        pdf_url: 'https://arxiv.org/abs/2405.0078',
        code_repo_url: 'https://github.com/enquebet-labs/mav-swarm-consensus',
        dataset_url: 'https://kaggle.com/datasets/enquebet/mav-tunnel-trials',
        live_demo_url: 'https://swarm-viz.enquebet.org',
        hardware_bom: [
            {
                name: 'STM32F405 Flight Management Unit with Barometer',
                slug: 'stm32f405-flight-controller',
                quantity: 4,
                role: 'PX4 Realtime Autopilot',
                datasheet_url: 'https://venopai.in/datasheets/stm32f405.pdf',
                estimated_price_paise: 249000
            },
            {
                name: 'HC-SR04 Ultrasonic Distance Transducer Module',
                slug: 'hc-sr04-ultrasonic-sensor',
                quantity: 8,
                role: 'Perimeter Proximity Guard',
                datasheet_url: 'https://venopai.in/datasheets/hc-sr04.pdf',
                estimated_price_paise: 9500
            }
        ],
        open_collaborator_roles: ['SLAM State Estimation Specialist', 'PX4 Firmware Hacker'],
        citations_count: 24,
        reproducibility_score: 4.7,
        views_count: 980,
        downloads_count: 215,
        doi: '10.1109/enquebet.2026.0078',
        keywords: ['mav', 'swarm-robotics', 'optical-flow', 'ros2', 'px4'],
        published_at: '2026-10-10T14:30:00Z',
        has_code: true,
        has_dataset: true,
        has_demo: true,
        has_bom: true,
        hardware_bom_count: 2,
        reviews_count: 2,
        bibtex: `@article{sharma2026swarm,
  author = {Aarav Sharma},
  title = {Decentralized Swarm Consensus in GPS-Denied Environments using Optical Flow & Ultra-Wideband Meshes},
  journal = {ENQUEbet Living Research Repository},
  year = {2026},
  eprint = {ENQ-RES-2026-0078},
  url = {https://enquebet.com/research/decentralized-swarm-consensus-for-autonomous-micro-aerial-vehicles}
}`
    },
    {
        id: 'res-canon-03',
        paper_code: 'ENQ-RES-2026-0105',
        slug: 'hybrid-quantum-classical-variational-solvers-for-lithium-sulfur-cathodes',
        title: 'Hybrid Quantum-Classical Variational Solvers for Molecular Dissolution in Next-Gen Lithium-Sulfur Cathodes',
        abstract: 'Lithium-Sulfur (Li-S) cells offer 5x theoretical energy densities over conventional NMC chemistries but suffer catastrophic polysulfide shuttling. We model the reaction coordinate of Li2S6 dissolution utilizing a 28-qubit hardware-efficient Variational Quantum Eigensolver (VQE) mapped to superconducting transmon layouts. We identify a stable fluorinated ether electrolyte coordination structure reducing active sulfur degradation by 84%.',
        methodology_summary: 'Simulated with Qiskit Aer GPU statevector emulator with noisy Kraus operator channel modeling 10^-3 two-qubit gate error rates.',
        field: 'QUANTUM',
        field_display: 'Quantum Computing & Information',
        status: 'PREPRINT',
        status_display: 'Open Preprint',
        primary_author: {
            id: 'author-03',
            username: 'devika_menon',
            full_name: 'Devika Menon',
            profile_image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
            headline: 'Computational Quantum Chemist & Materials Scientist',
            college: 'Indian Institute of Science (IISc)',
            campus_domain: 'iisc.ac.in',
            city: 'Bengaluru, India',
            reputation_score: 910,
        },
        pdf_url: 'https://arxiv.org/abs/2407.0105',
        code_repo_url: 'https://github.com/enquebet-labs/vqe-polysulfide-shuttle',
        dataset_url: 'https://zenodo.org/record/991204',
        live_demo_url: 'https://vqe-materials.enquebet.org',
        hardware_bom: [],
        open_collaborator_roles: ['Transmon Noise Modeling Specialist', 'Battery Electrochemistry Bench Lead'],
        citations_count: 12,
        reproducibility_score: 4.8,
        views_count: 810,
        downloads_count: 190,
        doi: '10.1038/enquebet.2026.0105',
        keywords: ['quantum-computing', 'vqe', 'battery-tech', 'clean-energy', 'qiskit'],
        published_at: '2026-10-14T08:15:00Z',
        has_code: true,
        has_dataset: true,
        has_demo: true,
        has_bom: false,
        hardware_bom_count: 0,
        reviews_count: 1,
        bibtex: `@article{menon2026quantum,
  author = {Devika Menon},
  title = {Hybrid Quantum-Classical Variational Solvers for Molecular Dissolution in Next-Gen Lithium-Sulfur Cathodes},
  journal = {ENQUEbet Living Research Repository},
  year = {2026},
  eprint = {ENQ-RES-2026-0105},
  url = {https://enquebet.com/research/hybrid-quantum-classical-variational-solvers-for-lithium-sulfur-cathodes}
}`
    }
];
