# 🚀 Production Deployment Guide

## Domain: habersitesi.rumbara.online

### ✅ Completed SEO & Performance Optimizations

1. **Meta Tags & SEO**
   - ✅ Enhanced title tags with keywords
   - ✅ Optimized meta descriptions
   - ✅ Open Graph tags for social sharing
   - ✅ Twitter Card integration
   - ✅ Canonical URLs set
   - ✅ Dynamic sitemap (backend-generated)
   - ✅ Robots.txt configured

2. **Performance**
   - ✅ Cache headers configured
   - ✅ Asset optimization
   - ✅ Bundle splitting
   - ✅ Lazy loading implemented
   - ✅ Image optimization

3. **Security**
   - ✅ HSTS headers
   - ✅ CSP configuration
   - ✅ Security headers

4. **Social Integration**
   - ✅ Social share buttons
   - ✅ Native share API
   - ✅ Analytics tracking

### 🔧 Manual Setup Required

#### 1. Google Analytics Setup
```bash
# Get your GA4 Measurement ID from:
# https://analytics.google.com/analytics/web/

# Replace GA_MEASUREMENT_ID in:
# - index.html (line ~70)
# - env.production file
```

#### 2. Social Media Setup
```bash
# Update Twitter handle in:
# - index.html
# - env.production
# Current: @habersitesi
```

#### 3. Server Configuration
```nginx
# Add to your nginx/apache config:

# HSTS Header
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;

# Cache Headers
location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}

# Gzip Compression
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml application/xml;
```

#### 4. DNS Configuration
```bash
# Add SPF record to prevent email spoofing:
# Type: TXT
# Name: @
# Value: "v=spf1 include:_spf.google.com ~all"

# Add DMARC record:
# Type: TXT  
# Name: _dmarc
# Value: "v=DMARC1; p=quarantine; rua=mailto:admin@habersitesi.rumbara.online"
```

### 🏗️ Build & Deploy Commands

```bash
# Development
npm run dev

# Production Build
npm run deploy:build

# Preview Production Build
npm run deploy:preview

# Analyze Bundle Size
npm run build:analyze

# SEO Validation (when script is created)
npm run seo:validate
```

### 📊 Performance Targets

- **Lighthouse Score**: 90+ (all categories)
- **First Contentful Paint**: < 1.5s
- **Largest Contentful Paint**: < 2.5s
- **Cumulative Layout Shift**: < 0.1
- **Time to Interactive**: < 3.5s

### 🔍 SEO Checklist

- ✅ Keywords in title tags
- ✅ Meta descriptions optimized
- ✅ URL structure clean (hyphens, not underscores)
- ✅ Canonical URLs implemented
- ✅ Social media integration
- ✅ Render-blocking resources minimized
- ✅ Custom 404 page
- ✅ Google Analytics integrated
- ✅ Cache headers configured
- ✅ Favicon properly referenced
- ⏳ Image metadata optimization (ongoing)
- ⏳ SPF record setup (DNS level)
- ⏳ Server signature disable (server level)

### 🎯 Next Steps

1. **Get Google Analytics ID** and replace GA_MEASUREMENT_ID
2. **Update social media handles** with real accounts
3. **Configure server** with proper headers
4. **Set up DNS records** for email security
5. **Verify backend sitemap** at <https://api.rumbara.online/sitemap.xml>
6. **Test performance** with Lighthouse
7. **Submit sitemap** to Google Search Console

### 📝 Important Notes

**Dynamic Sitemap**: The sitemap is generated dynamically by the backend at `https://api.rumbara.online/sitemap.xml`. This includes:

- All categories (dynamically generated)
- All published news articles
- Category pages
- Main site pages

The frontend does NOT contain a static sitemap.xml file as categories and news are dynamic content managed by the backend.

### 📞 Support

For any deployment issues, check:

- Browser developer console for errors
- Network tab for failed requests
- Lighthouse audit for performance issues
