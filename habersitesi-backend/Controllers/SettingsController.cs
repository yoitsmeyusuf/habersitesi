using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using System.Text.Json;
using System.ComponentModel.DataAnnotations;
using habersitesi_backend.Services;

namespace habersitesi_backend.Controllers
{
    [ApiController]
    [Route("api/settings")]
    [Authorize(Roles = "admin")] // Settings are admin-only
    public class SettingsController : ControllerBase
    {
        private static readonly string SettingsFilePath = Path.Combine(Directory.GetCurrentDirectory(), "site-settings.json");
        private readonly IConfiguration _config;
        private readonly ICacheService _cache;

        public SettingsController(IConfiguration config, ICacheService cache)
        {
            _config = config;
            _cache = cache;
        }

        public class SiteSettingsDto
        {
            // Genel
            public string? site_name { get; set; }
            public string? site_description { get; set; }
            public string? site_keywords { get; set; }
            public string? site_logo { get; set; }
            public string? site_favicon { get; set; }

            // İletişim
            [EmailAddress]
            public string? contact_email { get; set; }
            public string? contact_phone { get; set; }
            public string? contact_address { get; set; }

            // Sosyal
            public string? social_facebook { get; set; }
            public string? social_twitter { get; set; }
            public string? social_instagram { get; set; }
            public string? social_youtube { get; set; }

            // Analytics & Reklam
            public string? analytics_code { get; set; }
            public string? ads_header { get; set; }
            public string? ads_sidebar { get; set; }
            public string? ads_footer { get; set; }

            // Gelişmiş
            public bool maintenance_mode { get; set; } = false;
            public bool user_registration { get; set; } = true;
            public bool comment_moderation { get; set; } = true;

            // Yükleme
            [Range(1, 100)]
            public int max_upload_size { get; set; } = 5;
            public string? allowed_file_types { get; set; } = "jpg,jpeg,png,gif,webp";

            // SMTP
            public string? smtp_host { get; set; }
            public string? smtp_port { get; set; }
            public string? smtp_username { get; set; }
            public string? smtp_password { get; set; }
            public string? smtp_encryption { get; set; } = "tls";
        }

        private SiteSettingsDto GetDefaultSettings()
        {
            return new SiteSettingsDto
            {
                site_name = "Haber Sitesi",
                site_description = "Güncel haberler ve analizler",
                site_keywords = "haber, güncel, türkiye",
                site_logo = string.Empty,
                site_favicon = string.Empty,
                contact_email = _config["Smtp:From"] ?? _config["Smtp:Username"] ?? string.Empty,
                contact_phone = string.Empty,
                contact_address = string.Empty,
                social_facebook = string.Empty,
                social_twitter = string.Empty,
                social_instagram = string.Empty,
                social_youtube = string.Empty,
                analytics_code = string.Empty,
                ads_header = string.Empty,
                ads_sidebar = string.Empty,
                ads_footer = string.Empty,
                maintenance_mode = false,
                user_registration = true,
                comment_moderation = true,
                max_upload_size = 5,
                allowed_file_types = "jpg,jpeg,png,gif,webp",
                smtp_host = _config["Smtp:Host"],
                smtp_port = _config["Smtp:Port"],
                smtp_username = _config["Smtp:Username"],
                smtp_password = _config["Smtp:Password"],
                smtp_encryption = "tls"
            };
        }

        private SiteSettingsDto LoadSettings()
        {
            try
            {
                if (System.IO.File.Exists(SettingsFilePath))
                {
                    var json = System.IO.File.ReadAllText(SettingsFilePath);
                    var dto = JsonSerializer.Deserialize<SiteSettingsDto>(json);
                    if (dto != null) return dto;
                }
            }
            catch
            {
                // ignore and return defaults
            }
            return GetDefaultSettings();
        }

        private void SaveSettings(SiteSettingsDto dto)
        {
            try
            {
                var json = JsonSerializer.Serialize(dto, new JsonSerializerOptions { WriteIndented = true });
                System.IO.File.WriteAllText(SettingsFilePath, json);
            }
            catch
            {
                // ignore write failures
            }
        }

        [HttpGet]
        public IActionResult Get()
        {
            var settings = LoadSettings();
            return Ok(settings);
        }

        [HttpPut]
        public IActionResult Update([FromBody] SiteSettingsDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);
            // Basic guards
            dto.max_upload_size = Math.Clamp(dto.max_upload_size, 1, 100);
            SaveSettings(dto);
            return Ok(new { success = true });
        }

        [HttpPost("clear-cache")]
        public async Task<IActionResult> ClearCache()
        {
            await _cache.RemovePatternAsync(string.Empty);
            return Ok(new { success = true, message = "Cache cleared" });
        }

        [HttpPost("reset")]
        public async Task<IActionResult> Reset()
        {
            var defaults = GetDefaultSettings();
            SaveSettings(defaults);
            await _cache.RemovePatternAsync(string.Empty);
            return Ok(new { success = true, data = defaults });
        }

        [HttpGet("export")]
        public IActionResult Export()
        {
            var settings = LoadSettings();
            return Ok(new { data = settings });
        }
    }
}
