# Performance Checklist

This document outlines performance targets and best practices for the digital menu application.

## Video Optimization

### Welcome Video
- **Target File Size**: 2-8 MB maximum (depending on length)
- **Resolution**: 720p (1280x720) for mobile, 1080p optional for desktop
- **Format**: H.264 MP4 (best compatibility)
- **Encoding Settings**:
  - Codec: H.264
  - Bitrate: 2-4 Mbps for 720p
  - Frame rate: 24-30 fps
  - Audio: AAC (or remove if not needed)
- **Duration**: Keep welcome videos short (2-10 seconds, looping)
- **Preload Strategy**: `preload="metadata"` (loads only metadata, not full video)
- **Poster Image**: Use a lightweight placeholder (gradient or first frame thumbnail)

### Testing on iPhone
1. Test on actual iPhone device (Safari)
2. Use Safari Web Inspector (connect iPhone to Mac)
3. Check Network tab for video loading time
4. Verify autoplay works (requires muted + playsInline)
5. Test on slow 3G connection (Safari DevTools > Network throttling)

## Image Optimization

### Upload Guidelines
- **Item Images**: 
  - Recommended size: 800x800px (1:1 aspect ratio)
  - Max file size: 500KB per image
  - Format: WebP (best compression) or JPEG (fallback)
  - Quality: 80-85% for JPEG, 85-90% for WebP

- **Category Images**:
  - Recommended size: 400x400px (1:1 aspect ratio)
  - Max file size: 200KB per image

- **Logo**:
  - Recommended size: 400x200px (2:1 aspect ratio) or square
  - Max file size: 100KB
  - Format: PNG (for transparency) or WebP

- **Welcome Background Image** (if not using video):
  - Recommended size: 1920x1080px
  - Max file size: 500KB
  - Format: WebP or optimized JPEG

### Image Compression Tools
- **Online**: TinyPNG, Squoosh, ImageOptim
- **CLI**: `sharp` (Node.js), `imagemagick`
- **Before Upload**: Always compress images before uploading

### Current Implementation
- Images are stored in PostgreSQL as BYTEA blobs
- Images are served via `/api/media/[id]` endpoint
- All images use lazy loading (except priority images)
- Skeleton loaders show while images load
- Fixed aspect ratios prevent layout shift

## API Caching

### Current Cache Settings
- **Menu API** (`/api/menu`): 
  - Cache: 60 seconds (s-maxage)
  - Stale-while-revalidate: 120 seconds
  
- **Restaurant API** (`/api/restaurant`):
  - Cache: 120 seconds (s-maxage)
  - Stale-while-revalidate: 240 seconds

- **Media API** (`/api/media/[id]`):
  - Cache: 1 year (immutable)
  - Strong caching for static assets

## Performance Targets

### Mobile (iPhone Safari)
- **First Contentful Paint (FCP)**: < 1.5 seconds
- **Largest Contentful Paint (LCP)**: < 2.5 seconds
- **Time to Interactive (TTI)**: < 3.5 seconds
- **Cumulative Layout Shift (CLS)**: < 0.1

### Image Loading
- Above-the-fold images: Load immediately (priority)
- Below-the-fold images: Lazy load (IntersectionObserver)
- First 4 visible item images: Preload if possible

## Testing Checklist

### Before Deployment
1. ✅ Test on actual iPhone device
2. ✅ Test on slow 3G connection (Network throttling)
3. ✅ Verify all images have lazy loading
4. ✅ Check video autoplay works on iOS
5. ✅ Verify skeleton loaders appear during loading
6. ✅ Test menu scrolling performance
7. ✅ Check API response times
8. ✅ Verify caching headers are set correctly

### Tools for Testing
- **Chrome DevTools**: Lighthouse, Network tab, Performance tab
- **Safari Web Inspector**: Network tab, Timeline
- **Online**: WebPageTest, GTmetrix
- **Mobile**: Chrome Remote Debugging, Safari Web Inspector

## Optimization Tips

1. **Reduce Initial Bundle Size**: 
   - Code splitting
   - Tree shaking
   - Dynamic imports for heavy components

2. **Optimize Database Queries**:
   - Add indexes on frequently queried fields
   - Use select statements to fetch only needed fields
   - Consider pagination for large datasets

3. **CDN/Storage Consideration**:
   - Consider moving images to object storage (S3, Supabase Storage)
   - Generate thumbnails at upload time
   - Serve images via CDN for better global performance

4. **Progressive Enhancement**:
   - Show content immediately (text, layout)
   - Load images progressively
   - Use skeleton loaders for perceived performance

## Current Optimizations Implemented

✅ Lazy loading for welcome video (500ms delay)
✅ Video preload="metadata" (not full video)
✅ Poster/placeholder for video (gradient)
✅ Lazy loading for all below-the-fold images
✅ Skeleton loaders for item cards
✅ Fixed aspect ratios (prevents layout shift)
✅ API response caching
✅ Media caching headers (1 year)
✅ IntersectionObserver for image lazy loading
✅ Priority loading for logo and modal images

## Future Improvements

- [ ] Move images to object storage (Supabase Storage or S3)
- [ ] Generate thumbnails at upload time
- [ ] Implement image resizing API endpoint
- [ ] Add WebP/AVIF format support with fallbacks
- [ ] Implement service worker for offline support
- [ ] Add image compression on upload
- [ ] Consider using Next.js Image component with custom loader


