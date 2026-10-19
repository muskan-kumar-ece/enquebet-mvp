"""
Management command to seed realistic, high-signal intelligence for ENQUEbet Pulse 1.0.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import date, timedelta
from apps.updates.models import (
    PlatformUpdate,
    UpdateCategory,
    UpdateType,
    EditorialStatus,
    ImportanceLevel,
)
from apps.users.models import User


class Command(BaseCommand):
    help = "Seed high-signal technical updates across all 9 ENQUEbet Pulse domains"

    def handle(self, *args, **options):
        self.stdout.write("Seeding ENQUEbet Pulse 1.0 intelligence records...")

        # Find or use an admin author
        author = User.objects.filter(is_staff=True).first()
        if not author:
            author = User.objects.filter(is_superuser=True).first()
        if not author:
            author = User.objects.first()

        now = timezone.now()
        today = date.today()

        pulse_data = [
            # 1. Lead / Top Story: Software Development
            {
                "title": "Next.js 16 Runtime Engine: Turbopack Default & Sandboxed Server Actions",
                "slug": "nextjs-16-runtime-turbopack-default",
                "category": UpdateCategory.SOFTWARE,
                "update_type": UpdateType.RELEASE,
                "importance": ImportanceLevel.CRITICAL,
                "editorial_status": EditorialStatus.PUBLISHED,
                "is_top_story": True,
                "is_pinned": True,
                "reading_time_minutes": 4,
                "event_date": today,
                "source_published_at": now - timedelta(hours=3),
                "published_at": now - timedelta(hours=2),
                "last_verified_at": now,
                "primary_source_name": "Vercel Engineering Blog",
                "primary_source_url": "https://nextjs.org/blog/next-16",
                "sources": [
                    {"name": "Official Next.js Release Notes", "url": "https://nextjs.org/blog/next-16", "source_type": "official", "is_official": True},
                    {"name": "GitHub Next.js v16.0.0 Tag", "url": "https://github.com/vercel/next.js/releases", "source_type": "repository", "is_official": True}
                ],
                "tags": ["Next.js", "React", "Turbopack", "TypeScript", "Frontend"],
                "summary": "Next.js 16 makes Turbopack the default bundler for both dev and production builds, achieving 70% faster HMR in large codebases while introducing strict memory sandboxing for Server Actions.",
                "why_it_matters": "Frontend engineering teams no longer need to manage complex Webpack configurations. Cold builds are reduced from 45s to under 6s, and memory isolation prevents accidental server credential leakage through nested action closures.",
                "who_should_care": "Full-stack React developers, SaaS frontend architects, and engineering students preparing web production portfolios.",
                "what_to_do_next": "Audit your `next.config.js` for deprecated Webpack plugins and test build stability with `npx @next/codemod@latest upgrade`.",
                "content": """## Architecture Overview

Next.js 16 represents the culmination of a two-year migration to Rust-native tooling. Turbopack is now stable across all rendering targets (App Router, Pages Router, and Middleware).

### Key Architectural Shifts

1. **Turbopack Build Daemon:** Background caching daemon with content-addressable AST hashing.
2. **Server Action Isolation:** Server Actions now execute in an isolated V8 execution context with explicit environment variable allow-lists.
3. **Partial Prerendering (PPR) Stable:** Seamless combination of static shell streaming and dynamic micro-islands.

```tsx
// Server Action with explicit sandboxing policy in Next.js 16
'use server';

import { createSafeAction } from 'next/safe-action';
import { z } from 'zod';

const TaskSchema = z.object({
  title: z.string().min(5),
  priority: z.enum(['low', 'medium', 'high']),
});

export const createProjectTask = createSafeAction(TaskSchema, async ({ title, priority }) => {
  // Enforced memory boundaries protect server environment secrets
  return await db.tasks.create({ data: { title, priority } });
});
```

### Benchmark Metrics

| Metric | Next.js 15 (Webpack) | Next.js 16 (Turbopack) | Improvement |
| :--- | :--- | :--- | :--- |
| **Cold Start (1000 routes)** | 28.4s | 3.2s | **8.8x faster** |
| **HMR Fast Refresh** | 480ms | 38ms | **12.6x faster** |
| **Production Build Time** | 3m 42s | 58s | **3.8x faster** |
""",
                "learn_this_next": [
                    {"title": "Turbopack Architecture RFC", "url": "https://turbo.build/pack/docs/features/compilation", "provider": "Vercel", "level": "Intermediate"},
                    {"title": "React Server Components Deep Dive", "url": "https://react.dev/reference/rsc/server-components", "provider": "React Team", "level": "Advanced"}
                ],
                "build_this_idea": {
                    "title": "Turbopack Telemetry Visualizer",
                    "description": "Build an open-source Next.js 16 dashboard that connects to Turbopack build metrics and graphs route compilation latency in real time.",
                    "difficulty": "Intermediate",
                    "estimated_hours": 6,
                    "stack": "Next.js 16, TypeScript, Tailwind CSS, Recharts"
                }
            },

            # 2. AI & Machine Learning
            {
                "title": "DeepSeek-R1 & Llama-3.3 70B: Efficient Local Edge Inference via 4-bit AWQ",
                "slug": "deepseek-r1-llama-33-local-edge-inference",
                "category": UpdateCategory.AI_ML,
                "update_type": UpdateType.RELEASE,
                "importance": ImportanceLevel.HIGH,
                "editorial_status": EditorialStatus.PUBLISHED,
                "is_top_story": False,
                "is_pinned": False,
                "reading_time_minutes": 5,
                "event_date": today,
                "source_published_at": now - timedelta(hours=6),
                "published_at": now - timedelta(hours=4),
                "last_verified_at": now,
                "primary_source_name": "Hugging Face Models Hub",
                "primary_source_url": "https://huggingface.co/deepseek-ai",
                "sources": [
                    {"name": "DeepSeek AI Research Paper", "url": "https://arxiv.org/abs/2412.19437", "source_type": "paper", "is_official": True},
                    {"name": "vLLM Inference Engine Benchmarks", "url": "https://docs.vllm.ai", "source_type": "documentation", "is_official": True}
                ],
                "tags": ["AI", "LLM", "DeepSeek", "Quantization", "vLLM", "LocalAI"],
                "summary": "DeepSeek-R1 reasoning weights and Llama-3.3 70B quantized models have achieved parity with proprietary frontier models while running locally on single-consumer 24GB GPUs using 4-bit AWQ.",
                "why_it_matters": "Students and indie developers can now run PhD-level mathematical reasoning, agentic code synthesis, and structured JSON generation completely offline without API subscription costs or data privacy concerns.",
                "who_should_care": "AI engineers, backend developers building agentic workflows, and researchers studying parameter quantization.",
                "what_to_do_next": "Set up a local `vLLM` or `Ollama` container and test multi-step chain-of-thought benchmarks against your codebase.",
                "content": """## Breakthrough in Parameter Efficiency

Recent open-weights architectures demonstrate that test-time compute scaling (reinforcement learning with verified rewards) produces reasoning accuracy surpassing 10x larger dense models.

### Architecture Highlights

- **Multi-Head Latent Attention (MLA):** Compresses KV-cache memory footprint by 85%, allowing 128k context windows on standard hardware.
- **Sparse Mixture of Experts (MoE):** Only 37B active parameters invoked per token during generation.
- **Self-Correction Loops:** Embedded thinking tags `<think>...</think>` allow inspection of internal deduction logic.

```bash
# Launch DeepSeek-R1 4-bit quantized server locally
docker run --gpus all -v ~/.cache/huggingface:/root/.cache/huggingface \
  -p 8000:8000 --ipc=host vllm/vllm-openai:latest \
  --model deepseek-ai/DeepSeek-R1-Distill-Qwen-32B \
  --quantization awq --max-model-len 32768
```
""",
                "learn_this_next": [
                    {"title": "Understanding Multi-Head Latent Attention (MLA)", "url": "https://arxiv.org/abs/2405.04434", "provider": "arXiv", "level": "Advanced"},
                    {"title": "Local LLM Serving with vLLM Guide", "url": "https://docs.vllm.ai", "provider": "vLLM", "level": "Beginner"}
                ],
                "build_this_idea": {
                    "title": "Local Code Reviewer Agent",
                    "description": "Create a GitHub webhook service powered by local DeepSeek-R1 that analyzes PR diffs and outputs security vulnerability advisories with zero token cost.",
                    "difficulty": "Intermediate",
                    "estimated_hours": 8,
                    "stack": "Python, FastAPI, vLLM, GitHub Webhooks"
                }
            },

            # 3. Electronics & Engineering
            {
                "title": "ESP32-P4 High-Performance RISC-V Silicon: Dual-Core 400MHz with MIPI-CSI Hardware",
                "slug": "esp32-p4-riscv-dual-core-silicon",
                "category": UpdateCategory.ELECTRONICS,
                "update_type": UpdateType.HARDWARE_ANNOUNCEMENT,
                "importance": ImportanceLevel.HIGH,
                "editorial_status": EditorialStatus.PUBLISHED,
                "is_top_story": False,
                "is_pinned": False,
                "reading_time_minutes": 4,
                "event_date": today - timedelta(days=1),
                "source_published_at": now - timedelta(hours=12),
                "published_at": now - timedelta(hours=8),
                "last_verified_at": now,
                "primary_source_name": "Espressif Systems Hardware Announcements",
                "primary_source_url": "https://www.espressif.com/en/news/ESP32-P4",
                "sources": [
                    {"name": "ESP32-P4 Technical Reference Manual", "url": "https://www.espressif.com", "source_type": "datasheet", "is_official": True}
                ],
                "tags": ["Electronics", "Embedded", "RISC-V", "ESP32", "Hardware", "Robotics"],
                "summary": "Espressif has begun production shipping of the ESP32-P4, a dual-core 400MHz RISC-V microcontroller equipped with hardware H.264 video encoding, MIPI-CSI camera interfaces, and zero wireless overhead.",
                "why_it_matters": "Provides electronics, mechatronics, and IoT engineering students with sub-$5 silicon capable of real-time computer vision, edge audio synthesis, and autonomous robot perception without needing power-hungry Linux single-board computers.",
                "who_should_care": "ECE & EEE students, embedded firmware engineers, robotics developers, and hardware prototyping teams.",
                "what_to_do_next": "Download ESP-IDF v5.3+ to explore the hardware cryptographic engine and 2D pixel processing pipeline.",
                "content": """## Pure Compute Silicon Without Wireless Overhead

The ESP32-P4 is Espressif's first non-wireless compute-focused processor, addressing embedded edge compute, smart HMI displays, and industrial control.

### Hardware Specifications

- **CPU:** Dual-core 32-bit RISC-V RV32IMAFCP cores clocked at 400 MHz.
- **Co-processor:** Low-power 40 MHz single-core RISC-V core for deep sleep power states (< 10 µA).
- **Video & Display:** Dual-lane MIPI-CSI (1080p@30fps), MIPI-DSI display interface, JPEG codec, H.264 encoder.
- **Memory:** 768 KB on-chip SRAM with support for up to 32MB external PSRAM.
- **Security:** Hardware Secure Boot, Flash Encryption, ECC & RSA cryptographic accelerators.
""",
                "learn_this_next": [
                    {"title": "RISC-V Architecture Fundamentals", "url": "https://riscv.org/technical/specifications/", "provider": "RISC-V International", "level": "Intermediate"},
                    {"title": "ESP-IDF MIPI-CSI Camera Guide", "url": "https://docs.espressif.com", "provider": "Espressif", "level": "Intermediate"}
                ],
                "build_this_idea": {
                    "title": "Edge Security Camera with On-Device Motion Segmentation",
                    "description": "Interface an OV5640 MIPI camera module to an ESP32-P4 board and implement hardware-accelerated H.264 video streaming over Ethernet.",
                    "difficulty": "Advanced",
                    "estimated_hours": 12,
                    "stack": "C/C++, ESP-IDF, FreeRTOS, MIPI-CSI"
                }
            },

            # 4. Cybersecurity
            {
                "title": "Critical OpenSSL CVE-2026-1049: Memory Buffer Overread in TLS 1.3 Session Cache",
                "slug": "openssl-cve-2026-1049-session-overread-patch",
                "category": UpdateCategory.CYBERSECURITY,
                "update_type": UpdateType.SECURITY_ADVISORY,
                "importance": ImportanceLevel.CRITICAL,
                "editorial_status": EditorialStatus.PUBLISHED,
                "is_top_story": False,
                "is_pinned": False,
                "reading_time_minutes": 3,
                "event_date": today,
                "source_published_at": now - timedelta(hours=8),
                "published_at": now - timedelta(hours=6),
                "last_verified_at": now,
                "primary_source_name": "OpenSSL Security Advisory",
                "primary_source_url": "https://www.openssl.org/news/secadv",
                "sources": [
                    {"name": "NIST National Vulnerability Database", "url": "https://nvd.nist.gov", "source_type": "cve", "is_official": True}
                ],
                "tags": ["Cybersecurity", "OpenSSL", "CVE", "Patch", "DevOps", "Linux"],
                "summary": "OpenSSL has released versions 3.3.3 and 3.2.4 resolving a high-severity vulnerability (CVE-2026-1049) that could allow remote unauthenticated attackers to trigger denial of service or leak session ticket contents.",
                "why_it_matters": "Affects web reverse proxies, microservice mesh ingress routers, and custom VPN gateways handling high-concurrency TLS 1.3 resumption handshakes.",
                "who_should_care": "DevOps engineers, sysadmins, backend developers, and cybersecurity researchers.",
                "what_to_do_next": "Run package manager upgrades immediately (`apt update && apt --only-upgrade install libssl3`) and restart reverse proxies (NGINX/Traefik).",
                "content": """## Vulnerability Details

- **CVE ID:** CVE-2026-1049
- **CVSS v3.1 Score:** 8.4 (High)
- **Vector:** `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:H`
- **Affected Versions:** OpenSSL 3.3.0–3.3.2, 3.2.0–3.2.3, 3.1.0–3.1.7.
- **Fixed Versions:** OpenSSL 3.3.3, 3.2.4, 3.1.8.

### Remediation Verification

Verify the active shared library version on your deployment containers:

```bash
openssl version -a
# Ensure version string reports OpenSSL 3.3.3 or higher
```
""",
                "learn_this_next": [
                    {"title": "TLS 1.3 Handshake Protocol RFC 8446", "url": "https://datatracker.ietf.org/doc/html/rfc8446", "provider": "IETF", "level": "Advanced"}
                ],
                "build_this_idea": {
                    "title": "Automated Container Vulnerability Scanner",
                    "description": "Write a lightweight CI step in Python using Docker API to inspect base images for vulnerable OpenSSL so files before deployment.",
                    "difficulty": "Beginner",
                    "estimated_hours": 4,
                    "stack": "Python, Docker SDK, Linux"
                }
            },

            # 5. Careers & Opportunities
            {
                "title": "Google Summer of Code 2027: Open Source Fellowship Application Window Opens",
                "slug": "google-summer-of-code-2027-applications",
                "category": UpdateCategory.CAREERS,
                "update_type": UpdateType.OPPORTUNITY,
                "importance": ImportanceLevel.HIGH,
                "editorial_status": EditorialStatus.PUBLISHED,
                "is_top_story": False,
                "is_pinned": False,
                "reading_time_minutes": 3,
                "event_date": today,
                "source_published_at": now - timedelta(hours=14),
                "published_at": now - timedelta(hours=10),
                "last_verified_at": now,
                "primary_source_name": "Google Open Source Programs Office",
                "primary_source_url": "https://summerofcode.withgoogle.com",
                "sources": [
                    {"name": "GSoC Official Portal", "url": "https://summerofcode.withgoogle.com", "source_type": "official", "is_official": True}
                ],
                "tags": ["Careers", "GSoC", "Internship", "OpenSource", "Fellowship", "Students"],
                "summary": "Google Summer of Code (GSoC) 2027 has officially published its mentoring organization list. Engineering students can apply for 12-week and 22-week paid technical fellowships with stipends up to $6,000 USD.",
                "why_it_matters": "GSoC is one of the highest-leverage career opportunities for university builders to work with senior maintainers on world-class projects like Linux, Python Software Foundation, Apache, and Blender.",
                "who_should_care": "Undergraduate and graduate students, career-switchers, and open-source contributors.",
                "what_to_do_next": "Review the mentoring organization ideas list, join their Discord/IRC/Mailing list, and submit your first introductory PR.",
                "opportunity_meta": {
                    "opportunity_type": "fellowship",
                    "deadline": (today + timedelta(days=21)).isoformat(),
                    "stipend": "$3,000 - $6,000 USD (Location Adjusted)",
                    "eligibility": "Open to all students & open-source beginners age 18+",
                    "location_type": "Remote / Global",
                    "application_url": "https://summerofcode.withgoogle.com"
                },
                "content": """## How to Prepare a Winning GSoC Proposal

Mentoring organizations look for evidence of past contributions over pedigree. A proposal that includes an already-merged bugfix or documentation cleanup has an 80% higher acceptance rate.

### Essential Timeline

1. **Phase 1 (Now – Day 10):** Identify 2-3 target organizations whose tech stack matches your interests.
2. **Phase 2 (Day 10 – Day 18):** Submit an introductory pull request on an open "good first issue".
3. **Phase 3 (Day 18 – Deadline):** Draft your proposal with an explicit week-by-week deliverable timeline.
""",
                "learn_this_next": [
                    {"title": "Open Source Contribution Playbook", "url": "https://opensource.guide/how-to-contribute/", "provider": "GitHub Guides", "level": "Beginner"}
                ],
                "build_this_idea": {
                    "title": "GSoC Proposal Draft Workspace",
                    "description": "Start a collaborative workspace with peer students to peer-review technical proposal drafts and milestone roadmaps.",
                    "difficulty": "Beginner",
                    "estimated_hours": 3,
                    "stack": "ENQUEbet Workspace, Markdown, Git"
                }
            },

            # 6. Technology Lifecycle
            {
                "title": "Node.js 18 LTS Reaches Official End of Life: Mandatory Migration Protocol to Node 22",
                "slug": "nodejs-18-lts-end-of-life-migration-guide",
                "category": UpdateCategory.LIFECYCLE,
                "update_type": UpdateType.DEPRECATION,
                "importance": ImportanceLevel.HIGH,
                "editorial_status": EditorialStatus.PUBLISHED,
                "is_top_story": False,
                "is_pinned": False,
                "reading_time_minutes": 4,
                "event_date": today,
                "source_published_at": now - timedelta(hours=18),
                "published_at": now - timedelta(hours=14),
                "last_verified_at": now,
                "primary_source_name": "Node.js Foundation Release Working Group",
                "primary_source_url": "https://nodejs.org/en/about/previous-releases",
                "sources": [
                    {"name": "Node.js LTS Schedule Table", "url": "https://github.com/nodejs/release#release-schedule", "source_type": "official", "is_official": True}
                ],
                "tags": ["Node.js", "Lifecycle", "EOL", "JavaScript", "Backend", "Migration"],
                "summary": "Node.js 18 (Hydrogen) has officially transitioned to End-of-Life (EOL). It will no longer receive security patches, bug fixes, or OpenSSL compatibility updates. Production services must migrate to Node.js 22 LTS.",
                "why_it_matters": "Running EOL runtimes in production fails SOC2/PCI-DSS compliance and leaves web servers exposed to unpatched vulnerabilities. Node 22 also delivers native WebSocket, faster V8 Maglev compilation, and built-in SQLite.",
                "who_should_care": "Backend engineers, DevOps engineers managing Docker base images, and full-stack JavaScript developers.",
                "what_to_do_next": "Update your `.nvmrc`, `package.json` engines field, and CI Dockerfiles (`FROM node:22-alpine`).",
                "lifecycle_meta": {
                    "status": "end_of_life",
                    "affected_version": "Node.js 18.x (Hydrogen)",
                    "recommended_version": "Node.js 22.x LTS (Jod)",
                    "migration_url": "https://nodejs.org/en/blog/release/v22.0.0"
                },
                "content": """## Migration Protocol from Node 18 to Node 22

### Key Breaking Changes to Audit

1. **Built-in Globbing (`fs.glob`):** Native glob implementation may shadow legacy `glob` package semantics.
2. **OpenSSL 3.0+ Strict Cipher Requirements:** Legacy MD5/DES SSL endpoints will fail without explicit legacy provider flags.
3. **ESM Import Assertions:** Replaced by `with { type: "json" }` syntax.

```dockerfile
# Recommended CI/CD Dockerfile target
FROM node:22-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
CMD ["node", "server.js"]
```
""",
                "learn_this_next": [
                    {"title": "Node.js 22 Feature Tour", "url": "https://nodejs.org/en/blog/release/v22.0.0", "provider": "Node.js Foundation", "level": "Intermediate"}
                ],
                "build_this_idea": {
                    "title": "Node.js LTS Dependency Auditor",
                    "description": "Build a CLI tool that parses package.json and Dockerfiles across an organization and generates a deprecation countdown report.",
                    "difficulty": "Intermediate",
                    "estimated_hours": 5,
                    "stack": "Node.js 22, TypeScript, Commander"
                }
            },

            # 7. Cloud, DevOps & Infrastructure
            {
                "title": "Kubernetes v1.32 'Kubelet Dynamic Resizing' & WebAssembly WASI 0.2 Support",
                "slug": "kubernetes-v132-kubelet-dynamic-resizing",
                "category": UpdateCategory.CLOUD_DEVOPS,
                "update_type": UpdateType.RELEASE,
                "importance": ImportanceLevel.MEDIUM,
                "editorial_status": EditorialStatus.PUBLISHED,
                "is_top_story": False,
                "is_pinned": False,
                "reading_time_minutes": 3,
                "event_date": today - timedelta(days=2),
                "source_published_at": now - timedelta(days=2),
                "published_at": now - timedelta(hours=16),
                "last_verified_at": now,
                "primary_source_name": "Kubernetes Official Blog",
                "primary_source_url": "https://kubernetes.io/blog",
                "sources": [
                    {"name": "Kubernetes v1.32 Changelog", "url": "https://github.com/kubernetes/kubernetes/blob/master/CHANGELOG/CHANGELOG-1.32.md", "source_type": "changelog", "is_official": True}
                ],
                "tags": ["Kubernetes", "DevOps", "Cloud", "WASM", "Containers", "Infrastructure"],
                "summary": "Kubernetes 1.32 introduces in-place pod resource resizing into GA, allowing memory and CPU limits to change without restarting containers, alongside native WebAssembly WASI 0.2 runtime classes.",
                "why_it_matters": "Eliminates downtime for database pods and JVM services scaling up under traffic bursts, cutting cloud infrastructure over-provisioning costs by up to 35%.",
                "who_should_care": "DevOps architects, site reliability engineers (SRE), and cloud infrastructure developers.",
                "what_to_do_next": "Test the `resizePolicy` block in your staging pod specs on a k3s or kind local cluster.",
                "content": """## In-Place Pod Resizing in Action

Previously, changing CPU or memory required killing the pod, causing cache evictions and connection drops.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: scalable-database
spec:
  containers:
  - name: postgres
    image: postgres:16
    resizePolicy:
    - resourceName: cpu
      restartPolicy: NotRequired
    - resourceName: memory
      restartPolicy: NotRequired
    resources:
      requests:
        memory: "2Gi"
        cpu: "1"
      limits:
        memory: "4Gi"
        cpu: "2"
```
""",
                "learn_this_next": [
                    {"title": "Kubernetes In-Place Resource Resizing Deep Dive", "url": "https://kubernetes.io/docs/tasks/configure-pod-container/resize-container-resources/", "provider": "CNCF", "level": "Advanced"}
                ],
                "build_this_idea": {
                    "title": "Autonomous Pod Autoscaler using In-Place Resize",
                    "description": "Write a Kubernetes controller in Go that monitors pod latency and calls the in-place subresource API instead of triggering replica count thrash.",
                    "difficulty": "Advanced",
                    "estimated_hours": 10,
                    "stack": "Go, client-go, Kubernetes CRD"
                }
            },

            # 8. Research & Science
            {
                "title": "Terahertz Quantum Material Oscillator: Real-Time Microscopic Defect Scanning for VLSI",
                "slug": "terahertz-quantum-oscillator-vlsi-semiconductor-scanning",
                "category": UpdateCategory.RESEARCH_SCIENCE,
                "update_type": UpdateType.RESEARCH_PAPER,
                "importance": ImportanceLevel.MEDIUM,
                "editorial_status": EditorialStatus.PUBLISHED,
                "is_top_story": False,
                "is_pinned": False,
                "reading_time_minutes": 5,
                "event_date": today - timedelta(days=3),
                "source_published_at": now - timedelta(days=3),
                "published_at": now - timedelta(hours=20),
                "last_verified_at": now,
                "primary_source_name": "Applied Physics Letters / Nature Electronics",
                "primary_source_url": "https://nature.com/articles/electronics",
                "sources": [
                    {"name": "arXiv Pre-print 2601.08492", "url": "https://arxiv.org", "source_type": "paper", "is_official": True}
                ],
                "tags": ["Research", "Semiconductors", "Quantum", "Physics", "VLSI", "Hardware"],
                "summary": "MIT and Tokyo Tech researchers demonstrate a room-temperature Terahertz quantum cascade oscillator that non-destructively scans silicon sub-surface vias with 2nm spatial resolution.",
                "why_it_matters": "Enables foundry and VLSI design labs to detect 3D stacked chiplet interconnect failures in seconds instead of destroying wafers under focused ion beams (FIB).",
                "who_should_care": "VLSI design students, semiconductor engineers, materials science researchers, and physics enthusiasts.",
                "what_to_do_next": "Review the open-source signal processing Python notebook published on GitHub by the research team.",
                "content": """## Sub-surface Terahertz Tomography

As semiconductor manufacturing shifts from monolithic planar silicon to 3D heterogeneous chiplets (2.5D interposers and micro-bumps), physical inspection becomes a critical bottleneck.

### Research Breakthrough

- **Frequency Band:** 2.4 THz to 4.8 THz continuous tunable radiation.
- **Power Consumption:** 15 mW at room temperature (operating without liquid helium cooling).
- **Depth Penetration:** Up to 150 µm through passivated silicon dioxide layers.
""",
                "learn_this_next": [
                    {"title": "Introduction to 3D IC Packaging & Chiplets", "url": "https://semi.org", "provider": "SEMI", "level": "Intermediate"}
                ],
                "build_this_idea": {
                    "title": "Terahertz Spectrogram Signal Processing Pipeline",
                    "description": "Implement a Python Fourier-transform filter to reconstruct 2D cross-sectional density slices from raw sensor time-series data.",
                    "difficulty": "Intermediate",
                    "estimated_hours": 6,
                    "stack": "Python, NumPy, SciPy, Matplotlib"
                }
            },

            # 9. Startups & Industry
            {
                "title": "Open Source AI Hardware Collective Launches $10M Prototyping Foundry for University Labs",
                "slug": "open-source-ai-hardware-collective-10m-foundry-grant",
                "category": UpdateCategory.STARTUPS,
                "update_type": UpdateType.DAILY_BRIEF,
                "importance": ImportanceLevel.MEDIUM,
                "editorial_status": EditorialStatus.PUBLISHED,
                "is_top_story": False,
                "is_pinned": False,
                "reading_time_minutes": 3,
                "event_date": today - timedelta(days=1),
                "source_published_at": now - timedelta(hours=22),
                "published_at": now - timedelta(hours=18),
                "last_verified_at": now,
                "primary_source_name": "TechCrunch Venture Dispatch",
                "primary_source_url": "https://techcrunch.com",
                "sources": [
                    {"name": "Foundry Initiative Announcement", "url": "https://openhardware.foundation", "source_type": "official", "is_official": True}
                ],
                "tags": ["Startups", "Venture", "Funding", "Hardware", "Foundry", "Grants"],
                "summary": "A coalition of semiconductor founders and venture funds has established a $10M non-dilutive grant pool to fund MPW (multi-project wafer) ASIC tape-outs for student and open-source engineering teams.",
                "why_it_matters": "Lowers the barrier to physical silicon tape-out from $250,000 to zero for university teams building custom RISC-V accelerators, cryptographic coprocessors, and neural sensor chips.",
                "who_should_care": "Student hardware teams, university startup founders, and collegiate robotics clubs.",
                "what_to_do_next": "Form a team, select an open-source EDA toolchain (OpenLane / SkyWater 130nm), and submit a project proposal before the winter deadline.",
                "opportunity_meta": {
                    "opportunity_type": "grant",
                    "deadline": (today + timedelta(days=35)).isoformat(),
                    "stipend": "$10,000 - $50,000 Wafer Fabrication Grant",
                    "eligibility": "Open to student teams & open-source hardware creators",
                    "location_type": "Global / Remote",
                    "application_url": "https://openhardware.foundation/apply"
                },
                "content": """## Democratizing Physical Silicon Prototyping

For decades, custom ASIC development was restricted to well-funded defense contractors and tech giants due to mask set expenses. The Open Silicon Initiative matches student designs with shuttle runs at SkyWater and TSMC partner foundries.
""",
                "learn_this_next": [
                    {"title": "Zero to ASIC: OpenLane Tutorial", "url": "https://zerotoasiccourse.com", "provider": "Matt Venn", "level": "Intermediate"}
                ],
                "build_this_idea": {
                    "title": "Custom RISC-V Neural Accelerator Tape-Out Proposal",
                    "description": "Assemble a team on ENQUEbet to design a 4-bit matrix multiplier core using Verilog and submit it for the MPW grant.",
                    "difficulty": "Advanced",
                    "estimated_hours": 30,
                    "stack": "Verilog, OpenLane, SkyWater 130nm PDK"
                }
            }
        ]

        created_count = 0
        updated_count = 0

        for item in pulse_data:
            slug = item.pop("slug")
            obj, created = PlatformUpdate.objects.update_or_create(
                slug=slug,
                defaults={
                    **item,
                    "author": author,
                }
            )
            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(self.style.SUCCESS(
            f"Successfully seeded ENQUEbet Pulse! Created: {created_count}, Updated: {updated_count}"
        ))
