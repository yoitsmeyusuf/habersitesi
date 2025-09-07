using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using System.Net;

namespace habersitesi_backend.Middleware
{
    public class GoogleAuthRateLimitMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly IMemoryCache _cache;
        private readonly ILogger<GoogleAuthRateLimitMiddleware> _logger;
        private readonly int _maxAttempts;
        private readonly TimeSpan _timeWindow;

        public GoogleAuthRateLimitMiddleware(
            RequestDelegate next, 
            IMemoryCache cache, 
            ILogger<GoogleAuthRateLimitMiddleware> logger,
            int maxAttempts = 5,
            int timeWindowMinutes = 15)
        {
            _next = next;
            _cache = cache;
            _logger = logger;
            _maxAttempts = maxAttempts;
            _timeWindow = TimeSpan.FromMinutes(timeWindowMinutes);
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Sadece Google auth endpoint'lerini kontrol et
            if (!IsGoogleAuthEndpoint(context.Request.Path))
            {
                await _next(context);
                return;
            }

            var clientIp = GetClientIpAddress(context);
            var cacheKey = $"google_auth_attempts_{clientIp}";

            // Cache'den mevcut denemeler sayısını al
            if (_cache.TryGetValue(cacheKey, out int attempts))
            {
                if (attempts >= _maxAttempts)
                {
                    _logger.LogWarning("Google auth rate limit exceeded for IP: {ClientIp}", clientIp);
                    context.Response.StatusCode = (int)HttpStatusCode.TooManyRequests;
                    context.Response.Headers["Retry-After"] = _timeWindow.TotalSeconds.ToString();
                    
                    await context.Response.WriteAsync(System.Text.Json.JsonSerializer.Serialize(new
                    {
                        message = "Çok fazla Google giriş denemesi. Lütfen daha sonra tekrar deneyin.",
                        retryAfter = _timeWindow.TotalMinutes,
                        code = "RATE_LIMIT_EXCEEDED"
                    }));
                    return;
                }
            }

            await _next(context);

            // Eğer başarısızsa attempt sayısını artır
            if (context.Response.StatusCode >= 400)
            {
                var newAttempts = attempts + 1;
                _cache.Set(cacheKey, newAttempts, _timeWindow);
                _logger.LogInformation("Google auth failed attempt {Attempts}/{MaxAttempts} for IP: {ClientIp}", 
                    newAttempts, _maxAttempts, clientIp);
            }
            else if (context.Response.StatusCode < 300)
            {
                // Başarılı ise cache'i temizle
                _cache.Remove(cacheKey);
            }
        }

        private bool IsGoogleAuthEndpoint(string path)
        {
            return path.StartsWith("/api/auth/google", StringComparison.OrdinalIgnoreCase);
        }

        private string GetClientIpAddress(HttpContext context)
        {
            // X-Forwarded-For header'ını kontrol et (proxy/load balancer için)
            var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
            if (!string.IsNullOrEmpty(forwardedFor))
            {
                return forwardedFor.Split(',')[0].Trim();
            }

            // X-Real-IP header'ını kontrol et
            var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
            if (!string.IsNullOrEmpty(realIp))
            {
                return realIp;
            }

            // Remote IP address
            return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        }
    }

    public static class GoogleAuthRateLimitMiddlewareExtensions
    {
        public static IApplicationBuilder UseGoogleAuthRateLimit(
            this IApplicationBuilder builder, 
            int maxAttempts = 5, 
            int timeWindowMinutes = 15)
        {
            return builder.UseMiddleware<GoogleAuthRateLimitMiddleware>(maxAttempts, timeWindowMinutes);
        }
    }
}
