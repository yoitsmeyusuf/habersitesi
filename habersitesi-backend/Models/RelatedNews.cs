using System.ComponentModel.DataAnnotations;

namespace habersitesi_backend.Models
{
    public class RelatedNews
    {
        public int Id { get; set; }
        
        public int NewsId { get; set; }
        public News? News { get; set; }
        
        public int RelatedNewsId { get; set; }
        public News? RelatedNewsItem { get; set; }
        
        // Similarity score (0.0 - 1.0)
        public double SimilarityScore { get; set; }
        
        // Algorithm used for relation detection
        public string Algorithm { get; set; } = "category-tags";
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        // Prevent circular references in configuration
    }
}
