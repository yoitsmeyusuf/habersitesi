import { useEffect } from 'react';

const SEOHead = ({ 
  title, 
  description, 
  keywords, 
  author,
  image,
  url,
  type = 'website',
  publishedTime,
  modifiedTime,
  tags = [],
  category,
  noindex = false
}) => {
  useEffect(() => {
    // Set page title
    document.title = title ? `${title} - Haber Sitesi` : 'Haber Sitesi - Türkiye\'nin Güvenilir Haber Kaynağı';

    // Set meta tags
    const setMetaTag = (name, content, property = false) => {
      if (!content) return;
      
      const attribute = property ? 'property' : 'name';
      let meta = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!meta) {
        meta = document.createElement('meta');
        meta.setAttribute(attribute, name);
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };    // Basic meta tags
    setMetaTag('description', description);
    setMetaTag('keywords', keywords);
    setMetaTag('author', author);
    setMetaTag('robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMetaTag('viewport', 'width=device-width, initial-scale=1.0');

    // Open Graph tags
    setMetaTag('og:title', title, true);
    setMetaTag('og:description', description, true);
    setMetaTag('og:type', type, true);
    setMetaTag('og:url', url, true);
    setMetaTag('og:image', image, true);
    setMetaTag('og:site_name', 'Haber Sitesi', true);
    setMetaTag('og:locale', 'tr_TR', true);

    // Twitter Card tags
    setMetaTag('twitter:card', 'summary_large_image');
    setMetaTag('twitter:title', title);
    setMetaTag('twitter:description', description);
    setMetaTag('twitter:image', image);

    // Article specific tags
    if (type === 'article') {
      setMetaTag('article:published_time', publishedTime, true);
      setMetaTag('article:modified_time', modifiedTime, true);
      setMetaTag('article:author', author, true);
      setMetaTag('article:section', category, true);
      
      // Article tags
      tags.forEach(tag => {
        const tagMeta = document.createElement('meta');
        tagMeta.setAttribute('property', 'article:tag');
        tagMeta.setAttribute('content', tag);
        document.head.appendChild(tagMeta);
      });
    }

    // JSON-LD Structured Data
    const structuredData = {
      "@context": "https://schema.org",
      "@type": type === 'article' ? 'NewsArticle' : 'WebSite',
      "name": title,
      "headline": title,
      "description": description,
      "url": url,
      "image": image,
      "publisher": {
        "@type": "Organization",
        "name": "Haber Sitesi",
        "logo": {
          "@type": "ImageObject",
          "url": `${window.location.origin}/icon-512x512.png`
        }
      }
    };

    if (type === 'article') {
      structuredData.author = {
        "@type": "Person",
        "name": author
      };
      structuredData.datePublished = publishedTime;
      structuredData.dateModified = modifiedTime || publishedTime;
      structuredData.articleSection = category;
      structuredData.keywords = tags.join(', ');
    }

    // Remove existing JSON-LD script
    const existingScript = document.querySelector('script[type="application/ld+json"]');
    if (existingScript) {
      existingScript.remove();
    }

    // Add new JSON-LD script
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(structuredData);
    document.head.appendChild(script);

    // Cleanup function
    return () => {
      // Remove article tags on unmount
      const articleTags = document.querySelectorAll('meta[property="article:tag"]');
      articleTags.forEach(tag => tag.remove());
    };
  }, [title, description, keywords, author, image, url, type, publishedTime, modifiedTime, tags, category, noindex]);

  return null; // This component doesn't render anything
};

export default SEOHead;
