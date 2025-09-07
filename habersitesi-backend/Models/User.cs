using System.ComponentModel.DataAnnotations;

namespace habersitesi_backend.Models
{
    public class User
    {
        public int Id { get; set; }

        [Required]
        public string Username { get; set; } = null!;

        [Required]
        public string Email { get; set; } = null!;

        [Required]
        public string PasswordHash { get; set; } = null!;

        [Required]
        public string Role { get; set; } = "user";

        public bool EmailConfirmed { get; set; } = false;

        public string? EmailConfirmationToken { get; set; }

        public bool Approved { get; set; } = true; // Admin onaylı kullanıcılar için

        // Password reset
        public string? PasswordResetToken { get; set; }
        public DateTime? PasswordResetTokenExpires { get; set; }        // Profile
        public string? ProfilePicture { get; set; }
        public string? Bio { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? DisplayName { get; set; } // Kullanıcının gösterilmek istediği isim

        // Display name helper - eğer DisplayName yoksa FirstName + LastName döner
        public string GetDisplayName()
        {
            if (!string.IsNullOrWhiteSpace(DisplayName))
                return DisplayName;
            
            if (!string.IsNullOrWhiteSpace(FirstName) || !string.IsNullOrWhiteSpace(LastName))
                return $"{FirstName?.Trim()} {LastName?.Trim()}".Trim();
            
            return Username; // Son çare olarak username döner
        }

        // Google OAuth
        public string? GoogleId { get; set; }
        public bool IsGoogleAccount { get; set; } = false;
        public DateTime? LastGoogleLogin { get; set; }
        
        // Timestamps
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime? LastLogin { get; set; }
    }
}
