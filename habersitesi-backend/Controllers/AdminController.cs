using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using habersitesi_backend.Models;
using Microsoft.EntityFrameworkCore;
using habersitesi_backend.Services;
using habersitesi_backend.Dtos;

[ApiController]
[Route("api/admin")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly IEmailService _emailService;
    private readonly ILogger<AdminController> _logger;
    private readonly IFileService _fileService;
    private readonly IRelatedNewsService _relatedNewsService;

    public AdminController(AppDbContext context, IEmailService emailService, ILogger<AdminController> logger, IFileService fileService, IRelatedNewsService relatedNewsService)
    {
        _context = context;
        _emailService = emailService;
        _logger = logger;
        _fileService = fileService;
        _relatedNewsService = relatedNewsService;
    }

    #region Email Gönderme İşlemleri

    [HttpPost("send-email")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> SendEmail([FromBody] AdminEmailDto dto)
    {
        // Use execution strategy for atomic email sending and logging
        var strategy = _context.Database.CreateExecutionStrategy();
        
        try
        {
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
                    if (currentUser == null)
                    {
                        throw new UnauthorizedAccessException("User not found");
                    }

                    var targetUser = await _context.Users.FirstOrDefaultAsync(u => u.Email == dto.ToEmail);
                    if (targetUser == null)
                    {
                        throw new InvalidOperationException("Target user not found");
                    }

                    // Email gönder (atomik işlem)
                    await _emailService.SendCustomEmailAsync(dto.ToEmail, dto.Subject, dto.Message);

                    // Email geçmişine kaydet (atomik işlem)
                    var emailHistory = new EmailHistory
                    {
                        ToEmail = dto.ToEmail,
                        Subject = dto.Subject,
                        Message = dto.Message,
                        SentBy = currentUser.Id,
                        SentAt = DateTime.UtcNow,
                        IsSuccess = true,
                        EmailType = "Individual"
                    };

                    _context.EmailHistories.Add(emailHistory);
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    return Ok(new
                    {
                        success = true,
                        message = "E-posta başarıyla gönderildi",
                        sentTo = dto.ToEmail,
                        sentAt = emailHistory.SentAt
                    });                }
                catch (Exception)
                {
                    await transaction.RollbackAsync();
                    throw; // Re-throw to be handled by outer catch
                }
            });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (InvalidOperationException ex) when (ex.Message == "Target user not found")
        {
            return NotFound(new { message = "Hedef kullanıcı bulunamadı" });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email gönderilirken hata oluştu: {Error}", ex.Message);

            // Log failure separately
            try
            {
                var failureStrategy = _context.Database.CreateExecutionStrategy();
                await failureStrategy.ExecuteAsync(async () =>
                {
                    using var failureTransaction = await _context.Database.BeginTransactionAsync();
                    try
                    {
                        var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
                        var emailHistory = new EmailHistory
                        {
                            ToEmail = dto.ToEmail,
                            Subject = dto.Subject,
                            Message = dto.Message,
                            SentBy = currentUser?.Id ?? 0,
                            SentAt = DateTime.UtcNow,
                            IsSuccess = false,
                            ErrorMessage = ex.Message,
                            EmailType = "Individual"
                        };
                        _context.EmailHistories.Add(emailHistory);
                        await _context.SaveChangesAsync();
                        await failureTransaction.CommitAsync();
                    }
                    catch (Exception logEx)
                    {
                        await failureTransaction.RollbackAsync();
                        _logger.LogError(logEx, "Email geçmişi kaydetme hatası");
                    }
                });
            }
            catch
            {
                // Ignore logging errors
            }

            return BadRequest(new
            {
                success = false,
                message = "E-posta gönderilemedi: " + ex.Message
            });
        }
    }   
    [HttpPost("send-bulk-email")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> SendBulkEmail([FromBody] BulkEmailDto dto)
    {
        try
        {
            // Use execution strategy for atomic bulk email operations
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
                    if (currentUser == null)
                    {
                        throw new UnauthorizedAccessException("User not found");
                    }

                    var users = new List<User>();

                    // Kullanıcı seçim kriterlerine göre filtreleme (atomik sorgu)
                    if (dto.SendToAll)
                    {
                        users = await _context.Users
                            .Where(u => u.EmailConfirmed && !string.IsNullOrEmpty(u.Email))
                            .ToListAsync();
                    }
                    else if (dto.UserIds?.Any() == true)
                    {
                        users = await _context.Users
                            .Where(u => dto.UserIds.Contains(u.Id) && u.EmailConfirmed && !string.IsNullOrEmpty(u.Email))
                            .ToListAsync();
                    }
                    else if (!string.IsNullOrEmpty(dto.Role))
                    {
                        users = await _context.Users
                            .Where(u => u.Role == dto.Role && u.EmailConfirmed && !string.IsNullOrEmpty(u.Email))
                            .ToListAsync();
                    }

                    if (!users.Any())
                    {
                        throw new ArgumentException("Gönderilecek kullanıcı bulunamadı");
                    }

                var successCount = 0;
                var failureCount = 0;
                var emailHistories = new List<EmailHistory>();

                // Toplu email gönderimi (atomik işlemler)
                foreach (var user in users)
                {
                    try
                    {
                        // Kişiselleştirilmiş mesaj oluştur
                        var personalizedMessage = dto.Message.Replace("{Username}", user.Username)
                                                            .Replace("{Email}", user.Email);

                        await _emailService.SendCustomEmailAsync(user.Email, dto.Subject, personalizedMessage);
                        successCount++;

                        emailHistories.Add(new EmailHistory
                        {
                            ToEmail = user.Email,
                            Subject = dto.Subject,
                            Message = personalizedMessage,
                            SentBy = currentUser.Id,
                            SentAt = DateTime.UtcNow,
                            IsSuccess = true,
                            EmailType = "Bulk"
                        });
                    }
                    catch (Exception ex)
                    {
                        failureCount++;
                        _logger.LogError(ex, "Bulk email gönderim hatası - {Email}: {Error}", user.Email, ex.Message);

                        emailHistories.Add(new EmailHistory
                        {
                            ToEmail = user.Email,
                            Subject = dto.Subject,
                            Message = dto.Message,
                            SentBy = currentUser.Id,
                            SentAt = DateTime.UtcNow,
                            IsSuccess = false,
                            ErrorMessage = ex.Message,
                            EmailType = "Bulk"
                        });
                    }
                }                // Tüm email geçmişini atomik olarak kaydet
                _context.EmailHistories.AddRange(emailHistories);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        return Ok(new
        {
            success = true,
            message = "Toplu email gönderimi tamamlandı",
            totalUsers = dto.UserIds?.Count ?? 0,
            sentAt = DateTime.UtcNow
        });
    }
    catch (UnauthorizedAccessException)
    {
        return Unauthorized();
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { message = ex.Message });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Toplu email gönderilirken hata oluştu: {Error}", ex.Message);
        return BadRequest(new
        {
            success = false,
            message = "Toplu email gönderilemedi: " + ex.Message
        });    }
}

    [HttpPost("send-newsletter")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> SendNewsletter([FromBody] AdminNewsletterDto dto)
    {
        try
        {
            // Use execution strategy for atomic newsletter operations
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
                    if (currentUser == null)
                    {
                        throw new UnauthorizedAccessException("User not found");
                    }

                    // Newsletter subscriber'ları al (atomik sorgu)
                    var subscribers = await _context.Users
                        .Where(u => u.EmailConfirmed && u.Approved && !string.IsNullOrEmpty(u.Email))
                        .ToListAsync();

                    if (!subscribers.Any())
                    {
                        throw new ArgumentException("Newsletter abonesi bulunamadı");
                    }

                var successCount = 0;
                var failureCount = 0;
                var emailHistories = new List<EmailHistory>();

                // Newsletter HTML template'i
                var newsletterTemplate = $@"
                    <html>
                    <head>
                        <style>
                            body {{ font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }}
                            .container {{ max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }}
                            .header {{ text-align: center; border-bottom: 2px solid #007bff; padding-bottom: 10px; margin-bottom: 20px; }}
                            .content {{ line-height: 1.6; }}
                            .footer {{ margin-top: 20px; padding-top: 10px; border-top: 1px solid #eee; text-align: center; color: #666; }}
                        </style>
                    </head>
                    <body>
                        <div class='container'>
                            <div class='header'>
                                <h1>📰 Haber Sitesi Newsletter</h1>
                            </div>
                            <div class='content'>
                                <h2>{dto.Subject}</h2>
                                <div>{dto.Content}</div>
                            </div>
                            <div class='footer'>
                                <p>Bu email {{{{Username}}}} adına gönderilmiştir.</p>
                                <p><small>© 2024 Haber Sitesi. Tüm hakları saklıdır.</small></p>
                            </div>
                        </div>
                    </body>
                    </html>";

                // Newsletter gönderimi (atomik işlemler)
                foreach (var subscriber in subscribers)
                {
                    try
                    {
                        var personalizedContent = newsletterTemplate.Replace("{Username}", subscriber.Username);
                        await _emailService.SendCustomEmailAsync(subscriber.Email, $"📰 Newsletter: {dto.Subject}", personalizedContent);
                        successCount++;

                        emailHistories.Add(new EmailHistory
                        {
                            ToEmail = subscriber.Email,
                            Subject = $"📰 Newsletter: {dto.Subject}",
                            Message = personalizedContent,
                            SentBy = currentUser.Id,
                            SentAt = DateTime.UtcNow,
                            IsSuccess = true,
                            EmailType = "Newsletter"
                        });
                    }
                    catch (Exception ex)
                    {
                        failureCount++;
                        _logger.LogError(ex, "Newsletter gönderim hatası - {Email}: {Error}", subscriber.Email, ex.Message);

                        emailHistories.Add(new EmailHistory
                        {
                            ToEmail = subscriber.Email,
                            Subject = $"📰 Newsletter: {dto.Subject}",
                            Message = dto.Content,
                            SentBy = currentUser.Id,
                            SentAt = DateTime.UtcNow,
                            IsSuccess = false,
                            ErrorMessage = ex.Message,
                            EmailType = "Newsletter"
                        });
                    }
                }                // Email geçmişini atomik olarak kaydet
                _context.EmailHistories.AddRange(emailHistories);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        return Ok(new
        {
            success = true,
            message = "Newsletter başarıyla gönderildi",
            sentAt = DateTime.UtcNow
        });
    }
    catch (UnauthorizedAccessException)
    {
        return Unauthorized();
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { message = ex.Message });
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Newsletter gönderilirken hata oluştu: {Error}", ex.Message);
        return BadRequest(new
        {
            success = false,
            message = "Newsletter gönderilemedi: " + ex.Message
        });
    }
}

    #endregion

    #region Haber Detay (Admin/Edit)

    [HttpGet("news/{id}")]
    [Authorize(Roles = "admin,author")]
    public async Task<IActionResult> GetNewsDetailForEdit(int id)
    {
        try
        {
            var news = await _context.News.AsNoTracking().FirstOrDefaultAsync(n => n.Id == id);
            if (news == null)
                return NotFound(new { message = "Haber bulunamadı" });

            var currentUsername = User.Identity!.Name;
            var isAdmin = User.IsInRole("admin");
            var isAuthor = User.IsInRole("author");

            if (!isAdmin && (!isAuthor || !string.Equals(news.Author, currentUsername, StringComparison.OrdinalIgnoreCase)))
            {
                return Forbid();
            }

            return Ok(new
            {
                id = news.Id,
                title = news.Title,
                summary = news.Summary,
                image = news.Image,
                category = news.Category,
                content = news.Content,
                author = news.Author,
                featured = news.Featured,
                featuredPriority = news.FeaturedPriority,
                tags = news.Tags,
                isApproved = news.IsApproved,
                approvedAt = news.ApprovedAt,
                approvedBy = news.ApprovedByUserId
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin haber detayı alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Haber detayı alınamadı" });
        }
    }

    #endregion

    #region Email Geçmişi

    [HttpGet("email-history")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetEmailHistory([FromQuery] int page = 1, [FromQuery] int pageSize = 20, 
        [FromQuery] string? emailType = null, [FromQuery] bool? isSuccess = null)
    {
        try
        {
            var query = _context.EmailHistories
                .Include(eh => eh.SentByUser)
                .AsQueryable();

            if (!string.IsNullOrEmpty(emailType))
            {
                query = query.Where(eh => eh.EmailType == emailType);
            }

            if (isSuccess.HasValue)
            {
                query = query.Where(eh => eh.IsSuccess == isSuccess.Value);
            }

            var totalCount = await query.CountAsync();
            
            var emailHistories = await query
                .OrderByDescending(eh => eh.SentAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(eh => new EmailHistoryDto
                {
                    Id = eh.Id,
                    ToEmail = eh.ToEmail,
                    Subject = eh.Subject,
                    SentAt = eh.SentAt,
                    IsSuccess = eh.IsSuccess,
                    EmailType = eh.EmailType,
                    SentByUsername = eh.SentByUser!.Username,
                    ErrorMessage = eh.ErrorMessage
                })
                .ToListAsync();

            return Ok(new
            {
                emailHistories,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email geçmişi alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Email geçmişi alınamadı" });
        }
    }

    [HttpGet("email-history/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetEmailHistoryDetail(int id)
    {
        try
        {
            var emailHistory = await _context.EmailHistories
                .Include(eh => eh.SentByUser)
                .Where(eh => eh.Id == id)
                .Select(eh => new
                {
                    eh.Id,
                    eh.ToEmail,
                    eh.Subject,
                    eh.Message,
                    eh.SentAt,
                    eh.IsSuccess,
                    eh.EmailType,
                    eh.ErrorMessage,
                    SentByUsername = eh.SentByUser!.Username
                })
                .FirstOrDefaultAsync();

            if (emailHistory == null)
            {
                return NotFound(new { message = "Email geçmişi bulunamadı" });
            }

            return Ok(emailHistory);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email geçmişi detayı alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Email geçmişi detayı alınamadı" });
        }
    }

    [HttpGet("email-statistics")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetEmailStatistics()
    {
        try
        {
            var stats = await _context.EmailHistories
                .GroupBy(eh => eh.EmailType)
                .Select(g => new
                {
                    EmailType = g.Key,
                    TotalSent = g.Count(),
                    SuccessCount = g.Count(eh => eh.IsSuccess),
                    FailureCount = g.Count(eh => !eh.IsSuccess),
                    SuccessRate = g.Any() ? (double)g.Count(eh => eh.IsSuccess) / g.Count() * 100 : 0
                })
                .ToListAsync();

            var totalStats = await _context.EmailHistories
                .GroupBy(eh => 1)
                .Select(g => new
                {
                    TotalEmails = g.Count(),
                    TotalSuccess = g.Count(eh => eh.IsSuccess),
                    TotalFailures = g.Count(eh => !eh.IsSuccess),
                    OverallSuccessRate = g.Any() ? (double)g.Count(eh => eh.IsSuccess) / g.Count() * 100 : 0
                })
                .FirstOrDefaultAsync();

            return Ok(new
            {
                byType = stats,
                overall = totalStats ?? new { TotalEmails = 0, TotalSuccess = 0, TotalFailures = 0, OverallSuccessRate = 0.0 }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email istatistikleri alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Email istatistikleri alınamadı" });
        }
    }

    #endregion

    #region Kullanıcı Yönetimi

    [HttpGet("users")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetUsers([FromQuery] int page = 1, [FromQuery] int pageSize = 20, 
        [FromQuery] string? role = null, [FromQuery] bool? approved = null, [FromQuery] string? search = null)
    {
        try
        {
            var query = _context.Users.AsQueryable();

            if (!string.IsNullOrEmpty(role))
            {
                query = query.Where(u => u.Role == role);
            }

            if (approved.HasValue)
            {
                query = query.Where(u => u.Approved == approved.Value);
            }

            if (!string.IsNullOrEmpty(search))
            {
                query = query.Where(u => u.Username.Contains(search) || u.Email.Contains(search));
            }

            var totalCount = await query.CountAsync();
            
            var users = await query
                .OrderByDescending(u => u.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.Role,
                    u.Approved,
                    u.EmailConfirmed,
                    u.CreatedAt,
                    u.LastLogin
                })
                .ToListAsync();

            return Ok(new
            {
                users,
                totalCount,
                page,
                pageSize,
                totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kullanıcılar alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Kullanıcılar alınamadı" });
        }
    }

    [HttpGet("users/for-email")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetUsersForEmail()
    {
        try
        {
            var users = await _context.Users
                .Where(u => u.EmailConfirmed && !string.IsNullOrEmpty(u.Email))
                .Select(u => new
                {
                    u.Id,
                    u.Username,
                    u.Email,
                    u.Role,
                    u.Approved
                })
                .OrderBy(u => u.Username)
                .ToListAsync();

            var roles = await _context.Users
                .Where(u => u.EmailConfirmed && !string.IsNullOrEmpty(u.Email))
                .Select(u => u.Role)
                .Distinct()
                .ToListAsync();

            return Ok(new
            {
                users,
                roles,
                statistics = new
                {
                    totalUsers = users.Count,
                    approvedUsers = users.Count(u => u.Approved),
                    adminUsers = users.Count(u => u.Role == "admin"),
                    regularUsers = users.Count(u => u.Role == "user")
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Email kullanıcıları alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Email kullanıcıları alınamadı" });
        }
    }

    #endregion

    #region Admin Kayıt Sistemi

    [HttpGet("setup-status")]
    [AllowAnonymous]
    public async Task<IActionResult> GetSetupStatus()
    {
        try
        {
            var hasAdmin = await _context.Users.AnyAsync(u => u.Role == "admin");
            var totalUsers = await _context.Users.CountAsync();
            
            return Ok(new
            {
                hasAdmin,
                needsSetup = !hasAdmin,
                totalUsers,
                setupComplete = hasAdmin
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Setup durumu kontrol edilirken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Setup durumu kontrol edilemedi" });
        }
    }

    [HttpPost("initial-setup")]
    [AllowAnonymous]
    public async Task<IActionResult> InitialSetup([FromBody] InitialSetupDto dto)
    {
        try
        {
            // Zaten admin varsa bu endpoint'i reddet
            var existingAdmin = await _context.Users.AnyAsync(u => u.Role == "admin");
            if (existingAdmin)
            {
                return BadRequest(new { message = "Sistem zaten kurulmuş. Admin kullanıcı mevcut." });
            }

            // Şifre güçlülük kontrolü
            if (dto.Password.Length < 8)
            {
                return BadRequest(new { message = "Şifre en az 8 karakter olmalı" });
            }

            // Email format kontrolü
            if (!IsValidEmail(dto.Email))
            {
                return BadRequest(new { message = "Geçerli bir email adresi girin" });
            }

            // İlk admin kullanıcıyı oluştur
            var admin = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = "admin",
                EmailConfirmed = true,
                Approved = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(admin);
            await _context.SaveChangesAsync();

            _logger.LogInformation("İlk admin kullanıcı oluşturuldu: {Username} ({Email})", admin.Username, admin.Email);

            return Ok(new
            {
                success = true,
                message = "Sistem başarıyla kuruldu. Admin kullanıcı oluşturuldu.",
                admin = new
                {
                    username = admin.Username,
                    email = admin.Email,
                    createdAt = admin.CreatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "İlk kurulum sırasında hata oluştu: {Error}", ex.Message);
            return BadRequest(new
            {
                success = false,
                message = "Sistem kurulumu başarısız: " + ex.Message
            });
        }
    }

    [HttpPost("create-additional-admin")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateAdditionalAdmin([FromBody] CreateAdminDto dto)
    {
        try
        {
            // Email zaten kullanılıyor mu kontrol et
            var existingUser = await _context.Users.AnyAsync(u => u.Email == dto.Email);
            if (existingUser)
            {
                return BadRequest(new { message = "Bu email adresi zaten kullanılıyor" });
            }

            // Kullanıcı adı zaten kullanılıyor mu kontrol et
            var existingUsername = await _context.Users.AnyAsync(u => u.Username == dto.Username);
            if (existingUsername)
            {
                return BadRequest(new { message = "Bu kullanıcı adı zaten kullanılıyor" });
            }

            // Şifre güçlülük kontrolü
            if (dto.Password.Length < 8)
            {
                return BadRequest(new { message = "Şifre en az 8 karakter olmalı" });
            }

            var newAdmin = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = "admin",
                EmailConfirmed = true,
                Approved = true,
                CreatedAt = DateTime.UtcNow
            };

            _context.Users.Add(newAdmin);
            await _context.SaveChangesAsync();

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
            _logger.LogInformation("Yeni admin kullanıcı oluşturuldu: {Username} ({Email}) - Oluşturan: {Creator}", 
                newAdmin.Username, newAdmin.Email, currentUser?.Username);

            return Ok(new
            {
                success = true,
                message = "Yeni admin kullanıcı başarıyla oluşturuldu",
                admin = new
                {
                    username = newAdmin.Username,
                    email = newAdmin.Email,
                    createdAt = newAdmin.CreatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin kullanıcı oluşturulurken hata oluştu: {Error}", ex.Message);
            return BadRequest(new
            {
                success = false,
                message = "Admin kullanıcı oluşturulamadı: " + ex.Message
            });
        }
    }

    [HttpPost("create-user")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> CreateUser([FromBody] CreateUserDto dto)
    {
        try
        {
            // Email zaten kullanılıyor mu kontrol et
            var existingUser = await _context.Users.AnyAsync(u => u.Email == dto.Email);
            if (existingUser)
            {
                return BadRequest(new { message = "Bu email adresi zaten kullanılıyor" });
            }

            // Kullanıcı adı zaten kullanılıyor mu kontrol et
            var existingUsername = await _context.Users.AnyAsync(u => u.Username == dto.Username);
            if (existingUsername)
            {
                return BadRequest(new { message = "Bu kullanıcı adı zaten kullanılıyor" });
            }

            // Şifre güçlülük kontrolü
            if (dto.Password.Length < 6)
            {
                return BadRequest(new { message = "Şifre en az 6 karakter olmalı" });
            }

            // Email format kontrolü
            if (!IsValidEmail(dto.Email))
            {
                return BadRequest(new { message = "Geçerli bir email adresi girin" });
            }

            // Geçerli rol kontrolü
            var validRoles = new[] { "user", "author", "admin" };
            if (!validRoles.Contains(dto.Role))
            {
                return BadRequest(new { message = "Geçerli bir rol seçin (user, author, admin)" });
            }

            var newUser = new User
            {
                Username = dto.Username,
                Email = dto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password),
                Role = dto.Role,
                EmailConfirmed = true, // Admin tarafından oluşturulan kullanıcılar otomatik onaylı
                Approved = true, // Admin tarafından oluşturulan kullanıcılar otomatik onaylı
                CreatedAt = DateTime.UtcNow,
                FirstName = dto.FirstName?.Trim(),
                LastName = dto.LastName?.Trim(),
                DisplayName = dto.DisplayName?.Trim(),
                Bio = dto.Bio?.Trim()
            };

            _context.Users.Add(newUser);
            await _context.SaveChangesAsync();

            var currentUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
            _logger.LogInformation("Yeni kullanıcı oluşturuldu: {Username} ({Email}) - Rol: {Role} - Oluşturan: {Creator}", 
                newUser.Username, newUser.Email, newUser.Role, currentUser?.Username);

            return Ok(new
            {
                success = true,
                message = "Kullanıcı başarıyla oluşturuldu",
                user = new
                {
                    id = newUser.Id,
                    username = newUser.Username,
                    email = newUser.Email,
                    role = newUser.Role,
                    firstName = newUser.FirstName,
                    lastName = newUser.LastName,
                    displayName = newUser.DisplayName,
                    emailConfirmed = newUser.EmailConfirmed,
                    approved = newUser.Approved,
                    createdAt = newUser.CreatedAt
                }
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Kullanıcı oluşturulurken hata oluştu: {Error}", ex.Message);
            return BadRequest(new
            {
                success = false,
                message = "Kullanıcı oluşturulamadı: " + ex.Message
            });
        }
    }

    #endregion

    #region Mevcut Test Metotları

    [HttpPost("test-email-connection")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> TestEmailConnection()
    {
        try
        {
            var result = await _emailService.TestEmailConnectionAsync();
            return Ok(new { 
                success = result,
                message = result ? "SMTP bağlantısı başarılı" : "SMTP bağlantısı başarısız",
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "E-mail bağlantı testi sırasında hata oluştu");
            return BadRequest(new { 
                success = false,
                message = "E-mail bağlantı testi başarısız"
            });
        }
    }

    [HttpPost("send-test-email")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> SendTestEmail([FromBody] TestEmailDto dto)
    {
        try
        {
            var testUser = new User
            {
                Username = "Test User",
                Email = dto.Email
            };

            await _emailService.SendEmailConfirmationAsync(testUser, "http://localhost:5173/test-confirmation");
            
            return Ok(new { 
                success = true,
                message = "Test e-postası başarıyla gönderildi",
                to = dto.Email,
                timestamp = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Test e-postası gönderilirken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { 
                success = false,
                message = "Test e-postası gönderilemedi"
            });
        }
    }

    [HttpGet("email-settings")]
    [Authorize(Roles = "admin")]
    public IActionResult GetEmailSettings()
    {
        var config = HttpContext.RequestServices.GetRequiredService<IConfiguration>();
        return Ok(new
        {
            host = config["Smtp:Host"],
            port = config["Smtp:Port"],
            from = config["Smtp:From"],
            passwordSet = !string.IsNullOrEmpty(config["Smtp:Password"])
        });
    }

    [HttpPost("create-admin")]
    [AllowAnonymous] // Geriye dönük uyumluluk için korundu
    public async Task<IActionResult> CreateAdmin([FromBody] CreateAdminDto dto)
    {
        // Bu endpoint artık initial-setup ile değiştirildi, ama geriye dönük uyumluluk için korundu
        return await InitialSetup(new InitialSetupDto 
        { 
            Username = dto.Username, 
            Email = dto.Email, 
            Password = dto.Password 
        });
    }   
     #endregion

    #region Dashboard İstatistikleri

    [HttpGet("dashboard")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetDashboardStatistics()
    {
        try
        {
            // Kullanıcı istatistikleri
            var totalUsers = await _context.Users.CountAsync();
            var approvedUsers = await _context.Users.CountAsync(u => u.Approved);
            var emailConfirmedUsers = await _context.Users.CountAsync(u => u.EmailConfirmed);
            var adminUsers = await _context.Users.CountAsync(u => u.Role == "admin");
            var authorUsers = await _context.Users.CountAsync(u => u.Role == "author");
            var regularUsers = await _context.Users.CountAsync(u => u.Role == "user");
            var newUsersToday = await _context.Users.CountAsync(u => u.CreatedAt.Date == DateTime.UtcNow.Date);
            var newUsersThisWeek = await _context.Users
                .CountAsync(u => u.CreatedAt >= DateTime.UtcNow.AddDays(-7));

            // Haber istatistikleri
            var totalNews = await _context.News.CountAsync();
            var approvedNews = await _context.News.CountAsync(n => n.IsApproved);
            var pendingNews = totalNews - approvedNews;
            var featuredNews = await _context.News.CountAsync(n => n.Featured);
            var newsToday = await _context.News.CountAsync(n => n.Date.Date == DateTime.UtcNow.Date);
            var newsThisWeek = await _context.News.CountAsync(n => n.Date >= DateTime.UtcNow.AddDays(-7));
            var newsThisMonth = await _context.News.CountAsync(n => n.Date >= DateTime.UtcNow.AddDays(-30));
            var pendingNewsToday = await _context.News.CountAsync(n => !n.IsApproved && n.Date.Date == DateTime.UtcNow.Date);
            var pendingNewsThisWeek = await _context.News.CountAsync(n => !n.IsApproved && n.Date >= DateTime.UtcNow.AddDays(-7));

            // Yorum istatistikleri
            var totalComments = await _context.Comments.CountAsync();
            var approvedComments = await _context.Comments.CountAsync(c => c.Approved);
            var pendingComments = totalComments - approvedComments;
            var commentsToday = await _context.Comments.CountAsync(c => c.CreatedAt.Date == DateTime.UtcNow.Date);
            var commentsThisWeek = await _context.Comments.CountAsync(c => c.CreatedAt >= DateTime.UtcNow.AddDays(-7));

            // Kategori istatistikleri
            var totalCategories = await _context.Categories.CountAsync();
            var categoriesWithNews = await _context.Categories
                .CountAsync(c => _context.News.Any(n => n.Category == c.Name));

            // Email istatistikleri
            var totalEmails = await _context.EmailHistories.CountAsync();
            var successfulEmails = await _context.EmailHistories.CountAsync(e => e.IsSuccess);
            var failedEmails = totalEmails - successfulEmails;
            var emailsToday = await _context.EmailHistories.CountAsync(e => e.SentAt.Date == DateTime.UtcNow.Date);
            var emailsThisWeek = await _context.EmailHistories.CountAsync(e => e.SentAt >= DateTime.UtcNow.AddDays(-7));

            // Push notification istatistikleri
            var totalPushNotifications = await _context.PushNotifications.CountAsync();
            var sentPushNotifications = await _context.PushNotifications.CountAsync(p => p.IsSent);
            var pendingPushNotifications = totalPushNotifications - sentPushNotifications;

            // Son aktiviteler
            var recentUsers = await _context.Users
                .OrderByDescending(u => u.CreatedAt)
                .Take(5)
                .Select(u => new { u.Username, u.Email, u.Role, u.CreatedAt, u.Approved })
                .ToListAsync();

            var recentNews = await _context.News
                .OrderByDescending(n => n.Date)
                .Take(5)
                .Select(n => new { n.Id, n.Title, n.Author, n.Category, n.Date, n.Featured, n.IsApproved })
                .ToListAsync();

            // Onay bekleyen haberler
            var pendingNewsForReview = await _context.News
                .Where(n => !n.IsApproved)
                .OrderByDescending(n => n.Date)
                .Take(10)
                .Select(n => new { 
                    n.Id, 
                    n.Title, 
                    n.Author, 
                    n.Category, 
                    n.Date, 
                    n.Summary,
                    n.IsApproved,
                    DaysWaiting = (DateTime.UtcNow - n.Date).Days
                })
                .ToListAsync();

            var recentComments = await _context.Comments
                .Include(c => c.News)
                .OrderByDescending(c => c.CreatedAt)
                .Take(5)
                .Select(c => new { 
                    c.Id, 
                    c.User, 
                    c.Text, 
                    c.Approved, 
                    c.CreatedAt,
                    NewsTitle = c.News!.Title,
                    NewsId = c.NewsId
                })
                .ToListAsync();

            // Popüler kategoriler
            var popularCategories = await _context.News
                .GroupBy(n => n.Category)
                .Select(g => new { 
                    Category = g.Key, 
                    NewsCount = g.Count(),
                    LatestNews = g.Max(n => n.Date)
                })
                .OrderByDescending(x => x.NewsCount)
                .Take(5)
                .ToListAsync();

            // En aktif yazarlar
            var activeAuthors = await _context.News
                .Where(n => !string.IsNullOrEmpty(n.Author))
                .GroupBy(n => n.Author)
                .Select(g => new { 
                    Author = g.Key, 
                    NewsCount = g.Count(),
                    LatestNews = g.Max(n => n.Date)
                })
                .OrderByDescending(x => x.NewsCount)
                .Take(5)
                .ToListAsync();

            // Aylık trend verileri (son 6 ay)
            var monthlyTrends = new List<object>();
            for (int i = 5; i >= 0; i--)
            {
                var monthStart = DateTime.UtcNow.AddMonths(-i).Date.AddDays(1 - DateTime.UtcNow.AddMonths(-i).Day);
                var monthEnd = monthStart.AddMonths(1).AddDays(-1);
                
                var monthlyData = new
                {
                    Month = monthStart.ToString("yyyy-MM"),
                    Users = await _context.Users.CountAsync(u => u.CreatedAt >= monthStart && u.CreatedAt <= monthEnd),
                    News = await _context.News.CountAsync(n => n.Date >= monthStart && n.Date <= monthEnd),
                    ApprovedNews = await _context.News.CountAsync(n => n.IsApproved && n.Date >= monthStart && n.Date <= monthEnd),
                    PendingNews = await _context.News.CountAsync(n => !n.IsApproved && n.Date >= monthStart && n.Date <= monthEnd),
                    Comments = await _context.Comments.CountAsync(c => c.CreatedAt >= monthStart && c.CreatedAt <= monthEnd),
                    Emails = await _context.EmailHistories.CountAsync(e => e.SentAt >= monthStart && e.SentAt <= monthEnd)
                };
                monthlyTrends.Add(monthlyData);
            }

            var dashboardData = new
            {
                // Genel sistem bilgileri
                SystemInfo = new
                {
                    TotalUsers = totalUsers,
                    TotalNews = totalNews,
                    TotalComments = totalComments,
                    TotalCategories = totalCategories,
                    TotalEmails = totalEmails,
                    TotalPushNotifications = totalPushNotifications,
                    LastUpdated = DateTime.UtcNow
                },

                // Kullanıcı istatistikleri
                UserStats = new
                {
                    Total = totalUsers,
                    Approved = approvedUsers,
                    EmailConfirmed = emailConfirmedUsers,
                    PendingApproval = totalUsers - approvedUsers,
                    PendingEmailConfirmation = totalUsers - emailConfirmedUsers,
                    NewToday = newUsersToday,
                    NewThisWeek = newUsersThisWeek,
                    RoleDistribution = new
                    {
                        Admin = adminUsers,
                        Author = authorUsers,
                        User = regularUsers
                    }
                },

                // Haber istatistikleri
                NewsStats = new
                {
                    Total = totalNews,
                    Approved = approvedNews,
                    Pending = pendingNews,
                    ApprovalRate = totalNews > 0 ? Math.Round((double)approvedNews / totalNews * 100, 2) : 0,
                    Featured = featuredNews,
                    PublishedToday = newsToday,
                    PublishedThisWeek = newsThisWeek,
                    PublishedThisMonth = newsThisMonth,
                    PendingToday = pendingNewsToday,
                    PendingThisWeek = pendingNewsThisWeek,
                    CategoriesInUse = categoriesWithNews
                },

                // Yorum istatistikleri
                CommentStats = new
                {
                    Total = totalComments,
                    Approved = approvedComments,
                    Pending = pendingComments,
                    ApprovalRate = totalComments > 0 ? Math.Round((double)approvedComments / totalComments * 100, 2) : 0,
                    NewToday = commentsToday,
                    NewThisWeek = commentsThisWeek
                },

                // Email istatistikleri
                EmailStats = new
                {
                    Total = totalEmails,
                    Successful = successfulEmails,
                    Failed = failedEmails,
                    SuccessRate = totalEmails > 0 ? Math.Round((double)successfulEmails / totalEmails * 100, 2) : 0,
                    SentToday = emailsToday,
                    SentThisWeek = emailsThisWeek
                },

                // Push notification istatistikleri
                PushNotificationStats = new
                {
                    Total = totalPushNotifications,
                    Sent = sentPushNotifications,
                    Pending = pendingPushNotifications,
                    SendRate = totalPushNotifications > 0 ? Math.Round((double)sentPushNotifications / totalPushNotifications * 100, 2) : 0
                },

                // Son aktiviteler
                RecentActivity = new
                {
                    Users = recentUsers,
                    News = recentNews,
                    Comments = recentComments,
                    PendingNews = pendingNewsForReview
                },

                // Popüler veriler
                PopularData = new
                {
                    Categories = popularCategories,
                    Authors = activeAuthors
                },

                // Trend verileri
                MonthlyTrends = monthlyTrends
            };

            return Ok(dashboardData);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Dashboard istatistikleri alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Dashboard istatistikleri alınamadı: " + ex.Message });
        }
    }

    [HttpGet("system-info")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetSystemInfo()
    {
        try
        {
            var databaseStats = new
            {
                Tables = new
                {
                    Users = await _context.Users.CountAsync(),
                    News = await _context.News.CountAsync(),
                    Categories = await _context.Categories.CountAsync(),
                    Comments = await _context.Comments.CountAsync(),
                    EmailHistories = await _context.EmailHistories.CountAsync(),
                    PushNotifications = await _context.PushNotifications.CountAsync(),
                    PushSubscriptions = await _context.PushSubscriptions.CountAsync()
                },
                LastBackup = DateTime.UtcNow.AddDays(-1), // Bu gerçek backup sisteminden alınmalı
                DatabaseSize = "Bilinmiyor" // Bu gerçek veritabanı boyutundan alınmalı
            };

            var systemInfo = new
            {
                ServerTime = DateTime.UtcNow,
                ServerTimeZone = TimeZoneInfo.Local.DisplayName,
                Environment = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT") ?? "Production",
                Version = "1.0.0", // Uygulama versiyonu
                Database = databaseStats,
                Memory = new
                {
                    Used = GC.GetTotalMemory(false),
                    WorkingSet = Environment.WorkingSet
                }
            };

            return Ok(systemInfo);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Sistem bilgileri alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Sistem bilgileri alınamadı: " + ex.Message });
        }
    }

    #endregion

    #region Yardımcı Metotlar

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;
        }
    }

    private Task DeleteNewsImagesAsync(News news)
    {
        var imagesToDelete = new List<string>();

        // Haber ana resmini ekle
        if (!string.IsNullOrEmpty(news.Image) && news.Image.Contains("/uploads/"))
        {
            imagesToDelete.Add(news.Image);
        }

        // Haber içeriğindeki base64'ten kaydedilmiş resimleri bul
        if (!string.IsNullOrEmpty(news.Content))
        {
            // src="/uploads/" ile başlayan resimleri bul
            var regex = new System.Text.RegularExpressions.Regex(@"src=[""']([^""']*\/uploads\/[^""']*)[""']", 
                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
            var matches = regex.Matches(news.Content);
            
            foreach (System.Text.RegularExpressions.Match match in matches)
            {
                if (match.Groups.Count > 1)
                {
                    var imageUrl = match.Groups[1].Value;
                    if (!imagesToDelete.Contains(imageUrl))
                    {
                        imagesToDelete.Add(imageUrl);
                    }
                }
            }
        }

        // Resimleri arka planda sil
    if (imagesToDelete.Any())
        {
            _ = Task.Run(async () =>
            {
                foreach (var imageUrl in imagesToDelete)
                {
                    try
                    {
                        await _fileService.DeleteFileAsync(imageUrl);
                        _logger.LogInformation("Haber reddedilirken resim silindi: {ImageUrl}", imageUrl);
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Haber reddedilirken resim silinemedi: {ImageUrl}, Error: {Error}", imageUrl, ex.Message);
                    }
                }
            });
        }

    return Task.CompletedTask;
    }

    #region Haber Onay Sistemi

    [HttpGet("pending-news")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetPendingNews([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 50) pageSize = 10;

            var query = _context.News
                .AsNoTracking()
                .Where(n => !n.IsApproved)
                .OrderByDescending(n => n.Date);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var news = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new NewsListDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Summary = n.Summary,
                    Image = n.Image,
                    Category = n.Category,
                    Date = n.Date,
                    Author = n.Author,
                    AuthorId = _context.Users.Where(u => u.Username == n.Author).Select(u => u.Id).FirstOrDefault(),
                    Featured = n.Featured,
                    Tags = n.Tags,
                    IsApproved = n.IsApproved,
                    ApprovedByUsername = n.ApprovedBy != null ? n.ApprovedBy.Username : null,
                    ApprovedAt = n.ApprovedAt,
                    CommentCount = _context.Comments.Count(c => c.NewsId == n.Id && c.Approved)
                })
                .ToListAsync();

            var result = new
            {
                data = news,
                pagination = new
                {
                    currentPage = page,
                    pageSize,
                    totalCount,
                    totalPages,
                    hasNext = page < totalPages,
                    hasPrevious = page > 1
                }
            };

            return Ok(result);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Onay bekleyen haberler alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Onay bekleyen haberler alınamadı: " + ex.Message });
        }
    }    [HttpPost("approve-news/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> ApproveNews(int id)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        
        try
        {
            var news = await _context.News.FirstOrDefaultAsync(n => n.Id == id);
            if (news == null)
                return NotFound(new { message = "Haber bulunamadı." });

            if (news.IsApproved)
                return BadRequest(new { message = "Haber zaten onaylanmış." });

            var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
            if (adminUser == null)
                return Unauthorized(new { message = "Admin kullanıcısı bulunamadı." });            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                
                news.IsApproved = true;
                news.ApprovedByUserId = adminUser.Id;
                news.ApprovedAt = DateTime.UtcNow;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            });

            // Generate related news in background after approval
            _ = Task.Run(async () =>
            {
                try
                {
                    await _relatedNewsService.GenerateRelatedNewsAsync(id);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to generate related news for approved NewsId: {NewsId}", id);
                }
            });

            _logger.LogInformation("Haber onaylandı: {NewsId} by {AdminUsername}", id, adminUser.Username);

            return Ok(new { 
                message = "Haber başarıyla onaylandı.",
                newsId = id,
                approvedBy = adminUser.Username,
                approvedAt = news.ApprovedAt
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Haber onaylanırken hata oluştu: {NewsId}, Error: {Error}", id, ex.Message);
            return BadRequest(new { message = "Haber onaylanırken hata oluştu: " + ex.Message });
        }
    }    [HttpPost("reject-news/{id}")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> RejectNews(int id, [FromBody] RejectNewsDto dto)
    {
        var strategy = _context.Database.CreateExecutionStrategy();
        
        try
        {
            var news = await _context.News.FirstOrDefaultAsync(n => n.Id == id);
            if (news == null)
                return NotFound(new { message = "Haber bulunamadı." });

            if (news.IsApproved)
                return BadRequest(new { message = "Onaylanmış haber reddedilemez." });

            var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
            if (adminUser == null)
                return Unauthorized(new { message = "Admin kullanıcısı bulunamadı." });            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                
                // Haberi sil (reddetme = silme)
                _context.News.Remove(news);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            });

            // Haber içindeki resimleri sil (arka planda)
            await DeleteNewsImagesAsync(news);

            _logger.LogInformation("Haber reddedildi ve silindi: {NewsId} by {AdminUsername}, Reason: {Reason}", 
                id, adminUser.Username, dto.Reason);

            return Ok(new { 
                message = "Haber reddedildi ve silindi.",
                newsId = id,
                rejectedBy = adminUser.Username,
                reason = dto.Reason
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Haber reddedilirken hata oluştu: {NewsId}, Error: {Error}", id, ex.Message);
            return BadRequest(new { message = "Haber reddedilirken hata oluştu: " + ex.Message });
        }
    }

    [HttpGet("all-news")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetAllNewsForAdmin(
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10,
        [FromQuery] bool? isApproved = null,
        [FromQuery] string? category = null,
        [FromQuery] string? author = null)
    {
        try
        {
            if (page < 1) page = 1;
            if (pageSize < 1 || pageSize > 50) pageSize = 10;

            var query = _context.News
                .AsNoTracking()
                .AsQueryable();

            if (isApproved.HasValue)
                query = query.Where(n => n.IsApproved == isApproved.Value);

            if (!string.IsNullOrEmpty(category))
                query = query.Where(n => n.Category == category);

            if (!string.IsNullOrEmpty(author))
                query = query.Where(n => n.Author != null && n.Author.Contains(author));

            query = query.OrderByDescending(n => n.Date);

            var totalCount = await query.CountAsync();
            var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

            var news = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(n => new NewsListDto
                {
                    Id = n.Id,
                    Title = n.Title,
                    Summary = n.Summary,
                    Image = n.Image,
                    Category = n.Category,
                    Date = n.Date,
                    Author = n.Author,
                    AuthorId = _context.Users.Where(u => u.Username == n.Author).Select(u => u.Id).FirstOrDefault(),
                    Featured = n.Featured,
                    Tags = n.Tags,
                    IsApproved = n.IsApproved,
                    ApprovedByUsername = n.ApprovedBy != null ? n.ApprovedBy.Username : null,
                    ApprovedAt = n.ApprovedAt,
                    CommentCount = _context.Comments.Count(c => c.NewsId == n.Id && c.Approved)
                })
                .ToListAsync();

            var result = new
            {
                data = news,
                pagination = new
                {
                    currentPage = page,
                    pageSize,
                    totalCount,
                    totalPages,
                    hasNext = page < totalPages,
                    hasPrevious = page > 1
                }
            };

            return Ok(result);        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Admin için haberler alınırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "Haberler alınamadı: " + ex.Message });
        }
    }

    // Regenerate related news for all approved news
    [HttpPost("regenerate-related-news")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> RegenerateRelatedNews()
    {
        try
        {
            var adminUser = await _context.Users.FirstOrDefaultAsync(u => u.Username == User.Identity!.Name);
            if (adminUser == null)
                return Unauthorized(new { message = "Admin kullanıcısı bulunamadı." });

            // Start background task
            _ = Task.Run(async () =>
            {
                try
                {
                    await _relatedNewsService.RegenerateAllRelatedNewsAsync();
                    _logger.LogInformation("Related news regenerated by admin: {AdminUsername}", adminUser.Username);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to regenerate related news");
                }
            });

            return Ok(new { 
                message = "İlgili haberler yeniden oluşturuluyor. Bu işlem arka planda devam edecek.",
                startedBy = adminUser.Username,
                startedAt = DateTime.UtcNow
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Related news regeneration başlatılırken hata oluştu: {Error}", ex.Message);
            return BadRequest(new { message = "İşlem başlatılamadı: " + ex.Message });
        }
    }

    #endregion
    #endregion
}

#region DTOs

public class TestEmailDto
{
    public string Email { get; set; } = string.Empty;
}

public class CreateAdminDto
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class InitialSetupDto
{
    public string Username { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}

public class RejectNewsDto
{
    public string Reason { get; set; } = string.Empty;
}

#endregion
