using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using habersitesi_backend.Models;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;
using System.Text.RegularExpressions;
using System.Text;
using habersitesi_backend.Dtos;
using habersitesi_backend.Services;
using System.ComponentModel.DataAnnotations;

[ApiController]
[Route("api/haber")]
public class NewsController : ControllerBase
{    private readonly AppDbContext _context;
    private readonly IFileService _fileService;
    private readonly ICacheService _cache;
    private readonly IRelatedNewsService _relatedNewsService;

    public NewsController(AppDbContext context, IFileService fileService, ICacheService cache, IRelatedNewsService relatedNewsService)
    {
        _context = context;
        _fileService = fileService;
        _cache = cache;
        _relatedNewsService = relatedNewsService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? category, 
        [FromQuery] string? q,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] bool? featured = null,
        [FromQuery] string? sortBy = "date",
        [FromQuery] bool? approved = null) // Admin için pending haberleri görmek için
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 50) pageSize = 10;        // Cache key için parametreleri hash'le - approved parametresi de dahil
        var cacheKey = $"news_list_{category}_{q}_{page}_{pageSize}_{featured}_{sortBy}_{approved}";
        
        var cachedResult = await _cache.GetAsync<object>(cacheKey);
        if (cachedResult != null)
        {
            return Ok(cachedResult);
        }        // Optimized query - performans için AsNoTracking ve AsQueryable kullan
        var baseQuery = _context.News
            .AsNoTracking()
            .Include(n => n.ApprovedBy) // Admin bilgisi için
            .AsQueryable();
            
        // Approval filter - eğer approved parametresi belirtilmemişse sadece approved haberleri göster
        if (approved == null)
        {
            baseQuery = baseQuery.Where(n => n.IsApproved); // Varsayılan: sadece onaylanmış haberler
        }
        else if (approved == true)
        {
            baseQuery = baseQuery.Where(n => n.IsApproved); // Sadece onaylanmış haberler
        }
        else if (approved == false)
        {
            baseQuery = baseQuery.Where(n => !n.IsApproved); // Sadece onay bekleyen haberler
        }
        
        // Filters
        if (!string.IsNullOrEmpty(category))
            baseQuery = baseQuery.Where(n => n.Category == category);
        
        if (!string.IsNullOrEmpty(q))
            baseQuery = baseQuery.Where(n => 
                EF.Functions.ILike(n.Title, $"%{q}%") || 
                EF.Functions.ILike(n.Content ?? "", $"%{q}%") || 
                EF.Functions.ILike(n.Summary ?? "", $"%{q}%"));
        
        if (featured.HasValue)
            baseQuery = baseQuery.Where(n => n.Featured == featured.Value);// Sorting
        var query = sortBy?.ToLower() switch
        {
            "title" => baseQuery.OrderBy(n => n.Title),
            "category" => baseQuery.OrderBy(n => n.Category).ThenByDescending(n => n.Date),
            "featured" => baseQuery.OrderByDescending(n => n.Featured).ThenByDescending(n => n.Date),
            _ => baseQuery.OrderByDescending(n => n.Date)
        };

        // Get total count first - performans için asenkron
        var totalCount = await query.CountAsync();

        // Optimized projection - Comment count'u ayrı query ile optimize et
        var newsIds = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => n.Id)
            .ToListAsync();

        // Bulk comment counts - tek query ile tüm comment sayılarını al
        var commentCounts = await _context.Comments
            .AsNoTracking()
            .Where(c => newsIds.Contains(c.NewsId) && c.Approved)
            .GroupBy(c => c.NewsId)
            .Select(g => new { NewsId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.NewsId, x => x.Count);        // Ana news verilerini al - User join ile AuthorDisplayName bilgisini de çek
        var news = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_context.Users,
                n => n.Author,
                u => u.Username,
                (n, u) => new { News = n, User = u })
            .Select(nu => new NewsListDto
            {
                Id = nu.News.Id,
                Title = nu.News.Title,
                Summary = nu.News.Summary,
                Image = nu.News.Image,
                Category = nu.News.Category,
                Date = nu.News.Date,
                Author = nu.News.Author,
                AuthorDisplayName = !string.IsNullOrWhiteSpace(nu.User.DisplayName) ? nu.User.DisplayName :
                                   (!string.IsNullOrWhiteSpace(nu.User.FirstName) || !string.IsNullOrWhiteSpace(nu.User.LastName)) ? 
                                   (nu.User.FirstName + " " + nu.User.LastName).Trim() : nu.User.Username,
                AuthorId = nu.User.Id,
                Featured = nu.News.Featured,
                FeaturedPriority = nu.News.FeaturedPriority,
                Tags = nu.News.Tags,
                ViewCount = nu.News.ViewCount,
                LastViewedAt = nu.News.LastViewedAt,
                CommentCount = 0, // Will be filled below
                IsApproved = nu.News.IsApproved,
                ApprovedByUsername = nu.News.ApprovedBy != null ? nu.News.ApprovedBy.Username : null,
                ApprovedAt = nu.News.ApprovedAt
            })
            .ToListAsync();// Comment count'ları doldur
        foreach (var newsItem in news)
        {
            newsItem.CommentCount = commentCounts.GetValueOrDefault(newsItem.Id, 0);
        }

        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

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
        };        // Cache for 2 minutes - yeni postların daha hızlı görünmesi için
        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(2));

        return Ok(result);
    }

    [HttpGet("ara")]
    public async Task<IActionResult> Search(
        [FromQuery] string? q, 
        [FromQuery] string? category,
        [FromQuery] string? author,
        [FromQuery] string? tags,
        [FromQuery] DateTime? startDate,
        [FromQuery] DateTime? endDate,
        [FromQuery] bool? featured,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 10,
        [FromQuery] string? sortBy = "relevance")
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 50) pageSize = 10;

        var cacheKey = $"news_search_{q}_{category}_{author}_{tags}_{startDate}_{endDate}_{featured}_{page}_{pageSize}_{sortBy}".GetHashCode();
        
        var cachedResult = await _cache.GetAsync<object>(cacheKey.ToString());
        if (cachedResult != null)
        {
            return Ok(cachedResult);
        }

        var query = _context.News
            .AsNoTracking()
            .Where(n => n.IsApproved); // Sadece onaylanmış haberler
        
        // Optimized text search using PostgreSQL ILike
        if (!string.IsNullOrEmpty(q))
        {
            query = query.Where(n => 
                EF.Functions.ILike(n.Title, $"%{q}%") || 
                EF.Functions.ILike(n.Content ?? "", $"%{q}%") || 
                EF.Functions.ILike(n.Summary ?? "", $"%{q}%") ||
                EF.Functions.ILike(n.Tags ?? "", $"%{q}%"));
        }
        
        if (!string.IsNullOrEmpty(category))
            query = query.Where(n => n.Category == category);
            
        if (!string.IsNullOrEmpty(author))
            query = query.Where(n => n.Author != null && EF.Functions.ILike(n.Author, $"%{author}%"));
            
        if (!string.IsNullOrEmpty(tags))
        {
            var tagList = tags.Split(',').Select(t => t.Trim()).ToList();
            query = query.Where(n => n.Tags != null && 
                tagList.Any(tag => EF.Functions.ILike(n.Tags, $"%{tag}%")));
        }
        
        if (startDate.HasValue)
            query = query.Where(n => n.Date >= startDate.Value);
        if (endDate.HasValue)
            query = query.Where(n => n.Date <= endDate.Value);
            
        if (featured.HasValue)
            query = query.Where(n => n.Featured == featured.Value);

        // Optimized sorting
        query = sortBy?.ToLower() switch
        {
            "date" => query.OrderByDescending(n => n.Date),
            "title" => query.OrderBy(n => n.Title),
            "author" => query.OrderBy(n => n.Author),
            "relevance" when !string.IsNullOrEmpty(q) => query.OrderByDescending(n => 
                (EF.Functions.ILike(n.Title, $"%{q}%") ? 3 : 0) +
                (n.Summary != null && EF.Functions.ILike(n.Summary, $"%{q}%") ? 2 : 0) +
                (n.Content != null && EF.Functions.ILike(n.Content, $"%{q}%") ? 1 : 0)),
            _ => query.OrderByDescending(n => n.Date)
        };

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);        var news = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Join(_context.Users,
                n => n.Author,
                u => u.Username,
                (n, u) => new { News = n, User = u })
            .Select(nu => new NewsListDto
            {
                Id = nu.News.Id,
                Title = nu.News.Title,
                Summary = nu.News.Summary,
                Image = nu.News.Image,
                Category = nu.News.Category,
                Date = nu.News.Date,
                Author = nu.News.Author,
                AuthorDisplayName = !string.IsNullOrWhiteSpace(nu.User.DisplayName) ? nu.User.DisplayName :
                                   (!string.IsNullOrWhiteSpace(nu.User.FirstName) || !string.IsNullOrWhiteSpace(nu.User.LastName)) ? 
                                   (nu.User.FirstName + " " + nu.User.LastName).Trim() : nu.User.Username,
                AuthorId = nu.User.Id,
                AuthorProfilePicture = nu.User.ProfilePicture,
                Featured = nu.News.Featured,
                Tags = nu.News.Tags,
                CommentCount = _context.Comments.Count(c => c.NewsId == nu.News.Id && c.Approved),
                IsApproved = nu.News.IsApproved,
                ApprovedByUsername = nu.News.ApprovedBy != null ? nu.News.ApprovedBy.Username : null,
                ApprovedAt = nu.News.ApprovedAt
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
            },
            searchQuery = q,
            filters = new
            {
                category,
                author,
                tags,
                startDate,
                endDate,
                featured,
                sortBy
            }
        };        // Cache search results for 2 minutes
        await _cache.SetAsync(cacheKey.ToString(), result, TimeSpan.FromMinutes(2));

        return Ok(result);
    }

    [HttpGet("manset")]
    public async Task<IActionResult> GetFeatured([FromQuery] int count = 5)
    {
        if (count < 1 || count > 20) count = 5;

        var cacheKey = $"{CacheKeys.FEATURED_NEWS}_{count}";
        
        var cachedNews = await _cache.GetAsync<List<NewsListDto>>(cacheKey);
        if (cachedNews != null)
        {
            return Ok(cachedNews);
        }

        // Get news IDs first to optimize comment count query - FeaturedPriority'ye göre sıralı
        var newsIds = await _context.News
            .AsNoTracking()
            .Where(n => n.Featured && n.FeaturedPriority > 0)
            .OrderBy(n => n.FeaturedPriority) // 1-5 arası, 1 en yüksek öncelik
            .ThenByDescending(n => n.Date)    // Aynı öncelikse en yeni ilk
            .Take(count)
            .Select(n => n.Id)
            .ToListAsync();

        // Bulk comment counts - tek query ile tüm comment sayılarını al
        var commentCounts = await _context.Comments
            .AsNoTracking()
            .Where(c => newsIds.Contains(c.NewsId) && c.Approved)
            .GroupBy(c => c.NewsId)
            .Select(g => new { NewsId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.NewsId, x => x.Count);        // Ana news verilerini al - FeaturedPriority'ye göre sıralı
        var featuredNews = await _context.News
            .AsNoTracking()
            .Where(n => n.Featured && n.FeaturedPriority > 0)
            .OrderBy(n => n.FeaturedPriority) // 1-5 arası, 1 en yüksek öncelik
            .ThenByDescending(n => n.Date)    // Aynı öncelikse en yeni ilk
            .Take(count)
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
                FeaturedPriority = n.FeaturedPriority,
                Tags = n.Tags,
                ViewCount = n.ViewCount,
                LastViewedAt = n.LastViewedAt,
                CommentCount = 0 // Will be filled below
            })
            .ToListAsync();

        // Comment count'ları doldur
        foreach (var newsItem in featuredNews)
        {
            newsItem.CommentCount = commentCounts.GetValueOrDefault(newsItem.Id, 0);
        }

        // Cache for 15 minutes
        await _cache.SetAsync(cacheKey, featuredNews, TimeSpan.FromMinutes(15));

        return Ok(featuredNews);
    }

    [HttpGet("kategoriye-gore/{category}")]
    public async Task<IActionResult> GetByCategory(
        string category, 
        [FromQuery] int page = 1, 
        [FromQuery] int pageSize = 10)
    {
        if (page < 1) page = 1;
        if (pageSize < 1 || pageSize > 50) pageSize = 10;

        var cacheKey = string.Format(CacheKeys.NEWS_BY_CATEGORY + "_{1}_{2}", category, page, pageSize);
        
        var cachedResult = await _cache.GetAsync<object>(cacheKey);
        if (cachedResult != null)
        {
            return Ok(cachedResult);
        }        // Check if category exists (cached) - use database case-insensitive comparison
        var categoryExists = await _context.Categories
            .AsNoTracking()
            .AnyAsync(c => EF.Functions.ILike(c.Name, category.Trim()));
        
        if (!categoryExists)
            return NotFound(new { message = "Kategori bulunamadı." });        var query = _context.News
            .AsNoTracking()
            .Where(n => n.Category == category);

        var totalCount = await query.CountAsync();
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        // Get news IDs first to optimize comment count query
        var newsIds = await query
            .OrderByDescending(n => n.Date)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => n.Id)
            .ToListAsync();

        // Bulk comment counts - tek query ile tüm comment sayılarını al
        var commentCounts = await _context.Comments
            .AsNoTracking()
            .Where(c => newsIds.Contains(c.NewsId) && c.Approved)
            .GroupBy(c => c.NewsId)
            .Select(g => new { NewsId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.NewsId, x => x.Count);        // Ana news verilerini al
        var news = await query
            .OrderByDescending(n => n.Date)
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
                FeaturedPriority = n.FeaturedPriority,
                Tags = n.Tags,
                IsApproved = true,
                ViewCount = n.ViewCount,
                LastViewedAt = n.LastViewedAt,
                CommentCount = 0 // Will be filled below
            })
            .ToListAsync();

        // Comment count'ları doldur
        foreach (var newsItem in news)
        {
            newsItem.CommentCount = commentCounts.GetValueOrDefault(newsItem.Id, 0);
        }

        var result = new
        {
            data = news,
            category = category,
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

        // Cache for 10 minutes
        await _cache.SetAsync(cacheKey, result, TimeSpan.FromMinutes(10));

        return Ok(result);
    }    [Authorize(Roles = "admin,author")]
    [HttpPost]
    public async Task<IActionResult> Create([FromBody] NewsCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Length < 5)
            return BadRequest(new { message = "Başlık en az 5 karakter olmalıdır." });

        if (string.IsNullOrWhiteSpace(dto.Category))
            return BadRequest(new { message = "Kategori zorunludur." });        // Use execution strategy for atomic news creation
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Check if category exists - use database case-insensitive comparison
                var categoryExists = await _context.Categories
                    .AsNoTracking()
                    .AnyAsync(c => EF.Functions.ILike(c.Name, dto.Category.Trim()));
                
                if (!categoryExists)
                    return BadRequest(new { message = "Geçersiz kategori." });

                // Atomic duplicate title check
                var titleExists = await _context.News
                    .AnyAsync(n => n.Title.ToLower() == dto.Title.ToLower());
                
                if (titleExists)
                    return BadRequest(new { message = "Bu başlıkta bir haber zaten mevcut." });                var author = User.FindFirstValue(ClaimTypes.Name);
                var news = new News
                {
                    Title = dto.Title.Trim(),
                    Summary = dto.Summary?.Trim(),
                    Image = dto.Image,
                    Category = dto.Category.Trim(),
                    Content = dto.Content,
                    Featured = User.IsInRole("admin") ? dto.Featured : false, // Only admin can set featured
                    Date = DateTime.UtcNow,
                    Author = author,
                    Tags = dto.Tags?.Trim(),
                    IsApproved = false // Yeni haberler onaylanmamış olarak oluşturulur
                };

                if (!string.IsNullOrEmpty(news.Image) && news.Image.StartsWith("http"))
                    news.Image = await _fileService.DownloadImageAsync(news.Image, HttpContext);

                if (!string.IsNullOrEmpty(news.Content))
                    news.Content = await _fileService.SaveBase64ImagesAndUpdateHtml(news.Content, HttpContext);

                _context.News.Add(news);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                // Invalidate cache after creating news
                await InvalidateNewsCache();
                
                return CreatedAtAction(nameof(GetByIdOrSlug), new { idOrSlug = news.Id.ToString() }, new { news.Id, message = "Haber başarıyla oluşturuldu." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Haber oluşturulurken bir hata oluştu.", error = ex.Message });
            }        });
    }

    [Authorize(Roles = "admin,author")]
    [HttpPut("{id}")]
    public async Task<IActionResult> Update(int id, [FromBody] NewsUpdateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        try
        {
            // Use execution strategy for atomic news update
            var strategy = _context.Database.CreateExecutionStrategy();
            await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var news = await _context.News.FindAsync(id);
                    if (news == null) 
                        throw new ArgumentException("Haber bulunamadı.");

                    var currentUser = User.FindFirstValue(ClaimTypes.Name);
                    var isAdmin = User.IsInRole("admin");
                    var isAuthor = User.IsInRole("author");

                    // Only admin or the author can update
                    if (!isAdmin && (!isAuthor || news.Author != currentUser))
                        throw new UnauthorizedAccessException("Bu haberi düzenleme yetkiniz yok.");

                    if (string.IsNullOrWhiteSpace(dto.Title) || dto.Title.Length < 5)
                        throw new ArgumentException("Başlık en az 5 karakter olmalıdır.");

                    if (string.IsNullOrWhiteSpace(dto.Category))
                        throw new ArgumentException("Kategori zorunludur.");

                    // Check if category exists - use database case-insensitive comparison
                    var categoryExists = await _context.Categories
                        .AsNoTracking()
                        .AnyAsync(c => EF.Functions.ILike(c.Name, dto.Category.Trim()));
                    
                    if (!categoryExists)
                        throw new ArgumentException("Geçersiz kategori.");

                    // Atomic duplicate title check (excluding current news)
                    var titleExists = await _context.News
                        .AnyAsync(n => n.Id != id && n.Title.ToLower() == dto.Title.ToLower());
                    
                    if (titleExists)
                        throw new ArgumentException("Bu başlıkta bir haber zaten mevcut.");                    news.Title = dto.Title.Trim();
                    news.Summary = dto.Summary?.Trim();
                    news.Category = dto.Category.Trim();
                    news.Featured = isAdmin ? dto.Featured : news.Featured; // Only admin can change featured status
                    news.Tags = dto.Tags?.Trim();

                    // Handle image update and delete old image if needed
                    var oldImage = news.Image;
                    if (!string.IsNullOrEmpty(dto.Image) && dto.Image.StartsWith("http"))
                        news.Image = await _fileService.DownloadImageAsync(dto.Image, HttpContext);
                    else if (!string.IsNullOrEmpty(dto.Image))
                        news.Image = dto.Image;

                    // Delete old image if it was replaced and is from uploads folder
                    if (!string.IsNullOrEmpty(oldImage) && oldImage != news.Image && oldImage.Contains("/uploads/"))
                    {
                        _ = Task.Run(async () => await _fileService.DeleteFileAsync(oldImage));
                    }

                    if (!string.IsNullOrEmpty(dto.Content))
                        news.Content = await _fileService.SaveBase64ImagesAndUpdateHtml(dto.Content, HttpContext);
                    else
                        news.Content = dto.Content;

                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                // Invalidate cache after updating news
                await InvalidateNewsCache();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        return Ok(new { message = "Haber başarıyla güncellendi." });
    }
    catch (ArgumentException ex)
    {
        return BadRequest(new { message = ex.Message });
    }
    catch (UnauthorizedAccessException)
    {
        return Forbid();
    }
    catch (Exception ex)
    {
        return StatusCode(500, new { message = "Haber güncellenirken bir hata oluştu.", error = ex.Message });
    }
}    [Authorize(Roles = "admin,author")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(int id)
    {
        var news = await _context.News.Include(n => n.Comments).FirstOrDefaultAsync(n => n.Id == id);
        if (news == null) 
            return NotFound(new { message = "Haber bulunamadı." });

        var currentUser = User.FindFirstValue(ClaimTypes.Name);
        var isAdmin = User.IsInRole("admin");
        var isAuthor = User.IsInRole("author");
        // Only admin or the author can delete
        if (!isAdmin && (!isAuthor || news.Author != currentUser))
            return Forbid();

        // Collect files to delete
        var filesToDelete = new List<string>();

        // Ana haber resmi
        if (!string.IsNullOrEmpty(news.Image) && news.Image.Contains("/uploads/"))
        {
            filesToDelete.Add(news.Image);
        }

        // İçerikteki resimler
        if (!string.IsNullOrEmpty(news.Content))
        {
            var contentImages = await _fileService.ExtractImageUrlsFromHtml(news.Content);
            filesToDelete.AddRange(contentImages);
        }

        // Delete associated comments first
        if (news.Comments?.Any() == true)
            _context.Comments.RemoveRange(news.Comments);

        _context.News.Remove(news);
        await _context.SaveChangesAsync();
        
        // Delete associated files after successful database deletion
        foreach (var fileUrl in filesToDelete.Distinct())
        {
            _ = Task.Run(async () => await _fileService.DeleteFileAsync(fileUrl));
        }
        
        // Invalidate cache after deleting news
        await InvalidateNewsCache();
        
        return Ok(new { 
            success = true, 
            message = "Haber, yorumlar ve ilgili dosyalar başarıyla silindi.",
            deletedFilesCount = filesToDelete.Distinct().Count()
        });
    }

    [Authorize(Roles = "author,admin")]
    [HttpPost("resim-yukle")]
    public async Task<IActionResult> UploadImage([FromForm] IFormFile file)
    {
        var result = await _fileService.UploadImageAsync(file, HttpContext);
        if (!result.Success)
            return BadRequest(new { message = result.Message });
        return Ok(new { url = result.Url });
    }

    [HttpPost("coklu-resim-yukle")]
    [Authorize(Roles = "author,admin")]
    public async Task<IActionResult> UploadMultipleImages(IFormFileCollection files)
    {
        var result = await _fileService.UploadMultipleImagesAsync(files, HttpContext);
        if (!result.Success)
            return BadRequest(new { message = result.Message });
        return Ok(new { urls = result.Urls });
    }

    [HttpPost("resim-boyutlandir")]
    [Authorize(Roles = "author,admin")]
    public async Task<IActionResult> ResizeImage(IFormFile file, [FromQuery] int width = 800, [FromQuery] int height = 600)
    {        var result = await _fileService.ResizeImageAsync(file, width, height, HttpContext);
        if (!result.Success)
            return BadRequest(new { message = result.Message });
        
        return Ok(new { url = result.Url });
    }

    [HttpGet("gallery")]
    public IActionResult GetImageGallery([FromQuery] int page = 1, [FromQuery] int pageSize = 20)
    {
        try 
        {
            var wwwrootPath = Path.Combine(Directory.GetCurrentDirectory(), "wwwroot");
            var uploadsPath = Path.Combine(wwwrootPath, "uploads");
            if (!Directory.Exists(uploadsPath))
                return Ok(new { images = new List<object>(), totalCount = 0 });

            var imageFiles = Directory.GetFiles(uploadsPath)
                .Where(f => new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" }
                    .Contains(Path.GetExtension(f).ToLowerInvariant()))
                .OrderByDescending(f => new FileInfo(f).CreationTime)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(f => new
                {
                    name = Path.GetFileName(f),
                    url = $"{Request.Scheme}://{Request.Host}/uploads/{Path.GetFileName(f)}",
                    size = new FileInfo(f).Length,
                    createdAt = new FileInfo(f).CreationTime
                })
                .ToList();

            var totalCount = Directory.GetFiles(uploadsPath)
                .Count(f => new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" }
                    .Contains(Path.GetExtension(f).ToLowerInvariant()));

            return Ok(new { images = imageFiles, totalCount, page, pageSize });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Galeri yüklenirken hata oluştu: " + ex.Message });
        }
    }
    // Cache invalidation methods
    private async Task InvalidateNewsCache()
    {
        // Specific cache patterns to avoid accidentally removing unrelated cache
        await _cache.RemovePatternAsync("news_list_");
        await _cache.RemovePatternAsync("news_search_");
        await _cache.RemovePatternAsync("news_category_");
        await _cache.RemovePatternAsync("news_detail_");
        await _cache.RemovePatternAsync(CacheKeys.FEATURED_NEWS);
        await _cache.RemoveAsync(CacheKeys.RECENT_NEWS);
    }

    private async Task InvalidateCategoryCache()
    {        await _cache.RemoveAsync(CacheKeys.CATEGORIES);
        await _cache.RemoveAsync(CacheKeys.CATEGORIES_WITH_COUNT);
    }    [HttpPost("{id}/manset-yap")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> MakeFeatured(int id, [FromQuery] int priority = 1)
    {
        var news = await _context.News.FirstOrDefaultAsync(n => n.Id == id);
        if (news == null)
            return NotFound(new { message = "Haber bulunamadı." });

        // Priority 1-5 arası olmalı
        if (priority < 1 || priority > 5)
            return BadRequest(new { message = "Öncelik 1-5 arası olmalıdır." });

        try
        {
            // Use execution strategy for atomic featured management
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Mevcut featured haberlerin sayısını kontrol et
                    var currentFeaturedCount = await _context.News
                        .Where(n => n.Featured && n.FeaturedPriority > 0)
                        .CountAsync();

                    // Eğer 5 featured haber varsa ve yeni ekliyorsak
                    if (currentFeaturedCount >= 5)
                    {
                        // En düşük öncelikli (en büyük FeaturedPriority değeri) haberi bul ve çıkar
                        var oldestFeatured = await _context.News
                            .Where(n => n.Featured && n.FeaturedPriority > 0)
                            .OrderByDescending(n => n.FeaturedPriority)
                            .ThenBy(n => n.Date) // Aynı öncelikse en eskisi çıkar
                            .FirstOrDefaultAsync();

                        if (oldestFeatured != null)
                        {
                            oldestFeatured.Featured = false;
                            oldestFeatured.FeaturedPriority = 0;
                        }
                    }

                    // Belirtilen öncelik zaten mevcutsa, diğer haberlerin önceliklerini kaydır
                    var existingAtPriority = await _context.News
                        .Where(n => n.Featured && n.FeaturedPriority == priority && n.Id != id)
                        .ToListAsync();

                    foreach (var existingNews in existingAtPriority)
                    {
                        // Mevcut önceliği 1 artır (önceliği düşür), ama max 5'i geçmesin
                        if (existingNews.FeaturedPriority < 5)
                        {
                            existingNews.FeaturedPriority++;
                        }
                        else
                        {
                            // Öncelik 5'ten büyük olacaksa featured'dan çıkar
                            existingNews.Featured = false;
                            existingNews.FeaturedPriority = 0;
                        }
                    }

                    // Seçilen haberi featured yap
                    news.Featured = true;
                    news.FeaturedPriority = priority;

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Cache'i temizle
                    await InvalidateNewsCache();

                    return Ok(new { 
                        message = $"Haber başarıyla {priority}. öncelikle featured olarak işaretlendi.",
                        featuredNewsId = id,
                        featuredNewsTitle = news.Title,
                        priority = priority
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { message = "Featured işlemi sırasında hata oluştu", error = ex.Message });
                }
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Featured işlemi sırasında hata oluştu: " + ex.Message });
        }
    }    [HttpPost("{id}/manset-kaldir")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> RemoveFeatured(int id)
    {
        var news = await _context.News.FirstOrDefaultAsync(n => n.Id == id);
        if (news == null)
            return NotFound(new { message = "Haber bulunamadı." });

        if (!news.Featured || news.FeaturedPriority == 0)
            return BadRequest(new { message = "Bu haber zaten featured değil." });

        try
        {
            // Use execution strategy for atomic featured management
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var removedPriority = news.FeaturedPriority;

                    // Haberi featured'dan çıkar
                    news.Featured = false;
                    news.FeaturedPriority = 0;

                    // Çıkarılan haberden sonraki öncelikleri yukarı kaydır (önceliği artır)
                    var lowerPriorityNews = await _context.News
                        .Where(n => n.Featured && n.FeaturedPriority > removedPriority)
                        .ToListAsync();

                    foreach (var lowerNews in lowerPriorityNews)
                    {
                        lowerNews.FeaturedPriority--;
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Cache'i temizle
                    await InvalidateNewsCache();

                    return Ok(new { 
                        message = "Haber featured listesinden çıkarıldı.",
                        newsId = id,
                        newsTitle = news.Title,
                        removedFromPriority = removedPriority
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { message = "Featured kaldırma işlemi sırasında hata oluştu", error = ex.Message });
                }
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Featured kaldırma işlemi sırasında hata oluştu: " + ex.Message });
        }    }

    [HttpPut("{id}/manset-oncelik")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateFeaturedPriority(int id, [FromBody] UpdateFeaturedPriorityDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var news = await _context.News.FirstOrDefaultAsync(n => n.Id == id);
        if (news == null)
            return NotFound(new { message = "Haber bulunamadı." });

        if (!news.Featured || news.FeaturedPriority == 0)
            return BadRequest(new { message = "Bu haber featured değil." });

        if (dto.NewPriority < 1 || dto.NewPriority > 5)
            return BadRequest(new { message = "Öncelik 1-5 arası olmalıdır." });

        try
        {
            // Use execution strategy for atomic priority update
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var oldPriority = news.FeaturedPriority;
                    var newPriority = dto.NewPriority;

                    if (oldPriority == newPriority)
                        return Ok(new { message = "Öncelik zaten aynı.", priority = oldPriority });

                    // Önceliği artırıyorsa (sayı küçülüyorsa)
                    if (newPriority < oldPriority)
                    {
                        // Araya giren haberlerin önceliğini düşür (sayıyı artır)
                        var affectedNews = await _context.News
                            .Where(n => n.Featured && n.FeaturedPriority >= newPriority && n.FeaturedPriority < oldPriority && n.Id != id)
                            .ToListAsync();

                        foreach (var affectedNewsItem in affectedNews)
                        {
                            affectedNewsItem.FeaturedPriority++;
                        }
                    }
                    // Önceliği düşürüyorsa (sayı büyüyorsa)
                    else
                    {
                        // Araya giren haberlerin önceliğini artır (sayıyı küçült)
                        var affectedNews = await _context.News
                            .Where(n => n.Featured && n.FeaturedPriority > oldPriority && n.FeaturedPriority <= newPriority && n.Id != id)
                            .ToListAsync();

                        foreach (var affectedNewsItem in affectedNews)
                        {
                            affectedNewsItem.FeaturedPriority--;
                        }
                    }

                    // Ana haberin önceliğini güncelle
                    news.FeaturedPriority = newPriority;

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();

                    // Cache'i temizle
                    await InvalidateNewsCache();

                    return Ok(new { 
                        message = $"Haber önceliği {oldPriority}'den {newPriority}'ye güncellendi.",
                        newsId = id,
                        newsTitle = news.Title,
                        oldPriority = oldPriority,
                        newPriority = newPriority
                    });
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    return StatusCode(500, new { message = "Öncelik güncelleme sırasında hata oluştu", error = ex.Message });
                }
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Öncelik güncelleme sırasında hata oluştu: " + ex.Message });
        }
    }

    [HttpGet("manset-listesi")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> GetFeaturedList()
    {
        try
        {
            var featuredNews = await _context.News
                .AsNoTracking()
                .Where(n => n.Featured && n.FeaturedPriority > 0)
                .OrderBy(n => n.FeaturedPriority)
                .Select(n => new {
                    Id = n.Id,
                    Title = n.Title,
                    Category = n.Category,
                    Date = n.Date,
                    Author = n.Author,
                    FeaturedPriority = n.FeaturedPriority,
                    Image = n.Image
                })
                .ToListAsync();

            return Ok(new {
                featuredNews = featuredNews,
                count = featuredNews.Count,
                maxCount = 5
            });
        }
        catch (Exception ex)
        {
            return BadRequest(new { message = "Featured liste alınırken hata oluştu: " + ex.Message });
        }
    }    [HttpGet("{idOrSlug}")]
    public async Task<IActionResult> GetByIdOrSlug(string idOrSlug)
    {
        int newsId;
        string? correctSlug = null;
        
        // Try to parse as direct ID first
        if (int.TryParse(idOrSlug, out newsId))
        {
            // Direct ID access: /api/news/18
        }
        else
        {
            // Slug-based access: /api/news/integer-gravida-18
            var parts = idOrSlug.Split('-');
            if (parts.Length == 0 || !int.TryParse(parts[^1], out newsId))
            {
                return BadRequest(new { message = "Geçersiz URL formatı." });
            }
            
            // Extract slug for validation
            correctSlug = string.Join("-", parts.Take(parts.Length - 1));
        }

        var cacheKey = string.Format(CacheKeys.NEWS_DETAIL, newsId);
        
        var cachedNews = await _cache.GetAsync<NewsDetailDto>(cacheKey);
        if (cachedNews != null)
        {
            // Validate slug if provided
            if (correctSlug != null)
            {
                var expectedSlug = GenerateSlug(cachedNews.Title);                if (!expectedSlug.Equals(correctSlug, StringComparison.OrdinalIgnoreCase))
                {
                    var correctUrl = $"/api/haber/{expectedSlug}-{newsId}";
                    return Redirect(correctUrl);
                }
            }
            
            await IncrementViewCountAsync(newsId);
            return Ok(cachedNews);
        }

        // Optimized single query with projection - User join ile AuthorDisplayName bilgisini de çek
        var news = await _context.News
            .AsNoTracking()
            .Where(n => n.Id == newsId && n.IsApproved) // Sadece onaylanmış haberler
            .Join(_context.Users,
                n => n.Author,
                u => u.Username,
                (n, u) => new { News = n, User = u })
            .Select(nu => new NewsDetailDto
            {
                Id = nu.News.Id,
                Title = nu.News.Title,
                Summary = nu.News.Summary,
                Image = nu.News.Image,
                Category = nu.News.Category,
                Date = nu.News.Date,
                Author = nu.News.Author,
                AuthorDisplayName = !string.IsNullOrWhiteSpace(nu.User.DisplayName) ? nu.User.DisplayName :
                                   (!string.IsNullOrWhiteSpace(nu.User.FirstName) || !string.IsNullOrWhiteSpace(nu.User.LastName)) ? 
                                   (nu.User.FirstName + " " + nu.User.LastName).Trim() : nu.User.Username,
                AuthorId = nu.User.Id,
                AuthorProfilePicture = nu.User.ProfilePicture,
                Content = nu.News.Content,
                Featured = nu.News.Featured,
                Tags = nu.News.Tags,
                Comments = new List<CommentDto>(), // Will be filled separately
                CommentCount = 0, // Will be filled separately
                ViewCount = nu.News.ViewCount,
                LastViewedAt = nu.News.LastViewedAt,
                IsApproved = nu.News.IsApproved,
                ApprovedByUsername = nu.News.ApprovedBy != null ? nu.News.ApprovedBy.Username : null,
                ApprovedAt = nu.News.ApprovedAt,
                RelatedNews = new List<RelatedNewsDto>() // Will be filled separately
            })
            .FirstOrDefaultAsync();

        if (news == null) 
            return NotFound(new { message = "Haber bulunamadı." });        // Get comments with reply system - Remove AsNoTracking for proper navigation
        var mainComments = await _context.Comments
            .Where(c => c.NewsId == newsId && c.Approved && c.ParentId == null)
            .Include(c => c.Replies.Where(r => r.Approved))
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
        
        var commentDtos = mainComments.Select(c => new CommentDto
        {
            Id = c.Id,
            User = c.User,
            Text = c.Text,
            Approved = c.Approved,
            CreatedAt = c.CreatedAt,
            ParentId = c.ParentId,
            IsReply = c.IsReply,
            HasReplies = (c.Replies?.Count ?? 0) > 0,
            ReplyCount = c.ReplyCount,
            Replies = (c.Replies ?? new List<Comment>()).Select(r => new CommentDto
            {
                Id = r.Id,
                User = r.User,
                Text = r.Text,
                Approved = r.Approved,
                CreatedAt = r.CreatedAt,
                ParentId = r.ParentId,
                IsReply = r.IsReply,
                HasReplies = false,
                ReplyCount = 0
            }).OrderBy(r => r.CreatedAt).ToList()
        }).ToList();        news.Comments = commentDtos;
        news.CommentCount = await _context.Comments
            .CountAsync(c => c.NewsId == newsId && c.Approved);

        // Get related news
        news.RelatedNews = await _relatedNewsService.GetRelatedNewsAsync(newsId, 5);

        // Increment view count
        await IncrementViewCountAsync(newsId);

        // Cache for 10 minutes
        await _cache.SetAsync(cacheKey, news, TimeSpan.FromMinutes(10));        return Ok(news);    }

    // Helper method to generate SEO-friendly slug from title
    private static string GenerateSlug(string title)
    {
        if (string.IsNullOrWhiteSpace(title))
            return "haber";
            
        // Prevent potential DoS with very long titles
        if (title.Length > 200)
            title = title.Substring(0, 200);

        // Convert to lowercase and replace Turkish characters efficiently
        var turkishCharMap = new Dictionary<char, char>
        {
            ['ç'] = 'c', ['ğ'] = 'g', ['ı'] = 'i', ['ö'] = 'o', ['ş'] = 's', ['ü'] = 'u',
            ['Ç'] = 'c', ['Ğ'] = 'g', ['I'] = 'i', ['İ'] = 'i', ['Ö'] = 'o', ['Ş'] = 's', ['Ü'] = 'u'
        };
        
        var slugBuilder = new StringBuilder();
        foreach (char c in title.ToLowerInvariant())
        {
            if (turkishCharMap.TryGetValue(c, out char replacement))
            {
                slugBuilder.Append(replacement);
            }
            else
            {
                slugBuilder.Append(c);
            }
        }
        var slug = slugBuilder.ToString();

        // Remove special characters and replace spaces with hyphens
        slug = Regex.Replace(slug, @"[^a-z0-9\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        slug = slug.Trim('-');

        // Limit length to 100 characters for better URLs
        if (slug.Length > 100)
        {
            slug = slug.Substring(0, 100);
            var lastDash = slug.LastIndexOf('-');
            if (lastDash > 50)
                slug = slug.Substring(0, lastDash);
        }
        
        return string.IsNullOrEmpty(slug) ? "haber" : slug;
    }
    
    // Helper method to increment view count asynchronously
    private async Task IncrementViewCountAsync(int newsId)
    {
        try
        {
            // Don't use background task, just do it quickly
            var news = await _context.News.FirstOrDefaultAsync(n => n.Id == newsId);
            if (news != null)
            {
                news.ViewCount++;
                news.LastViewedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                
                // Invalidate related cache
                await _cache.RemoveAsync(string.Format(CacheKeys.NEWS_DETAIL, newsId));
            }
        }
        catch (Exception)
        {
            // Log error but don't throw to avoid affecting main request
            // View count increment error logged
        }
    }

    // Get most popular news based on view count
    [HttpGet("populer")]
    public async Task<IActionResult> GetPopularNews([FromQuery] int count = 10)
    {
        var cacheKey = $"popular_news_{count}";
        var cachedResult = await _cache.GetAsync<object>(cacheKey);
        if (cachedResult != null)
        {
            return Ok(cachedResult);
        }

        var popularNews = await _context.News
            .AsNoTracking()
            .Where(n => n.IsApproved)
            .OrderByDescending(n => n.ViewCount)
            .ThenByDescending(n => n.Date)
            .Take(count)
            .Join(_context.Users,
                n => n.Author,
                u => u.Username,
                (n, u) => new { News = n, User = u })
            .Select(nu => new NewsListDto
            {
                Id = nu.News.Id,
                Title = nu.News.Title,
                Summary = nu.News.Summary,
                Image = nu.News.Image,
                Category = nu.News.Category,
                Date = nu.News.Date,
                Author = nu.News.Author,
                AuthorDisplayName = !string.IsNullOrWhiteSpace(nu.User.DisplayName) ? nu.User.DisplayName :
                                   (!string.IsNullOrWhiteSpace(nu.User.FirstName) || !string.IsNullOrWhiteSpace(nu.User.LastName)) ? 
                                   (nu.User.FirstName + " " + nu.User.LastName).Trim() : nu.User.Username,
                AuthorId = nu.User.Id,
                Featured = nu.News.Featured,
                FeaturedPriority = nu.News.FeaturedPriority,
                Tags = nu.News.Tags,
                ViewCount = nu.News.ViewCount,
                LastViewedAt = nu.News.LastViewedAt,
                CommentCount = nu.News.Comments != null ? nu.News.Comments.Count(c => c.Approved) : 0,
                IsApproved = nu.News.IsApproved,
                ApprovedByUsername = nu.News.ApprovedBy != null ? nu.News.ApprovedBy.Username : null,
                ApprovedAt = nu.News.ApprovedAt
            })
            .ToListAsync();

        // Cache for 30 minutes
        await _cache.SetAsync(cacheKey, popularNews, TimeSpan.FromMinutes(30));

        return Ok(popularNews);
    }
}
