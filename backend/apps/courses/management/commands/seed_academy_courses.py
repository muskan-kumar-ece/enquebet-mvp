"""
Alias command for seed_academy.
Ensures both 'python manage.py seed_academy' and 'python manage.py seed_academy_courses' work identically.
"""
from apps.courses.management.commands.seed_academy import Command as SeedAcademyCommand


class Command(SeedAcademyCommand):
    help = "Seed initial production-quality engineering courses and curriculum into ENQUEbet Academy (alias)"
