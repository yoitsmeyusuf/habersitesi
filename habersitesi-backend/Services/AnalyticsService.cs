using System.Collections.Concurrent;

public interface IAnalyticsService
{
    void RecordView(string path, string? referrer, string? userAgent, string? ip);
    IReadOnlyDictionary<string, PathViewStats> GetSummary();
    void Reset();
}

public class PathViewStats
{
    public long Views { get; set; }
    public HashSet<string> UniqueIps { get; } = new();
    public DateTime LastSeen { get; set; } = DateTime.UtcNow;
}

public class InMemoryAnalyticsService : IAnalyticsService
{
    private readonly ConcurrentDictionary<string, PathViewStats> _stats = new(StringComparer.OrdinalIgnoreCase);

    public void RecordView(string path, string? referrer, string? userAgent, string? ip)
    {
        if (string.IsNullOrWhiteSpace(path)) path = "/";

        var entry = _stats.GetOrAdd(path, _ => new PathViewStats());
        lock (entry)
        {
            entry.Views++;
            if (!string.IsNullOrWhiteSpace(ip))
            {
                lock (entry.UniqueIps)
                {
                    entry.UniqueIps.Add(ip);
                }
            }
            entry.LastSeen = DateTime.UtcNow;
        }
        // Optionally log referrer/userAgent if needed in future
    }

    public IReadOnlyDictionary<string, PathViewStats> GetSummary()
    {
        return _stats;
    }

    public void Reset()
    {
        _stats.Clear();
    }
}
