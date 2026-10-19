"""
Management command to seed realistic, IEEE-grade research papers for ENQUEbet Research Hub.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta
from apps.research.models import (
    ResearchPaper,
    ResearchAuthor,
    ResearchVersion,
    ReproducibilityReview,
    ResearchField,
    ResearchStatus,
)
from apps.users.models import User


class Command(BaseCommand):
    help = "Seed IEEE-grade research papers, multi-authors, and reproducibility audits"

    def handle(self, *args, **options):
        self.stdout.write("Seeding ENQUEbet Research Hub papers...")

        now = timezone.now()

        # Helper to get or create distinct research authors
        def get_researcher(username, email, full_name, headline, college, profile_image):
            user, _ = User.objects.get_or_create(
                username=username,
                defaults={
                    "email": email,
                    "full_name": full_name,
                    "headline": headline,
                    "college": college,
                    "profile_image": profile_image,
                }
            )
            return user

        elena_user = get_researcher(
            "elena_rostova",
            "elena.rostova@iit.ac.in",
            "Dr. Elena Rostova",
            "Embedded Systems Lead & RISC-V Architect",
            "Indian Institute of Technology (IIT) Bengaluru",
            "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
        )
        aarav_user = get_researcher(
            "aarav_sharma",
            "aarav.s@iitm.ac.in",
            "Aarav Sharma",
            "Autonomous Flight Researcher & Robotics Builder",
            "Indian Institute of Technology (IIT) Madras",
            "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
        )
        vikram_user = get_researcher(
            "vikram_sethi",
            "vikram.sethi@iiit.ac.in",
            "Vikram Sethi",
            "Distributed Systems & Zero-Knowledge Cryptographer",
            "International Institute of Information Technology (IIIT) Hyderabad",
            "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
        )

        papers_data = [
            {
                "primary_author_obj": elena_user,
                "paper_code": "ENQ-RES-2026-0042",
                "slug": "real-time-edge-neural-compression-on-heterogeneous-risc-v-silicon",
                "title": "Real-Time Edge Neural Compression on Heterogeneous RISC-V Silicon with Dynamic INT4 Quantization",
                "abstract": "Deploying sub-billion parameter vision-language models directly on resource-constrained embedded edge nodes requires aggressive weight compression without degrading temporal attention fidelity. We present a cycle-accurate dynamic INT4 sparse quantization runtime implemented on custom RISC-V vector extensions. Across 10,000 edge inference cycles, our pipeline achieves 8.4x throughput elevation and 71% thermal dissipation reduction compared to standard float16 baselines.",
                "methodology_summary": "Evaluated against cycle-accurate Verilator RTL benches using physical ESP32-S3 and STM32H7 microcontrollers. Vector SIMD kernels were compiled via LLVM 18 with custom autotuning.",
                "field": ResearchField.ROBOTICS_EMBEDDED,
                "status": ResearchStatus.REPRODUCED,
                "pdf_url": "https://arxiv.org/abs/2403.0042",
                "code_repo_url": "https://github.com/enquebet-labs/edge-quant-riscv",
                "dataset_url": "https://zenodo.org/record/8492014",
                "live_demo_url": "https://edge-quant.enquebet.org",
                "doi": "10.1145/enquebet.2026.0042",
                "keywords": ["risc-v", "edge-ai", "quantization", "embedded-systems", "hardware-bom"],
                "citations_count": 38,
                "views_count": 1420,
                "downloads_count": 340,
                "published_at": now - timedelta(days=15),
                "open_collaborator_roles": ["FPGA Vector Kernel Engineer", "Thermal Characterization Lead"],
                "hardware_bom": [
                    {
                        "name": "ESP32-S3-WROOM-1 Microcontroller Dual-Core XTensa LX7",
                        "slug": "esp32-s3-wroom-1-n16r8",
                        "quantity": 2,
                        "role": "Edge Inference Host Node",
                        "datasheet_url": "https://venopai.in/datasheets/esp32-s3.pdf",
                        "estimated_price_paise": 38900
                    },
                    {
                        "name": "MPU-6050 6-Axis Accelerometer & Gyroscope Sensor",
                        "slug": "mpu-6050-6-axis-sensor",
                        "quantity": 1,
                        "role": "High-Frequency Telemetry Capture",
                        "datasheet_url": "https://venopai.in/datasheets/mpu-6050.pdf",
                        "estimated_price_paise": 14900
                    },
                    {
                        "name": "Logic Level Converter 4-Channel Bi-Directional",
                        "slug": "logic-level-converter-4ch",
                        "quantity": 2,
                        "role": "3.3V to 5V Bus Level Shift",
                        "datasheet_url": "https://venopai.in/datasheets/logic-shifter.pdf",
                        "estimated_price_paise": 7900
                    }
                ],
                "authors": [
                    {
                        "full_name": "Dr. Elena Rostova",
                        "email": "e.rostova@iit.ac.in",
                        "affiliation": "Indian Institute of Technology (IIT) Bengaluru",
                        "orcid": "0000-0002-1825-0097",
                        "is_corresponding": True,
                        "order": 1,
                        "contribution_statement": "Conceived the INT4 quantized vector kernel and directed physical thermal bench experiments."
                    },
                    {
                        "full_name": "Kavya Nair",
                        "email": "kavya.n@bits-pilani.ac.in",
                        "affiliation": "BITS Pilani, Department of Electrical & Electronics",
                        "orcid": "0000-0003-4912-8810",
                        "is_corresponding": False,
                        "order": 2,
                        "contribution_statement": "Implemented LLVM SIMD autotuner and executed Verilator cycle-accurate RTL verification."
                    }
                ],
                "reviews": [
                    {
                        "verdict": ReproducibilityReview.Verdict.VERIFIED_REPRODUCED,
                        "rigor_score": 5,
                        "clarity_score": 5,
                        "reproducibility_score": 5,
                        "evaluation_notes": "Successfully synthesized the Verilog vector unit on Artix-7 and verified latency benchmarks on ESP32-S3 hardware via VenopAI parts. Timing closure met at 240MHz with 0 setup violations.",
                        "environment_details": "Ubuntu 24.04 LTS, Vivado 2024.1, ESP32-S3 DevKitC-1 with ESP-IDF v5.2",
                        "evidence_url": "https://github.com/kavya-nair/repro-enquebet-0042",
                    }
                ]
            },
            {
                "primary_author_obj": aarav_user,
                "paper_code": "ENQ-RES-2026-0078",
                "slug": "decentralized-swarm-consensus-for-autonomous-micro-aerial-vehicles",
                "title": "Decentralized Swarm Consensus in GPS-Denied Environments using Optical Flow & Ultra-Wideband Meshes",
                "abstract": "Coordinated flight in micro-aerial vehicle (MAV) swarms traditionally relies on external RTK-GPS or central motion capture grids. We propose an asynchronous distributed consensus protocol that couples optical flow divergence estimation with peer-to-peer UWB ranging. In trials across 12 quadrotors inside subterranean obstacles, the swarm sustained 99.4% formation coherence at speeds reaching 4.2 m/s.",
                "methodology_summary": "Conducted in abandoned quarry tunnels using ROS2 Humble and custom PX4 flight stacks. Peer telemetry synchronized over 802.15.4 UWB mesh at 100Hz.",
                "field": ResearchField.AEROSPACE,
                "status": ResearchStatus.PEER_REVIEWED,
                "pdf_url": "https://arxiv.org/abs/2405.0078",
                "code_repo_url": "https://github.com/enquebet-labs/mav-swarm-consensus",
                "dataset_url": "https://kaggle.com/datasets/enquebet/mav-tunnel-trials",
                "live_demo_url": "https://swarm-viz.enquebet.org",
                "doi": "10.1109/aerospace.2026.0078",
                "keywords": ["drones", "swarm-intelligence", "uwb", "optical-flow", "robotics"],
                "citations_count": 21,
                "views_count": 890,
                "downloads_count": 185,
                "published_at": now - timedelta(days=28),
                "open_collaborator_roles": ["PX4 State Estimation Specialist", "UWB Mesh Protocol Architect"],
                "hardware_bom": [
                    {
                        "name": "STM32F405 Flight Management Unit with Barometer",
                        "slug": "stm32f405-flight-controller",
                        "quantity": 4,
                        "role": "PX4 Realtime Autopilot",
                        "datasheet_url": "https://venopai.in/datasheets/stm32f405.pdf",
                        "estimated_price_paise": 420000
                    },
                    {
                        "name": "Decawave DWM1000 Ultra-Wideband Transceiver Module",
                        "slug": "decawave-dwm1000-uwb",
                        "quantity": 12,
                        "role": "Peer-to-Peer Inter-Drone Ranging",
                        "datasheet_url": "https://venopai.in/datasheets/dwm1000.pdf",
                        "estimated_price_paise": 115000
                    }
                ],
                "authors": [
                    {
                        "full_name": "Aarav Sharma",
                        "email": "aarav.s@iitm.ac.in",
                        "affiliation": "Indian Institute of Technology (IIT) Madras",
                        "orcid": "0000-0001-9023-4412",
                        "is_corresponding": True,
                        "order": 1,
                        "contribution_statement": "Formulated the asynchronous UWB range consensus matrix and led subterranean flight tests."
                    }
                ],
                "reviews": []
            },
            {
                "primary_author_obj": vikram_user,
                "paper_code": "ENQ-RES-2026-0105",
                "slug": "zero-knowledge-state-proofs-for-heterogeneous-iot-clusters",
                "title": "Succinct Zero-Knowledge State Attestation for Heterogeneous Low-Power Microcontrollers",
                "abstract": "Verifying firmware integrity across untrusted remote IoT sensor nodes incurs prohibitive compute overhead when using traditional cryptographic handshakes. We introduce zk-Node, a recursive SNARK circuit with proving time under 1.2s on Cortex-M4 silicon (80MHz). The verifier contract verifies cluster validity in 240,000 EVM gas, enabling untrusted sensor clusters to prove sensor compliance without exposing raw telemetry.",
                "methodology_summary": "Circuits written in Circom 2.1 with Groth16 backend. Verification benchmarked on physical STM32F401 'Black Pill' development boards.",
                "field": ResearchField.CRYPTOGRAPHY,
                "status": ResearchStatus.ACCEPTED,
                "pdf_url": "https://eprint.iacr.org/2026/105",
                "code_repo_url": "https://github.com/enquebet-labs/zk-iot-state-proofs",
                "doi": "10.1007/cryptology.2026.0105",
                "keywords": ["zero-knowledge", "snarks", "iot-security", "embedded-crypto"],
                "citations_count": 14,
                "views_count": 620,
                "downloads_count": 112,
                "published_at": now - timedelta(days=40),
                "open_collaborator_roles": ["Circom Circuit Optimizer", "Smart Contract Auditor"],
                "hardware_bom": [
                    {
                        "name": "STM32F401 Black Pill Board ARM Cortex-M4 84MHz",
                        "slug": "stm32f401-black-pill",
                        "quantity": 3,
                        "role": "Prover Execution Node",
                        "datasheet_url": "https://venopai.in/datasheets/stm32f401.pdf",
                        "estimated_price_paise": 24900
                    }
                ],
                "authors": [
                    {
                        "full_name": "Vikram Sethi",
                        "email": "v.sethi@iiit.ac.in",
                        "affiliation": "International Institute of Information Technology (IIIT) Hyderabad",
                        "orcid": "0000-0002-8819-2041",
                        "is_corresponding": True,
                        "order": 1,
                        "contribution_statement": "Designed the recursive Groth16 proving circuit for low-memory microcontrollers."
                    }
                ],
                "reviews": []
            }
        ]

        created_count = 0
        updated_count = 0

        for item in papers_data:
            authors_data = item.pop("authors", [])
            reviews_data = item.pop("reviews", [])
            paper_author = item.pop("primary_author_obj", None)

            paper, created = ResearchPaper.objects.update_or_create(
                slug=item["slug"],
                defaults={
                    **item,
                    "primary_author": paper_author,
                }
            )

            # Seed authors
            for a_info in authors_data:
                ResearchAuthor.objects.update_or_create(
                    paper=paper,
                    email=a_info["email"],
                    defaults={
                        "user": paper_author if a_info.get("is_corresponding") else None,
                        "full_name": a_info["full_name"],
                        "affiliation": a_info["affiliation"],
                        "orcid": a_info.get("orcid", ""),
                        "is_corresponding": a_info.get("is_corresponding", False),
                        "order": a_info.get("order", 1),
                        "contribution_statement": a_info.get("contribution_statement", ""),
                        "is_confirmed": True
                    }
                )

            # Seed initial version v1
            ResearchVersion.objects.update_or_create(
                paper=paper,
                version_number=1,
                defaults={
                    "pdf_url": paper.pdf_url,
                    "changelog": "Initial preprint release with reproducible methodology."
                }
            )

            # Seed reviews
            for rev_info in reviews_data:
                ReproducibilityReview.objects.update_or_create(
                    paper=paper,
                    reviewer=aarav_user,
                    defaults={
                        **rev_info,
                    }
                )

            if created:
                created_count += 1
            else:
                updated_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully seeded {created_count} research papers (updated {updated_count}). Total in DB: {ResearchPaper.objects.count()}"
            )
        )
