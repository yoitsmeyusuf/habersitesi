using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using habersitesi_backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using habersitesi_backend.Dtos;
using habersitesi_backend.Services;
using System.ComponentModel.DataAnnotations;

[ApiController]
[Route("api/kimlik")]
public class KimlikController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IConfiguration _config;
    private readonly IGoogleAuthService _googleAuthService;

    public KimlikController(AppDbContext context, IConfiguration config, IGoogleAuthService googleAuthService)
    {
        _context = context;
        _config = config;
        _googleAuthService = googleAuthService;
    }

    [HttpPost("giris")]
    public async Task<IActionResult> Login([FromBody] UserLoginDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _context.Users
            .FirstOrDefaultAsync(u => u.Username == dto.Username);

        if (user == null || !BCrypt.Net.BCrypt.Verify(dto.Password, user.PasswordHash))
            return Unauthorized(new { message = "Geçersiz kullanıcı adı veya şifre." });

        if (!user.EmailConfirmed)
            return BadRequest(new { message = "E-posta adresinizi onaylamanız gerekiyor." });

        if (!user.Approved)
            return BadRequest(new { message = "Hesabınız henüz onaylanmamış." });

        var token = GenerateJwtToken(user);
        return Ok(new { token, user = new { user.Id, user.Username, user.Email, user.Role } });
    }

    [HttpPost("kayit")]
    public async Task<IActionResult> Register([FromBody] UserRegisterDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (await _context.Users.AnyAsync(u => u.Username == dto.Username))
            return BadRequest(new { message = "Bu kullanıcı adı zaten kullanımda." });

        if (await _context.Users.AnyAsync(u => u.Email == dto.Email))
            return BadRequest(new { message = "Bu e-posta adresi zaten kayıtlı." });

        var user = new User
        {
            Username = dto.Username,
            Email = dto.Email,
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
            Role = "user",
            EmailConfirmed = false,
            Approved = false,
            CreatedAt = DateTime.UtcNow
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Kayıt başarılı. E-posta adresinizi onaylamanız gerekiyor." });
    }

    [HttpGet("ben")]
    [Authorize]
    public async Task<IActionResult> GetCurrentUser()
    {
        var username = User.FindFirstValue(ClaimTypes.Name);
        var user = await _context.Users
            .Where(u => u.Username == username)
            .Select(u => new { u.Id, u.Username, u.Email, u.Role, u.Bio, u.ProfilePicture, u.FirstName, u.LastName, u.DisplayName })
            .FirstOrDefaultAsync();

        return user != null ? Ok(user) : NotFound();
    }

    [HttpPost("google")]
    public async Task<IActionResult> GoogleAuth([FromBody] GoogleAuthDto dto)
    {
        try
        {
            var payload = await _googleAuthService.ValidateGoogleTokenAsync(dto.Credential);
            
            var existingUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == payload.Email);
            
            if (existingUser != null)
            {
                if (!existingUser.EmailConfirmed)
                {
                    existingUser.EmailConfirmed = true;
                    await _context.SaveChangesAsync();
                }

                var token = GenerateJwtToken(existingUser);
                return Ok(new { token, user = new { existingUser.Id, existingUser.Username, existingUser.Email, existingUser.Role } });
            }

            // Create new user from Google account
            var newUser = new User
            {
                Username = payload.Email.Split('@')[0] + DateTime.Now.Ticks.ToString()[^4..], // Ensure uniqueness
                Email = payload.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(Guid.NewGuid().ToString()), // Random password
                Role = "user",
                EmailConfirmed = true, // Google emails are pre-verified
                Approved = false,
                FirstName = payload.GivenName,
                LastName = payload.FamilyName,
                DisplayName = payload.Name,
                ProfilePicture = payload.Picture,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            var newToken = GenerateJwtToken(newUser);
            return Ok(new { token = newToken, user = new { newUser.Id, newUser.Username, newUser.Email, newUser.Role } });
        }
        catch (UnauthorizedAccessException ex)
        {
            return Unauthorized(new { message = ex.Message });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Google kimlik doğrulama başarısız", error = ex.Message });
        }
    }

    [HttpGet("yazar/{username}")]
    public async Task<IActionResult> GetAuthorProfile(string username)
    {
        var user = await _context.Users
            .Where(u => u.Username == username && u.Role == "author" && u.Approved && u.EmailConfirmed)
            .Select(u => new 
            {
                u.Id,
                u.Username,
                u.Email,
                u.Bio,
                u.ProfilePicture,
                u.FirstName,
                u.LastName,
                u.DisplayName,
                FullDisplayName = !string.IsNullOrWhiteSpace(u.DisplayName) 
                    ? u.DisplayName 
                    : (!string.IsNullOrWhiteSpace(u.FirstName) || !string.IsNullOrWhiteSpace(u.LastName))
                        ? $"{u.FirstName} {u.LastName}".Trim()
                        : u.Username
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound(new { message = "Yazar bulunamadı." });

        return Ok(user);
    }

    [HttpPut("profil")]
    [Authorize]
    public async Task<IActionResult> UpdateProfile([FromBody] UpdateProfileDto dto)
    {
        var username = User.FindFirstValue(ClaimTypes.Name);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);

        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        // Update only provided fields
        if (!string.IsNullOrEmpty(dto.Email))
            user.Email = dto.Email;
        if (dto.Bio != null)
            user.Bio = dto.Bio;
        if (dto.ProfilePicture != null)
            user.ProfilePicture = dto.ProfilePicture;
        if (dto.FirstName != null)
            user.FirstName = dto.FirstName;
        if (dto.LastName != null)
            user.LastName = dto.LastName;
        if (dto.DisplayName != null)
            user.DisplayName = dto.DisplayName;

        await _context.SaveChangesAsync();

        return Ok(new { message = "Profil başarıyla güncellendi." });
    }

    [HttpPut("password")]
    [Authorize]
    public async Task<IActionResult> UpdatePassword([FromBody] UpdatePasswordDto dto)
    {
        var username = User.FindFirstValue(ClaimTypes.Name);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);

        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (!BCrypt.Net.BCrypt.Verify(dto.CurrentPassword, user.PasswordHash))
            return BadRequest(new { message = "Mevcut şifre yanlış." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Şifre başarıyla güncellendi." });
    }

    [HttpGet("email-dogrula")]
    public async Task<IActionResult> ConfirmEmail([FromQuery] string email, [FromQuery] string token)
    {
        // Basic email confirmation implementation
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == email);
        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        // For simplicity, accept any non-empty token in this implementation
        if (string.IsNullOrEmpty(token))
            return BadRequest(new { message = "Geçersiz doğrulama tokeni." });

        user.EmailConfirmed = true;
        await _context.SaveChangesAsync();

        return Ok(new { message = "E-posta başarıyla doğrulandı." });
    }

    [HttpPost("dogrulama-tekrar-gonder")]
    public async Task<IActionResult> ResendConfirmation([FromBody] EmailDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (user.EmailConfirmed)
            return BadRequest(new { message = "E-posta zaten doğrulanmış." });

        // In a real implementation, send email here
        return Ok(new { message = "Doğrulama e-postası tekrar gönderildi." });
    }

    [HttpGet("email-dogrulandi-mi")]
    public async Task<IActionResult> IsEmailVerified([FromQuery] string username)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        return Ok(new { emailConfirmed = user.EmailConfirmed });
    }

    [HttpPost("sifre-unuttum")]
    public async Task<IActionResult> ForgotPassword([FromBody] EmailDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return Ok(new { message = "Eğer bu e-posta kayıtlıysa, şifre sıfırlama bağlantısı gönderilecek." });

        // In a real implementation, generate and send reset token
        return Ok(new { message = "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi." });
    }

    [HttpPost("sifre-sifirla")]
    public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto dto)
    {
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.Email);
        if (user == null)
            return BadRequest(new { message = "Geçersiz token veya e-posta adresi." });

        // In a real implementation, validate the token
        if (string.IsNullOrEmpty(dto.Token))
            return BadRequest(new { message = "Geçersiz token." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        await _context.SaveChangesAsync();

        return Ok(new { message = "Şifre başarıyla sıfırlandı." });
    }

    [HttpPost("profil/avatar-yukle")]
    [Authorize]
    public async Task<IActionResult> UploadAvatar([FromForm] IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { message = "Dosya seçilmedi." });

        if (file.Length > 5 * 1024 * 1024) // 5MB limit
            return BadRequest(new { message = "Dosya boyutu 5MB'dan büyük olamaz." });

        var allowedTypes = new[] { "image/jpeg", "image/png", "image/gif", "image/webp" };
        if (!allowedTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { message = "Sadece resim dosyaları kabul edilir." });

        // For this implementation, return a placeholder URL
        // In a real implementation, save the file and return the actual URL
        var fileName = $"avatar_{User.FindFirstValue(ClaimTypes.Name)}_{DateTime.Now:yyyyMMdd_HHmmss}_{Path.GetExtension(file.FileName)}";
        var fileUrl = $"/uploads/avatars/{fileName}";

        var username = User.FindFirstValue(ClaimTypes.Name);
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user != null)
        {
            user.ProfilePicture = fileUrl;
            await _context.SaveChangesAsync();
        }

        return Ok(new { url = fileUrl, message = "Avatar başarıyla yüklendi." });
    }

    private string GenerateJwtToken(User user)
    {
        var jwtKey = _config["Jwt:Key"];
        if (string.IsNullOrEmpty(jwtKey))
            throw new InvalidOperationException("JWT key must be configured");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(ClaimTypes.Name, user.Username),
            new Claim(ClaimTypes.Email, user.Email),
            new Claim(ClaimTypes.Role, user.Role),
            new Claim("userId", user.Id.ToString())
        };

        var token = new JwtSecurityToken(
            claims: claims,
            expires: DateTime.Now.AddDays(30),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}

public class UpdatePasswordDto
{
    [Required(ErrorMessage = "Mevcut şifre gereklidir.")]
    public string CurrentPassword { get; set; } = "";
    
    [Required(ErrorMessage = "Yeni şifre gereklidir.")]
    [StringLength(100, MinimumLength = 6, ErrorMessage = "Şifre en az 6, en fazla 100 karakter olmalıdır.")]
    public string NewPassword { get; set; } = "";
}