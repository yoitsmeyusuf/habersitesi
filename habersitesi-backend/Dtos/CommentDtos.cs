using System;
using System.ComponentModel.DataAnnotations;

namespace habersitesi_backend.Dtos
{
    public class CommentDto
    {
        public int Id { get; set; }
        public string User { get; set; } = "";
        public string Text { get; set; } = "";
        public bool Approved { get; set; }
        public DateTime CreatedAt { get; set; }
    public string? UserAvatar { get; set; }
        
        // Reply System Properties
        public int? ParentId { get; set; }
        public bool IsReply { get; set; }
        public bool HasReplies { get; set; }
        public int ReplyCount { get; set; }
        public List<CommentDto>? Replies { get; set; }
    }

    public class CommentCreateDto
    {
        [Required]
        [StringLength(1000, MinimumLength = 2)]
        public string Text { get; set; } = "";
        
        // For reply functionality
        public int? ParentId { get; set; }
    }

    public class CommentReplyDto
    {
        [Required]
        [StringLength(1000, MinimumLength = 2)]
        public string Text { get; set; } = "";
    }

    public class CommentAdminDto
    {
        public int Id { get; set; }
        public int NewsId { get; set; }
        public string NewsTitle { get; set; } = "";
        public string User { get; set; } = "";
        public string Text { get; set; } = "";
        public bool Approved { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? ApprovedAt { get; set; }
        public string? ApprovedBy { get; set; }
    public string? UserAvatar { get; set; }
        
        // Reply System Properties for Admin
        public int? ParentId { get; set; }
        public bool IsReply { get; set; }
        public int ReplyCount { get; set; }
        public string? ParentCommentText { get; set; } // For admin reference
    }
}
