using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System.Text;
using System.Text.RegularExpressions;
using System.Xml;

namespace habersitesi_backend.Controllers
{
    [ApiController]
    public class SitemapController : ControllerBase
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly IMemoryCache _cache;
        private const string SITEMAP_CACHE_KEY = "sitemap_xml_cache";

        public SitemapController(AppDbContext context, IConfiguration configuration, IMemoryCache cache)
        {
            _context = context;
            _configuration = configuration;
            _cache = cache;
        }

        // Ana sitemap endpoint (standart)
        [HttpGet("/sitemap.xml")]
        public async Task<IActionResult> GetSitemap()
        {
            try
            {
                // Cache'den sitemap'i kontrol et
                if (_cache.TryGetValue(SITEMAP_CACHE_KEY, out string? cachedSitemap))
                {
                    return Content(cachedSitemap!, "application/xml", Encoding.UTF8);
                }

                var baseUrl = _configuration["SiteSettings:BaseUrl"] ?? "http://localhost:5173";
                var xmlString = await GenerateSitemapXml(baseUrl);
                
                // Cache'e kaydet (30 dakika)
                _cache.Set(SITEMAP_CACHE_KEY, xmlString, TimeSpan.FromMinutes(30));
                
                return Content(xmlString, "application/xml", Encoding.UTF8);
            }
            catch (Exception ex)
            {
                return StatusCode(500, new { message = "Sitemap oluşturulamadı: " + ex.Message });
            }
        }

        // Eski/alternatif endpoint: Frontend bazı yerlerde /sitemap çağırıyor
        [HttpGet("/sitemap")]
        public Task<IActionResult> GetSitemapAlias()
        {
            return GetSitemap();
        }

        [HttpGet("/sitemap-debug")]
        public async Task<IActionResult> GetSitemapDebug()
        {
            try
            {
                var baseUrl = _configuration["SiteSettings:BaseUrl"] ?? "http://localhost:5173";
                
                var categoriesCount = await _context.Categories.CountAsync();
                var newsCount = await _context.News.CountAsync();
                var featuredNewsCount = await _context.News.CountAsync(n => n.Featured);
                
                return Ok(new
                {
                    message = "Sitemap Debug Info",
                    baseUrl = baseUrl,
                    categories = categoriesCount,
                    totalNews = newsCount,
                    featuredNews = featuredNewsCount,
                    sitemapUrl = $"{Request.Scheme}://{Request.Host}/sitemap.xml",
                    configurationValues = new
                    {
                        siteSettingsBaseUrl = _configuration["SiteSettings:BaseUrl"],
                        environmentBaseUrl = Environment.GetEnvironmentVariable("SiteSettings__BaseUrl")
                    }
                });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = "Debug error: " + ex.Message });
            }
        }

        private async Task<string> GenerateSitemapXml(string baseUrl)
        {
            var sb = new StringBuilder();
            sb.AppendLine("<?xml version=\"1.0\" encoding=\"UTF-8\"?>");
            sb.AppendLine("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");

            // Ana sayfa
            AddUrlToSitemap(sb, baseUrl, DateTime.UtcNow, "daily", "1.0");

            // Kategoriler - name ile URL oluştur
            var categories = await _context.Categories
                .Select(c => new { c.Id, c.Name })
                .ToListAsync();
            
            foreach (var category in categories)
            {
                // Frontend format: /kategori/Politika
                AddUrlToSitemap(sb, $"{baseUrl}/kategori/{Uri.EscapeDataString(category.Name)}", DateTime.UtcNow, "weekly", "0.8");
            }

            // Haberler - slug ile URL oluştur (Frontend format: /haber/slug-id)
            var news = await _context.News
                .OrderByDescending(n => n.Date)
                .Take(1000) // Son 1000 haber
                .Select(n => new { 
                    n.Id, 
                    n.Date, 
                    n.Featured,
                    n.Title // Slug için başlık gerekli
                })
                .ToListAsync();

            foreach (var newsItem in news)
            {
                var priority = newsItem.Featured ? "0.9" : "0.7";
                var daysSincePublished = DateTime.UtcNow.Subtract(newsItem.Date).TotalDays;
                
                // Daha detaylı changefreq logic
                string changeFreq;
                if (daysSincePublished < 1) changeFreq = "hourly";
                else if (daysSincePublished < 7) changeFreq = "daily";
                else if (daysSincePublished < 30) changeFreq = "weekly";
                else changeFreq = "monthly";
                
                // Slug oluştur
                var slug = GenerateSlug(newsItem.Title);
                
                // Frontend format: /haber/slug-id
                AddUrlToSitemap(sb, $"{baseUrl}/haber/{slug}-{newsItem.Id}", newsItem.Date, changeFreq, priority);
            }

            // Statik sayfalar (Yeni frontend rotalarına göre)
            AddUrlToSitemap(sb, $"{baseUrl}/search", DateTime.UtcNow, "weekly", "0.6");
            AddUrlToSitemap(sb, $"{baseUrl}/hakkimizda", DateTime.UtcNow, "monthly", "0.5");
            AddUrlToSitemap(sb, $"{baseUrl}/iletisim", DateTime.UtcNow, "monthly", "0.5");
            AddUrlToSitemap(sb, $"{baseUrl}/sss", DateTime.UtcNow, "monthly", "0.4");
            AddUrlToSitemap(sb, $"{baseUrl}/yazarlar", DateTime.UtcNow, "weekly", "0.5");

            sb.AppendLine("</urlset>");
            return sb.ToString();
        }

        private static void AddUrlToSitemap(StringBuilder sb, string url, DateTime lastModified, string changeFreq, string priority)
        {
            sb.AppendLine("  <url>");
            sb.AppendLine($"    <loc>{url}</loc>");
            sb.AppendLine($"    <lastmod>{lastModified:yyyy-MM-dd}</lastmod>");
            sb.AppendLine($"    <changefreq>{changeFreq}</changefreq>");
            sb.AppendLine($"    <priority>{priority}</priority>");
            sb.AppendLine("  </url>");
        }

        // Cache temizleme method'u - diğer controller'lardan çağrılabilir
        [HttpPost("/sitemap/invalidate-cache")]
        public IActionResult InvalidateSitemapCache()
        {
            _cache.Remove(SITEMAP_CACHE_KEY);
            return Ok(new { message = "Sitemap cache temizlendi." });
        }

        // Helper method to generate SEO-friendly slug from title (NewsController'dan kopyalandı)
        private static string GenerateSlug(string title)
        {
            if (string.IsNullOrWhiteSpace(title))
                return "haber";

            // Convert to lowercase and replace Turkish characters
            var slug = title.ToLowerInvariant()
                .Replace('ç', 'c')
                .Replace('ğ', 'g')
                .Replace('ı', 'i')
                .Replace('ö', 'o')
                .Replace('ş', 's')
                .Replace('ü', 'u')
                .Replace('Ç', 'c')
                .Replace('Ğ', 'g')
                .Replace('I', 'i')
                .Replace('İ', 'i')
                .Replace('Ö', 'o')
                .Replace('Ş', 's')
                .Replace('Ü', 'u');

            // Remove or replace non-alphanumeric characters
            slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
            
            // Replace spaces with hyphens
            slug = Regex.Replace(slug, @"\s+", "-");
            
            // Remove multiple consecutive hyphens
            slug = Regex.Replace(slug, @"-+", "-");
            
            // Trim hyphens from start and end
            slug = slug.Trim('-');
            
            // Limit length
            if (slug.Length > 50)
                slug = slug.Substring(0, 50).TrimEnd('-');
                
            return string.IsNullOrEmpty(slug) ? "haber" : slug;
        }
    }
}
