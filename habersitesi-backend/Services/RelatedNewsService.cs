using Microsoft.EntityFrameworkCore;
using habersitesi_backend.Models;
using habersitesi_backend.Dtos;

namespace habersitesi_backend.Services
{
    public interface IRelatedNewsService
    {
        Task<List<RelatedNewsDto>> GetRelatedNewsAsync(int newsId, int count = 5);
        Task GenerateRelatedNewsAsync(int newsId);
        Task RegenerateAllRelatedNewsAsync();
    }

    public class RelatedNewsService : IRelatedNewsService
    {
        private readonly AppDbContext _context;
        private readonly ILogger<RelatedNewsService> _logger;

        public RelatedNewsService(AppDbContext context, ILogger<RelatedNewsService> logger)
        {
            _context = context;
            _logger = logger;
        }

        public async Task<List<RelatedNewsDto>> GetRelatedNewsAsync(int newsId, int count = 5)
        {
            try
            {
                var relatedNews = await _context.RelatedNews
                    .Where(rn => rn.NewsId == newsId)
                    .OrderByDescending(rn => rn.SimilarityScore)
                    .Take(count)
                    .Include(rn => rn.RelatedNewsItem)
                    .Join(_context.Users,
                        rn => rn.RelatedNewsItem!.Author,
                        u => u.Username,
                        (rn, u) => new { RelatedNews = rn, User = u })
                    .Select(rnu => new RelatedNewsDto
                    {
                        Id = rnu.RelatedNews.RelatedNewsItem!.Id,
                        Title = rnu.RelatedNews.RelatedNewsItem.Title,
                        Summary = rnu.RelatedNews.RelatedNewsItem.Summary,
                        Image = rnu.RelatedNews.RelatedNewsItem.Image,
                        Category = rnu.RelatedNews.RelatedNewsItem.Category,
                        Date = rnu.RelatedNews.RelatedNewsItem.Date,
                        Author = rnu.RelatedNews.RelatedNewsItem.Author,
                        AuthorDisplayName = !string.IsNullOrWhiteSpace(rnu.User.DisplayName) ? rnu.User.DisplayName :
                                           (!string.IsNullOrWhiteSpace(rnu.User.FirstName) || !string.IsNullOrWhiteSpace(rnu.User.LastName)) ? 
                                           (rnu.User.FirstName + " " + rnu.User.LastName).Trim() : rnu.User.Username,
                        ViewCount = rnu.RelatedNews.RelatedNewsItem.ViewCount,
                        SimilarityScore = rnu.RelatedNews.SimilarityScore
                    })
                    .ToListAsync();

                return relatedNews;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting related news for NewsId: {NewsId}", newsId);
                return new List<RelatedNewsDto>();
            }
        }

        public async Task GenerateRelatedNewsAsync(int newsId)
        {
            try
            {
                var currentNews = await _context.News
                    .FirstOrDefaultAsync(n => n.Id == newsId && n.IsApproved);

                if (currentNews == null) return;

                // Clear existing related news
                var existingRelated = await _context.RelatedNews
                    .Where(rn => rn.NewsId == newsId)
                    .ToListAsync();
                
                _context.RelatedNews.RemoveRange(existingRelated);

                // Find related news using multiple algorithms
                var relatedNewsList = new List<RelatedNews>();

                // Algorithm 1: Category-based similarity
                var categoryMatches = await FindCategoryBasedRelatedNews(currentNews);
                relatedNewsList.AddRange(categoryMatches);

                // Algorithm 2: Tag-based similarity
                var tagMatches = await FindTagBasedRelatedNews(currentNews);
                relatedNewsList.AddRange(tagMatches);

                // Algorithm 3: Title/Content similarity (basic)
                var contentMatches = await FindContentBasedRelatedNews(currentNews);
                relatedNewsList.AddRange(contentMatches);

                // Remove duplicates and sort by score
                var uniqueRelated = relatedNewsList
                    .GroupBy(rn => rn.RelatedNewsId)
                    .Select(g => g.OrderByDescending(rn => rn.SimilarityScore).First())
                    .OrderByDescending(rn => rn.SimilarityScore)
                    .Take(10) // Keep top 10
                    .ToList();

                _context.RelatedNews.AddRange(uniqueRelated);
                await _context.SaveChangesAsync();

                _logger.LogInformation("Generated {Count} related news for NewsId: {NewsId}", 
                    uniqueRelated.Count, newsId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating related news for NewsId: {NewsId}", newsId);
            }
        }

        private async Task<List<RelatedNews>> FindCategoryBasedRelatedNews(News currentNews)
        {
            var categoryNews = await _context.News
                .Where(n => n.Category == currentNews.Category 
                    && n.Id != currentNews.Id 
                    && n.IsApproved)
                .OrderByDescending(n => n.ViewCount)
                .ThenByDescending(n => n.Date)
                .Take(5)
                .ToListAsync();

            return categoryNews.Select(n => new RelatedNews
            {
                NewsId = currentNews.Id,
                RelatedNewsId = n.Id,
                SimilarityScore = 0.8, // High score for same category
                Algorithm = "category-match"
            }).ToList();
        }

        private async Task<List<RelatedNews>> FindTagBasedRelatedNews(News currentNews)
        {
            if (string.IsNullOrEmpty(currentNews.Tags))
                return new List<RelatedNews>();

            var currentTags = currentNews.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                .Select(t => t.Trim().ToLower()).ToList();

            if (!currentTags.Any()) return new List<RelatedNews>();

            var tagNews = await _context.News
                .Where(n => n.Tags != null 
                    && n.Id != currentNews.Id 
                    && n.IsApproved)
                .ToListAsync();

            var relatedByTags = new List<RelatedNews>();

            foreach (var news in tagNews)
            {
                if (string.IsNullOrEmpty(news.Tags)) continue;

                var newsTags = news.Tags.Split(',', StringSplitOptions.RemoveEmptyEntries)
                    .Select(t => t.Trim().ToLower()).ToList();

                var commonTags = currentTags.Intersect(newsTags).Count();
                if (commonTags > 0)
                {
                    var score = (double)commonTags / Math.Max(currentTags.Count, newsTags.Count);
                    relatedByTags.Add(new RelatedNews
                    {
                        NewsId = currentNews.Id,
                        RelatedNewsId = news.Id,
                        SimilarityScore = score * 0.7, // Tag-based scoring
                        Algorithm = "tag-match"
                    });
                }
            }

            return relatedByTags.OrderByDescending(rn => rn.SimilarityScore).Take(5).ToList();
        }

        private async Task<List<RelatedNews>> FindContentBasedRelatedNews(News currentNews)
        {
            // Simple keyword-based content similarity
            if (string.IsNullOrEmpty(currentNews.Title)) 
                return new List<RelatedNews>();

            var titleWords = currentNews.Title.Split(' ', StringSplitOptions.RemoveEmptyEntries)
                .Where(w => w.Length > 3) // Only words longer than 3 characters
                .Select(w => w.ToLower())
                .ToList();

            if (!titleWords.Any()) return new List<RelatedNews>();

            var contentNews = new List<RelatedNews>();

            foreach (var word in titleWords.Take(3)) // Check top 3 words
            {
                var matchingNews = await _context.News
                    .Where(n => EF.Functions.ILike(n.Title, $"%{word}%") 
                        && n.Id != currentNews.Id 
                        && n.IsApproved)
                    .Take(3)
                    .ToListAsync();

                foreach (var news in matchingNews)
                {
                    contentNews.Add(new RelatedNews
                    {
                        NewsId = currentNews.Id,
                        RelatedNewsId = news.Id,
                        SimilarityScore = 0.4, // Lower score for basic content match
                        Algorithm = "content-match"
                    });
                }
            }

            return contentNews;
        }

        public async Task RegenerateAllRelatedNewsAsync()
        {
            try
            {
                var allNews = await _context.News
                    .Where(n => n.IsApproved)
                    .Select(n => n.Id)
                    .ToListAsync();

                foreach (var newsId in allNews)
                {
                    await GenerateRelatedNewsAsync(newsId);
                }

                _logger.LogInformation("Regenerated related news for {Count} news articles", allNews.Count);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error regenerating all related news");
            }
        }
    }
}
