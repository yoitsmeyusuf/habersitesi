using Microsoft.AspNetCore.Mvc;
using habersitesi_backend.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authorization;
using System.ComponentModel.DataAnnotations;
using habersitesi_backend.Services;

[ApiController]
[Route("api/kategoriler")]
public class CategoriesController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly ICacheService _cache;
    
    public CategoriesController(AppDbContext context, ICacheService cache)
    {
        _context = context;
        _cache = cache;
    }

    [HttpGet]
    public async Task<ActionResult<IEnumerable<object>>> GetCategories([FromQuery] bool includeCount = false)
    {
        var cacheKey = includeCount ? CacheKeys.CATEGORIES_WITH_COUNT : CacheKeys.CATEGORIES;
        
        var cachedCategories = await _cache.GetAsync<object>(cacheKey);
        if (cachedCategories != null)
        {
            return Ok(cachedCategories);
        }

        if (includeCount)
        {
            // Optimized query - single query with subquery
            var categoriesWithCount = await _context.Categories
                .AsNoTracking()
                .Select(c => new
                {
                    Id = c.Id,
                    Name = c.Name,
                    NewsCount = _context.News.Count(n => n.Category == c.Name)
                })
                .OrderBy(c => c.Name)
                .ToListAsync();
            
            // Cache for 30 minutes
            await _cache.SetAsync(cacheKey, categoriesWithCount, TimeSpan.FromMinutes(30));
            
            return Ok(categoriesWithCount);
        }

        var categories = await _context.Categories
            .AsNoTracking()
            .Select(c => new { c.Id, c.Name })
            .OrderBy(c => c.Name)
            .ToListAsync();
        
        // Cache for 1 hour
        await _cache.SetAsync(cacheKey, categories, TimeSpan.FromHours(1));
        
        return Ok(categories);
    }

    [HttpGet("{id}")]
    public async Task<IActionResult> GetCategory(int id)
    {
        var cacheKey = $"category_{id}";
        
        var cachedCategory = await _cache.GetAsync<object>(cacheKey);
        if (cachedCategory != null)
        {
            return Ok(cachedCategory);
        }

        var category = await _context.Categories
            .AsNoTracking()
            .Where(c => c.Id == id)
            .Select(c => new
            {
                c.Id,
                c.Name,
                NewsCount = _context.News.Count(n => n.Category == c.Name)
            })
            .FirstOrDefaultAsync();

        if (category == null)
            return NotFound(new { message = "Kategori bulunamadı." });

        // Cache for 30 minutes
        await _cache.SetAsync(cacheKey, category, TimeSpan.FromMinutes(30));

        return Ok(category);
    }
    [Authorize(Roles = "admin")]
    [HttpPost]
    public async Task<IActionResult> AddCategory([FromBody] CategoryCreateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        if (string.IsNullOrWhiteSpace(dto.Name))
            return BadRequest(new { message = "Kategori adı boş olamaz." });

        if (dto.Name.Length < 2 || dto.Name.Length > 50)
            return BadRequest(new { message = "Kategori adı 2-50 karakter arasında olmalıdır." });

        var normalizedName = dto.Name.Trim();        // Use execution strategy for atomic category creation
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                // Atomic existence check
                var exists = await _context.Categories
                    .AsNoTracking()
                    .AnyAsync(c => EF.Functions.ILike(c.Name, normalizedName));
                    
                if (exists)
                    return BadRequest(new { message = "Bu kategori zaten mevcut." });

                var category = new Category { Name = normalizedName };
                _context.Categories.Add(category);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
                
                // Invalidate cache after successful transaction
                await InvalidateCategoryCache();
                
                return CreatedAtAction(nameof(GetCategory), new { id = category.Id }, 
                    new { category.Id, category.Name, message = "Kategori başarıyla oluşturuldu." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Kategori oluşturulamadı.", error = ex.Message });
            }
        });
    }    [Authorize(Roles = "admin,author")]
    [HttpPut("{id}")]
    public async Task<IActionResult> UpdateCategory(int id, [FromBody] CategoryUpdateDto dto)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        // Use execution strategy for atomic category update
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null)
                    return NotFound(new { message = "Kategori bulunamadı." });

                if (string.IsNullOrWhiteSpace(dto.Name))
                    return BadRequest(new { message = "Kategori adı boş olamaz." });

                if (dto.Name.Length < 2 || dto.Name.Length > 50)
                    return BadRequest(new { message = "Kategori adı 2-50 karakter arasında olmalıdır." });

                var normalizedName = dto.Name.Trim();

                // Atomic duplicate check
                var exists = await _context.Categories
                    .AsNoTracking()
                    .AnyAsync(c => c.Id != id && EF.Functions.ILike(c.Name, normalizedName));
                    
                if (exists)
                    return BadRequest(new { message = "Bu kategori adı zaten kullanılıyor." });

                var oldName = category.Name;
                category.Name = normalizedName;

                // Atomic update of category and all related news
                if (oldName != normalizedName)
                {
                    var newsToUpdate = await _context.News
                        .Where(n => n.Category == oldName)
                        .ToListAsync();
                        
                    foreach (var news in newsToUpdate)
                    {
                        news.Category = normalizedName;
                    }
                }
                
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Invalidate cache after successful transaction
                await InvalidateCategoryCache();
                await InvalidateNewsCache();

                return Ok(new 
                { 
                    category.Id, 
                    category.Name, 
                    message = "Kategori başarıyla güncellendi.",
                    updatedNewsCount = oldName != normalizedName ? await _context.News.CountAsync(n => n.Category == normalizedName) : 0
                });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Kategori güncellenemedi.", error = ex.Message });
            }
        });
    }[Authorize(Roles = "admin,author")]
    [HttpDelete("{id}")]
    public async Task<IActionResult> DeleteCategory(int id)
    {
        // Use execution strategy for atomic category deletion
        var strategy = _context.Database.CreateExecutionStrategy();
        return await strategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                var category = await _context.Categories.FindAsync(id);
                if (category == null)
                    return NotFound(new { message = "Kategori bulunamadı." });

                // Atomic check for news count
                var newsCount = await _context.News
                    .AsNoTracking()
                    .CountAsync(n => n.Category == category.Name);
                    
                if (newsCount > 0)
                    return BadRequest(new 
                    { 
                        message = $"Bu kategoride {newsCount} haber bulunuyor. Önce haberleri başka kategoriye taşıyın veya silin.",
                        newsCount 
                    });

                _context.Categories.Remove(category);
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();

                // Invalidate cache after successful transaction
                await InvalidateCategoryCache();

                return Ok(new { message = "Kategori başarıyla silindi." });
            }
            catch (Exception ex)
            {
                await transaction.RollbackAsync();
                return StatusCode(500, new { message = "Kategori silinemedi.", error = ex.Message });
            }
        });
    }

    [HttpGet("stats")]
    public async Task<IActionResult> GetCategoryStats()
    {
        var cacheKey = "category_stats";
        
        var cachedStats = await _cache.GetAsync<object>(cacheKey);
        if (cachedStats != null)
        {
            return Ok(cachedStats);
        }

        var stats = await _context.Categories
            .AsNoTracking()
            .Select(c => new
            {
                Id = c.Id,
                Name = c.Name,
                NewsCount = _context.News.Count(n => n.Category == c.Name),
                FeaturedNewsCount = _context.News.Count(n => n.Category == c.Name && n.Featured),
                LatestNewsDate = _context.News
                    .Where(n => n.Category == c.Name)
                    .Max(n => (DateTime?)n.Date)
            })
            .OrderByDescending(c => c.NewsCount)
            .ToListAsync();

        var result = new
        {
            categories = stats,
            totalCategories = stats.Count,
            totalNews = stats.Sum(s => s.NewsCount),
            categoriesWithNews = stats.Count(s => s.NewsCount > 0),
            mostPopularCategory = stats.FirstOrDefault()?.Name
        };

        // Cache for 1 hour
        await _cache.SetAsync(cacheKey, result, TimeSpan.FromHours(1));

        return Ok(result);
    }

    private async Task InvalidateCategoryCache()
    {
        await _cache.RemoveAsync(CacheKeys.CATEGORIES);
        await _cache.RemoveAsync(CacheKeys.CATEGORIES_WITH_COUNT);
        await _cache.RemovePatternAsync("category_");
    }

    private async Task InvalidateNewsCache()
    {
        await _cache.RemovePatternAsync("news_");
        await _cache.RemoveAsync(CacheKeys.FEATURED_NEWS);
    }

    // DTOs
    public class CategoryCreateDto
    {
        [Required]
        [StringLength(50, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;
    }

    public class CategoryUpdateDto
    {
        [Required]
        [StringLength(50, MinimumLength = 2)]
        public string Name { get; set; } = string.Empty;
    }

    public class MoveCategoryDto
    {
        [Required]
        public int TargetCategoryId { get; set; }
    }
}


