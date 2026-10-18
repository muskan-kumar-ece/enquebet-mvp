"""
Geolocation and Ripple Expansion Feed Service for ENQUEbet.

Provides:
- Haversine distance calculation in Python and SQL (Django ORM expressions).
- Radial ripple scoring across 3 time waves:
    Wave 1 (<12h):   Hyperlocal focus (0-5 km: +40, 5-25 km: +25, remote: +15)
    Wave 2 (12-48h): Regional expansion (0-25 km: +35, 25-75 km: +25, remote: +20)
    Wave 3 (>=48h):  Global/mature wave (0-100 km: +20, 100-500 km: +15, remote: +25, others: +10)
- Campus / College boost (+35 pts for matching college domain/name).
"""
import math
from datetime import timedelta
from typing import Optional, Union

from django.db.models import (
    Case,
    ExpressionWrapper,
    F,
    FloatField,
    IntegerField,
    Q,
    Value,
    When,
)
from django.db.models.functions import (
    ACos,
    Cos,
    Greatest,
    Least,
    Radians,
    Sin,
)
from django.utils import timezone

EARTH_RADIUS_KM = 6371.0


def haversine_distance_km(
    lat1: Optional[Union[float, int]],
    lon1: Optional[Union[float, int]],
    lat2: Optional[Union[float, int]],
    lon2: Optional[Union[float, int]],
) -> Optional[float]:
    """Calculate the great-circle distance between two points on Earth in kilometers.
    Returns None if any coordinate is missing or invalid.
    """
    if lat1 is None or lon1 is None or lat2 is None or lon2 is None:
        return None

    try:
        lat1_f, lon1_f = float(lat1), float(lon1)
        lat2_f, lon2_f = float(lat2), float(lon2)
    except (ValueError, TypeError):
        return None

    phi1 = math.radians(lat1_f)
    phi2 = math.radians(lat2_f)
    delta_phi = math.radians(lat2_f - lat1_f)
    delta_lambda = math.radians(lon2_f - lon1_f)

    a = (
        math.sin(delta_phi / 2.0) ** 2
        + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    )
    # Clamp to [0, 1] to prevent float domain error in asin
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return round(EARTH_RADIUS_KM * c, 2)


def get_distance_expression(ref_lat: float, ref_lng: float):
    """Generate a Django SQL expression computing distance in km from (ref_lat, ref_lng).
    Handles null coordinates cleanly via Case/When. Clamps cosine to [-1.0, 1.0].
    """
    d_lat1 = Radians(Value(float(ref_lat)))
    d_lon1 = Radians(Value(float(ref_lng)))
    d_lat2 = Radians(F('latitude'))
    d_lon2 = Radians(F('longitude'))

    cos_central_angle = (
        Sin(d_lat1) * Sin(d_lat2)
        + Cos(d_lat1) * Cos(d_lat2) * Cos(d_lon2 - d_lon1)
    )

    clamped_cos = Least(Greatest(cos_central_angle, Value(-1.0)), Value(1.0))
    dist_expr = ExpressionWrapper(
        ACos(clamped_cos) * Value(EARTH_RADIUS_KM),
        output_field=FloatField()
    )

    return Case(
        When(Q(latitude__isnull=False) & Q(longitude__isnull=False), then=dist_expr),
        default=Value(None),
        output_field=FloatField()
    )


def annotate_distance(queryset, ref_lat: Optional[float], ref_lng: Optional[float]):
    """Annotate queryset with `_distance_km` attribute.
    If coordinates are invalid or omitted, annotates `_distance_km=None`.
    """
    if ref_lat is not None and ref_lng is not None:
        try:
            lat_f = float(ref_lat)
            lng_f = float(ref_lng)
            # Basic sanity range check
            if -90.0 <= lat_f <= 90.0 and -180.0 <= lng_f <= 180.0:
                return queryset.annotate(_distance_km=get_distance_expression(lat_f, lng_f))
        except (ValueError, TypeError):
            pass

    return queryset.annotate(_distance_km=Value(None, output_field=FloatField()))


def build_ripple_score_expression(
    has_coords: bool,
    now=None,
):
    """Build the time-decayed ripple wave scoring expression.
    Requires `_distance_km` to be already annotated on the queryset.
    """
    if now is None:
        now = timezone.now()

    t12 = now - timedelta(hours=12)
    t48 = now - timedelta(hours=48)

    if has_coords:
        return Case(
            # Wave 1: Under 12 hours old
            When(
                created_at__gte=t12,
                _distance_km__isnull=False,
                _distance_km__lte=5.0,
                then=Value(40),
            ),
            When(
                created_at__gte=t12,
                _distance_km__isnull=False,
                _distance_km__lte=25.0,
                then=Value(25),
            ),
            When(
                created_at__gte=t12,
                _distance_km__isnull=False,
                _distance_km__lte=50.0,
                then=Value(10),
            ),
            When(
                created_at__gte=t12,
                is_remote=True,
                then=Value(15),
            ),
            # Wave 2: 12h to 48h old
            When(
                created_at__gte=t48,
                _distance_km__isnull=False,
                _distance_km__lte=25.0,
                then=Value(35),
            ),
            When(
                created_at__gte=t48,
                _distance_km__isnull=False,
                _distance_km__lte=75.0,
                then=Value(25),
            ),
            When(
                created_at__gte=t48,
                _distance_km__isnull=False,
                _distance_km__lte=150.0,
                then=Value(15),
            ),
            When(
                created_at__gte=t48,
                is_remote=True,
                then=Value(20),
            ),
            # Wave 3: 48h+ old
            When(
                created_at__lt=t48,
                _distance_km__isnull=False,
                _distance_km__lte=100.0,
                then=Value(20),
            ),
            When(
                created_at__lt=t48,
                _distance_km__isnull=False,
                _distance_km__lte=500.0,
                then=Value(15),
            ),
            When(
                created_at__lt=t48,
                is_remote=True,
                then=Value(25),
            ),
            When(
                created_at__lt=t48,
                then=Value(10),
            ),
            default=Value(0),
            output_field=IntegerField(),
        )
    else:
        # Fallback when user has no coordinates provided
        return Case(
            When(is_remote=True, then=Value(20)),
            default=Value(0),
            output_field=IntegerField(),
        )
