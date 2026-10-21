/**
 * Canonical Academy Datasets & Category Seed for ENQUEbet Academy
 * Used as reliable fallback and instant hydration
 */
import { Course, CourseCategory, AcademyStats } from '@/types/academy';

export const CANONICAL_ACADEMY_CATEGORIES: CourseCategory[] = [
    {
        id: 'cat-web-systems',
        name: 'Software & Web Systems',
        slug: 'web-systems',
        icon: 'Code',
        description: 'Production full-stack engineering, distributed systems, real-time protocols, and system design.',
        display_order: 1,
        courses_count: 1,
    },
    {
        id: 'cat-ai-ml',
        name: 'AI & Machine Learning',
        slug: 'ai-ml',
        icon: 'Brain',
        description: 'Autonomous multi-agent architectures, vector search, LLM fine-tuning, and neural networks.',
        display_order: 2,
        courses_count: 1,
    },
    {
        id: 'cat-cloud-devops',
        name: 'Cloud Infrastructure & DevOps',
        slug: 'cloud-devops',
        icon: 'Cloud',
        description: 'Kubernetes clusters, Terraform IaC, multi-stage Docker builds, and zero-downtime CI/CD.',
        display_order: 3,
        courses_count: 1,
    },
    {
        id: 'cat-embedded-systems',
        name: 'Electronics & Embedded Systems',
        slug: 'embedded-systems',
        icon: 'Cpu',
        description: 'Bare-metal Rust firmware, FreeRTOS scheduling, DMA drivers, and VenopAI hardware integration.',
        display_order: 4,
        courses_count: 1,
    },
    {
        id: 'cat-product-design',
        name: 'Product & Visual Design',
        slug: 'product-design',
        icon: 'Palette',
        description: 'Design systems, high-density SaaS UX, accessibility, and modern interactive animation.',
        display_order: 5,
        courses_count: 0,
    },
];

export const CANONICAL_ACADEMY_COURSES: Course[] = [
    {
        id: 'course-fullstack-saas',
        slug: 'fullstack-saas-nextjs-django',
        title: 'Full-Stack SaaS Engineering with Next.js 16 & Django Channels',
        short_description: 'Build an enterprise-grade collaborative workspace engine featuring ASGI WebSockets, atomic state transactions, and optimistic UI updates.',
        full_description: (
            'In this comprehensive, project-first masterclass, you will engineer a high-concurrency SaaS workspace ' +
            'from scratch. You will configure Daphne ASGI with Django Channels, implement atomic state machines for ' +
            'task progression, design outbox patterns for reliable Redis notifications, and build a blazing-fast ' +
            'Next.js App Router frontend with sub-100ms optimistic UI updates.'
        ),
        category: CANONICAL_ACADEMY_CATEGORIES[0],
        difficulty: 'intermediate',
        format: 'project_based',
        estimated_hours: 18,
        thumbnail_url: 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
        creator: {
            id: 'creator-staff-1',
            username: 'staff_architect',
            full_name: 'ENQUEbet Systems Lead',
            headline: 'Principal Infrastructure Architect',
            reputation_score: 950,
        },
        status: 'published',
        access_tier: 'free',
        price_inr: 0,
        prerequisites: [
            'Proficiency in modern TypeScript & React hooks',
            'Familiarity with Python and Django REST framework',
            'Basic understanding of HTTP vs WebSocket protocols',
        ],
        learning_outcomes: [
            'Architect dual-protocol web applications with HTTP REST and ASGI WebSockets',
            'Implement transactional outbox pattern to eliminate distributed system message loss',
            'Build optimistic state stores that reconcile real-time server broadcasts seamlessly',
            'Design multi-tenant PostgreSQL schemas with strict row-level authorization',
        ],
        project_outcome_title: 'Production Real-Time Workspace Platform with Live Task Sync',
        project_outcome_description: (
            'You will deliver a production-ready real-time collaboration workspace with live task kanban, ' +
            'presence indicators, deliverable reviews, and cryptographically verified audit trails.'
        ),
        starter_repo_url: 'https://github.com/enquebet/saas-starter-template',
        skills_gained: ['Next.js 16', 'Django Channels', 'WebSockets', 'Redis', 'PostgreSQL', 'Tailwind CSS', 'Docker'],
        is_featured: true,
        enrolled_count: 428,
        modules_count: 3,
        lessons_count: 5,
        is_enrolled: false,
        progress_percent: 0,
        is_bookmarked: false,
        created_at: '2026-10-18T10:00:00Z',
    },
    {
        id: 'course-applied-ai',
        slug: 'applied-ai-agents-vector-search',
        title: 'Applied AI & LLM Systems: Autonomous Multi-Agent Architectures',
        short_description: 'Engineer production autonomous agent loops, hybrid dense-sparse vector search, deterministic tool execution, and token streaming pipelines.',
        full_description: (
            'Master the engineering of reliable, non-hallucinating LLM applications. In this course, you will build ' +
            'an autonomous code review and refactoring multi-agent system. You will implement ReAct thought-action-observation ' +
            'loops, hybrid vector search combining pgvector and BM25, strict JSON schema validation for tool calling, and ' +
            'real-time Server-Sent Events (SSE) token streaming.'
        ),
        category: CANONICAL_ACADEMY_CATEGORIES[1],
        difficulty: 'advanced',
        format: 'project_based',
        estimated_hours: 24,
        thumbnail_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
        creator: {
            id: 'creator-staff-2',
            username: 'ai_researcher',
            full_name: 'Dr. Evelyn Vance',
            headline: 'Staff AI Research Scientist',
            reputation_score: 1120,
        },
        status: 'published',
        access_tier: 'free',
        price_inr: 0,
        prerequisites: [
            'Intermediate Python experience (asyncio, type hints)',
            'Familiarity with OpenAI or Anthropic API fundamentals',
            'Basic SQL and relational database concepts',
        ],
        learning_outcomes: [
            'Construct fault-tolerant ReAct reasoning engines with deterministic circuit breakers',
            'Implement hybrid semantic retrieval combining cosine similarity with lexical keyword ranking',
            'Enforce structured outputs via Pydantic schema validation and tool calling protocols',
            'Deploy streaming AI services with low time-to-first-token (TTFT) metrics',
        ],
        project_outcome_title: 'Autonomous Code Review & Refactoring Agent with AST Verification',
        project_outcome_description: (
            'An intelligent CI/CD agent that parses pull request diffs, retrieves relevant architectural context from ' +
            'a code knowledge base, and suggests syntax-verified code patches.'
        ),
        starter_repo_url: 'https://github.com/enquebet/agentic-ai-starter',
        skills_gained: ['Python', 'LangChain', 'pgvector', 'FastAPI', 'Agentic Workflows', 'Prompt Engineering', 'Pydantic'],
        is_featured: true,
        enrolled_count: 612,
        modules_count: 2,
        lessons_count: 3,
        is_enrolled: false,
        progress_percent: 0,
        is_bookmarked: false,
        created_at: '2026-10-19T14:30:00Z',
    },
    {
        id: 'course-cloud-devops',
        slug: 'production-devops-docker-terraform',
        title: 'Production Cloud Infrastructure & DevOps with Docker, Terraform & CI/CD',
        short_description: 'Architect immutable, reproducible cloud deployments using multi-stage Dockerfiles, Terraform infrastructure-as-code, and GitHub Actions.',
        full_description: (
            'Step beyond toy deployments. In this hands-on course, you will engineer a battle-tested cloud delivery ' +
            'pipeline. You will create minimal distroless Docker containers, provision isolated multi-environment cloud ' +
            'infrastructure with Terraform, automate security scanning and linting in GitHub Actions, and implement ' +
            'zero-downtime blue-green rollouts.'
        ),
        category: CANONICAL_ACADEMY_CATEGORIES[2],
        difficulty: 'intermediate',
        format: 'project_based',
        estimated_hours: 14,
        thumbnail_url: 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=1200&q=80',
        creator: {
            id: 'creator-staff-3',
            username: 'devops_ninja',
            full_name: 'Marcus Brody',
            headline: 'Staff SRE & Platform Engineer',
            reputation_score: 840,
        },
        status: 'published',
        access_tier: 'free',
        price_inr: 0,
        prerequisites: [
            'Basic Linux terminal proficiency',
            'Familiarity with Git branching workflows',
            'Understanding of web server and database architecture',
        ],
        learning_outcomes: [
            'Write minimal, secure multi-stage Dockerfiles under 50MB',
            'Provision reproducible cloud resources with modular Terraform',
            'Construct automated CI/CD pipelines with linting, testing, and security gates',
            'Execute zero-downtime rolling deployments with health checks',
        ],
        project_outcome_title: 'Multi-Region Cloud Deployment Pipeline with Zero-Downtime Rollbacks',
        project_outcome_description: (
            'A complete infrastructure-as-code repository that provisions container hosts, VPCs, managed databases, ' +
            'and automated deployment webhooks.'
        ),
        starter_repo_url: 'https://github.com/enquebet/devops-infra-starter',
        skills_gained: ['Docker', 'Terraform', 'GitHub Actions', 'AWS', 'Linux', 'Security Auditing', 'Nginx'],
        is_featured: false,
        enrolled_count: 310,
        modules_count: 1,
        lessons_count: 1,
        is_enrolled: false,
        progress_percent: 0,
        is_bookmarked: false,
        created_at: '2026-10-17T09:15:00Z',
    },
    {
        id: 'course-embedded-rust',
        slug: 'embedded-firmware-rust-freertos',
        title: 'Embedded Systems & Firmware Engineering with Rust & FreeRTOS',
        short_description: 'Write safe, bare-metal microcontroller firmware with zero-cost abstractions, real-time multitasking, and hardware DMA peripherals.',
        full_description: (
            'Bring modern memory safety to embedded engineering. In this advanced masterclass, you will program ' +
            'ARM Cortex-M microcontrollers using bare-metal Rust and FreeRTOS. You will implement direct memory-mapped ' +
            'I/O drivers, configure DMA channels for non-blocking serial communication, prevent priority inversion with ' +
            'mutex inheritance, and interface with VenopAI hardware sensor modules.'
        ),
        category: CANONICAL_ACADEMY_CATEGORIES[3],
        difficulty: 'expert',
        format: 'project_based',
        estimated_hours: 28,
        thumbnail_url: 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
        creator: {
            id: 'creator-staff-4',
            username: 'firmware_guru',
            full_name: 'Devin Thorne',
            headline: 'Embedded Systems Specialist at VenopAI',
            reputation_score: 1350,
        },
        status: 'published',
        access_tier: 'free',
        price_inr: 0,
        prerequisites: [
            'Solid understanding of C or Rust systems programming',
            'Familiarity with digital electronics and binary arithmetic',
            'Basic microcontroller concepts (registers, timers, interrupts)',
        ],
        learning_outcomes: [
            'Write memory-safe `no_std` firmware on bare-metal ARM Cortex-M hardware',
            'Schedule real-time tasks and queues with FreeRTOS priority guarantees',
            'Drive high-speed peripherals via Direct Memory Access (DMA) without CPU stalls',
            'Integrate embedded sensor telemetry with low-power sleep modes',
        ],
        project_outcome_title: 'Industrial Sensor Node with Low-Power Sleep & Verifiable Telemetry',
        project_outcome_description: (
            'A production firmware build for an STM32/ESP32 sensor node that streams cryptographically hashed telemetry ' +
            'with sub-milliamp battery consumption.'
        ),
        starter_repo_url: 'https://github.com/enquebet/rust-embedded-starter',
        skills_gained: ['Embedded Rust', 'FreeRTOS', 'ARM Cortex-M', 'DMA', 'SPI/UART', 'Hardware Debugging', 'C/C++'],
        is_featured: true,
        enrolled_count: 189,
        modules_count: 1,
        lessons_count: 1,
        is_enrolled: false,
        progress_percent: 0,
        is_bookmarked: false,
        created_at: '2026-10-20T16:00:00Z',
    },
];

export const CANONICAL_ACADEMY_STATS: AcademyStats = {
    total_courses: 4,
    total_enrollments: 1539,
    total_completions: 214,
    total_assignments: 18,
};
