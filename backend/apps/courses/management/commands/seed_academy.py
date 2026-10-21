"""
Django Management Command: Seed Production Engineering Masterclasses for ENQUEbet Academy
"""
from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from apps.courses.models import (
    CourseCategory,
    Course,
    CourseModule,
    Lesson,
    Assignment,
    DifficultyLevel,
    CourseFormat,
    CourseStatus,
    AccessTier,
    ContentType,
    DeliverableType,
)

User = get_user_model()


class Command(BaseCommand):
    help = 'Seeds realistic, project-first engineering courses into ENQUEbet Academy'

    def handle(self, *args, **options):
        self.stdout.write("Seeding ENQUEbet Academy courses...")

        # 1. Resolve Creator User
        creator = User.objects.filter(is_superuser=True).first()
        if not creator:
            creator = User.objects.filter(is_staff=True).first()
        if not creator:
            creator = User.objects.first()
        if not creator:
            creator = User.objects.create_user(
                username='staff_academy',
                email='academy@enquebet.com',
                full_name='ENQUEbet Academy Engineering Staff',
                headline='Staff Technical Architects & Builders',
                is_staff=True
            )

        # 2. Taxonomy Categories
        categories_data = [
            {
                'name': 'Software & Web Systems',
                'slug': 'web-systems',
                'icon': 'Code',
                'description': 'Production full-stack engineering, distributed systems, real-time protocols, and system design.',
                'display_order': 1,
            },
            {
                'name': 'AI & Machine Learning',
                'slug': 'ai-ml',
                'icon': 'Brain',
                'description': 'Autonomous multi-agent architectures, vector search, LLM fine-tuning, and neural networks.',
                'display_order': 2,
            },
            {
                'name': 'Cloud Infrastructure & DevOps',
                'slug': 'cloud-devops',
                'icon': 'Cloud',
                'description': 'Kubernetes clusters, Terraform IaC, multi-stage Docker builds, and zero-downtime CI/CD.',
                'display_order': 3,
            },
            {
                'name': 'Electronics & Embedded Systems',
                'slug': 'embedded-systems',
                'icon': 'Cpu',
                'description': 'Bare-metal Rust firmware, FreeRTOS scheduling, DMA drivers, and VenopAI hardware integration.',
                'display_order': 4,
            },
            {
                'name': 'Product & Visual Design',
                'slug': 'product-design',
                'icon': 'Palette',
                'description': 'Design systems, high-density SaaS UX, accessibility, and modern interactive animation.',
                'display_order': 5,
            },
        ]

        cat_objs = {}
        for cdata in categories_data:
            cat, _ = CourseCategory.objects.update_or_create(
                slug=cdata['slug'],
                defaults=cdata
            )
            cat_objs[cdata['slug']] = cat

        # 3. Seed Masterclasses
        courses_data = [
            {
                'slug': 'fullstack-saas-nextjs-django',
                'title': 'Full-Stack SaaS Engineering with Next.js 16 & Django Channels',
                'short_description': 'Build an enterprise-grade collaborative workspace engine featuring ASGI WebSockets, atomic state transactions, and optimistic UI updates.',
                'full_description': (
                    "In this comprehensive, project-first masterclass, you will engineer a high-concurrency SaaS workspace "
                    "from scratch. You will configure Daphne ASGI with Django Channels, implement atomic state machines for "
                    "task progression, design outbox patterns for reliable Redis notifications, and build a blazing-fast "
                    "Next.js App Router frontend with sub-100ms optimistic UI updates."
                ),
                'category': cat_objs['web-systems'],
                'difficulty': DifficultyLevel.INTERMEDIATE,
                'format': CourseFormat.PROJECT_BASED,
                'estimated_hours': 18,
                'thumbnail_url': 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&w=1200&q=80',
                'creator': creator,
                'status': CourseStatus.PUBLISHED,
                'access_tier': AccessTier.FREE,
                'price_inr': 0,
                'is_featured': True,
                'skills_gained': ['Next.js 16', 'Django Channels', 'WebSockets', 'Redis', 'PostgreSQL', 'Tailwind CSS', 'Docker'],
                'prerequisites': [
                    'Proficiency in modern TypeScript & React hooks',
                    'Familiarity with Python and Django REST framework',
                    'Basic understanding of HTTP vs WebSocket protocols'
                ],
                'learning_outcomes': [
                    'Architect dual-protocol web applications with HTTP REST and ASGI WebSockets',
                    'Implement transactional outbox pattern to eliminate distributed system message loss',
                    'Build optimistic state stores that reconcile real-time server broadcasts seamlessly',
                    'Design multi-tenant PostgreSQL schemas with strict row-level authorization'
                ],
                'project_outcome_title': 'Production Real-Time Workspace Platform with Live Task Sync',
                'project_outcome_description': (
                    'You will deliver a production-ready real-time collaboration workspace with live task kanban, '
                    'presence indicators, deliverable reviews, and cryptographically verified audit trails.'
                ),
                'starter_repo_url': 'https://github.com/enquebet/saas-starter-template',
                'modules': [
                    {
                        'order': 1,
                        'title': 'Architecture, Monorepos & ASGI Foundations',
                        'description': 'Configure Next.js and Django Daphne with shared TypeScript contracts and dual-protocol routing.',
                        'lessons': [
                            {
                                'order': 1,
                                'title': 'Monorepo Setup & System Boundaries',
                                'slug': 'monorepo-setup-system-boundaries',
                                'content_type': ContentType.ARTICLE,
                                'duration_minutes': 15,
                                'is_preview': True,
                                'article_markdown': (
                                    "# Monorepo Architecture & System Boundaries\n\n"
                                    "When building production SaaS systems, maintaining strict type synchronization between the Python backend and the TypeScript frontend is crucial.\n\n"
                                    "## Key Design Goals\n\n"
                                    "- **Decoupled Deployability**: Independent Next.js and Django service lifecycles.\n"
                                    "- **Unified Domain Vocabulary**: Consistent model naming across DB and client stores.\n"
                                    "- **Zero-Cold-Start ASGI**: Daphne channel layers configured for persistent connections."
                                ),
                            },
                            {
                                'order': 2,
                                'title': 'Configuring Daphne ASGI & Redis Channel Layer',
                                'slug': 'configuring-daphne-asgi-redis-channel-layer',
                                'content_type': ContentType.WALKTHROUGH,
                                'duration_minutes': 25,
                                'is_preview': True,
                                'article_markdown': (
                                    "# Configuring Daphne ASGI & Redis Channel Layer\n\n"
                                    "In this walkthrough, we establish the ASGI application pipeline and wire `channels_redis`.\n\n"
                                    "```python\n"
                                    "# config/asgi.py\n"
                                    "import os\n"
                                    "from django.core.asgi import get_asgi_application\n"
                                    "from channels.routing import ProtocolTypeRouter, URLRouter\n"
                                    "from channels.auth import AuthMiddlewareStack\n\n"
                                    "os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')\n"
                                    "django_asgi = get_asgi_application()\n\n"
                                    "application = ProtocolTypeRouter({\n"
                                    "    'http': django_asgi,\n"
                                    "    'websocket': AuthMiddlewareStack(\n"
                                    "        URLRouter(websocket_urlpatterns)\n"
                                    "    ),\n"
                                    "})\n"
                                    "```"
                                ),
                            },
                        ],
                    },
                    {
                        'order': 2,
                        'title': 'Real-Time State Synchronization & Optimistic UI',
                        'description': 'Implement real-time broadcast pipelines and handle client reconnect states gracefully.',
                        'lessons': [
                            {
                                'order': 1,
                                'title': 'Designing the WebSocket Ticket Handshake',
                                'slug': 'designing-websocket-ticket-handshake',
                                'content_type': ContentType.ARTICLE,
                                'duration_minutes': 20,
                                'is_preview': False,
                                'article_markdown': (
                                    "# WebSocket Ticket Handshake Pattern\n\n"
                                    "Never send bearer tokens directly in WebSocket query parameters—they leak into proxy logs and browser history.\n\n"
                                    "Instead, issue short-lived (60s), single-use cryptographic tickets over authenticated HTTPS, then exchange the ticket on connection initiation."
                                ),
                            },
                            {
                                'order': 2,
                                'title': 'Optimistic Task Kanban Updates with Auto-Rollback',
                                'slug': 'optimistic-task-kanban-auto-rollback',
                                'content_type': ContentType.WALKTHROUGH,
                                'duration_minutes': 30,
                                'is_preview': False,
                                'article_markdown': (
                                    "# Optimistic Task Kanban Updates\n\n"
                                    "Learn how to mutate client state immediately on user drag, queue an atomic mutation promise, and rollback cleanly if the server emits a conflict."
                                ),
                            },
                        ],
                    },
                    {
                        'order': 3,
                        'title': 'Capstone Deliverable & Verification',
                        'description': 'Deliver the complete collaborative workspace project and pass peer evaluation.',
                        'lessons': [
                            {
                                'order': 1,
                                'title': 'Workspace Capstone Specifications',
                                'slug': 'workspace-capstone-specifications',
                                'content_type': ContentType.ASSIGNMENT,
                                'duration_minutes': 45,
                                'is_preview': False,
                                'article_markdown': (
                                    "# Capstone Project: Real-Time Collaborative Workspace\n\n"
                                    "Implement the end-to-end task board, live presence tracker, deliverable review pipeline, and verified audit log."
                                ),
                            },
                        ],
                    },
                ],
                'assignment': {
                    'title': 'Build a Real-Time Workspace Task Board with WebSocket Broadcasts',
                    'instructions_markdown': (
                        "### Assignment Brief\n\n"
                        "Fork the starter repository and implement:\n"
                        "1. A Kanban task board with status transitions (`backlog` -> `in_progress` -> `in_review` -> `completed`).\n"
                        "2. WebSocket event broadcasting using Django Channels and Redis.\n"
                        "3. Optimistic UI client state with automatic rollback on error.\n"
                        "4. Unit tests covering both the DRF mutation endpoints and the WebSocket consumer."
                    ),
                    'acceptance_criteria': [
                        'Zero-latency optimistic drag-and-drop on Kanban columns',
                        'Real-time multi-browser task state sync via WebSockets',
                        'All test suites passing with >80% coverage',
                        'Production build deploys cleanly on Vercel and Render'
                    ],
                    'starter_repo_url': 'https://github.com/enquebet/saas-starter-template',
                    'required_deliverable_type': DeliverableType.REPO_LINK,
                }
            },
            {
                'slug': 'applied-ai-agents-vector-search',
                'title': 'Applied AI & LLM Systems: Autonomous Multi-Agent Architectures',
                'short_description': 'Engineer production autonomous agent loops, hybrid dense-sparse vector search, deterministic tool execution, and token streaming pipelines.',
                'full_description': (
                    "Master the engineering of reliable, non-hallucinating LLM applications. In this course, you will build "
                    "an autonomous code review and refactoring multi-agent system. You will implement ReAct thought-action-observation "
                    "loops, hybrid vector search combining pgvector and BM25, strict JSON schema validation for tool calling, and "
                    "real-time Server-Sent Events (SSE) token streaming."
                ),
                'category': cat_objs['ai-ml'],
                'difficulty': DifficultyLevel.ADVANCED,
                'format': CourseFormat.PROJECT_BASED,
                'estimated_hours': 24,
                'thumbnail_url': 'https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=1200&q=80',
                'creator': creator,
                'status': CourseStatus.PUBLISHED,
                'access_tier': AccessTier.FREE,
                'price_inr': 0,
                'is_featured': True,
                'skills_gained': ['Python', 'LangChain', 'pgvector', 'FastAPI', 'Agentic Workflows', 'Prompt Engineering', 'Pydantic'],
                'prerequisites': [
                    'Intermediate Python experience (asyncio, type hints)',
                    'Familiarity with OpenAI or Anthropic API fundamentals',
                    'Basic SQL and relational database concepts'
                ],
                'learning_outcomes': [
                    'Construct fault-tolerant ReAct reasoning engines with deterministic circuit breakers',
                    'Implement hybrid semantic retrieval combining cosine similarity with lexical keyword ranking',
                    'Enforce structured outputs via Pydantic schema validation and tool calling protocols',
                    'Deploy streaming AI services with low time-to-first-token (TTFT) metrics'
                ],
                'project_outcome_title': 'Autonomous Code Review & Refactoring Agent with AST Verification',
                'project_outcome_description': (
                    'An intelligent CI/CD agent that parses pull request diffs, retrieves relevant architectural context from '
                    'a code knowledge base, and suggests syntax-verified code patches.'
                ),
                'starter_repo_url': 'https://github.com/enquebet/agentic-ai-starter',
                'modules': [
                    {
                        'order': 1,
                        'title': 'Agentic Loops & Deterministic Tool Schemas',
                        'description': 'Master the ReAct framework, structured function calling, and state persistence.',
                        'lessons': [
                            {
                                'order': 1,
                                'title': 'The ReAct Pattern & Agent State Machines',
                                'slug': 'react-pattern-agent-state-machines',
                                'content_type': ContentType.ARTICLE,
                                'duration_minutes': 20,
                                'is_preview': True,
                                'article_markdown': (
                                    "# The ReAct Pattern in Production\n\n"
                                    "Reasoning without action is paralyzed; action without reasoning is reckless.\n\n"
                                    "Learn how to construct state machines where models iteratively think, generate structured tool invocations, parse results, and verify correctness before final emission."
                                ),
                            },
                            {
                                'order': 2,
                                'title': 'Tool Calling with Pydantic & JSON Schemas',
                                'slug': 'tool-calling-pydantic-json-schemas',
                                'content_type': ContentType.WALKTHROUGH,
                                'duration_minutes': 30,
                                'is_preview': True,
                                'article_markdown': (
                                    "# Tool Calling with Pydantic\n\n"
                                    "Implement strict schema generation and validation for custom agent tools."
                                ),
                            },
                        ],
                    },
                    {
                        'order': 2,
                        'title': 'Hybrid Retrieval & Context Architecture',
                        'description': 'Build high-precision RAG pipelines using PostgreSQL pgvector and BM25 rank fusion.',
                        'lessons': [
                            {
                                'order': 1,
                                'title': 'Postgres pgvector & Semantic Chunking',
                                'slug': 'postgres-pgvector-semantic-chunking',
                                'content_type': ContentType.ARTICLE,
                                'duration_minutes': 25,
                                'is_preview': False,
                                'article_markdown': (
                                    "# Semantic Chunking & Vector Search\n\n"
                                    "Why fixed-size chunking damages retrieval precision, and how AST-based language parsing yields 4x higher citation accuracy."
                                ),
                            },
                        ],
                    },
                ],
                'assignment': {
                    'title': 'Implement a Self-Correcting Code Review Agent',
                    'instructions_markdown': (
                        "### Assignment Requirements\n\n"
                        "1. Implement an agent loop that clones a Git repo, runs linters, and inspects AST.\n"
                        "2. Generate targeted fix suggestions formatted as unified diffs.\n"
                        "3. Verify that modified code compiles and passes unit tests in a sandboxed subprocess."
                    ),
                    'acceptance_criteria': [
                        'Agent correctly identifies code smell or bug in sample repo',
                        'Generated unified diff applies cleanly without syntax error',
                        'Test suite passes after agent patch execution'
                    ],
                    'starter_repo_url': 'https://github.com/enquebet/agentic-ai-starter',
                    'required_deliverable_type': DeliverableType.GITHUB_PR,
                }
            },
            {
                'slug': 'production-devops-docker-terraform',
                'title': 'Production Cloud Infrastructure & DevOps with Docker, Terraform & CI/CD',
                'short_description': 'Architect immutable, reproducible cloud deployments using multi-stage Dockerfiles, Terraform infrastructure-as-code, and GitHub Actions.',
                'full_description': (
                    "Step beyond toy deployments. In this hands-on course, you will engineer a battle-tested cloud delivery "
                    "pipeline. You will create minimal distroless Docker containers, provision isolated multi-environment cloud "
                    "infrastructure with Terraform, automate security scanning and linting in GitHub Actions, and implement "
                    "zero-downtime blue-green rollouts."
                ),
                'category': cat_objs['cloud-devops'],
                'difficulty': DifficultyLevel.INTERMEDIATE,
                'format': CourseFormat.PROJECT_BASED,
                'estimated_hours': 14,
                'thumbnail_url': 'https://images.unsplash.com/photo-1667372393119-3d4c48d07fc9?auto=format&fit=crop&w=1200&q=80',
                'creator': creator,
                'status': CourseStatus.PUBLISHED,
                'access_tier': AccessTier.FREE,
                'price_inr': 0,
                'is_featured': False,
                'skills_gained': ['Docker', 'Terraform', 'GitHub Actions', 'AWS', 'Linux', 'Security Auditing', 'Nginx'],
                'prerequisites': [
                    'Basic Linux terminal proficiency',
                    'Familiarity with Git branching workflows',
                    'Understanding of web server and database architecture'
                ],
                'learning_outcomes': [
                    'Write minimal, secure multi-stage Dockerfiles under 50MB',
                    'Provision reproducible cloud resources with modular Terraform',
                    'Construct automated CI/CD pipelines with linting, testing, and security gates',
                    'Execute zero-downtime rolling deployments with health checks'
                ],
                'project_outcome_title': 'Multi-Region Cloud Deployment Pipeline with Zero-Downtime Rollbacks',
                'project_outcome_description': (
                    'A complete infrastructure-as-code repository that provisions container hosts, VPCs, managed databases, '
                    'and automated deployment webhooks.'
                ),
                'starter_repo_url': 'https://github.com/enquebet/devops-infra-starter',
                'modules': [
                    {
                        'order': 1,
                        'title': 'Containerization & Distroless Builds',
                        'description': 'Master container optimization, multi-stage builds, and layer caching.',
                        'lessons': [
                            {
                                'order': 1,
                                'title': 'Crafting Production Dockerfiles for Node & Python',
                                'slug': 'crafting-production-dockerfiles',
                                'content_type': ContentType.ARTICLE,
                                'duration_minutes': 20,
                                'is_preview': True,
                                'article_markdown': (
                                    "# Production Dockerfile Best Practices\n\n"
                                    "Learn why running containers as root is an immediate vulnerability, and how to utilize unprivileged non-root users and distroless runtime bases."
                                ),
                            },
                        ],
                    },
                ],
                'assignment': {
                    'title': 'Provision Complete IaC Cloud Pipeline with Terraform & Docker',
                    'instructions_markdown': (
                        "### Assignment Deliverables\n\n"
                        "1. Provide a Terraform repository that provisions a VPC, compute instance, and PostgreSQL database.\n"
                        "2. Multi-stage Dockerfile with security scanning via Trivy in GitHub Actions.\n"
                        "3. Automated health check verification script."
                    ),
                    'acceptance_criteria': [
                        'Terraform validate and plan exit 0 with clean state',
                        'Docker image builds under 100MB with zero high/critical CVEs',
                        'Automated GitHub Actions workflow executes tests and triggers deployment'
                    ],
                    'starter_repo_url': 'https://github.com/enquebet/devops-infra-starter',
                    'required_deliverable_type': DeliverableType.REPO_LINK,
                }
            },
            {
                'slug': 'embedded-firmware-rust-freertos',
                'title': 'Embedded Systems & Firmware Engineering with Rust & FreeRTOS',
                'short_description': 'Write safe, bare-metal microcontroller firmware with zero-cost abstractions, real-time multitasking, and hardware DMA peripherals.',
                'full_description': (
                    "Bring modern memory safety to embedded engineering. In this advanced masterclass, you will program "
                    "ARM Cortex-M microcontrollers using bare-metal Rust and FreeRTOS. You will implement direct memory-mapped "
                    "I/O drivers, configure DMA channels for non-blocking serial communication, prevent priority inversion with "
                    "mutex inheritance, and interface with VenopAI hardware sensor modules."
                ),
                'category': cat_objs['embedded-systems'],
                'difficulty': DifficultyLevel.EXPERT,
                'format': CourseFormat.PROJECT_BASED,
                'estimated_hours': 28,
                'thumbnail_url': 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80',
                'creator': creator,
                'status': CourseStatus.PUBLISHED,
                'access_tier': AccessTier.FREE,
                'price_inr': 0,
                'is_featured': True,
                'skills_gained': ['Embedded Rust', 'FreeRTOS', 'ARM Cortex-M', 'DMA', 'SPI/UART', 'Hardware Debugging', 'C/C++'],
                'prerequisites': [
                    'Solid understanding of C or Rust systems programming',
                    'Familiarity with digital electronics and binary arithmetic',
                    'Basic microcontroller concepts (registers, timers, interrupts)'
                ],
                'learning_outcomes': [
                    'Write memory-safe `no_std` firmware on bare-metal ARM Cortex-M hardware',
                    'Schedule real-time tasks and queues with FreeRTOS priority guarantees',
                    'Drive high-speed peripherals via Direct Memory Access (DMA) without CPU stalls',
                    'Integrate embedded sensor telemetry with low-power sleep modes'
                ],
                'project_outcome_title': 'Industrial Sensor Node with Low-Power Sleep & Verifiable Telemetry',
                'project_outcome_description': (
                    'A production firmware build for an STM32/ESP32 sensor node that streams cryptographically hashed telemetry '
                    'with sub-milliamp battery consumption.'
                ),
                'starter_repo_url': 'https://github.com/enquebet/rust-embedded-starter',
                'modules': [
                    {
                        'order': 1,
                        'title': 'Bare-Metal Rust & Memory-Mapped Registers',
                        'description': 'Configure the embedded toolchain, link scripts, and safe peripheral access crates (PAC).',
                        'lessons': [
                            {
                                'order': 1,
                                'title': 'The no_std Runtime & Panic Handlers in Rust',
                                'slug': 'no-std-runtime-panic-handlers',
                                'content_type': ContentType.ARTICLE,
                                'duration_minutes': 25,
                                'is_preview': True,
                                'article_markdown': (
                                    "# Bare-Metal Rust: The no_std World\n\n"
                                    "When there is no operating system, no heap allocator, and no standard library, Rust gives you absolute deterministic control.\n\n"
                                    "Learn how the `cortex-m-rt` crate initializes the vector table, copies `.data` to SRAM, and zeros `.bss` before jumping to `main()`."
                                ),
                            },
                        ],
                    },
                ],
                'assignment': {
                    'title': 'Implement DMA-Driven Modbus RTU Protocol Driver',
                    'instructions_markdown': (
                        "### Assignment Specifications\n\n"
                        "1. Implement an interrupt-driven UART driver using DMA circular buffers.\n"
                        "2. Calculate and verify Modbus CRC16 in real-time.\n"
                        "3. Implement FreeRTOS task notification to wake the processing thread upon packet arrival."
                    ),
                    'acceptance_criteria': [
                        'Driver processes packets at 115200 baud with zero CPU frame loss',
                        'CRC16 verification executes accurately under automated test benches',
                        'Memory footprint fits within 32KB Flash and 8KB RAM'
                    ],
                    'starter_repo_url': 'https://github.com/enquebet/rust-embedded-starter',
                    'required_deliverable_type': DeliverableType.REPO_LINK,
                }
            },
        ]

        for cdata in courses_data:
            modules_data = cdata.pop('modules', [])
            assignment_data = cdata.pop('assignment', None)

            course, created = Course.objects.update_or_create(
                slug=cdata['slug'],
                defaults=cdata
            )
            self.stdout.write(f"  {'Created' if created else 'Updated'} course: {course.title}")

            # Populate Modules & Lessons
            for mdata in modules_data:
                lessons_data = mdata.pop('lessons', [])
                module, _ = CourseModule.objects.update_or_create(
                    course=course,
                    order=mdata['order'],
                    defaults={'title': mdata['title'], 'description': mdata['description']}
                )

                for ldata in lessons_data:
                    Lesson.objects.update_or_create(
                        module=module,
                        order=ldata['order'],
                        defaults=ldata
                    )

            # Populate Assignment
            if assignment_data:
                first_lesson = Lesson.objects.filter(module__course=course, content_type=ContentType.ASSIGNMENT).first()
                assignment_data['course'] = course
                assignment_data['lesson'] = first_lesson
                Assignment.objects.update_or_create(
                    course=course,
                    title=assignment_data['title'],
                    defaults=assignment_data
                )

        self.stdout.write(self.style.SUCCESS("Successfully seeded ENQUEbet Academy courses!"))
