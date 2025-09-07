using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Diagnostics;

namespace habersitesi_backend.Services
{
    public class PerformanceMonitoringService
    {
        private readonly ILogger<PerformanceMonitoringService> _logger;
        private readonly ICacheService _cacheService;
        private static readonly Dictionary<string, List<double>> _responseTimeHistory = new();
        private static readonly Dictionary<string, int> _requestCounts = new();
        private static readonly Dictionary<string, int> _errorCounts = new();
        private static readonly object _lock = new();

        public PerformanceMonitoringService(
            ILogger<PerformanceMonitoringService> logger,
            ICacheService cacheService)
        {
            _logger = logger;
            _cacheService = cacheService;
        }

        public void RecordResponseTime(string endpoint, double milliseconds)
        {
            lock (_lock)
            {
                if (!_responseTimeHistory.ContainsKey(endpoint))
                {
                    _responseTimeHistory[endpoint] = new List<double>();
                }

                _responseTimeHistory[endpoint].Add(milliseconds);

                // Keep only last 100 measurements
                if (_responseTimeHistory[endpoint].Count > 100)
                {
                    _responseTimeHistory[endpoint].RemoveAt(0);
                }

                // Log slow requests
                if (milliseconds > 1000) // More than 1 second
                {
                    _logger.LogWarning("Slow request detected: {Endpoint} took {ResponseTime}ms", 
                        endpoint, milliseconds);
                }
            }
        }

        public void RecordRequest(string endpoint)
        {
            lock (_lock)
            {
                _requestCounts[endpoint] = _requestCounts.GetValueOrDefault(endpoint, 0) + 1;
            }
        }

        public void RecordError(string endpoint)
        {
            lock (_lock)
            {
                _errorCounts[endpoint] = _errorCounts.GetValueOrDefault(endpoint, 0) + 1;
                _logger.LogError("Error recorded for endpoint: {Endpoint}", endpoint);
            }
        }

        public PerformanceMetrics GetMetrics(string endpoint)
        {
            lock (_lock)
            {
                var responseTimes = _responseTimeHistory.GetValueOrDefault(endpoint, new List<double>());
                var requestCount = _requestCounts.GetValueOrDefault(endpoint, 0);
                var errorCount = _errorCounts.GetValueOrDefault(endpoint, 0);

                if (responseTimes.Count == 0)
                {
                    return new PerformanceMetrics
                    {
                        Endpoint = endpoint,
                        RequestCount = requestCount,
                        ErrorCount = errorCount,
                        AverageResponseTime = 0,
                        MinResponseTime = 0,
                        MaxResponseTime = 0,
                        SuccessRate = requestCount > 0 ? (double)(requestCount - errorCount) / requestCount * 100 : 100
                    };
                }

                return new PerformanceMetrics
                {
                    Endpoint = endpoint,
                    RequestCount = requestCount,
                    ErrorCount = errorCount,
                    AverageResponseTime = responseTimes.Average(),
                    MinResponseTime = responseTimes.Min(),
                    MaxResponseTime = responseTimes.Max(),
                    MedianResponseTime = GetMedian(responseTimes),
                    P95ResponseTime = GetPercentile(responseTimes, 95),
                    SuccessRate = requestCount > 0 ? (double)(requestCount - errorCount) / requestCount * 100 : 100
                };
            }
        }

        public Dictionary<string, PerformanceMetrics> GetAllMetrics()
        {
            lock (_lock)
            {
                var allEndpoints = _responseTimeHistory.Keys
                    .Union(_requestCounts.Keys)
                    .Union(_errorCounts.Keys)
                    .Distinct();

                return allEndpoints.ToDictionary(endpoint => endpoint, GetMetrics);
            }
        }        public async Task<CacheMetrics> GetCacheMetricsAsync()
        {
            // This would require implementing cache statistics in CacheService
            // For now, return placeholder data
            return await Task.FromResult(new CacheMetrics
            {
                HitCount = 0, // Would need to track in CacheService
                MissCount = 0, // Would need to track in CacheService
                CacheSize = 0 // Would need to track in CacheService
            });
        }

        private static double GetMedian(List<double> values)
        {
            var sorted = values.OrderBy(x => x).ToList();
            int count = sorted.Count;
            
            if (count % 2 == 0)
            {
                return (sorted[count / 2 - 1] + sorted[count / 2]) / 2.0;
            }
            else
            {
                return sorted[count / 2];
            }
        }

        private static double GetPercentile(List<double> values, int percentile)
        {
            var sorted = values.OrderBy(x => x).ToList();
            int index = (int)Math.Ceiling(percentile / 100.0 * sorted.Count) - 1;
            return sorted[Math.Min(index, sorted.Count - 1)];
        }

        public void ResetMetrics()
        {
            lock (_lock)
            {
                _responseTimeHistory.Clear();
                _requestCounts.Clear();
                _errorCounts.Clear();
                _logger.LogInformation("Performance metrics reset");
            }
        }
    }

    public class PerformanceMetrics
    {
        public string Endpoint { get; set; } = string.Empty;
        public int RequestCount { get; set; }
        public int ErrorCount { get; set; }
        public double AverageResponseTime { get; set; }
        public double MinResponseTime { get; set; }
        public double MaxResponseTime { get; set; }
        public double MedianResponseTime { get; set; }
        public double P95ResponseTime { get; set; }
        public double SuccessRate { get; set; }
    }

    public class CacheMetrics
    {
        public long HitCount { get; set; }
        public long MissCount { get; set; }
        public double HitRate => HitCount + MissCount > 0 ? (double)HitCount / (HitCount + MissCount) * 100 : 0;
        public long CacheSize { get; set; }
    }

    // Health check for performance monitoring
    public class PerformanceHealthCheck : IHealthCheck
    {
        private readonly PerformanceMonitoringService _performanceService;

        public PerformanceHealthCheck(PerformanceMonitoringService performanceService)
        {
            _performanceService = performanceService;
        }

        public Task<HealthCheckResult> CheckHealthAsync(
            HealthCheckContext context,
            CancellationToken cancellationToken = default)
        {
            try
            {
                var metrics = _performanceService.GetAllMetrics();
                
                // Check if any endpoint has poor performance
                var poorPerformingEndpoints = metrics.Values
                    .Where(m => m.AverageResponseTime > 2000 || m.SuccessRate < 95)
                    .ToList();

                if (poorPerformingEndpoints.Any())
                {
                    var issues = string.Join(", ", poorPerformingEndpoints
                        .Select(e => $"{e.Endpoint} (avg: {e.AverageResponseTime:F2}ms, success: {e.SuccessRate:F1}%)"));
                    
                    return Task.FromResult(
                        HealthCheckResult.Degraded($"Performance issues detected: {issues}"));
                }

                return Task.FromResult(HealthCheckResult.Healthy("All endpoints performing well"));
            }
            catch (Exception ex)
            {
                return Task.FromResult(
                    HealthCheckResult.Unhealthy("Performance monitoring failed", ex));
            }
        }
    }
}
