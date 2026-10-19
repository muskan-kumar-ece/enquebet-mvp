from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from rest_framework import status

from apps.research.models import ResearchPaper, ReproducibilityReview, ResearchField, ResearchStatus

User = get_user_model()


class ResearchPaperTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.author = User.objects.create_user(
            username='dr_quantum',
            email='quantum@campus.edu',
            password='TestPassword123!',
            full_name='Dr. Elena Rostova',
            college='MIT',
            campus_domain='campus.edu'
        )
        self.reviewer = User.objects.create_user(
            username='peer_auditor',
            email='auditor@campus.edu',
            password='TestPassword123!',
            full_name='Marcus Vance',
            college='Stanford',
            campus_domain='campus.edu'
        )

        self.admin = User.objects.create_user(
            username='admin_staff',
            email='admin@campus.edu',
            password='TestPassword123!',
            full_name='Staff Admin',
            is_staff=True
        )

        self.paper = ResearchPaper.objects.create(
            primary_author=self.author,
            title='Real-Time Edge Neural Compression on Heterogeneous RISC-V Silicon',
            abstract='We introduce a sparse quantization framework enabling 4-bit transformer execution with sub-10ms latency.',
            methodology_summary='Evaluated across 10,000 edge cycles using cycle-accurate RTL emulation and hardware benches.',
            field=ResearchField.ROBOTICS_EMBEDDED,
            status=ResearchStatus.PREPRINT,
            code_repo_url='https://github.com/enquebet/edge-quant',
            dataset_url='https://zenodo.org/record/1234567',
            live_demo_url='https://demo.enquebet.com/quant',
            hardware_bom=[
                {
                    'name': 'ESP32-S3-WROOM-1',
                    'slug': 'esp32-s3-wroom-1',
                    'quantity': 2,
                    'role': 'Edge Controller'
                }
            ],
            open_collaborator_roles=['FPGA Synthesis Lead', 'Benchmark Engineer'],
            keywords=['edge-ai', 'risc-v', 'quantization']
        )

    def test_paper_code_and_slug_auto_generated(self):
        """Paper code and slug are generated automatically on save"""
        self.assertTrue(self.paper.paper_code.startswith('ENQ-RES-'))
        self.assertTrue(len(self.paper.slug) > 0)
        self.assertEqual(self.paper.status, ResearchStatus.PREPRINT)

    def test_list_research_papers(self):
        """Public list endpoint returns papers with summary metadata"""
        response = self.client.get('/api/v1/research/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        results = response.data.get('results', response.data)
        self.assertEqual(len(results), 1)
        paper_data = results[0]
        self.assertEqual(paper_data['paper_code'], self.paper.paper_code)
        self.assertTrue(paper_data['has_code'])
        self.assertTrue(paper_data['has_bom'])
        self.assertEqual(paper_data['hardware_bom_count'], 1)
        self.assertEqual(paper_data['primary_author']['username'], 'dr_quantum')

    def test_filter_by_field(self):
        """Filtering by field returns matching papers only"""
        # Create a second paper in another field
        ResearchPaper.objects.create(
            primary_author=self.author,
            title='Quantum Topological Superconductors',
            abstract='Investigating Majorana zero modes in superconductor-semiconductor nanowires.',
            field=ResearchField.QUANTUM,
            status=ResearchStatus.PREPRINT
        )

        res_robotics = self.client.get(f'/api/v1/research/?field={ResearchField.ROBOTICS_EMBEDDED}')
        data_robotics = res_robotics.data.get('results', res_robotics.data)
        self.assertEqual(len(data_robotics), 1)
        self.assertEqual(data_robotics[0]['field'], ResearchField.ROBOTICS_EMBEDDED)

        res_quantum = self.client.get(f'/api/v1/research/?field={ResearchField.QUANTUM}')
        data_quantum = res_quantum.data.get('results', res_quantum.data)
        self.assertEqual(len(data_quantum), 1)
        self.assertEqual(data_quantum[0]['field'], ResearchField.QUANTUM)

    def test_filter_by_user_for_profile(self):
        """Profile tab querying by user returns only that user's papers"""
        other_user = User.objects.create_user(
            username='other_author',
            email='other@campus.edu',
            password='TestPassword123!'
        )
        ResearchPaper.objects.create(
            primary_author=other_user,
            title='Autonomous Swarm Optimization in GPS-Denied Environments',
            abstract='Decentralized consensus protocol for quadrotor formations.',
            field=ResearchField.AEROSPACE,
            status=ResearchStatus.PREPRINT
        )

        # Filter by author ID
        res = self.client.get(f'/api/v1/research/?user={self.author.id}')
        data = res.data.get('results', res.data)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['primary_author']['username'], 'dr_quantum')

    def test_retrieve_paper_increments_views(self):
        """Retrieving paper increments view count and returns bibtex"""
        initial_views = self.paper.views_count
        response = self.client.get(f'/api/v1/research/{self.paper.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.paper.refresh_from_db()
        self.assertEqual(self.paper.views_count, initial_views + 1)
        self.assertIn('@article{', response.data['bibtex'])

    def test_create_paper_authenticated_defaults_to_pending_approval(self):
        """Authenticated builder submitting a research paper enters PENDING_APPROVAL"""
        self.client.force_authenticate(user=self.author)
        payload = {
            'title': 'High-Throughput Photonic Interconnects for Neuromorphic Silicon',
            'abstract': 'Optical waveguide crossbar arrays operating at 1.55um with 0.1pJ per synaptic MAC operation.',
            'methodology_summary': 'Fabricated on standard 220nm SOI wafer run.',
            'field': ResearchField.ROBOTICS_EMBEDDED,
            'hardware_bom': [
                {'name': 'STM32H743ZI', 'slug': 'stm32h743zi', 'quantity': 1, 'role': 'Optical Driver'}
            ],
            'open_collaborator_roles': ['Silicon Photonics Specialist']
        }
        response = self.client.post('/api/v1/research/', data=payload, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(response.data['paper_code'].startswith('ENQ-RES-'))
        self.assertEqual(response.data['status'], ResearchStatus.PENDING_APPROVAL)

    def test_admin_can_approve_research_paper(self):
        """Admin can approve a pending research paper into PREPRINT"""
        pending_paper = ResearchPaper.objects.create(
            primary_author=self.author,
            title='Neuromorphic Spike Encoding over Event-Driven Buses',
            abstract='Novel low-power spike-based communication architecture.',
            field=ResearchField.AI_ML,
            status=ResearchStatus.PENDING_APPROVAL
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(f'/api/v1/research/{pending_paper.slug}/approve/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ResearchStatus.PREPRINT)

        pending_paper.refresh_from_db()
        self.assertEqual(pending_paper.status, ResearchStatus.PREPRINT)
        self.assertEqual(pending_paper.reviewed_by, self.admin)

    def test_admin_can_reject_research_paper_with_reason(self):
        """Admin can reject a pending research paper and record feedback"""
        pending_paper = ResearchPaper.objects.create(
            primary_author=self.author,
            title='Sub-THz Signal Generation on CMOS',
            abstract='Experimental signal generation at 300GHz without harmonic multiplier.',
            field=ResearchField.ROBOTICS_EMBEDDED,
            status=ResearchStatus.PENDING_APPROVAL
        )
        self.client.force_authenticate(user=self.admin)
        response = self.client.post(
            f'/api/v1/research/{pending_paper.slug}/reject/',
            {'reason': 'Incomplete schematic layout and missing thermal dissipation test data.'}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['status'], ResearchStatus.REJECTED)
        self.assertIn('Incomplete schematic', response.data['rejection_reason'])

    def test_non_admin_cannot_approve_or_reject_paper(self):
        """Regular user cannot approve or reject research papers"""
        pending_paper = ResearchPaper.objects.create(
            primary_author=self.author,
            title='Low Latency BFT Consensus',
            abstract='Testing fast-path Byzantine Fault Tolerant state machines.',
            field=ResearchField.CRYPTOGRAPHY,
            status=ResearchStatus.PENDING_APPROVAL
        )
        self.client.force_authenticate(user=self.reviewer)
        app_res = self.client.post(f'/api/v1/research/{pending_paper.slug}/approve/')
        self.assertEqual(app_res.status_code, status.HTTP_403_FORBIDDEN)
        rej_res = self.client.post(f'/api/v1/research/{pending_paper.slug}/reject/', {'reason': 'test'})
        self.assertEqual(rej_res.status_code, status.HTTP_403_FORBIDDEN)

    def test_reproducibility_audit_flow(self):
        """Reviewers can submit reproducibility audits, updating score and status"""
        # Author cannot review own paper
        self.client.force_authenticate(user=self.author)
        review_payload = {
            'verdict': ReproducibilityReview.Verdict.VERIFIED_REPRODUCED,
            'rigor_score': 5,
            'clarity_score': 5,
            'reproducibility_score': 5,
            'evaluation_notes': 'Successfully compiled and reproduced test benches on local RISC-V hardware.'
        }
        res_fail = self.client.post(f'/api/v1/research/{self.paper.slug}/review/', data=review_payload)
        self.assertEqual(res_fail.status_code, status.HTTP_400_BAD_REQUEST)

        # Peer reviewer submits audit
        self.client.force_authenticate(user=self.reviewer)
        res_success = self.client.post(f'/api/v1/research/{self.paper.slug}/review/', data=review_payload)
        self.assertEqual(res_success.status_code, status.HTTP_201_CREATED)

        self.paper.refresh_from_db()
        self.assertEqual(self.paper.reproducibility_score, 5.0)
        self.assertEqual(self.paper.status, ResearchStatus.REPRODUCED)

        # Duplicate review is rejected
        res_dup = self.client.post(f'/api/v1/research/{self.paper.slug}/review/', data=review_payload)
        self.assertEqual(res_dup.status_code, status.HTTP_400_BAD_REQUEST)

    def test_citation_endpoint(self):
        """Citation endpoint formats BibTeX, APA, IEEE, and MLA"""
        res_bib = self.client.get(f'/api/v1/research/{self.paper.slug}/citation/?style=bibtex')
        self.assertEqual(res_bib.status_code, status.HTTP_200_OK)
        self.assertIn('@article{', res_bib.data['citation'])

        res_ieee = self.client.get(f'/api/v1/research/{self.paper.slug}/citation/?style=ieee')
        self.assertEqual(res_ieee.status_code, status.HTTP_200_OK)
        self.assertIn('ENQUEbet Living Research Repository', res_ieee.data['citation'])

    def test_stats_endpoint(self):
        """Platform research telemetry returns accurate counters"""
        response = self.client.get('/api/v1/research/stats/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('total_papers', response.data)
        self.assertIn('hardware_bom_papers', response.data)
