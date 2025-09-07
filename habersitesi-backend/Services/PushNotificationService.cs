using System.Text;
using System.Text.Json;
using WebPush;
using Microsoft.EntityFrameworkCore;
using habersitesi_backend.Models;

namespace habersitesi_backend.Services
{
    public interface IPushNotificationService
    {
        Task<bool> SubscribeUserAsync(string userId, PushSubscriptionDto subscription);
        Task<bool> UnsubscribeUserAsync(string userId, string endpoint);
        Task<bool> SendNotificationAsync(string title, string body, string? url = null, string? icon = null, int? newsId = null);
        Task<bool> SendNotificationToUserAsync(string userId, string title, string body, string? url = null, string? icon = null);
        Task<List<PushNotification>> GetNotificationHistoryAsync(int page = 1, int pageSize = 20);
    }

    public class PushNotificationService : IPushNotificationService
    {
        private readonly AppDbContext _context;
        private readonly IConfiguration _configuration;
        private readonly VapidDetails _vapidDetails;

        public PushNotificationService(AppDbContext context, IConfiguration configuration)
        {
            _context = context;
            _configuration = configuration;
            
            // VAPID keys for web push - environment variable'lardan al
            var publicKey = Environment.GetEnvironmentVariable("WebPush__PublicKey") 
                         ?? _configuration["WebPush:PublicKey"] 
                         ?? "BGIo8i1IPwDy0mZZyMfW4J_Bv4dOYElKUgkpF2QU2cRm5pIZU7YNxHc8xQo3kHT8vYoGUZKnJg8lZ2l1K3nP7iQ";
            
            var privateKey = Environment.GetEnvironmentVariable("WebPush__PrivateKey") 
                          ?? _configuration["WebPush:PrivateKey"] 
                          ?? "TZm8G3b5YqWKIzKH9j4D8F9m2LZEFj6kJ2F4xRt8yLo";
            
            _vapidDetails = new VapidDetails(
                "mailto:admin@habersitesi.com",
                publicKey,
                privateKey
            );
        }

        public async Task<bool> SubscribeUserAsync(string userId, PushSubscriptionDto subscription)
        {            // Use execution strategy for atomic push subscription
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Atomic check for existing subscription
                    var existingSubscription = await _context.PushSubscriptions
                        .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == subscription.Endpoint);

                    if (existingSubscription != null)
                    {
                        // Atomic update of existing subscription
                        existingSubscription.P256dh = subscription.Keys.P256dh;
                        existingSubscription.Auth = subscription.Keys.Auth;                        existingSubscription.IsActive = true;
                        existingSubscription.CreatedAt = DateTime.UtcNow;
                    }
                    else
                    {                        // Atomic creation of new subscription
                        var newSubscription = new habersitesi_backend.Models.PushSubscription
                        {
                            UserId = userId,
                            Endpoint = subscription.Endpoint,
                            P256dh = subscription.Keys.P256dh,
                            Auth = subscription.Keys.Auth,
                            IsActive = true
                        };
                        _context.PushSubscriptions.Add(newSubscription);
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    System.Console.WriteLine($"Push subscription error: {ex.Message}");
                    return false;
                }
            });
        }

        public async Task<bool> UnsubscribeUserAsync(string userId, string endpoint)
        {            // Use execution strategy for atomic unsubscription
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var subscription = await _context.PushSubscriptions
                        .FirstOrDefaultAsync(s => s.UserId == userId && s.Endpoint == endpoint);

                    if (subscription != null)
                    {
                        subscription.IsActive = false;
                        await _context.SaveChangesAsync();
                        await transaction.CommitAsync();
                    }

                    return true;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    System.Console.WriteLine($"Push unsubscription error: {ex.Message}");
                    return false;
                }
            });
        }

        public async Task<bool> SendNotificationAsync(string title, string body, string? url = null, string? icon = null, int? newsId = null)
        {            // Use execution strategy for atomic notification sending
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    // Save notification to database
                    var notification = new PushNotification
                    {
                        Title = title,
                        Body = body,
                        Url = url,
                        Icon = icon,
                        NewsId = newsId,
                        Tag = newsId != null ? $"news-{newsId}" : null
                };

                _context.PushNotifications.Add(notification);
                await _context.SaveChangesAsync();

                // Get all active subscriptions
                var subscriptions = await _context.PushSubscriptions
                    .Where(s => s.IsActive)
                    .ToListAsync();

                if (subscriptions.Count == 0)
                {
                    notification.IsSent = true;
                    notification.SentAt = DateTime.UtcNow;
                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return true;
                }

                // Prepare notification payload
                var payload = JsonSerializer.Serialize(new
                {
                    title,
                    body,
                    icon = icon ?? "/icon-192x192.png",
                    url = url ?? "/",
                    tag = notification.Tag,
                    badge = "/badge-72x72.png",
                    data = new { newsId = newsId, notificationId = notification.Id }
                });                var webPushClient = new WebPushClient();
                var successCount = 0;
                var failedSubscriptions = new List<habersitesi_backend.Models.PushSubscription>();

                // Send to all subscriptions
                foreach (var subscription in subscriptions)
                {
                    try
                    {
                        var pushSubscription = new WebPush.PushSubscription(
                            subscription.Endpoint,
                            subscription.P256dh,
                            subscription.Auth
                        );

                        await webPushClient.SendNotificationAsync(pushSubscription, payload, _vapidDetails);
                        successCount++;
                    }
                    catch (WebPushException ex)
                    {
                        System.Console.WriteLine($"Push notification failed for subscription {subscription.Id}: {ex.Message}");
                        
                        // If subscription is no longer valid, mark as inactive
                        if (ex.StatusCode == System.Net.HttpStatusCode.Gone || 
                            ex.StatusCode == System.Net.HttpStatusCode.BadRequest)
                        {
                            failedSubscriptions.Add(subscription);
                        }
                    }
                    catch (Exception ex)
                    {
                        System.Console.WriteLine($"Unexpected push notification error: {ex.Message}");
                    }
                }

                // Mark failed subscriptions as inactive
                foreach (var failedSub in failedSubscriptions)
                {
                    failedSub.IsActive = false;
                }

                // Update notification status
                notification.IsSent = true;
                notification.SentAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();                System.Console.WriteLine($"Push notification sent to {successCount}/{subscriptions.Count} subscribers");
                return successCount > 0;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    System.Console.WriteLine($"Push notification service error: {ex.Message}");
                    return false;
                }
            });
        }        public async Task<bool> SendNotificationToUserAsync(string userId, string title, string body, string? url = null, string? icon = null)
        {
            // Use execution strategy for atomic user notification
            var strategy = _context.Database.CreateExecutionStrategy();
            return await strategy.ExecuteAsync(async () =>
            {
                using var transaction = await _context.Database.BeginTransactionAsync();
                try
                {
                    var subscriptions = await _context.PushSubscriptions
                        .Where(s => s.UserId == userId && s.IsActive)
                        .ToListAsync();

                    if (subscriptions.Count == 0)
                    {
                        await transaction.CommitAsync();
                        return false;
                    }

                    var payload = JsonSerializer.Serialize(new
                    {
                        title,
                        body,
                        icon = icon ?? "/icon-192x192.png",
                        url = url ?? "/",
                        badge = "/badge-72x72.png"
                    });

                    var webPushClient = new WebPushClient();
                    var successCount = 0;
                    var failedSubscriptions = new List<habersitesi_backend.Models.PushSubscription>();

                    foreach (var subscription in subscriptions)
                    {
                        try
                        {
                            var pushSubscription = new WebPush.PushSubscription(
                                subscription.Endpoint,
                                subscription.P256dh,
                                subscription.Auth
                            );

                            await webPushClient.SendNotificationAsync(pushSubscription, payload, _vapidDetails);
                            successCount++;
                        }
                        catch (WebPushException ex)
                        {
                            System.Console.WriteLine($"User push notification failed: {ex.Message}");
                            
                            // If subscription is no longer valid, mark as inactive
                            if (ex.StatusCode == System.Net.HttpStatusCode.Gone || 
                                ex.StatusCode == System.Net.HttpStatusCode.BadRequest)
                            {
                                failedSubscriptions.Add(subscription);
                            }
                        }
                        catch (Exception ex)
                        {
                            System.Console.WriteLine($"Unexpected user push notification error: {ex.Message}");
                        }
                    }

                    // Mark failed subscriptions as inactive
                    foreach (var failedSub in failedSubscriptions)
                    {
                        failedSub.IsActive = false;
                    }

                    await _context.SaveChangesAsync();
                    await transaction.CommitAsync();
                    return successCount > 0;
                }
                catch (Exception ex)
                {
                    await transaction.RollbackAsync();
                    System.Console.WriteLine($"User push notification error: {ex.Message}");
                    return false;
                }
            });
        }

        public async Task<List<PushNotification>> GetNotificationHistoryAsync(int page = 1, int pageSize = 20)
        {
            return await _context.PushNotifications
                .Include(n => n.News)
                .OrderByDescending(n => n.CreatedAt)
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .ToListAsync();
        }
    }

    // DTOs for push notifications
    public class PushSubscriptionDto
    {
        public string Endpoint { get; set; } = string.Empty;
        public PushSubscriptionKeysDto Keys { get; set; } = new();
    }

    public class PushSubscriptionKeysDto
    {
        public string P256dh { get; set; } = string.Empty;
        public string Auth { get; set; } = string.Empty;
    }

    public class SendNotificationDto
    {
        public string Title { get; set; } = string.Empty;
        public string Body { get; set; } = string.Empty;
        public string? Url { get; set; }
        public string? Icon { get; set; }
        public int? NewsId { get; set; }
    }
}
