"""
Activity Matrix and Builder Heatmap Aggregator for ENQUEbet.
Calculates 365-day verified builder activity, streaks, and week-by-week contribution grid.
"""
from datetime import timedelta, date
from django.utils import timezone
from django.db import models
from apps.collaboration.models import ReputationEvent, ProjectTask, TaskDeliverable


class ActivityMatrixService:
    """
    Computes verified builder activity matrix for GitHub-rival heatmap and streaks.
    Only includes verified actions:
    - Approved deliverables
    - Completed tasks
    - Minted Proof of Work tokens
    - Received peer reviews
    """

    @classmethod
    def get_activity_matrix(cls, user, days: int = 365) -> dict:
        today = timezone.now().date()
        start_date = today - timedelta(days=days - 1)

        # 1. Fetch reputation events in the window
        events = ReputationEvent.objects.filter(
            user=user,
            is_revoked=False,
            created_at__date__gte=start_date,
            created_at__date__lte=today
        ).values('created_at__date', 'event_type')

        # Map date -> list of events
        date_counts = {}
        for ev in events:
            d_str = ev['created_at__date'].strftime('%Y-%m-%d')
            if d_str not in date_counts:
                date_counts[d_str] = {'count': 0, 'types': set()}
            date_counts[d_str]['count'] += 1
            date_counts[d_str]['types'].add(ev['event_type'])

        # Total contributions in window
        total_contributions = sum(item['count'] for item in date_counts.values())

        # 2. Compute current streak & longest streak
        # Generate full chronological list of days in the window
        all_days = []
        curr = start_date
        while curr <= today:
            d_str = curr.strftime('%Y-%m-%d')
            entry = date_counts.get(d_str, {'count': 0, 'types': set()})
            all_days.append({
                'date': d_str,
                'count': entry['count'],
                'types': sorted(list(entry['types'])) if isinstance(entry['types'], set) else entry['types']
            })
            curr += timedelta(days=1)

        # Longest streak
        longest_streak = 0
        current_streak = 0
        temp_streak = 0

        for day in all_days:
            if day['count'] > 0:
                temp_streak += 1
                if temp_streak > longest_streak:
                    longest_streak = temp_streak
            else:
                temp_streak = 0

        # Current streak: check backwards from today (or yesterday if today has 0 so far)
        today_str = today.strftime('%Y-%m-%d')
        yesterday_str = (today - timedelta(days=1)).strftime('%Y-%m-%d')

        check_date = today
        if date_counts.get(today_str, {}).get('count', 0) == 0:
            # If today has 0, streak can still be alive if yesterday had > 0
            if date_counts.get(yesterday_str, {}).get('count', 0) > 0:
                check_date = today - timedelta(days=1)
            else:
                check_date = None

        if check_date:
            c_streak = 0
            while check_date >= start_date:
                cd_str = check_date.strftime('%Y-%m-%d')
                if date_counts.get(cd_str, {}).get('count', 0) > 0:
                    c_streak += 1
                    check_date -= timedelta(days=1)
                else:
                    break
            current_streak = c_streak

        # 3. Build week-by-week grid for GitHub-style layout (52-53 weeks)
        # Pad from the start_date back to the preceding Sunday so days align properly
        weekday_offset = (start_date.weekday() + 1) % 7  # 0 for Sunday, 1 for Monday...
        grid_start = start_date - timedelta(days=weekday_offset)

        weeks = []
        current_week = []
        walker = grid_start

        while walker <= today:
            w_str = walker.strftime('%Y-%m-%d')
            cnt = date_counts.get(w_str, {}).get('count', 0)
            types_list = list(date_counts.get(w_str, {}).get('types', []))

            # Determine level 0 to 4
            level = 0
            if cnt >= 6:
                level = 4
            elif cnt >= 4:
                level = 3
            elif cnt >= 2:
                level = 2
            elif cnt >= 1:
                level = 1

            current_week.append({
                'date': w_str,
                'count': cnt,
                'level': level,
                'types': types_list,
                'day_of_week': walker.weekday()  # 0=Monday, 6=Sunday
            })

            if len(current_week) == 7 or walker == today:
                weeks.append(current_week)
                current_week = []

            walker += timedelta(days=1)

        if current_week:
            weeks.append(current_week)

        return {
            'total_contributions': total_contributions,
            'current_streak_days': current_streak,
            'longest_streak_days': longest_streak,
            'days_tracked': days,
            'start_date': start_date.strftime('%Y-%m-%d'),
            'end_date': today.strftime('%Y-%m-%d'),
            'weeks': weeks,
            'recent_active_days': [d for d in reversed(all_days) if d['count'] > 0][:10]
        }
