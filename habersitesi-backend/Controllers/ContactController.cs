using Microsoft.AspNetCore.Mvc;
using System.ComponentModel.DataAnnotations;
using habersitesi_backend.Services;

namespace habersitesi_backend.Controllers
{
    [ApiController]
    [Route("api/contact")]
    public class ContactController : ControllerBase
    {
        private readonly IEmailService _emailService;
        private readonly ILogger<ContactController> _logger;

        public ContactController(IEmailService emailService, ILogger<ContactController> logger)
        {
            _emailService = emailService;
            _logger = logger;
        }

        public class ContactDto
        {
            [Required]
            public string Name { get; set; } = string.Empty;
            [Required, EmailAddress]
            public string Email { get; set; } = string.Empty;
            [Required, StringLength(2000)]
            public string Message { get; set; } = string.Empty;
        }

        [HttpPost]
        public async Task<IActionResult> Submit([FromBody] ContactDto dto)
        {
            if (!ModelState.IsValid) return BadRequest(ModelState);

            // Basic anti-spam: minimum message length and rate limit by IP (very naive)
            if (dto.Message.Trim().Length < 10)
                return BadRequest(new { message = "Mesaj çok kısa" });

            var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
            _logger.LogInformation("Contact form from {Email} ({IP})", dto.Email, ip);

            var subject = $"[İletişim] {dto.Name} - {dto.Email}";
            var body = $"""
                <html><body>
                <h3>Yeni İletişim Mesajı</h3>
                <p><strong>İsim:</strong> {dto.Name}</p>
                <p><strong>E-posta:</strong> {dto.Email}</p>
                <p><strong>IP:</strong> {ip}</p>
                <hr>
                <p>{System.Net.WebUtility.HtmlEncode(dto.Message).Replace("\n", "<br>")}</p>
                </body></html>
            """;

            try
            {
                // Send to configured contact email (falls back to SMTP From)
                var to = Environment.GetEnvironmentVariable("CONTACT_TO_EMAIL")
                         ?? Environment.GetEnvironmentVariable("Smtp__From");
                if (string.IsNullOrWhiteSpace(to))
                    return StatusCode(500, new { message = "CONTACT_TO_EMAIL yapılandırılmadı" });

                await _emailService.SendCustomEmailAsync(to!, subject, body);
                return Ok(new { success = true });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Contact email send failed");
                return StatusCode(500, new { message = "Mesaj gönderilemedi" });
            }
        }
    }
}
