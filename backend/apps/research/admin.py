from django.contrib import admin
from .models import ResearchPaper, ResearchAuthor, ResearchVersion, ReproducibilityReview


class ResearchAuthorInline(admin.TabularInline):
    model = ResearchAuthor
    extra = 1
    fields = ('order', 'full_name', 'email', 'affiliation', 'orcid', 'is_corresponding')


class ResearchVersionInline(admin.TabularInline):
    model = ResearchVersion
    extra = 0
    readonly_fields = ('version_number', 'submitted_at')


@admin.register(ResearchPaper)
class ResearchPaperAdmin(admin.ModelAdmin):
    list_display = ('paper_code', 'title', 'field', 'status', 'primary_author', 'published_at', 'views_count')
    list_filter = ('field', 'status', 'published_at')
    search_fields = ('paper_code', 'title', 'abstract', 'primary_author__username', 'primary_author__email')
    prepopulated_fields = {'slug': ('title',)}
    inlines = [ResearchAuthorInline, ResearchVersionInline]
    readonly_fields = ('paper_code', 'published_at', 'updated_at')


@admin.register(ResearchAuthor)
class ResearchAuthorAdmin(admin.ModelAdmin):
    list_display = ('full_name', 'paper', 'affiliation', 'order', 'is_corresponding')
    search_fields = ('full_name', 'email', 'affiliation', 'paper__title', 'paper__paper_code')


@admin.register(ResearchVersion)
class ResearchVersionAdmin(admin.ModelAdmin):
    list_display = ('paper', 'version_number', 'submitted_at')
    search_fields = ('paper__title', 'paper__paper_code')


@admin.register(ReproducibilityReview)
class ReproducibilityReviewAdmin(admin.ModelAdmin):
    list_display = ('paper', 'reviewer', 'verdict', 'reproducibility_score', 'created_at')
    list_filter = ('verdict', 'created_at')
    search_fields = ('paper__title', 'paper__paper_code', 'reviewer__username')
