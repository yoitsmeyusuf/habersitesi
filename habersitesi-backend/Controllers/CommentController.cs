using Microsoft.AspNetCore.Mvc;
using habersitesi_backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using System.Collections.Generic;
using System.Threading.Tasks;
using habersitesi_backend.Dtos;
using habersitesi_backend.Services;
using Microsoft.Extensions.Options;
using habersitesi_backend.Settings;

[ApiController]
[Route("api/haber/{newsId}/yorumlar")]
public class CommentController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICacheService _cache;
    private readonly IModerationService _moderationService;

    public CommentController(AppDbContext context, ICacheService cache, IOptions<ModerationSettings> moderationOptions, IModerationService moderationService)
    {
        _context = context;
        _cache = cache;
        _moderationService = moderationService;
    }

    // Metin içerisindeki linkleri ve yasaklı kelimeleri temizle
    private string SanitizeCommentText(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return string.Empty;

        var sanitized = text.Trim();

        // HTML taglerini kaldır
        sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, "<[^>]*>", string.Empty);

        // URL'leri [link] ile değiştir (http, https, www, mailto, ftp)
        sanitized = System.Text.RegularExpressions.Regex.Replace(
            sanitized,
            @"(?i)\b((?:https?:\/\/|www\.|mailto:|ftp:\/\/)[\w\-\.\/?#%&=:+,;@]+)",
            "[link]"
        );

        // Yasaklı kelimeleri maskele (Unicode harf sınırlarıyla)
        var banned = _moderationService.GetBannedWords();
        foreach (var bad in banned)
        {
            if (string.IsNullOrWhiteSpace(bad)) continue;
            // Türkçe ve diğer diller için kelime sınırı: harf olmayan ile çevrili
            var escaped = System.Text.RegularExpressions.Regex.Escape(bad.Trim());
            var pattern = $"(?i)(?<!\\p{{L}}){escaped}(?!\\p{{L}})"; // harf değilse sınır kabul et
            sanitized = System.Text.RegularExpressions.Regex.Replace(
                sanitized,
                pattern,
                m => new string('*', m.Value.Length)
            );
        }

        // Çoklu boşlukları tek boşluğa indir
        sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, "\n{3,}", "\n\n");
        sanitized = System.Text.RegularExpressions.Regex.Replace(sanitized, " {2,}", " ");

        return sanitized;
    }

    // Yasaklı kelime kontrolü (Unicode harf sınırlarıyla)
    private bool ContainsBannedWords(string text)
    {
        if (string.IsNullOrWhiteSpace(text)) return false;
        var banned = _moderationService.GetBannedWords();
        foreach (var bad in banned)
        {
            if (string.IsNullOrWhiteSpace(bad)) continue;
            var escaped = System.Text.RegularExpressions.Regex.Escape(bad.Trim());
            var pattern = $@"(?i)(?<!\p{{L}}){escaped}(?!\p{{L}})";
            if (System.Text.RegularExpressions.Regex.IsMatch(text, pattern))
            {
                return true;
            }
        }
        return false;
    }

    private static string? GetAvatarFor(string username, Dictionary<string, string?> avatars)
    {
        if (string.IsNullOrWhiteSpace(username)) return null;
        return avatars.TryGetValue(username, out var avatar) ? avatar : null;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetComments(int newsId)
    {
        var newsExists = await _context.News.AnyAsync(n => n.Id == newsId);
        if (!newsExists)
            return NotFound(new { message = "Haber bulunamadı." });

        var isAdminOrAuthor = User?.IsInRole("admin") == true || User?.IsInRole("author") == true;
        
        // Debug: Add timestamp to see if cache is working
        Console.WriteLine($"[DEBUG] GetComments called for newsId: {newsId} at {DateTime.UtcNow:yyyy-MM-dd HH:mm:ss.fff}");
          // Get main comments (not replies) first - Force fresh data with AsNoTracking
        var mainCommentsQuery = _context.Comments
            .AsNoTracking() // Force fresh data from DB
            .Where(c => c.NewsId == newsId && c.ParentId == null);
        
        if (!isAdminOrAuthor)
            mainCommentsQuery = mainCommentsQuery.Where(c => c.Approved);        var mainComments = await mainCommentsQuery            .Include(c => c.Replies) // Include replies
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        // Kullanıcı avatarlarını toplu olarak çekmek için username listesi oluştur
        var usernames = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var c in mainComments)
        {
            if (!string.IsNullOrWhiteSpace(c.User)) usernames.Add(c.User);
            if (c.Replies != null)
            {
                foreach (var r in c.Replies)
                {
                    if (!string.IsNullOrWhiteSpace(r.User)) usernames.Add(r.User);
                }
            }
        }

        var avatars = await _context.Users
            .AsNoTracking()
            .Where(u => usernames.Contains(u.Username))
            .ToDictionaryAsync(u => u.Username, u => u.ProfilePicture);

        var commentDtos = new List<CommentDto>();

        foreach (var comment in mainComments)
        {
            var commentDto = new CommentDto
            {
                Id = comment.Id,
                User = comment.User,
                Text = comment.Text,
                Approved = comment.Approved,
                CreatedAt = comment.CreatedAt,
                ParentId = comment.ParentId,
                IsReply = comment.IsReply,
                HasReplies = (comment.Replies?.Count ?? 0) > 0,
                ReplyCount = comment.ReplyCount,
                Replies = new List<CommentDto>(),
                UserAvatar = GetAvatarFor(comment.User, avatars)
            };// Get approved replies or all replies for admin
            var repliesQuery = (comment.Replies ?? new List<Comment>()).AsQueryable();
            if (!isAdminOrAuthor)
                repliesQuery = repliesQuery.Where(r => r.Approved);            var replies = repliesQuery
                .OrderBy(r => r.CreatedAt)
                .Select(r => new CommentDto
                {
                    Id = r.Id,
                    User = r.User,
                    Text = r.Text,
                    Approved = r.Approved,
                    CreatedAt = r.CreatedAt,
                    ParentId = r.ParentId,
                    IsReply = r.IsReply,
                    HasReplies = false,
                    ReplyCount = 0, // Replies don't have sub-replies
                    UserAvatar = GetAvatarFor(r.User, avatars)
                })
                .ToList();

            commentDto.Replies = replies;
            commentDtos.Add(commentDto);
        }
        
        return Ok(commentDtos);
    }

    [Authorize]
    [HttpPost]
    public async Task<IActionResult> AddComment(int newsId, [FromBody] CommentCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(dto.Text) || dto.Text.Length < 2)
            return BadRequest(new { message = "Yorum en az 2 karakter olmalıdır." });

        if (dto.Text.Length > 1000)
            return BadRequest(new { message = "Yorum en fazla 1000 karakter olabilir." });

        var username = User.FindFirstValue(ClaimTypes.Name);
        if (string.IsNullOrEmpty(username))
            return Unauthorized();

    // Quote validation - alıntıların haber içeriğinde mevcut olup olmadığını kontrol et
    var quoteValidation = await ValidateQuotesAsync(newsId, dto.Text);
        if (!quoteValidation.IsValid)
            return BadRequest(new { message = quoteValidation.ErrorMessage });

        // Yasaklı kelime kontrolü: içeriyorsa otomatik reddet
        if (ContainsBannedWords(dto.Text ?? string.Empty))
            return BadRequest(new { message = "Yorum, yasaklı kelimeler içerdiği için otomatik olarak reddedildi." });

        // Use execution strategy for atomic comment creation with spam check
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var newsExists = await _context.News.AnyAsync(n => n.Id == newsId);
                if (!newsExists)
                    return NotFound(new { message = "Haber bulunamadı." });

                // Atomic spam check (same user commenting too frequently)
                var lastComment = await _context.Comments
                    .Where(c => c.User == username)
                    .OrderByDescending(c => c.CreatedAt)
                    .FirstOrDefaultAsync();

                if (lastComment != null && DateTime.UtcNow.Subtract(lastComment.CreatedAt).TotalMinutes < 1)
                    return BadRequest(new { message = "Çok sık yorum yapıyorsunuz. Lütfen 1 dakika bekleyin." });                // If this is a reply, validate parent comment
                Comment? parentComment = null;
                if (dto.ParentId.HasValue)
                {
                    parentComment = await _context.Comments
                        .FirstOrDefaultAsync(c => c.Id == dto.ParentId.Value && c.NewsId == newsId && c.Approved);
                    
                    if (parentComment == null)
                        return BadRequest(new { message = "Ana yorum bulunamadı veya henüz onaylanmamış." });
                    
                    // Prevent replies to replies (only 1-level deep)
                    if (parentComment.ParentId.HasValue)
                        return BadRequest(new { message = "Yanıtlara yanıt verilemez. Sadece ana yorumlara yanıt verebilirsiniz." });
                }

                var sanitizedText = SanitizeCommentText(dto.Text ?? string.Empty);

                var comment = new Comment
                {
                    NewsId = newsId,
                    User = username,
                    Text = sanitizedText,
                    Approved = true, // Uygun yorumlar otomatik onaylanır
                    ApprovedAt = DateTime.UtcNow,
                    ApprovedBy = "auto",
                    CreatedAt = DateTime.UtcNow,
                    ParentId = dto.ParentId // Include ParentId from DTO
                };

                _context.Comments.Add(comment);

                // Update parent comment reply count if this is a reply
                if (parentComment != null)
                {
                    parentComment.ReplyCount++;
                }
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                // Invalidate cache for this news
                await InvalidateNewsCache(newsId);                return Ok(new CommentDto
                {
                    Id = comment.Id,
                    User = comment.User,
                    Text = comment.Text,
                    Approved = comment.Approved,
                    CreatedAt = comment.CreatedAt,
                    ParentId = comment.ParentId,
                    IsReply = comment.IsReply,
                    ReplyCount = comment.ReplyCount,
                    UserAvatar = await _context.Users.AsNoTracking().Where(u => u.Username == comment.User).Select(u => u.ProfilePicture).FirstOrDefaultAsync()
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Yorum eklenirken bir hata oluştu.", error = ex.Message });
            }
        });
    }

    [Authorize(Roles = "admin,author")]
    [HttpGet("/api/yorumlar")]
    public async Task<ActionResult<IEnumerable<CommentAdminDto>>> GetAllComments([FromQuery] bool? approved = null)
    {
        var commentsQuery = _context.Comments
            .Include(c => c.News)
            .Include(c => c.Parent)
            .AsQueryable();
        
        if (approved.HasValue)
            commentsQuery = commentsQuery.Where(c => c.Approved == approved.Value);

    var comments = await commentsQuery
            .OrderByDescending(c => c.CreatedAt)            .Select(c => new CommentAdminDto
            {
                Id = c.Id,
                NewsId = c.NewsId,
                NewsTitle = c.News != null ? c.News.Title : "Haber Bulunamadı",
                User = c.User,
                Text = c.Text,
                Approved = c.Approved,
                CreatedAt = c.CreatedAt,
                ApprovedAt = c.ApprovedAt,
                ApprovedBy = c.ApprovedBy,
                ParentId = c.ParentId,
                IsReply = c.IsReply,
        ReplyCount = c.ReplyCount,
        ParentCommentText = c.Parent != null ? c.Parent.Text.Substring(0, Math.Min(c.Parent.Text.Length, 50)) + "..." : null,
        UserAvatar = _context.Users.Where(u => u.Username == c.User).Select(u => u.ProfilePicture).FirstOrDefault()
            })
            .ToListAsync();
        
        return Ok(comments);
    }    [Authorize(Roles = "admin,author")]
    [HttpPut("/api/yorumlar/{commentId}/onayla")]
    public async Task<IActionResult> ApproveCommentById(int commentId)
    {
        // Use execution strategy for atomic comment approval
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == commentId);
                if (comment == null) 
                    return NotFound(new { message = "Yorum bulunamadı." });
                
                if (comment.Approved)
                    return BadRequest(new { message = "Yorum zaten onaylanmış." });

                var approverUsername = User.FindFirstValue(ClaimTypes.Name);
                
                comment.Approved = true;
                comment.ApprovedAt = DateTime.UtcNow;
                comment.ApprovedBy = approverUsername;
                
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                // Invalidate cache
                await InvalidateNewsCache(comment.NewsId);
                
                return Ok(new { 
                    success = true, 
                    message = "Yorum başarıyla onaylandı.",
                    approvedBy = approverUsername,
                    approvedAt = comment.ApprovedAt
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Yorum onaylanırken bir hata oluştu.", error = ex.Message });
            }
        });
    }    [Authorize(Roles = "admin,author")]
    [HttpDelete("/api/yorumlar/{commentId}")]
    public async Task<IActionResult> DeleteCommentById(int commentId)
    {
        // Use execution strategy for atomic comment deletion
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == commentId);
                if (comment == null) 
                    return NotFound(new { message = "Yorum bulunamadı." });
                
                var newsId = comment.NewsId; // Store for cache invalidation
                
                _context.Comments.Remove(comment);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                // Invalidate cache
                await InvalidateNewsCache(newsId);
                
                return Ok(new { 
                    success = true, 
                    message = "Yorum başarıyla silindi." 
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Yorum silinirken bir hata oluştu.", error = ex.Message });
            }
        });
    }    [Authorize(Roles = "admin,author")]
    [HttpPut("/api/yorumlar/{commentId}/reddet")]
    public async Task<IActionResult> RejectCommentById(int commentId)
    {
        // Use execution strategy for atomic comment rejection
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var comment = await _context.Comments.FirstOrDefaultAsync(c => c.Id == commentId);
                if (comment == null) 
                    return NotFound(new { message = "Yorum bulunamadı." });
                
                if (!comment.Approved)
                    return BadRequest(new { message = "Yorum zaten onaylanmamış." });

                comment.Approved = false;
                comment.ApprovedAt = null;
                comment.ApprovedBy = null;
                
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                // Invalidate cache
                await InvalidateNewsCache(comment.NewsId);
                
                return Ok(new { 
                    success = true, 
                    message = "Yorum onayı geri alındı." 
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Yorum onayı geri alınırken bir hata oluştu.", error = ex.Message });
            }
        });
    }    // Private helper methods
    private async Task<(bool IsValid, string ErrorMessage)> ValidateQuotesAsync(int newsId, string commentText)
    {
        try
        {
            // Quote pattern: [QUOTE]...[/QUOTE]
            var quotePattern = @"\[QUOTE\](.*?)\[\/QUOTE\]";
            var matches = System.Text.RegularExpressions.Regex.Matches(commentText, quotePattern, 
                System.Text.RegularExpressions.RegexOptions.IgnoreCase | 
                System.Text.RegularExpressions.RegexOptions.Singleline);

            if (matches.Count == 0)
                return (true, ""); // No quotes to validate

            // Basit kontroller
            if (matches.Count > 3)
                return (false, "Bir yorumda en fazla 3 alıntı yapabilirsiniz.");

            // Haber içeriğini al
            var news = await _context.News
                .AsNoTracking()
                .Where(n => n.Id == newsId)
                .Select(n => new { n.Content, n.Title, n.Summary })
                .FirstOrDefaultAsync();

            if (news == null)
                return (false, "Haber bulunamadı.");

            var fullNewsContent = $"{news.Title} {news.Summary} {news.Content}".ToLowerInvariant();

            // Her quote'u basit kontrol et
            foreach (System.Text.RegularExpressions.Match match in matches)
            {
                var quotedText = match.Groups[1].Value.Trim();
                
                if (string.IsNullOrWhiteSpace(quotedText))
                    return (false, "Boş alıntı yapılamaz.");

                if (quotedText.Length > 500)
                    return (false, "Alıntı en fazla 500 karakter olabilir.");

                if (quotedText.Length < 5)
                    return (false, "Alıntı en az 5 karakter olmalıdır.");

                // Basit içerik kontrolü - alıntının haber içeriğinde mevcut olup olmadığı
                var normalizedQuote = quotedText.ToLowerInvariant().Trim();
                if (!fullNewsContent.Contains(normalizedQuote))
                    return (false, "Alıntı haber içeriğinden alınmalıdır.");
            }

            return (true, "");
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Quote validation error: {ex.Message}");
            return (false, "Alıntı doğrulama sırasında bir hata oluştu.");
        }
    }    private async Task InvalidateNewsCache(int newsId)
    {
        // News detail cache'ini temizle
        var cacheKey = string.Format(CacheKeys.NEWS_DETAIL, newsId);
        await _cache.RemoveAsync(cacheKey);
        
        // News list cache'lerini de temizle
        await _cache.RemovePatternAsync("news_list_");
        await _cache.RemovePatternAsync("news_category_");
        await _cache.RemovePatternAsync("featured_news_");
        await _cache.RemovePatternAsync("popular_news_");
        
        Console.WriteLine($"[DEBUG] Cache invalidated for news {newsId}");
    }

    // Reply to a comment
    [HttpPost("{commentId}/reply")]
    [Authorize]
    public async Task<ActionResult<CommentDto>> ReplyToComment(int newsId, int commentId, [FromBody] CommentReplyDto dto)
    {
        try
        {
            // Check if news exists and is approved
            var news = await _context.News.FirstOrDefaultAsync(n => n.Id == newsId && n.IsApproved);
            if (news == null)
                return NotFound(new { message = "Haber bulunamadı veya henüz onaylanmamış." });

            // Check if parent comment exists and is approved
            var parentComment = await _context.Comments
                .FirstOrDefaultAsync(c => c.Id == commentId && c.NewsId == newsId && c.Approved);
            
            if (parentComment == null)
                return NotFound(new { message = "Ana yorum bulunamadı veya henüz onaylanmamış." });

            // Prevent replies to replies (only 1-level deep)
            if (parentComment.ParentId.HasValue)
                return BadRequest(new { message = "Yanıtlara yanıt verilemez. Sadece ana yorumlara yanıt verebilirsiniz." });

            var username = User?.Identity?.Name;
            if (string.IsNullOrEmpty(username))
                return Unauthorized(new { message = "Kullanıcı bilgileri alınamadı." });            // Content validation
            var (isValid, errorMessage) = await ValidateQuotesAsync(newsId, dto.Text);
            if (!isValid)
                return BadRequest(new { message = errorMessage });

            // Yasaklı kelime kontrolü: içeriyorsa otomatik reddet
            if (ContainsBannedWords(dto.Text ?? string.Empty))
                return BadRequest(new { message = "Yanıt, yasaklı kelimeler içerdiği için otomatik olarak reddedildi." });

            var reply = new Comment
            {
                NewsId = newsId,
                ParentId = commentId,
                User = username,
                Text = SanitizeCommentText(dto.Text ?? string.Empty),
                Approved = true, // Uygun yanıtlar otomatik onaylanır
                ApprovedAt = DateTime.UtcNow,
                ApprovedBy = "auto",
                CreatedAt = DateTime.UtcNow
            };            _context.Comments.Add(reply);

            // Update parent comment reply count
            parentComment.ReplyCount++;
            
            Console.WriteLine($"[DEBUG] Adding reply to comment {parentComment.Id}, new reply count: {parentComment.ReplyCount}");
            
            await _context.SaveChangesAsync();

            Console.WriteLine($"[DEBUG] Reply saved with ID: {reply.Id}, ParentId: {reply.ParentId}");

            // Invalidate cache
            await InvalidateNewsCache(newsId);

            var replyDto = new CommentDto
            {
                Id = reply.Id,
                User = reply.User,
                Text = reply.Text,
                Approved = reply.Approved,
                CreatedAt = reply.CreatedAt,
                ParentId = reply.ParentId,
                IsReply = reply.IsReply,
                ReplyCount = 0,
                UserAvatar = await _context.Users.AsNoTracking().Where(u => u.Username == reply.User).Select(u => u.ProfilePicture).FirstOrDefaultAsync()
            };

            return CreatedAtAction(nameof(GetComments), new { newsId }, replyDto);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { message = "Yanıt eklenirken bir hata oluştu.", error = ex.Message });
        }
    }

    // Get replies for a specific comment
    [HttpGet("{commentId}/replies")]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetCommentReplies(int newsId, int commentId)
    {
        var parentComment = await _context.Comments
            .FirstOrDefaultAsync(c => c.Id == commentId && c.NewsId == newsId);
        
        if (parentComment == null)
            return NotFound(new { message = "Ana yorum bulunamadı." });

        var isAdminOrAuthor = User?.IsInRole("admin") == true || User?.IsInRole("author") == true;
        
        var repliesQuery = _context.Comments
            .Where(c => c.ParentId == commentId);
        
        if (!isAdminOrAuthor)
            repliesQuery = repliesQuery.Where(c => c.Approved);

        // Avatarlar için kullanıcı adlarını topla
        var replyUsernames = await repliesQuery.Select(c => c.User).Distinct().ToListAsync();
        var avatars = await _context.Users.AsNoTracking()
            .Where(u => replyUsernames.Contains(u.Username))
            .ToDictionaryAsync(u => u.Username, u => u.ProfilePicture);

        var replies = await repliesQuery
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto
            {
                Id = c.Id,
                User = c.User,
                Text = c.Text,
                Approved = c.Approved,
                CreatedAt = c.CreatedAt,
                ParentId = c.ParentId,
                IsReply = c.IsReply,
                ReplyCount = 0,
                UserAvatar = GetAvatarFor(c.User, avatars)
            })
            .ToListAsync();

        return Ok(replies);
    }

    // Frontend uyumluluğu için alias endpoint: /api/yorumlar/{commentId}/replies
    [HttpGet("/api/yorumlar/{commentId}/replies")]
    public async Task<ActionResult<IEnumerable<CommentDto>>> GetCommentRepliesAlias(int commentId)
    {
        var parent = await _context.Comments.AsNoTracking().FirstOrDefaultAsync(c => c.Id == commentId);
        if (parent == null)
            return NotFound(new { message = "Ana yorum bulunamadı." });

        var isAdminOrAuthor = User?.IsInRole("admin") == true || User?.IsInRole("author") == true;

        var repliesQuery = _context.Comments.Where(c => c.ParentId == commentId);
        if (!isAdminOrAuthor)
            repliesQuery = repliesQuery.Where(c => c.Approved);

        var replyUsernames = await repliesQuery.Select(c => c.User).Distinct().ToListAsync();
        var avatars = await _context.Users.AsNoTracking()
            .Where(u => replyUsernames.Contains(u.Username))
            .ToDictionaryAsync(u => u.Username, u => u.ProfilePicture);

        var replies = await repliesQuery
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto
            {
                Id = c.Id,
                User = c.User,
                Text = c.Text,
                Approved = c.Approved,
                CreatedAt = c.CreatedAt,
                ParentId = c.ParentId,
                IsReply = c.IsReply,
                ReplyCount = 0,
                UserAvatar = GetAvatarFor(c.User, avatars)
            })
            .ToListAsync();

        return Ok(replies);
    }
}
