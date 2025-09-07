using System.ComponentModel.DataAnnotations;

namespace habersitesi_backend.Dtos
{
    public class UserRegisterDto
    {
        [Required(ErrorMessage = "Kullanıcı adı gereklidir.")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Kullanıcı adı 3-50 karakter arasında olmalıdır.")]
        [RegularExpression(@"^[a-zA-Z0-9_]+$", ErrorMessage = "Kullanıcı adı sadece harf, rakam ve alt çizgi içerebilir.")]
        public string Username { get; set; } = null!;
        
        [Required(ErrorMessage = "E-posta adresi gereklidir.")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
        [StringLength(100, ErrorMessage = "E-posta adresi 100 karakterden uzun olamaz.")]
        public string Email { get; set; } = null!;
        
        [Required(ErrorMessage = "Şifre gereklidir.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Şifre en az 6, en fazla 100 karakter olmalıdır.")]
        public string Password { get; set; } = null!;
    }

    public class UserLoginDto
    {
        [Required(ErrorMessage = "Kullanıcı adı gereklidir.")]
        [StringLength(50, MinimumLength = 3, ErrorMessage = "Kullanıcı adı 3-50 karakter arasında olmalıdır.")]
        public string Username { get; set; } = null!;
        
        [Required(ErrorMessage = "Şifre gereklidir.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Şifre en az 6 karakter olmalıdır.")]
        public string Password { get; set; } = null!;
    }    public class GoogleAuthDto
    {
        [Required(ErrorMessage = "Google credential gereklidir")]
        public string Credential { get; set; } = null!;
        
        /// <summary>
        /// OAuth redirect URI (isteğe bağlı)
        /// </summary>
        public string? RedirectUri { get; set; }
        
        /// <summary>
        /// OAuth state parametresi (CSRF koruması için)
        /// </summary>
        public string? State { get; set; }
        
        /// <summary>
        /// İstemci tarafından gönderilen nonce (isteğe bağlı)
        /// </summary>
        public string? Nonce { get; set; }
    }

    public class GoogleUserInfoDto
    {
        public string Id { get; set; } = null!;
        public string Email { get; set; } = null!;
        public bool EmailVerified { get; set; }
        public string Name { get; set; } = null!;
        public string GivenName { get; set; } = null!;
        public string FamilyName { get; set; } = null!;
        public string Picture { get; set; } = null!;
        public string Locale { get; set; } = null!;
    }

    public class EmailDto
    {
        [Required(ErrorMessage = "E-posta adresi gereklidir.")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
        [StringLength(100, ErrorMessage = "E-posta adresi 100 karakterden uzun olamaz.")]
        public string Email { get; set; } = null!;
    }    public class ResetPasswordDto
    {
        [Required(ErrorMessage = "E-posta adresi gereklidir.")]
        [EmailAddress(ErrorMessage = "Geçerli bir e-posta adresi giriniz.")]
        public string Email { get; set; } = "";
        
        [Required(ErrorMessage = "Token gereklidir.")]
        public string Token { get; set; } = "";
        
        [Required(ErrorMessage = "Yeni şifre gereklidir.")]
        [StringLength(100, MinimumLength = 6, ErrorMessage = "Şifre en az 6, en fazla 100 karakter olmalıdır.")]
        public string NewPassword { get; set; } = "";
    }    public class UpdateProfileDto
    {
        // Email validasyonu sadece email gönderildiğinde ve boş olmadığında çalışır
        public string? Email { get; set; }
        
        [StringLength(500, ErrorMessage = "Bio cannot be longer than 500 characters")]
        public string? Bio { get; set; }
        
        public string? ProfilePicture { get; set; }
        
        [StringLength(50, ErrorMessage = "First name cannot be longer than 50 characters")]
        public string? FirstName { get; set; }

        [StringLength(50, ErrorMessage = "Last name cannot be longer than 50 characters")]
        public string? LastName { get; set; }

        [StringLength(100, ErrorMessage = "Display name cannot be longer than 100 characters")]
        public string? DisplayName { get; set; }
    }

    public class GoogleCallbackDto
    {
        [Required]
        public string Code { get; set; } = null!;
        public string? State { get; set; }
        public string? Error { get; set; }
        public string? ErrorDescription { get; set; }
    }
}
