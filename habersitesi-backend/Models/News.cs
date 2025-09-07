using System.ComponentModel.DataAnnotations;

namespace habersitesi_backend.Models
{
    public class News
    {
        public int Id { get; set; }

        [Required]
        public string Title { get; set; } = null!;

        public string? Summary { get; set; }

        public string? Image { get; set; }

        // Backward compatibility - keep string Category for now
        [Required]
        public string Category { get; set; } = null!;

        // Optional Foreign Key for future migration to Category table
        public int? CategoryId { get; set; }
        
        // Optional Navigation property for future use
        public Category? CategoryRef { get; set; }

        public DateTime Date { get; set; } = DateTime.UtcNow;

        public string? Author { get; set; }

        public string? Content { get; set; }        public bool Featured { get; set; } = false;
        
        // Featured Priority: 1-5 arası (1 en yüksek öncelik, 5 en düşük öncelik)
        // 0 = Featured değil
        public int FeaturedPriority { get; set; } = 0;        public string? Tags { get; set; } // Etiket desteği eklendi

        // View Tracking
        public int ViewCount { get; set; } = 0;
        public DateTime? LastViewedAt { get; set; }

        // Admin onay sistemi
        public bool IsApproved { get; set; } = false; // Admin onayı gerekli
        public int? ApprovedByUserId { get; set; } // Hangi admin onayladı
        public User? ApprovedBy { get; set; } // Navigation property
        public DateTime? ApprovedAt { get; set; } // Ne zaman onaylandı

        public ICollection<Comment>? Comments { get; set; }

        // Not: Content alanında XSS koruması için backend'de sanitize işlemi yapılmalı.
    }
}
