"""
Admin configuration for Platform Updates
"""
from django.contrib import admin
from .models import PlatformUpdate


@admin.register(PlatformUpdate)
class PlatformUpdateAdmin(admin.ModelAdmin):
    list_display = ('title', 'category', 'is_pinned', 'is_published', 'published_at', 'author')
    list_filter = ('category', 'is_pinned', 'is_published', 'published_at')
    search_fields = ('title', 'summary', 'content', 'slug')
    prepopulated_fields = {'slug': ('title',)}
    ordering = ('-is_pinned', '-published_at')
