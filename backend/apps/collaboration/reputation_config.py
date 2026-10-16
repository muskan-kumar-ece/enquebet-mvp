"""
Reputation Engine Configuration and Weight Rules for ENQUEbet.
All scoring parameters are documented with rationale, bounds, and thresholds.
"""

# Points awarded for verified contribution actions
REPUTATION_WEIGHTS = {
    # 1. Approved Deliverable: Individual created and submitted an artifact/PR
    # that was formally reviewed and approved by the project owner or lead.
    'DELIVERABLE_APPROVED': 15,

    # 2. Completed Task: Successfully closing out an assigned task with an approved deliverable.
    # Awarded to the task assignee upon formal review approval.
    'TASK_COMPLETED': 10,

    # 3. Verified Project Completion (Proof of Work minted):
    # Awarded to the project owner/lead for successfully driving project to completion.
    'PROJECT_COMPLETED_LEAD': 50,
    # Awarded to active team contributors who contributed at least one approved deliverable.
    'PROJECT_COMPLETED_CONTRIBUTOR': 35,

    # 4. Peer Review Rating Scale (1 to 5 average across execution, collaboration, reliability)
    # Neutral baseline is 3.0 (0 points).
    # Maximum peer review points per project per builder (prevents review farming)
    'PEER_REVIEW_MAX_PROJECT_POINTS': 30,
}

# Builder reputation level tiers based on cumulative verified score
BUILDER_LEVELS = [
    {'min_score': 500, 'title': 'Master Architect', 'badge_color': 'amber'},
    {'min_score': 250, 'title': 'Senior Builder', 'badge_color': 'purple'},
    {'min_score': 100, 'title': 'Verified Contributor', 'badge_color': 'blue'},
    {'min_score': 25,  'title': 'Active Builder', 'badge_color': 'emerald'},
    {'min_score': 0,   'title': 'New Builder', 'badge_color': 'slate'},
]


def calculate_peer_review_points(avg_rating: float) -> int:
    """
    Convert a 1.0 - 5.0 average peer review rating into bounded reputation points.
    Neutral baseline is 3.0 (0 points awarded).
    Ratings >= 3.0 award positive points (+3 to +10).
    Ratings < 3.0 apply a penalty (-4 to -8) to reflect unreliability or disruption.
    """
    if avg_rating >= 4.5:
        return 10
    elif avg_rating >= 4.0:
        return 6
    elif avg_rating >= 3.5:
        return 3
    elif avg_rating >= 3.0:
        return 0
    elif avg_rating >= 2.0:
        return -4
    else:
        return -8


def get_builder_level(score: int) -> dict:
    """Return the tier title and styling for a given reputation score."""
    for level in BUILDER_LEVELS:
        if score >= level['min_score']:
            return level
    return BUILDER_LEVELS[-1]
