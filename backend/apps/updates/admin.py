"""
Admin configuration for ENQUEbet Pulse
"""
from django.contrib import admin
from .models import PlatformUpdate, SavedUpdate, UserPulsePreference, UpdateRevision


@admin.register(PlatformUpdate)
class PlatformUpdateAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'update_type', 'editorial_status', 'importance', 'is_top_story', 'is_pinned', 'published_at', 'author')
    list_filter = ('category', 'update_type', 'editorial_status', 'importance', 'is_top_story', 'is_pinned', 'published_at')
    search_fields = ('title', 'summary', 'why_it_matters', 'content', 'slug', 'tags')
    prepopulated_fields = {'slug': ('title',)}
    ordering = ('-is_pinned', '-is_top_story', '-published_at')


@admin.register(SavedUpdate)
class SavedUpdateAdmin(admin.ModelAdmin):
    list_display = ('user', 'update', 'created_at')
    search_fields = ('user__username', 'update__title')


@admin.register(UserPulsePreference)
class UserPulsePreferenceAdmin(admin.ModelAdmin):
    list_display = ('user', 'receive_weekly_briefing', 'updated_at')
    search_fields = ('user__username',)


@admin.register(UpdateRevision)
class UpdateRevisionAdmin(admin.ModelAdmin):
    list_display = ('update', 'editor', 'revision_summary', 'created_at')
    search_fields = ('update__title', 'editor__username', 'revision_summary')
