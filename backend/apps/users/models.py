"""
User Models for ENQUEbet
"""
from django.contrib.auth.models import AbstractUser
from django.db import models
import uuid


class User(AbstractUser):
    """Custom User model"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True)
    username = models.CharField(max_length=150, unique=True)
    full_name = models.CharField(max_length=255)
    headline = models.CharField(max_length=200, blank=True, default='')
    bio = models.TextField(blank=True)
    profile_image = models.URLField(max_length=500, blank=True)
    cover_image = models.URLField(max_length=500, blank=True)
    location = models.CharField(max_length=255, blank=True)
    college = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    campus_domain = models.CharField(max_length=100, blank=True)
    is_private = models.BooleanField(default=False)
    verification_level = models.IntegerField(default=0)
    reputation_score = models.IntegerField(default=0)
    
    AVAILABILITY_CHOICES = [
        ('open_to_cofound', 'Open to Co-found'),
        ('open_to_collaborate', 'Open to Collaborate'),
        ('hiring', 'Hiring Builders'),
        ('open_to_work', 'Open to Work'),
        ('focused', 'Focused on Building'),
    ]
    availability_status = models.CharField(
        max_length=30,
        choices=AVAILABILITY_CHOICES,
        default='open_to_collaborate'
    )
    pinned_proof_ids = models.JSONField(default=list, blank=True)

    # Resume / Portfolio fields
    education = models.JSONField(default=list, blank=True)
    projects = models.JSONField(default=list, blank=True)
    experience = models.JSONField(default=list, blank=True)
    certifications = models.JSONField(default=list, blank=True)
    collaboration_preferences = models.JSONField(default=list, blank=True)
    resume_file = models.FileField(upload_to='resumes/', blank=True, null=True)
    linkedin_url = models.URLField(max_length=500, blank=True, default='')
    github_url = models.URLField(max_length=500, blank=True, default='')
    portfolio_url = models.URLField(max_length=500, blank=True, default='')
    
    # Time Management & Digital Wellbeing
    daily_focus_limit_minutes = models.IntegerField(default=0)
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.CharField(max_length=5, blank=True, default='22:00')
    quiet_hours_end = models.CharField(max_length=5, blank=True, default='08:00')
    weekly_digest_enabled = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'full_name']
    
    class Meta:
        db_table = 'users'
        ordering = ['-created_at']
    
    def __str__(self):
        return self.username


class UserSkill(models.Model):
    """User skills/specializations"""
    SKILL_LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='skills')
    skill_name = models.CharField(max_length=100)
    level = models.CharField(max_length=20, choices=SKILL_LEVEL_CHOICES, default='intermediate')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'user_skills'
        unique_together = ['user', 'skill_name']
    
    def __str__(self):
        return f"{self.user.username} - {self.skill_name}"


class Follower(models.Model):
    """User follow relationships"""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'followers'
        unique_together = ['follower', 'following']
        indexes = [
            models.Index(fields=['follower']),
            models.Index(fields=['following']),
        ]
    
    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"


class UserExperience(models.Model):
    """
    Verified Builder Career & Venture Timeline.
    Can be directly tethered to a cryptographic Proof of Work.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='experiences')
    company_name = models.CharField(max_length=150)
    role_title = models.CharField(max_length=150)
    location = models.CharField(max_length=150, blank=True, default='')
    is_remote = models.BooleanField(default=False)
    start_date = models.DateField()
    end_date = models.DateField(null=True, blank=True)
    is_current = models.BooleanField(default=False)
    description = models.TextField(blank=True, default='')
    skills_used = models.JSONField(default=list, blank=True)
    verified_pow = models.ForeignKey(
        'collaboration.ProofOfWork',
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name='linked_experiences'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'user_experiences'
        ordering = ['-start_date', '-created_at']

    def __str__(self):
        return f"{self.role_title} at {self.company_name} ({self.user.username})"


class UserEducation(models.Model):
    """
    Academic credentials with campus verification.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='educations')
    institution = models.CharField(max_length=200)
    degree = models.CharField(max_length=150)
    field_of_study = models.CharField(max_length=150, blank=True, default='')
    start_year = models.PositiveIntegerField()
    end_year = models.PositiveIntegerField(null=True, blank=True)
    is_campus_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_educations'
        ordering = ['-start_year', '-created_at']

    def __str__(self):
        return f"{self.degree} in {self.field_of_study} at {self.institution} ({self.user.username})"


class UserSession(models.Model):
    """
    Active device session tracking for security, multi-device management,
    and remote session revocation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sessions')
    refresh_jti = models.CharField(max_length=255, db_index=True, blank=True)
    device_name = models.CharField(max_length=150, default='Desktop Device')
    device_type = models.CharField(max_length=50, default='desktop')  # desktop, mobile, tablet
    browser = models.CharField(max_length=100, blank=True, default='')
    os = models.CharField(max_length=100, blank=True, default='')
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    location_city = models.CharField(max_length=100, blank=True, default='')
    last_active = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_current = models.BooleanField(default=False)
    revoked = models.BooleanField(default=False)

    class Meta:
        db_table = 'user_sessions'
        ordering = ['-last_active']

    def __str__(self):
        return f"{self.user.username} - {self.device_name} ({self.ip_address})"


class BlockedUser(models.Model):
    """
    Safety & moderation relationship: a user blocking another user.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_users')
    blocked_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='blocked_by')
    reason = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'blocked_users'
        unique_together = ['user', 'blocked_user']
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.username} blocked {self.blocked_user.username}"

