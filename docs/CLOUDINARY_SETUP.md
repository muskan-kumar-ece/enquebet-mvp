# 📋 Cloudinary Setup Guide

Follow these steps to enable image uploads in ENQUEbet:

## 1. Create Cloudinary Account

1. Go to https://cloudinary.com
2. Click "Sign Up" (it's free!)
3. Complete registration

## 2. Get Your Cloud Name

1. After logging in, you'll see your **Dashboard**
2. Find your **Cloud Name** at the top (e.g., `dxyz123abc`)
3. Copy this value

## 3. Create Upload Preset

1. Navigate to **Settings** (⚙️ icon in top right)
2. Click **Upload** tab
3. Scroll to **Upload presets** section
4. Click **Add upload preset**
5. Configure:
   - **Preset name**: `enquebet_uploads`
   - **Signing mode**: Select **Unsigned**
   - **Folder**: (optional) `enquebet` for organization
6. Click **Save**

## 4. Configure Frontend

1. Open `frontend/.env.local`
2. Replace placeholder values:

```bash
# Replace these with your actual values
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=dxyz123abc
NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET=enquebet_uploads
```

3. **Restart your dev server**:
```bash
# Stop (Ctrl+C) and restart
npm run dev
```

## 5. Test Upload

1. Navigate to `/create` (Create Post page)
2. Scroll to "Attachment" section
3. Click the upload area
4. Select an image (PNG, JPG, max 5MB)
5. Watch for:
   - ✅ Preview appears
   - ✅ "Image uploaded successfully!" toast
   - ✅ Image persists after page reload

## 6. Verify in Cloudinary

1. Go back to Cloudinary Dashboard
2. Click **Media Library** in sidebar
3. You should see your uploaded image
4. Click on it to see details and URL

---

## Troubleshooting

### Upload Fails with "Upload failed"

**Problem**: Unable to upload to Cloudinary

**Solutions**:
1. **Check Cloud Name**: Ensure `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` matches exactly
2. **Check Preset**: Verify preset name is exactly `enquebet_uploads`
3. **Check Signing Mode**: Must be "Unsigned" in Cloudinary settings
4. **Restart Dev Server**: Changes to `.env.local` require restart

### Upload is Slow

**Cause**: Large image files

**Solution**: Images are limited to 5MB. Compress before uploading if needed.

### CORS Errors

**Cause**: Cloudinary CORS restrictions

**Solution**:
1. Go to Cloudinary Settings → Security
2. Add `http://localhost:3000` to allowed origins
3. For production, add your deployment domain

### Environment Variables Not Loading

**Symptoms**: `undefined` errors in console

**Solutions**:
1. Ensure `.env.local` is in the `frontend/` directory
2. Variables must start with `NEXT_PUBLIC_` to be accessible in browser
3. **Always restart** dev server after changing `.env.local`

---

## Production Setup

When deploying to production:

### Vercel/Netlify

1. Go to project settings
2. Add environment variables:
   - `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`
   - `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET`
3. Redeploy

### Security Best Practices

1. **Create Separate Preset for Production**:
   - Different folder organization
   - Different transformations
   - Naming: `enquebet_uploads_prod`

2. **Enable Upload Restrictions**:
   - Set max file size
   - Limit file types
   - Add rate limiting

3. **Use Signed Uploads** (Advanced):
   - Requires backend signature generation
   - More secure but complex
   - See Cloudinary docs for implementation

---

## Optional: Advanced Features

### Image Transformations

Cloudinary can automatically optimize images:

```tsx
// In your component
const optimizedUrl = imageUrl.replace(
  '/upload/',
  '/upload/w_800,h_600,c_fill,q_auto,f_auto/'
);
```

Parameters:
- `w_800` - Width 800px
- `h_600` - Height 600px
- `c_fill` - Crop to fill
- `q_auto` - Auto quality
- `f_auto` - Auto format (WebP support)

### Folder Organization

Organize uploads by feature:

```tsx
formData.append('folder', 'enquebet/posts');
// or
formData.append('folder', 'enquebet/profiles');
```

---

## Support

- **Cloudinary Docs**: https://cloudinary.com/documentation
- **Support**: https://support.cloudinary.com
- **Community**: https://community.cloudinary.com

---

**That's it! Your image uploads are now powered by Cloudinary! 📸**
