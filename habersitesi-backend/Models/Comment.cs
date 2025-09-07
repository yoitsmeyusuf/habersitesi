using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace habersitesi_backend.Models
{
    public class Comment
    {
        public int Id { get; set; }

        [Required]
        public string User { get; set; } = null!;

        [Required]
        public string Text { get; set; } = null!;

        public int NewsId { get; set; }
        public News? News { get; set; }
        
        // Reply System
        public int? ParentId { get; set; }
        public Comment? Parent { get; set; }
        
        [InverseProperty("Parent")]
        public ICollection<Comment> Replies { get; set; } = new List<Comment>();
        
        public int ReplyCount { get; set; } = 0;
        
        public bool Approved { get; set; } = false;
        
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        
        public DateTime? ApprovedAt { get; set; }
        
        public string? ApprovedBy { get; set; }
        
        // Helper method to check if this is a reply
        [NotMapped]
        public bool IsReply => ParentId.HasValue;
        
        // Helper method to check if this comment has replies
        [NotMapped]
        public bool HasReplies => ReplyCount > 0;
    }
}
