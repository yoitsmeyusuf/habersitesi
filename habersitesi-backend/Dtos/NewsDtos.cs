using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using habersitesi_backend.Dtos;

namespace habersitesi_backend.Dtos
{    public class NewsListDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = "";
        public string? Summary { get; set; }
        public string? Image { get; set; }
        public string Category { get; set; } = "";
        public DateTime Date { get; set; }
        public string? Author { get; set; } // Username (backward compatibility)
        public string? AuthorDisplayName { get; set; } // DisplayName for UI
        public int? AuthorId { get; set; }
        public string? AuthorProfilePicture { get; set; } // Author's profile picture
        public bool Featured { get; set; }
        public int FeaturedPriority { get; set; } = 0;
        public string? Tags { get; set; }
        public int CommentCount { get; set; }
        
        // View tracking
        public int ViewCount { get; set; }
        public DateTime? LastViewedAt { get; set; }
        
        // Admin onay sistemi
        public bool IsApproved { get; set; }
        public string? ApprovedByUsername { get; set; } // Onaylayan admin kullanıcı adı
        public DateTime? ApprovedAt { get; set; }
    }

    public class NewsDetailDto : NewsListDto
    {
        public string? Content { get; set; }
        public List<CommentDto>? Comments { get; set; }
        public List<RelatedNewsDto>? RelatedNews { get; set; }
    }public class NewsCreateDto
    {
        public string Title { get; set; } = "";
        public string? Summary { get; set; }
        public string? Image { get; set; }
        public string Category { get; set; } = "";
        public string? Content { get; set; }
        public bool Featured { get; set; }
        public int FeaturedPriority { get; set; } = 0;
        public string? Tags { get; set; }
    }

    public class NewsUpdateDto : NewsCreateDto { }    public class UpdateFeaturedPriorityDto
    {
        [Range(1, 5, ErrorMessage = "Öncelik 1-5 arası olmalıdır")]
        public int NewPriority { get; set; }
    }

    public class RelatedNewsDto
    {
        public int Id { get; set; }
        public string Title { get; set; } = "";
        public string? Summary { get; set; }
        public string? Image { get; set; }
        public string Category { get; set; } = "";
        public DateTime Date { get; set; }
        public string? Author { get; set; } // Username (backward compatibility)
        public string? AuthorDisplayName { get; set; } // DisplayName for UI
        public int ViewCount { get; set; }
        public double SimilarityScore { get; set; }
    }

    public class ShareRequest
    {
        public string Platform { get; set; } = string.Empty;
    }
}
