"""
Admin configuration for all models
"""
from django.contrib import admin
from apps.users.models import User, UserSkill, Follower
from apps.posts.models import Post, PostAttachment, PostRequirement, PostTag, Like, Comment, SavedPost, PostCollaborator, PostReport
from apps.collaboration.models import CollaborationRequest
from apps.chats.models import Conversation, ConversationMember, Message
from apps.notifications.models import Notification
from apps.contributions.models import Contribution
from apps.research.models import Research

# User models
admin.site.register(User)
admin.site.register(UserSkill)
admin.site.register(Follower)

# Post models
admin.site.register(Post)
admin.site.register(PostAttachment)
admin.site.register(PostRequirement)
admin.site.register(PostTag)
admin.site.register(PostCollaborator)
admin.site.register(Like)
admin.site.register(Comment)
admin.site.register(SavedPost)
admin.site.register(PostReport)

#Collaboration
admin.site.register(CollaborationRequest)

# Messages
admin.site.register(Conversation)
admin.site.register(ConversationMember)
admin.site.register(Message)

# Notifications
admin.site.register(Notification)

# Contributions & Research
admin.site.register(Contribution)
admin.site.register(Research)
