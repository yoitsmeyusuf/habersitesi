using System.ComponentModel.DataAnnotations;
using habersitesi_backend.Models;

namespace habersitesi_backend.Models
{
    public class PushSubscription
    {
        public int Id { get; set; }
        public string UserId { get; set; } = string.Empty;
        public string Endpoint { get; set; } = string.Empty;
        public string P256dh { get; set; } = string.Empty;
        public string Auth { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public bool IsActive { get; set; } = true;
    }

    public class PushNotification
    {
        public int Id { get; set; }
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? Icon { get; set; }
        public string? Url { get; set; }
        public string? Tag { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? SentAt { get; set; }
        public bool IsSent { get; set; } = false;
        public int? NewsId { get; set; }
        public News? News { get; set; }
    }
}
