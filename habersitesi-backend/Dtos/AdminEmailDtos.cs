using System.ComponentModel.DataAnnotations;

namespace habersitesi_backend.Dtos
{
    public class AdminEmailDto
    {
        [Required]
        [EmailAddress]
        public string ToEmail { get; set; } = string.Empty;
        
        [Required]
        [StringLength(200, MinimumLength = 5)]
        public string Subject { get; set; } = string.Empty;
        
        [Required]
        [StringLength(5000, MinimumLength = 10)]
        public string Message { get; set; } = string.Empty;
        
        public bool IsHtml { get; set; } = false;
    }    public class BulkEmailDto
    {
        public List<int>? UserIds { get; set; } = new();
        
        [Required]
        [StringLength(200, MinimumLength = 5)]
        public string Subject { get; set; } = string.Empty;
        
        [Required]
        [StringLength(5000, MinimumLength = 10)]
        public string Message { get; set; } = string.Empty;
        
        public bool IsHtml { get; set; } = false;
        public bool SendToAll { get; set; } = false;
        public string? Role { get; set; }
    }public class EmailHistoryDto
    {
        public int Id { get; set; }
        public string ToEmail { get; set; } = string.Empty;
        public string Subject { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public bool IsHtml { get; set; }
        public DateTime SentAt { get; set; }
        public string SentBy { get; set; } = string.Empty;
        public bool IsSuccess { get; set; }
        public string? ErrorMessage { get; set; }
        public string? EmailType { get; set; }
        public string? SentByUsername { get; set; }
    }    public class AdminNewsletterDto
    {
        [Required]
        [StringLength(200, MinimumLength = 5)]
        public string Subject { get; set; } = string.Empty;
        
        [Required]
        [StringLength(10000, MinimumLength = 10)]
        public string Content { get; set; } = string.Empty;
    }

    public class CreateUserDto
    {
        [Required]
        [StringLength(50, MinimumLength = 3)]
        public string Username { get; set; } = string.Empty;

        [Required]
        [EmailAddress]
        public string Email { get; set; } = string.Empty;

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string Password { get; set; } = string.Empty;

        [Required]
        public string Role { get; set; } = "user"; // user, author, admin

        [StringLength(50)]
        public string? FirstName { get; set; }

        [StringLength(50)]
        public string? LastName { get; set; }

        [StringLength(100)]
        public string? DisplayName { get; set; }

        [StringLength(500)]
        public string? Bio { get; set; }
    }
}
