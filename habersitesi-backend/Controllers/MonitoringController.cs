using Microsoft.AspNetCore.Mvc;
using habersitesi_backend.Services;

namespace habersitesi_backend.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class MonitoringController : ControllerBase
    {
        private readonly PerformanceMonitoringService _performanceService;
        private readonly ICacheService _cacheService;
        private readonly ILogger<MonitoringController> _logger;

        public MonitoringController(
            PerformanceMonitoringService performanceService,
            ICacheService cacheService,
            ILogger<MonitoringController> logger)
        {
            _performanceService = performanceService;
            _cacheService = cacheService;
            _logger = logger;
        }

        [HttpGet("performance")]
        public ActionResult<Dictionary<string, PerformanceMetrics>> GetPerformanceMetrics()
        {
            try
            {
                var metrics = _performanceService.GetAllMetrics();
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get performance metrics");
                return StatusCode(500, "Failed to retrieve performance metrics");
            }
        }

        [HttpGet("performance/{endpoint}")]
        public ActionResult<PerformanceMetrics> GetEndpointMetrics(string endpoint)
        {
            try
            {
                var decodedEndpoint = Uri.UnescapeDataString(endpoint);
                var metrics = _performanceService.GetMetrics(decodedEndpoint);
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get metrics for endpoint: {Endpoint}", endpoint);
                return StatusCode(500, "Failed to retrieve endpoint metrics");
            }
        }

        [HttpGet("cache")]
        public async Task<ActionResult<CacheMetrics>> GetCacheMetrics()
        {
            try
            {
                var metrics = await _performanceService.GetCacheMetricsAsync();
                return Ok(metrics);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get cache metrics");
                return StatusCode(500, "Failed to retrieve cache metrics");
            }
        }

        [HttpPost("reset-metrics")]
        public ActionResult ResetMetrics()
        {
            try
            {
                _performanceService.ResetMetrics();
                _logger.LogInformation("Performance metrics reset by admin");
                return Ok(new { message = "Performance metrics reset successfully" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to reset performance metrics");
                return StatusCode(500, "Failed to reset performance metrics");
            }
        }

        [HttpGet("health-summary")]
        public ActionResult GetHealthSummary()
        {
            try
            {
                var metrics = _performanceService.GetAllMetrics();
                
                var summary = new
                {
                    TotalEndpoints = metrics.Count,
                    HealthyEndpoints = metrics.Values.Count(m => m.AverageResponseTime < 500 && m.SuccessRate >= 99),
                    SlowEndpoints = metrics.Values.Count(m => m.AverageResponseTime >= 500),
                    ErrorProneEndpoints = metrics.Values.Count(m => m.SuccessRate < 99),
                    OverallSuccessRate = metrics.Values.Any() ? 
                        metrics.Values.Average(m => m.SuccessRate) : 100,
                    AverageResponseTime = metrics.Values.Any() ? 
                        metrics.Values.Average(m => m.AverageResponseTime) : 0,
                    TopSlowEndpoints = metrics.Values
                        .OrderByDescending(m => m.AverageResponseTime)
                        .Take(5)
                        .Select(m => new { m.Endpoint, m.AverageResponseTime, m.SuccessRate })
                        .ToList()
                };

                return Ok(summary);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get health summary");
                return StatusCode(500, "Failed to retrieve health summary");
            }
        }

        [HttpGet("system-info")]
        public ActionResult GetSystemInfo()
        {
            try
            {
                var process = System.Diagnostics.Process.GetCurrentProcess();
                
                var systemInfo = new
                {
                    ServerTime = DateTime.UtcNow,
                    Uptime = DateTime.UtcNow - process.StartTime.ToUniversalTime(),
                    MemoryUsage = new
                    {
                        WorkingSet = process.WorkingSet64 / 1024 / 1024, // MB
                        PrivateMemory = process.PrivateMemorySize64 / 1024 / 1024, // MB
                        VirtualMemory = process.VirtualMemorySize64 / 1024 / 1024 // MB
                    },
                    ProcessorInfo = new
                    {
                        ProcessorCount = Environment.ProcessorCount,
                        TotalProcessorTime = process.TotalProcessorTime,
                        UserProcessorTime = process.UserProcessorTime
                    },
                    Environment = new
                    {
                        MachineName = Environment.MachineName,
                        OSVersion = Environment.OSVersion.ToString(),
                        Framework = Environment.Version.ToString(),
                        Is64BitProcess = Environment.Is64BitProcess
                    }
                };

                return Ok(systemInfo);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to get system info");
                return StatusCode(500, "Failed to retrieve system information");
            }
        }
    }
}
