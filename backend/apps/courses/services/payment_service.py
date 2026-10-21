"""
ENQUEbet Academy — Payment, Order Settlement & Entitlement Service

Handles commercial transactions for paid courses:
1. Razorpay Order Creation (UPI / Cards / Netbanking)
2. HMAC-SHA256 Payment Verification
3. Atomic Order Settlement & CourseEntitlement Provisioning
4. Razorpay Webhook Event Ingestion
5. Admin Scholarship & Grant Allocation
"""
import uuid
import hmac
import hashlib
import logging
import requests
from django.db import transaction
from django.conf import settings
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied

from ..models import (
    Course,
    AccessTier,
    Enrollment,
    EnrollmentStatus,
    CourseOrder,
    CourseEntitlement,
    OrderStatus,
    PaymentGateway,
)
from ..permissions import is_academy_admin

logger = logging.getLogger(__name__)


class AcademyPaymentService:
    """
    Core service coordinating paid course monetization and access entitlements.
    """

    @classmethod
    def create_payment_order(
        cls,
        course: Course,
        user,
        billing_name: str = '',
        billing_email: str = '',
        gateway: str = PaymentGateway.RAZORPAY
    ) -> CourseOrder:
        """
        Generates a new purchase order for a premium course.
        Interacts with the configured payment gateway (e.g. Razorpay) to create a checkout order.
        """
        # Validate course is actually paid
        if course.access_tier == AccessTier.FREE and (not course.price_inr or course.price_inr == 0):
            raise ValidationError("This course is free; direct enrollment is available without payment.")

        # Check if user already holds active commercial entitlement
        if CourseEntitlement.objects.filter(user=user, course=course, is_active=True).exists():
            raise ValidationError("You already hold active lifetime entitlement for this course.")

        order_number = f"ENQ-ORD-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"
        amount_inr = course.price_inr or 0
        gateway_order_id = ''

        rzp_key_id = getattr(settings, 'RAZORPAY_KEY_ID', '')
        rzp_key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

        # Live Razorpay API interaction
        if rzp_key_id and rzp_key_secret and gateway == PaymentGateway.RAZORPAY:
            try:
                resp = requests.post(
                    "https://api.razorpay.com/v1/orders",
                    auth=(rzp_key_id, rzp_key_secret),
                    json={
                        "amount": amount_inr * 100,  # Razorpay expects paise (1 INR = 100 paise)
                        "currency": "INR",
                        "receipt": order_number,
                        "notes": {
                            "course_id": str(course.id),
                            "course_slug": course.slug,
                            "user_id": str(user.id),
                            "username": user.username,
                        }
                    },
                    timeout=10
                )
                if resp.status_code in (200, 201):
                    gateway_order_id = resp.json().get('id', '')
                else:
                    logger.error("Razorpay order creation failed: %s %s", resp.status_code, resp.text)
                    raise ValidationError("Payment gateway order creation failed. Please try again.")
            except requests.RequestException as exc:
                logger.exception("Network error calling Razorpay API: %s", exc)
                raise ValidationError("Failed to connect to payment gateway. Please check your network.")
        else:
            # Sandbox / Simulation mode for development and testing
            gateway_order_id = f"sim_rzp_ord_{uuid.uuid4().hex[:14]}"
            gateway = PaymentGateway.SIMULATION if not rzp_key_id else gateway

        order = CourseOrder.objects.create(
            order_number=order_number,
            user=user,
            course=course,
            amount_inr=amount_inr,
            currency='INR',
            status=OrderStatus.PENDING,
            payment_gateway=gateway,
            gateway_order_id=gateway_order_id,
            billing_name=billing_name or getattr(user, 'get_full_name', lambda: '')() or user.username,
            billing_email=billing_email or getattr(user, 'email', '') or '',
        )
        return order

    @classmethod
    def verify_and_settle_payment(
        cls,
        order_number: str,
        gateway_payment_id: str,
        gateway_signature: str,
        user=None
    ) -> CourseOrder:
        """
        Verifies cryptographic signature from checkout and atomically settles the order,
        granting lifetime CourseEntitlement and initializing active Enrollment.
        """
        try:
            order = CourseOrder.objects.select_related('course', 'user').get(order_number=order_number)
        except CourseOrder.DoesNotExist:
            raise ValidationError("Course order not found.")

        if user and order.user != user and not is_academy_admin(user):
            raise PermissionDenied("You do not have authorization to settle this order.")

        # Idempotent return if order already successfully paid
        if order.status == OrderStatus.PAID:
            return order

        rzp_key_secret = getattr(settings, 'RAZORPAY_KEY_SECRET', '')

        # Live cryptographic verification when Razorpay credentials exist
        if rzp_key_secret and order.payment_gateway == PaymentGateway.RAZORPAY:
            message = f"{order.gateway_order_id}|{gateway_payment_id}".encode('utf-8')
            expected_signature = hmac.new(
                rzp_key_secret.encode('utf-8'),
                message,
                hashlib.sha256
            ).hexdigest()

            if not hmac.compare_digest(expected_signature, gateway_signature):
                order.status = OrderStatus.FAILED
                order.error_message = "HMAC signature verification failed"
                order.save(update_fields=['status', 'error_message', 'updated_at'])
                logger.warning("Order %s failed signature verification", order_number)
                raise ValidationError("Payment signature verification failed. Access not granted.")

        # Atomic Settlement Transaction
        with transaction.atomic():
            order.status = OrderStatus.PAID
            order.gateway_payment_id = gateway_payment_id
            order.gateway_signature = gateway_signature
            order.save(update_fields=['status', 'gateway_payment_id', 'gateway_signature', 'updated_at'])

            # Grant CourseEntitlement
            entitlement, created = CourseEntitlement.objects.get_or_create(
                user=order.user,
                course=order.course,
                defaults={
                    'order': order,
                    'is_active': True,
                }
            )
            if not created and not entitlement.is_active:
                entitlement.is_active = True
                entitlement.order = order
                entitlement.revocation_reason = ''
                entitlement.save(update_fields=['is_active', 'order', 'revocation_reason'])

            # Initialize / Activate runtime Enrollment
            enrollment, e_created = Enrollment.objects.get_or_create(
                user=order.user,
                course=order.course,
                defaults={
                    'status': EnrollmentStatus.ACTIVE,
                    'progress_percent': 0,
                }
            )
            if not e_created and enrollment.status != EnrollmentStatus.ACTIVE:
                enrollment.status = EnrollmentStatus.ACTIVE
                enrollment.save(update_fields=['status'])

            # Pre-populate first lesson if not already set
            if not enrollment.last_accessed_lesson:
                first_mod = order.course.modules.order_by('order').first()
                if first_mod:
                    first_lesson = first_mod.lessons.order_by('order').first()
                    if first_lesson:
                        enrollment.last_accessed_lesson = first_lesson
                        enrollment.save(update_fields=['last_accessed_lesson'])

        logger.info(
            "Order %s settled successfully. Granted entitlement to user %s for course %s",
            order.order_number,
            order.user.username,
            order.course.slug
        )
        return order

    @classmethod
    def handle_razorpay_webhook(cls, raw_body: bytes, signature_header: str) -> bool:
        """
        Processes server-to-server webhook callbacks from Razorpay.
        """
        webhook_secret = getattr(settings, 'RAZORPAY_WEBHOOK_SECRET', '')
        if webhook_secret:
            expected_sign = hmac.new(
                webhook_secret.encode('utf-8'),
                raw_body,
                hashlib.sha256
            ).hexdigest()
            if not hmac.compare_digest(expected_sign, signature_header):
                logger.error("Razorpay webhook signature mismatch.")
                raise ValidationError("Invalid webhook signature.")

        import json
        try:
            payload = json.loads(raw_body.decode('utf-8'))
        except (ValueError, UnicodeDecodeError):
            raise ValidationError("Malformed webhook JSON.")

        event = payload.get('event', '')
        logger.info("Handling Razorpay webhook event: %s", event)

        if event in ('order.paid', 'payment.captured'):
            payment_entity = payload.get('payload', {}).get('payment', {}).get('entity', {})
            gateway_order_id = payment_entity.get('order_id', '')
            gateway_payment_id = payment_entity.get('id', '')

            if gateway_order_id:
                order = CourseOrder.objects.filter(gateway_order_id=gateway_order_id).first()
                if order and order.status != OrderStatus.PAID:
                    cls.verify_and_settle_payment(
                        order_number=order.order_number,
                        gateway_payment_id=gateway_payment_id,
                        gateway_signature='webhook_verified',
                        user=order.user
                    )
                    return True
        return True

    @classmethod
    def grant_scholarship(
        cls,
        course: Course,
        recipient_user,
        admin_user,
        reason: str = ''
    ) -> CourseEntitlement:
        """
        Administrative action: Grants a zero-cost merit scholarship / manual access entitlement
        to a builder for a premium course.
        """
        if not is_academy_admin(admin_user):
            raise PermissionDenied("Only platform administrators can grant course scholarships.")

        order_number = f"ENQ-SCHOLAR-{timezone.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:8].upper()}"

        with transaction.atomic():
            order = CourseOrder.objects.create(
                order_number=order_number,
                user=recipient_user,
                course=course,
                amount_inr=0,
                currency='INR',
                status=OrderStatus.PAID,
                payment_gateway=PaymentGateway.SCHOLARSHIP,
                gateway_order_id=f"grant_{uuid.uuid4().hex[:12]}",
                gateway_payment_id=f"grant_pay_{uuid.uuid4().hex[:12]}",
                billing_name=recipient_user.username,
                billing_email=getattr(recipient_user, 'email', ''),
            )

            entitlement, created = CourseEntitlement.objects.get_or_create(
                user=recipient_user,
                course=course,
                defaults={
                    'order': order,
                    'granted_by': admin_user,
                    'is_active': True,
                    'revocation_reason': reason or 'Admin scholarship grant',
                }
            )
            if not created and not entitlement.is_active:
                entitlement.is_active = True
                entitlement.granted_by = admin_user
                entitlement.revocation_reason = reason or 'Admin scholarship grant'
                entitlement.save(update_fields=['is_active', 'granted_by', 'revocation_reason'])

            enrollment, _ = Enrollment.objects.get_or_create(
                user=recipient_user,
                course=course,
                defaults={
                    'status': EnrollmentStatus.ACTIVE,
                    'progress_percent': 0,
                }
            )
            if enrollment.status != EnrollmentStatus.ACTIVE:
                enrollment.status = EnrollmentStatus.ACTIVE
                enrollment.save(update_fields=['status'])

        logger.info(
            "Scholarship granted for course %s to user %s by admin %s",
            course.slug,
            recipient_user.username,
            admin_user.username
        )
        return entitlement
