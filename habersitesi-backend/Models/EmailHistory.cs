using System.ComponentModel.DataAnnotations;

namespace habersitesi_backend.Models
{
    public class EmailHistory
    {
        public int Id { get; set; }
        
        [Required]
        public string ToEmail { get; set; } = string.Empty;
        
        [Required]
        public string Subject { get; set; } = string.Empty;
        
        [Required]
        public string Message { get; set; } = string.Empty;
        
        public bool IsHtml { get; set; } = false;
        
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
          [Required]
        public int SentBy { get; set; } // Admin user ID
        
        // Navigation property
        public User? SentByUser { get; set; }
        
        public bool IsSuccess { get; set; }
        
        public string? ErrorMessage { get; set; }
        
        public string? EmailType { get; set; } // "individual", "bulk", "newsletter"
    }
}
