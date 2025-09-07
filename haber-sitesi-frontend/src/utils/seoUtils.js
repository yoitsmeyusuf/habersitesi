// SEO Utils - Sitemap and Robots.txt management
import api from '../services/api'

/**
 * Backend'den dinamik sitemap'i al
 */
export async function fetchSitemapFromBackend() {
  try {
    const sitemapXml = await api.getSitemap()
    return sitemapXml
  } catch (error) {
    console.error('Sitemap fetch error:', error)
    return null
  }
}

/**
 * Backend'den sitemap data'sını al
 */
export async function fetchSitemapData() {
  try {
    const data = await api.getSitemapData()
    return data
  } catch (error) {
    console.error('Sitemap data fetch error:', error)
    return null
  }
}

/**
 * Basit statik sitemap oluştur (fallback)
 */
export function generateBasicSitemap() {
  const baseUrl = 'https://habersitesi.rumbara.online'
  const now = new Date().toISOString().split('T')[0]
  
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>${baseUrl}/haber</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>${baseUrl}/category</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>${baseUrl}/authors</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>
  <url>
    <loc>${baseUrl}/about</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>
  <url>
    <loc>${baseUrl}/contact</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
</urlset>`
}

/**
 * Robots.txt için gerekli bilgileri kontrol et
 */
export function checkSEOConfig() {
  return {
    hasRobotsTxt: true, // Frontend'te var
    hasSitemap: false, // Boş dosya
    backendSitemapAvailable: true, // API endpoint var
    backendSitemapUrl: 'https://api.rumbara.online/sitemap.xml'
  }
}

export default {
  fetchSitemapFromBackend,
  fetchSitemapData,
  generateBasicSitemap,
  checkSEOConfig
}
