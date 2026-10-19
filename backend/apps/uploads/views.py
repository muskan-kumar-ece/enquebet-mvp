"""
Upload views — server-side image upload via Cloudinary.

Provides a single POST endpoint that accepts an image file, uploads it to
Cloudinary (when configured), and returns the public URL.  Falls back to
local media storage when Cloudinary is not available.
"""

import uuid
import logging

from django.conf import settings
from django.core.files.storage import default_storage
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

logger = logging.getLogger(__name__)

# Maximum upload size: 10 MB
MAX_UPLOAD_BYTES = 10 * 1024 * 1024

ALLOWED_IMAGE_TYPES = {
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
}


def _cloudinary_available() -> bool:
    """Return True when Cloudinary is configured and usable."""
    try:
        import cloudinary
        cfg = cloudinary.config()
        return bool(cfg.cloud_name and cfg.api_key and cfg.api_secret)
    except Exception:
        return False


class ImageUploadView(APIView):
    """Upload an image and return its public URL.

    POST /api/v1/uploads/image/
    Body: multipart/form-data  { file: <image>, folder?: <string> }
    Returns: { url: "https://..." }
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'error': 'No file provided. Send a file in the "file" field.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # --- Validation ---
        content_type = getattr(file_obj, 'content_type', '') or ''
        if content_type not in ALLOWED_IMAGE_TYPES:
            return Response(
                {'error': f'Unsupported image type: {content_type}. Allowed: JPEG, PNG, GIF, WebP.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file_obj.size > MAX_UPLOAD_BYTES:
            max_mb = MAX_UPLOAD_BYTES // (1024 * 1024)
            return Response(
                {'error': f'File too large. Maximum size is {max_mb} MB.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        folder = request.data.get('folder', 'enquebet/uploads')

        # --- Attempt Cloudinary upload ---
        if _cloudinary_available():
            try:
                import cloudinary.uploader

                result = cloudinary.uploader.upload(
                    file_obj,
                    resource_type='image',
                    folder=folder,
                    transformation=[
                        {'quality': 'auto', 'fetch_format': 'auto'},
                    ],
                )
                secure_url = result.get('secure_url')
                if not secure_url:
                    raise ValueError('Cloudinary returned no secure_url')

                return Response({'url': secure_url}, status=status.HTTP_201_CREATED)

            except Exception as exc:
                logger.error('Cloudinary upload failed: %s', exc, exc_info=True)
                return Response(
                    {'error': f'Image upload failed: {exc}'},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

        # --- Fallback: local storage ---
        try:
            ext = ''
            original_name = getattr(file_obj, 'name', '') or ''
            if '.' in original_name:
                ext = '.' + original_name.rsplit('.', 1)[-1].lower()

            filename = f"uploads/{uuid.uuid4().hex}{ext}"
            saved_name = default_storage.save(filename, file_obj)
            url = request.build_absolute_uri(settings.MEDIA_URL + saved_name)
            return Response({'url': url}, status=status.HTTP_201_CREATED)

        except Exception as exc:
            logger.error('Local upload failed: %s', exc, exc_info=True)
            return Response(
                {'error': f'Image upload failed: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# Maximum document upload size: 50 MB
MAX_DOC_UPLOAD_BYTES = 50 * 1024 * 1024

ALLOWED_DOC_EXTENSIONS = {
    '.pdf', '.docx', '.doc', '.txt', '.md', '.pptx', '.ppt', '.zip', '.tar.gz', '.epub'
}


class DocumentUploadView(APIView):
    """Upload technical books, Word/PDF docs, slides, text files, and code archives.

    POST /api/v1/uploads/document/
    Body: multipart/form-data { file: <document> }
    Returns: { url: "...", original_filename: "...", file_size_bytes: ..., file_type: "PDF" }
    """

    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        file_obj = request.FILES.get('file')
        if not file_obj:
            return Response(
                {'error': 'No document file provided. Send a file in the "file" field.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        original_name = getattr(file_obj, 'name', '') or 'document'
        ext = ''
        if '.' in original_name:
            ext = '.' + original_name.rsplit('.', 1)[-1].lower()

        if ext not in ALLOWED_DOC_EXTENSIONS:
            allowed_list = ', '.join(sorted(ALLOWED_DOC_EXTENSIONS))
            return Response(
                {'error': f"Unsupported file extension '{ext}'. Allowed: {allowed_list}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if file_obj.size > MAX_DOC_UPLOAD_BYTES:
            max_mb = MAX_DOC_UPLOAD_BYTES // (1024 * 1024)
            return Response(
                {'error': f"File exceeds maximum limit of {max_mb} MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Map extension to resource file type
        ext_clean = ext.lstrip('.').lower()
        type_mapping = {
            'pdf': 'PDF',
            'docx': 'DOCX',
            'doc': 'DOCX',
            'txt': 'TXT',
            'md': 'MARKDOWN',
            'epub': 'EPUB',
            'pptx': 'PPTX',
            'ppt': 'PPTX',
            'zip': 'ZIP',
            'tar.gz': 'ZIP',
        }
        resource_file_type = type_mapping.get(ext_clean, 'PDF')

        folder = request.data.get('folder', 'enquebet/resources')

        # --- Cloudinary Upload (resource_type='raw') ---
        if _cloudinary_available():
            try:
                import cloudinary.uploader

                result = cloudinary.uploader.upload(
                    file_obj,
                    resource_type='raw',
                    folder=folder,
                    use_filename=True,
                    unique_filename=True,
                )
                secure_url = result.get('secure_url')
                if not secure_url:
                    raise ValueError('Cloudinary returned no secure_url for raw upload')

                return Response({
                    'url': secure_url,
                    'original_filename': original_name,
                    'file_size_bytes': file_obj.size,
                    'file_type': resource_file_type,
                }, status=status.HTTP_201_CREATED)

            except Exception as exc:
                logger.error('Cloudinary document upload failed: %s', exc, exc_info=True)
                # Fall through to local storage if Cloudinary fails

        # --- Local Storage Fallback ---
        try:
            import re
            safe_name = re.sub(r'[^a-zA-Z0-9_\.-]', '_', original_name)
            filename = f"resources/{uuid.uuid4().hex[:12]}_{safe_name}"
            saved_name = default_storage.save(filename, file_obj)
            url = request.build_absolute_uri(settings.MEDIA_URL + saved_name)

            return Response({
                'url': url,
                'original_filename': original_name,
                'file_size_bytes': file_obj.size,
                'file_type': resource_file_type,
            }, status=status.HTTP_201_CREATED)

        except Exception as exc:
            logger.error('Local document upload failed: %s', exc, exc_info=True)
            return Response(
                {'error': f'Document upload failed: {exc}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

