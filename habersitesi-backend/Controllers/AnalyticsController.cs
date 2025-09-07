using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/analytics")]
public class AnalyticsController : ControllerBase
{
    private readonly IAnalyticsService _analytics;
    private readonly ILogger<AnalyticsController> _logger;

    public AnalyticsController(IAnalyticsService analytics, ILogger<AnalyticsController> logger)
    {
        _analytics = analytics;
        _logger = logger;
    }

    public record ViewDto(string path, string? referrer, string? userAgent, DateTime? ts);

    [HttpPost("view")]
    [IgnoreAntiforgeryToken]
    public IActionResult RecordView([FromBody] ViewDto dto)
    {
        var ua = dto.userAgent ?? Request.Headers["User-Agent"].ToString();
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString();
        _analytics.RecordView(dto.path, dto.referrer, ua, ip);
        return Ok(new { success = true });
    }

    [HttpGet]
    public IActionResult Summary()
    {
        var data = _analytics.GetSummary()
            .Select(kv => new {
                path = kv.Key,
                views = kv.Value.Views,
                uniqueIps = kv.Value.UniqueIps.Count,
                lastSeen = kv.Value.LastSeen
            })
            .OrderByDescending(x => x.views)
            .ToList();
        return Ok(new { data });
    }
}
