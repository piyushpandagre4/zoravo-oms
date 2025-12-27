# Google Search Console Setup Guide

This guide will help you complete the setup for Google Search Console integration.

## ✅ What's Already Done

The following files have been created and configured:

1. **`public/robots.txt`** - Search engine crawler directives
2. **`app/sitemap.ts`** - Dynamic sitemap generation
3. **`app/layout.tsx`** - Enhanced metadata with Open Graph, Twitter Cards, and structured data
4. **`public/manifest.json`** - PWA manifest file
5. **`public/site.webmanifest`** - Web manifest for mobile devices

## 📋 Required Actions

### 1. Set Environment Variable (Optional but Recommended)

The domain is already set to `https://zoravo.in` as the default. However, for flexibility across environments, you can set:

**In Vercel Dashboard:**
- Go to Settings → Environment Variables
- Add: `NEXT_PUBLIC_SITE_URL` = `https://zoravo.in`
- Apply to: Production, Preview, Development

**Or in `.env.local` for local testing:**
```
NEXT_PUBLIC_SITE_URL=https://zoravo.in
```

**Note:** If you don't set the environment variable, the code will automatically use `https://zoravo.in` as the default.

### 2. robots.txt

✅ Already configured with your domain: `https://zoravo.in`

### 3. Add Favicon Files

You mentioned you have a favicon file ready. You need to create the following sizes and place them in the `public/` folder:

- ✅ `favicon.ico` (already exists - keep it)
- ⚠️ `favicon-16x16.png` (16x16 pixels)
- ⚠️ `favicon-32x32.png` (32x32 pixels)
- ⚠️ `apple-touch-icon.png` (180x180 pixels)
- ⚠️ `android-chrome-192x192.png` (192x192 pixels)
- ⚠️ `android-chrome-512x512.png` (512x512 pixels)

**Tip:** You can use online tools like [Favicon Generator](https://realfavicongenerator.net/) to generate all sizes from a single image.

### 4. Add Open Graph Image

Create an Open Graph image for social media sharing:
- ⚠️ `public/og-image.png` (1200x630 pixels recommended)
- This image will appear when your site is shared on Facebook, Twitter, LinkedIn, etc.

### 5. Add Logo Image (Optional but Recommended)

- ⚠️ `public/logo.png` (for structured data)
- Recommended size: 512x512 pixels or larger

### 6. Update Social Media Links (Optional)

If you have social media accounts, edit `app/layout.tsx` and uncomment/add links in the `organizationSchema`:
```typescript
"sameAs": [
  "https://www.facebook.com/zoravo",
  "https://www.twitter.com/zoravo",
  "https://www.linkedin.com/company/zoravo"
]
```

Also update the Twitter creator handle if you have one:
```typescript
creator: "@your-actual-twitter-handle",
```

### 7. Google Search Console Setup

1. **Go to Google Search Console**: https://search.google.com/search-console

2. **Add Property**:
   - Click "Add Property"
   - Enter your domain: `https://zoravo.in`
   - Choose verification method:
     - **HTML file upload** (recommended): Download the verification file and place it in `public/` folder
     - **HTML tag**: Add the meta tag to `app/layout.tsx` in the metadata object

3. **Submit Sitemap**:
   - Once verified, go to "Sitemaps" in the left menu
   - Enter: `sitemap.xml`
   - Click "Submit"

4. **Request Indexing** (Optional):
   - Go to "URL Inspection"
   - Enter your homepage URL
   - Click "Request Indexing"

## 🧪 Testing & Validation

### Test Your Setup

1. **robots.txt**: Visit `https://zoravo.in/robots.txt`
2. **sitemap.xml**: Visit `https://zoravo.in/sitemap.xml`
3. **manifest.json**: Visit `https://zoravo.in/manifest.json`

### Validate Metadata

1. **Open Graph**: Use [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/)
2. **Twitter Cards**: Use [Twitter Card Validator](https://cards-dev.twitter.com/validator)
3. **Structured Data**: Use [Google Rich Results Test](https://search.google.com/test/rich-results)
4. **Mobile-Friendly**: Use [Google Mobile-Friendly Test](https://search.google.com/test/mobile-friendly)

### Check Page Source

View page source of your homepage and verify:
- ✅ Meta tags are present
- ✅ Open Graph tags are present
- ✅ Twitter Card tags are present
- ✅ Structured data (JSON-LD) is present
- ✅ Favicon links are correct

## 📊 Monitoring

After setup, monitor in Google Search Console:
- **Coverage**: Check which pages are indexed
- **Performance**: See search queries and click-through rates
- **Core Web Vitals**: Monitor page speed and user experience
- **Mobile Usability**: Ensure mobile-friendly status

## 🔍 Additional SEO Tips

1. **Content**: Ensure your landing page has quality, keyword-rich content
2. **Internal Linking**: Link between related pages
3. **Page Speed**: Optimize images and minimize JavaScript
4. **HTTPS**: Ensure your site uses HTTPS (Vercel provides this automatically)
5. **Regular Updates**: Keep content fresh and update sitemap regularly

## ❓ Troubleshooting

### Sitemap not found?
- Ensure `NEXT_PUBLIC_SITE_URL` is set correctly
- Check that `app/sitemap.ts` exists and exports correctly
- Verify the file is accessible at `/sitemap.xml`

### Favicons not showing?
- Check file names match exactly (case-sensitive)
- Verify files are in `public/` folder
- Clear browser cache

### Structured data errors?
- Use Google Rich Results Test to identify issues
- Check JSON-LD syntax is valid
- Ensure all required fields are present

## 📝 Notes

- The sitemap is generated dynamically, so it will always reflect current routes
- Protected routes (dashboard, admin, etc.) are excluded from sitemap
- The robots.txt disallows crawling of private routes
- All metadata uses environment variable for domain, making it easy to switch between environments

---

**Need Help?** If you encounter any issues, check the Google Search Console Help Center or review the Next.js documentation for metadata and SEO.

