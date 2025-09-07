using System.ComponentModel.DataAnnotations;

namespace habersitesi_backend.Dtos
{
    public class UserDto
    {
        public int Id { get; set; }
        public string Username { get; set; } = null!;
        public string Email { get; set; } = null!;
        public string Role { get; set; } = null!;
        public bool EmailConfirmed { get; set; }
        public bool Approved { get; set; }
        public string? Bio { get; set; }
        public string? ProfilePicture { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? DisplayName { get; set; }
        public string FullDisplayName { get; set; } = null!; // Computed field
    }

    public class UpdateUserRoleDto
    {
        [Required]
        [RegularExpression("^(user|author|admin)$", ErrorMessage = "Role must be user, author, or admin")]
        public string Role { get; set; } = null!;
    }    public class AdminResetPasswordDto
    {
        [Required]
        [MinLength(6, ErrorMessage = "Password must be at least 6 characters")]
        public string NewPassword { get; set; } = null!;
    }

    public class UpdateUserProfileDto
    {
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? DisplayName { get; set; }
        public string? Bio { get; set; }
        public string? Email { get; set; }
    }
}
