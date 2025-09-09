using System.Diagnostics;

namespace habersitesi_backend.Middleware
{
    public class PerformanceTrackingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<PerformanceTrackingMiddleware> _logger;

        public PerformanceTrackingMiddleware(RequestDelegate next, ILogger<PerformanceTrackingMiddleware> logger)
        {
            _next = next;
            _logger = logger;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            // Generate correlation ID for request tracing
            var correlationId = context.Request.Headers["X-Correlation-ID"].FirstOrDefault() 
                             ?? Guid.NewGuid().ToString();
            
            // Add correlation ID to response headers
            if (!context.Response.HasStarted)
            {
                context.Response.Headers["X-Correlation-ID"] = correlationId;
            }

            var stopwatch = Stopwatch.StartNew();
            var endpoint = $"{context.Request.Method} {context.Request.Path}";

            try
            {
                // Get performance monitoring service if available
                var performanceService = context.RequestServices
                    .GetService<Services.PerformanceMonitoringService>();

                performanceService?.RecordRequest(endpoint);

                await _next(context);

                stopwatch.Stop();
                var responseTime = stopwatch.ElapsedMilliseconds;

                // Record metrics
                performanceService?.RecordResponseTime(endpoint, responseTime);

                // Log slow requests with correlation ID
                if (responseTime > 1000)
                {
                    _logger.LogWarning("Slow request: {Endpoint} took {ResponseTime}ms. CorrelationId: {CorrelationId}", 
                        endpoint, responseTime, correlationId);
                }
                
                // Add performance headers (only if response hasn't started)
                if (!context.Response.HasStarted)
                {
                    context.Response.Headers["X-Response-Time"] = $"{responseTime}ms";
                }
            }
            catch (Exception ex)
            {
                stopwatch.Stop();
                
                // Record error
                var performanceService = context.RequestServices
                    .GetService<Services.PerformanceMonitoringService>();
                performanceService?.RecordError(endpoint);

                _logger.LogError(ex, "Request failed: {Endpoint}. CorrelationId: {CorrelationId}", 
                    endpoint, correlationId);
                throw;
            }
        }
    }

    public static class PerformanceTrackingMiddlewareExtensions
    {
        public static IApplicationBuilder UsePerformanceTracking(this IApplicationBuilder builder)
        {
            return builder.UseMiddleware<PerformanceTrackingMiddleware>();
        }
    }
}
