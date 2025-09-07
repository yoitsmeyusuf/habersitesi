using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using habersitesi_backend.Services;
using System.Security.Claims;

namespace habersitesi_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PushNotificationController : ControllerBase
    {
        private readonly IPushNotificationService _pushNotificationService;

        public PushNotificationController(IPushNotificationService pushNotificationService)
        {
            _pushNotificationService = pushNotificationService;
        }

        [HttpPost("subscribe")]
        [Authorize (Roles = "user,admin,author")]
        public async Task<IActionResult> Subscribe([FromBody] PushSubscriptionDto subscription)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Kullanıcı bulunamadı" });

            var result = await _pushNotificationService.SubscribeUserAsync(userId, subscription);
            if (result)
                return Ok(new { message = "Bildirimler aktif edildi" });
            
            return BadRequest(new { message = "Bildirim aboneliği başarısız" });
        }

        [HttpPost("unsubscribe")]
        [Authorize]
        public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeDto unsubscribeData)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized(new { message = "Kullanıcı bulunamadı" });

            var result = await _pushNotificationService.UnsubscribeUserAsync(userId, unsubscribeData.Endpoint);
            if (result)
                return Ok(new { message = "Bildirimler kapatıldı" });
            
            return BadRequest(new { message = "Bildirim aboneliği iptal edilemedi" });
        }

        [HttpPost("send")]
        [Authorize(Roles = "admin,author")]
        public async Task<IActionResult> SendNotification([FromBody] SendNotificationDto notification)
        {
            var result = await _pushNotificationService.SendNotificationAsync(
                notification.Title,
                notification.Body,
                notification.Url,
                notification.Icon,
                notification.NewsId
            );

            if (result)
                return Ok(new { message = "Bildirim gönderildi" });
            
            return BadRequest(new { message = "Bildirim gönderilemedi" });
        }

        [HttpPost("send-to-user")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> SendNotificationToUser([FromBody] SendUserNotificationDto notification)
        {
            var result = await _pushNotificationService.SendNotificationToUserAsync(
                notification.UserId,
                notification.Title,
                notification.Body,
                notification.Url,
                notification.Icon
            );

            if (result)
                return Ok(new { message = "Kullanıcıya bildirim gönderildi" });
            
            return BadRequest(new { message = "Kullanıcı bildirimi gönderilemedi" });
        }

        [HttpGet("history")]
        [Authorize(Roles = "admin,author")]
        public async Task<IActionResult> GetNotificationHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
        {
            var notifications = await _pushNotificationService.GetNotificationHistoryAsync(page, pageSize);
            return Ok(new { notifications, page, pageSize });
        }

        [HttpGet("vapid-public-key")]
        public IActionResult GetVapidPublicKey()
        {
            var publicKey = HttpContext.RequestServices.GetRequiredService<IConfiguration>()["WebPush:PublicKey"] 
                           ?? "BGIo8i1IPwDy0mZZyMfW4J_Bv4dOYElKUgkpF2QU2cRm5pIZU7YNxHc8xQo3kHT8vYoGUZKnJg8lZ2l1K3nP7iQ";
            
            return Ok(new { publicKey });
        }

        [HttpPost("test")]
        [Authorize(Roles = "admin")]
        public async Task<IActionResult> SendTestNotification()
        {
            var result = await _pushNotificationService.SendNotificationAsync(
                "Test Bildirimi",
                "Bu bir test bildirimidir. Sistem çalışıyor!",
                "/",
                "/icon-192x192.png"
            );

            if (result)
                return Ok(new { message = "Test bildirimi gönderildi" });
            
            return BadRequest(new { message = "Test bildirimi gönderilemedi" });
        }
    }

    // Additional DTOs
    public class UnsubscribeDto
    {
        public string Endpoint { get; set; } = string.Empty;
    }

    public class SendUserNotificationDto
    {
        public string UserId { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? Url { get; set; }
        public string? Icon { get; set; }
    }
}
