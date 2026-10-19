from rest_framework import serializers
from django.contrib.auth import get_user_model
from .models import ResearchPaper, ReproducibilityReview, ResearchField, ResearchStatus

User = get_user_model()


class ResearchAuthorSerializer(serializers.ModelSerializer):
    reputation_score = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'full_name', 'profile_image',
            'headline', 'college', 'campus_domain', 'city', 'reputation_score'
        ]

    def get_reputation_score(self, obj):
        try:
            return obj.reputation.score
        except Exception:
            return 0


class ReproducibilityReviewSerializer(serializers.ModelSerializer):
    reviewer = ResearchAuthorSerializer(read_only=True)

    class Meta:
        model = ReproducibilityReview
        fields = [
            'id', 'reviewer', 'verdict', 'rigor_score', 'clarity_score',
            'reproducibility_score', 'evaluation_notes', 'environment_details',
            'evidence_url', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'reviewer']


class ResearchPaperListSerializer(serializers.ModelSerializer):
    primary_author = ResearchAuthorSerializer(read_only=True)
    field_display = serializers.CharField(source='get_field_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    has_code = serializers.SerializerMethodField()
    has_dataset = serializers.SerializerMethodField()
    has_demo = serializers.SerializerMethodField()
    has_bom = serializers.SerializerMethodField()
    hardware_bom_count = serializers.SerializerMethodField()
    reviews_count = serializers.SerializerMethodField()

    class Meta:
        model = ResearchPaper
        fields = [
            'id', 'paper_code', 'slug', 'title', 'abstract', 'field', 'field_display',
            'status', 'status_display', 'primary_author', 'pdf_url', 'code_repo_url',
            'live_demo_url', 'citations_count', 'reproducibility_score', 'views_count',
            'downloads_count', 'keywords', 'published_at', 'has_code', 'has_dataset',
            'has_demo', 'has_bom', 'hardware_bom_count', 'reviews_count',
            'open_collaborator_roles', 'rejection_reason', 'reviewed_at'
        ]

    def get_has_code(self, obj):
        return bool(obj.code_repo_url)

    def get_has_dataset(self, obj):
        return bool(obj.dataset_url)

    def get_has_demo(self, obj):
        return bool(obj.live_demo_url)

    def get_has_bom(self, obj):
        return isinstance(obj.hardware_bom, list) and len(obj.hardware_bom) > 0

    def get_hardware_bom_count(self, obj):
        return len(obj.hardware_bom) if isinstance(obj.hardware_bom, list) else 0

    def get_reviews_count(self, obj):
        return obj.reproducibility_reviews.count()


class ResearchPaperDetailSerializer(serializers.ModelSerializer):
    primary_author = ResearchAuthorSerializer(read_only=True)
    reviewed_by = ResearchAuthorSerializer(read_only=True)
    field_display = serializers.CharField(source='get_field_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    reproducibility_reviews = ReproducibilityReviewSerializer(many=True, read_only=True)
    bibtex = serializers.SerializerMethodField()
    workspace_summary = serializers.SerializerMethodField()

    class Meta:
        model = ResearchPaper
        fields = [
            'id', 'paper_code', 'slug', 'title', 'abstract', 'methodology_summary',
            'field', 'field_display', 'status', 'status_display', 'primary_author',
            'reviewed_by', 'reviewed_at', 'rejection_reason',
            'pdf_url', 'code_repo_url', 'dataset_url', 'live_demo_url', 'hardware_bom',
            'associated_workspace', 'workspace_summary', 'open_collaborator_roles',
            'citations_count', 'reproducibility_score', 'views_count', 'downloads_count',
            'doi', 'keywords', 'published_at', 'updated_at', 'reproducibility_reviews',
            'bibtex'
        ]

    def get_bibtex(self, obj):
        return obj.generate_bibtex()

    def get_workspace_summary(self, obj):
        if obj.associated_workspace:
            ws = obj.associated_workspace
            return {
                'id': str(ws.id),
                'title': ws.title,
                'collaborators_count': ws.collaborators.count() if hasattr(ws, 'collaborators') else 0
            }
        return None


class ResearchPaperCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ResearchPaper
        fields = [
            'title', 'abstract', 'methodology_summary', 'field',
            'pdf_url', 'code_repo_url', 'dataset_url', 'live_demo_url',
            'hardware_bom', 'open_collaborator_roles', 'doi', 'keywords',
            'associated_workspace'
        ]

    def validate_title(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Title must be at least 5 characters long.")
        return value.strip()

    def validate_abstract(self, value):
        if len(value.strip()) < 30:
            raise serializers.ValidationError("Abstract must be at least 30 characters long.")
        return value.strip()

    def validate_hardware_bom(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Hardware BOM must be a list of components.")
        for item in value:
            if not isinstance(item, dict) or not item.get('name'):
                raise serializers.ValidationError("Each component in hardware BOM must have at least a 'name'.")
        return value

    def create(self, validated_data):
        user = self.context['request'].user
        paper = ResearchPaper.objects.create(primary_author=user, **validated_data)
        return paper


class ReproducibilityReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReproducibilityReview
        fields = [
            'verdict', 'rigor_score', 'clarity_score', 'reproducibility_score',
            'evaluation_notes', 'environment_details', 'evidence_url'
        ]

    def validate_rigor_score(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Rigor score must be between 1 and 5.")
        return value

    def validate_clarity_score(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Clarity score must be between 1 and 5.")
        return value

    def validate_reproducibility_score(self, value):
        if not (1 <= value <= 5):
            raise serializers.ValidationError("Reproducibility score must be between 1 and 5.")
        return value

    def validate_evaluation_notes(self, value):
        if len(value.strip()) < 20:
            raise serializers.ValidationError("Evaluation notes must be at least 20 characters long.")
        return value.strip()
