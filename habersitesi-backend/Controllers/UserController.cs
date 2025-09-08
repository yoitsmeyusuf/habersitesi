using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Antiforgery;
using habersitesi_backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using habersitesi_backend.Dtos;

[ApiController]
[Route("api/users")]
[Authorize(Roles = "admin")]
public class UserController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IAntiforgery _antiforgery;

    public UserController(AppDbContext context, IAntiforgery antiforgery)
    {
        _context = context;
        _antiforgery = antiforgery;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<UserDto>>> GetUsers([FromQuery] string? role = null, [FromQuery] bool? emailConfirmed = null)
    {
        var query = _context.Users.AsQueryable();

        if (!string.IsNullOrEmpty(role))
            query = query.Where(u => u.Role == role);

        if (emailConfirmed.HasValue)
            query = query.Where(u => u.EmailConfirmed == emailConfirmed.Value);        var users = await query
            .OrderBy(u => u.Username)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role,
                EmailConfirmed = u.EmailConfirmed,
                Approved = u.Approved,
                Bio = u.Bio,
                ProfilePicture = u.ProfilePicture,
                FirstName = u.FirstName,
                LastName = u.LastName,
                DisplayName = u.DisplayName,
                FullDisplayName = !string.IsNullOrWhiteSpace(u.DisplayName) 
                    ? u.DisplayName 
                    : (!string.IsNullOrWhiteSpace(u.FirstName) || !string.IsNullOrWhiteSpace(u.LastName))
                        ? $"{u.FirstName} {u.LastName}".Trim()
                        : u.Username
            })
            .ToListAsync();

        return Ok(users);
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<UserDto>> GetUser(int id)
    {        var user = await _context.Users
            .Where(u => u.Id == id)
            .Select(u => new UserDto
            {
                Id = u.Id,
                Username = u.Username,
                Email = u.Email,
                Role = u.Role,
                EmailConfirmed = u.EmailConfirmed,
                Approved = u.Approved,
                Bio = u.Bio,
                ProfilePicture = u.ProfilePicture,
                FirstName = u.FirstName,
                LastName = u.LastName,
                DisplayName = u.DisplayName,
                FullDisplayName = !string.IsNullOrWhiteSpace(u.DisplayName) 
                    ? u.DisplayName 
                    : (!string.IsNullOrWhiteSpace(u.FirstName) || !string.IsNullOrWhiteSpace(u.LastName))
                        ? $"{u.FirstName} {u.LastName}".Trim()
                        : u.Username
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        return Ok(user);
    }    
    [HttpPut("{id}/role")]
    public async Task<IActionResult> UpdateUserRole(int id, [FromBody] UpdateUserRoleDto dto)
    {
        // Validate CSRF token
        await _antiforgery.ValidateRequestAsync(HttpContext);
        
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Current user bilgilerini al
        var currentUserRole = User.FindFirstValue(ClaimTypes.Role);
        var currentUserName = User.FindFirstValue(ClaimTypes.Name);

        // Sadece admin'ler rol değiştirebilir
        if (currentUserRole != "admin")
            return Forbid("Bu işlem için admin yetkisi gereklidir.");

        // IDOR Protection: Enhanced authorization checks
        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == currentUserName);
        if (currentUser == null)
            return Unauthorized();

        var targetUser = await _context.Users.FindAsync(id);
        if (targetUser == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        // Prevent privilege escalation attacks  
        if (targetUser.Role == "admin" && currentUser.Role != "admin")
            return Forbid("Yetersiz yetki.");

        if (dto.Role == "admin" && currentUser.Role != "admin") 
            return Forbid("Sadece admin kullanıcıları admin yetkisi verebilir.");

        // Admin kendi rolünü değiştiremez
        if (targetUser.Username == currentUserName)
            return BadRequest(new { message = "Kendi rolünüzü değiştiremezsiniz." });

        // Admin sayısı kontrolü - son admin'i user yapma
        if (targetUser.Role == "admin" && dto.Role != "admin")
        {
            var adminCount = await _context.Users.CountAsync(u => u.Role == "admin");
            if (adminCount <= 1)
                return BadRequest(new { message = "Sistemde en az bir admin bulunması gereklidir." });
        }

        // Use execution strategy for atomic role update
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                targetUser.Role = dto.Role;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                return Ok(new { 
                    success = true, 
                    message = $"Kullanıcı rolü '{dto.Role}' olarak güncellendi.",
                    username = targetUser.Username,
                    newRole = targetUser.Role
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Rol güncellenirken bir hata oluştu", error = ex.Message });
            }
        });
    }

    [HttpPut("{id}/approve")]
    public async Task<IActionResult> ApproveUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (user.Approved)
            return BadRequest(new { message = "Kullanıcı zaten onaylanmış." });

        user.Approved = true;
        await _context.SaveChangesAsync();

        return Ok(new { 
            success = true, 
            message = "Kullanıcı başarıyla onaylandı.",
            username = user.Username
        });
    }

    [HttpPut("{id}/reject")]
    public async Task<IActionResult> RejectUser(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (!user.Approved)
            return BadRequest(new { message = "Kullanıcı zaten onaylanmamış." });

        var currentUser = User.FindFirstValue(ClaimTypes.Name);
        if (user.Username == currentUser)
            return BadRequest(new { message = "Kendi onayınızı geri alamazsınız." });

        user.Approved = false;
        await _context.SaveChangesAsync();

        return Ok(new { 
            success = true, 
            message = "Kullanıcı onayı geri alındı.",
            username = user.Username
        });
    }

    [HttpDelete("{username}")]
    public async Task<IActionResult> DeleteUser(string username)
    {
        // Validate CSRF token
        await _antiforgery.ValidateRequestAsync(HttpContext);
        
        var user = await _context.Users.FirstOrDefaultAsync(u => u.Username == username);
        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        var currentUser = User.FindFirstValue(ClaimTypes.Name);
        if (user.Username == currentUser)
            return BadRequest(new { message = "Kendi hesabınızı silemezsiniz." });

        // Check if user has any content
        var hasNews = await _context.News.AnyAsync(n => n.Author == username);
        var hasComments = await _context.Comments.AnyAsync(c => c.User == username);

        if (hasNews || hasComments)
        {
            return BadRequest(new { 
                message = "Bu kullanıcının haber veya yorumları bulunduğu için silinemez. Önce içeriği temizleyin.",
                hasNews,
                hasComments
            });
        }

        _context.Users.Remove(user);
        await _context.SaveChangesAsync();

        return Ok(new { 
            success = true, 
            message = "Kullanıcı başarıyla silindi.",
            username = user.Username
        });
    }

    [HttpGet("statistics")]
    public async Task<ActionResult> GetUserStatistics()
    {
        var totalUsers = await _context.Users.CountAsync();
        var approvedUsers = await _context.Users.CountAsync(u => u.Approved);
        var emailConfirmedUsers = await _context.Users.CountAsync(u => u.EmailConfirmed);
        var adminUsers = await _context.Users.CountAsync(u => u.Role == "admin");
        var authorUsers = await _context.Users.CountAsync(u => u.Role == "author");
        var regularUsers = await _context.Users.CountAsync(u => u.Role == "user");

        var statistics = new
        {
            totalUsers,
            approvedUsers,
            emailConfirmedUsers,
            pendingApproval = totalUsers - approvedUsers,
            pendingEmailConfirmation = totalUsers - emailConfirmedUsers,
            roleDistribution = new
            {
                admin = adminUsers,
                author = authorUsers,
                user = regularUsers
            }
        };

        return Ok(statistics);
    }

    [HttpPost("{id}/reset-password")]
    public async Task<IActionResult> ResetUserPassword(int id, [FromBody] AdminResetPasswordDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (dto.NewPassword.Length < 6)
            return BadRequest(new { message = "Şifre en az 6 karakter olmalıdır." });

        user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.NewPassword);
        user.PasswordResetToken = null;
        user.PasswordResetTokenExpires = null;
        
        await _context.SaveChangesAsync();

        return Ok(new { 
            success = true, 
            message = "Kullanıcı şifresi başarıyla sıfırlandı.",
            username = user.Username
        });
    }

    [HttpPut("{id}/email-confirmation")]
    public async Task<IActionResult> ConfirmUserEmail(int id)
    {
        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        if (user.EmailConfirmed)
            return BadRequest(new { message = "E-posta zaten doğrulanmış." });

        user.EmailConfirmed = true;
        user.EmailConfirmationToken = null;
        await _context.SaveChangesAsync();

        return Ok(new { 
            success = true, 
            message = "E-posta başarıyla doğrulandı.",
            username = user.Username,
            email = user.Email
        });
    }
    [HttpGet("author/{id}")]
    [AllowAnonymous] // Make this endpoint public
    public async Task<ActionResult> GetAuthorProfile(int id)
    {
        var user = await _context.Users
            .Where(u => u.Id == id && u.Role == "author" && u.Approved && u.EmailConfirmed)
            .Select(u => new 
            {
                Id = u.Id,
                Username = u.Username,
                FirstName = u.FirstName,
                LastName = u.LastName,
                DisplayName = u.DisplayName,
                Bio = u.Bio,
                ProfilePicture = u.ProfilePicture,
                Role = u.Role,
                CreatedAt = u.CreatedAt
            })
            .FirstOrDefaultAsync();

        if (user == null)
            return NotFound(new { message = "Yazar bulunamadı." });

        // Get author's published news
        var news = await _context.News
            .Where(n => n.Author == user.Username)
            .OrderByDescending(n => n.Date)
            .Select(n => new
            {
                Id = n.Id,
                Title = n.Title,
                Summary = n.Summary,
                Image = n.Image,
                Category = n.Category,
                Date = n.Date,
                Featured = n.Featured,
                Tags = n.Tags,
                CommentCount = _context.Comments.Count(c => c.NewsId == n.Id && c.Approved)
            })
            .ToListAsync();

        // Get some statistics
        var newsCount = news.Count;
        var totalComments = news.Sum(n => n.CommentCount);
        var featuredNewsCount = news.Count(n => n.Featured);

        return Ok(new
        {
            author = user,
            news = news,
            statistics = new
            {
                totalNews = newsCount,
                totalComments = totalComments,
                featuredNews = featuredNewsCount
            }
        });
    }

    [HttpPut("{id}/profile")]
    public async Task<IActionResult> UpdateUserProfile(int id, [FromBody] UpdateUserProfileDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var user = await _context.Users.FindAsync(id);
        if (user == null)
            return NotFound(new { message = "Kullanıcı bulunamadı." });

        // Update profile fields
        if (dto.FirstName != null) user.FirstName = dto.FirstName.Trim();
        if (dto.LastName != null) user.LastName = dto.LastName.Trim();
        if (dto.DisplayName != null) user.DisplayName = dto.DisplayName.Trim();
        if (dto.Bio != null) user.Bio = dto.Bio.Trim();
        if (dto.Email != null) user.Email = dto.Email.Trim();

        await _context.SaveChangesAsync();

        return Ok(new { 
            success = true, 
            message = "Kullanıcı profili başarıyla güncellendi.",
            user = new {
                user.Id,
                user.Username,
                user.FirstName,
                user.LastName,
                user.DisplayName,
                user.Bio,
                user.Email
            }
        });
    }

    // Public endpoint for getting authors (writers)
    [HttpGet("authors")]
    [AllowAnonymous]
    public async Task<ActionResult<IEnumerable<object>>> GetAuthors()
    {
        try
        {
            var authors = await _context.Users
                .Where(u => u.Role == "author" && u.Approved == true && u.EmailConfirmed == true)
                .OrderBy(u => u.DisplayName ?? u.Username)
                .Select(u => new {
                    u.Id,
                    u.Username,
                    DisplayName = u.DisplayName ?? u.Username,
                    u.Bio,
                    u.ProfilePicture,
                    NewsCount = _context.News.Count(n => n.IsApproved && n.Author == u.Username)
                })
                .ToListAsync();

            return Ok(authors);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { 
                message = "Yazarlar getirilemedi.", 
                error = ex.Message 
            });
        }
    }
}
