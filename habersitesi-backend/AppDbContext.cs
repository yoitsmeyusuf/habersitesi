using Microsoft.EntityFrameworkCore;
using habersitesi_backend.Models;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }    public DbSet<User> Users => Set<User>();
    public DbSet<News> News => Set<News>();
    public DbSet<Category> Categories => Set<Category>();
    public DbSet<Comment> Comments => Set<Comment>();
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();
    public DbSet<PushNotification> PushNotifications => Set<PushNotification>();
    public DbSet<EmailHistory> EmailHistories => Set<EmailHistory>();
    public DbSet<RelatedNews> RelatedNews => Set<RelatedNews>();
    public DbSet<BannedWord> BannedWords => Set<BannedWord>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Performance optimization indexes
        modelBuilder.Entity<News>()
            .HasIndex(n => n.Date)
            .HasDatabaseName("IX_News_Date");

        modelBuilder.Entity<News>()
            .HasIndex(n => n.Category)
            .HasDatabaseName("IX_News_Category");

        modelBuilder.Entity<News>()
            .HasIndex(n => n.Featured)
            .HasDatabaseName("IX_News_Featured");

        modelBuilder.Entity<News>()
            .HasIndex(n => new { n.Featured, n.Date })
            .HasDatabaseName("IX_News_Featured_Date");

        modelBuilder.Entity<News>()
            .HasIndex(n => n.Title)
            .HasDatabaseName("IX_News_Title");

        modelBuilder.Entity<Comment>()
            .HasIndex(c => c.Approved)
            .HasDatabaseName("IX_Comments_Approved");

        modelBuilder.Entity<Comment>()
            .HasIndex(c => new { c.NewsId, c.Approved })
            .HasDatabaseName("IX_Comments_NewsId_Approved");

        modelBuilder.Entity<Category>()
            .HasIndex(c => c.Name)
            .IsUnique()
            .HasDatabaseName("IX_Categories_Name");        // EmailHistory indexes
        modelBuilder.Entity<EmailHistory>()
            .HasIndex(e => e.SentAt)
            .HasDatabaseName("IX_EmailHistory_SentAt");

        modelBuilder.Entity<EmailHistory>()
            .HasIndex(e => e.SentBy)
            .HasDatabaseName("IX_EmailHistory_SentBy");

        modelBuilder.Entity<EmailHistory>()
            .HasIndex(e => e.ToEmail)
            .HasDatabaseName("IX_EmailHistory_ToEmail");        // EmailHistory relationships
        modelBuilder.Entity<EmailHistory>()
            .HasOne(e => e.SentByUser)
            .WithMany()
            .HasForeignKey(e => e.SentBy)
            .OnDelete(DeleteBehavior.Restrict);

        // News approval relationship
        modelBuilder.Entity<News>()
            .HasOne(n => n.ApprovedBy)
            .WithMany()
            .HasForeignKey(n => n.ApprovedByUserId)
            .OnDelete(DeleteBehavior.Restrict);

        // News approval index
        modelBuilder.Entity<News>()
            .HasIndex(n => n.IsApproved)
            .HasDatabaseName("IX_News_IsApproved");

        modelBuilder.Entity<News>()
            .HasIndex(n => new { n.IsApproved, n.Date })
            .HasDatabaseName("IX_News_IsApproved_Date");

        // Performance optimization configurations
        modelBuilder.Entity<News>()
            .Property(n => n.Title)
            .HasMaxLength(500);

        modelBuilder.Entity<News>()
            .Property(n => n.Summary)
            .HasMaxLength(1000);

        modelBuilder.Entity<Category>()
            .Property(c => c.Name)
            .HasMaxLength(100);

        modelBuilder.Entity<Comment>()
            .Property(c => c.Text)
            .HasMaxLength(2000);        modelBuilder.Entity<Comment>()
            .Property(c => c.User)
            .HasMaxLength(100);
            
        // Comment Reply System Configuration
        modelBuilder.Entity<Comment>()
            .HasOne(c => c.Parent)
            .WithMany(c => c.Replies)
            .HasForeignKey(c => c.ParentId)
            .OnDelete(DeleteBehavior.Restrict);

        // Comment indexes for reply system
        modelBuilder.Entity<Comment>()
            .HasIndex(c => c.ParentId)
            .HasDatabaseName("IX_Comments_ParentId");

        modelBuilder.Entity<Comment>()
            .HasIndex(c => new { c.NewsId, c.ParentId, c.Approved })
            .HasDatabaseName("IX_Comments_NewsId_ParentId_Approved");

        // Related News Configuration
        modelBuilder.Entity<RelatedNews>()
            .HasOne(rn => rn.News)
            .WithMany()
            .HasForeignKey(rn => rn.NewsId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<RelatedNews>()
            .HasOne(rn => rn.RelatedNewsItem)
            .WithMany()
            .HasForeignKey(rn => rn.RelatedNewsId)
            .OnDelete(DeleteBehavior.Cascade);

        // Related News indexes
        modelBuilder.Entity<RelatedNews>()
            .HasIndex(rn => rn.NewsId)
            .HasDatabaseName("IX_RelatedNews_NewsId");

        modelBuilder.Entity<RelatedNews>()
            .HasIndex(rn => new { rn.NewsId, rn.SimilarityScore })
            .HasDatabaseName("IX_RelatedNews_NewsId_Score");

        // News view tracking indexes
        modelBuilder.Entity<News>()
            .HasIndex(n => n.ViewCount)
            .HasDatabaseName("IX_News_ViewCount");

        modelBuilder.Entity<News>()
            .HasIndex(n => n.LastViewedAt)
            .HasDatabaseName("IX_News_LastViewedAt");

        // Unique constraint for RelatedNews to prevent duplicates
        modelBuilder.Entity<RelatedNews>()
            .HasIndex(rn => new { rn.NewsId, rn.RelatedNewsId })
            .IsUnique()
            .HasDatabaseName("IX_RelatedNews_Unique");

        // BannedWords configuration
        modelBuilder.Entity<BannedWord>()
            .HasIndex(bw => bw.Word)
            .IsUnique()
            .HasDatabaseName("IX_BannedWords_Word");

        modelBuilder.Entity<BannedWord>()
            .Property(bw => bw.Word)
            .HasMaxLength(200);
    }
}
