using Microsoft.Extensions.Caching.Memory;
using System.Collections.Concurrent;
using System.Text.RegularExpressions;

namespace habersitesi_backend.Services
{    public interface ICacheService
    {
        Task<T?> GetAsync<T>(string key);
        Task SetAsync<T>(string key, T value, TimeSpan? expiration = null);
        Task RemoveAsync(string key);
        Task RemovePatternAsync(string pattern);
        Task RemoveRegexPatternAsync(string regexPattern);
    }

    public class MemoryCacheService : ICacheService
    {
        private readonly IMemoryCache _cache;
        private readonly ConcurrentDictionary<string, byte> _cacheKeys; // Thread-safe key tracking
        private readonly SemaphoreSlim _semaphore = new(1, 1); // Concurrency control

        public MemoryCacheService(IMemoryCache cache)
        {
            _cache = cache;
            _cacheKeys = new ConcurrentDictionary<string, byte>();
        }

        public async Task<T?> GetAsync<T>(string key)
        {
            return await Task.FromResult(_cache.TryGetValue(key, out T? value) ? value : default(T));
        }

        public async Task SetAsync<T>(string key, T value, TimeSpan? expiration = null)
        {
            var options = new MemoryCacheEntryOptions();
            
            if (expiration.HasValue)
            {
                options.AbsoluteExpirationRelativeToNow = expiration;
            }
            else
            {
                options.AbsoluteExpirationRelativeToNow = TimeSpan.FromMinutes(30); // Default 30 minutes
            }

            // Expiration callback to remove from tracking
            options.PostEvictionCallbacks.Add(new PostEvictionCallbackRegistration
            {
                EvictionCallback = (key, value, reason, state) =>
                {
                    if (key is string keyStr)
                    {
                        _cacheKeys.TryRemove(keyStr, out _);
                    }
                }
            });

            _cache.Set(key, value, options);
            _cacheKeys.TryAdd(key, 0); // Add to tracking
            
            await Task.CompletedTask;
        }

        public async Task RemoveAsync(string key)
        {
            await _semaphore.WaitAsync();
            try
            {
                _cache.Remove(key);
                _cacheKeys.TryRemove(key, out _);
            }
            finally
            {
                _semaphore.Release();
            }
        }        public async Task RemovePatternAsync(string pattern)
        {
            await _semaphore.WaitAsync();
            try
            {
                // Güvenli pattern matching - starts with kullan
                var keysToRemove = _cacheKeys.Keys.Where(k => k.StartsWith(pattern, StringComparison.OrdinalIgnoreCase)).ToList();
                foreach (var key in keysToRemove)
                {
                    _cache.Remove(key);
                    _cacheKeys.TryRemove(key, out _);
                }
            }
            finally
            {
                _semaphore.Release();
            }
        }

        public async Task RemoveRegexPatternAsync(string regexPattern)
        {
            await _semaphore.WaitAsync();
            try
            {
                var regex = new Regex(regexPattern, RegexOptions.Compiled | RegexOptions.IgnoreCase);
                var keysToRemove = _cacheKeys.Keys.Where(k => regex.IsMatch(k)).ToList();
                foreach (var key in keysToRemove)
                {
                    _cache.Remove(key);
                    _cacheKeys.TryRemove(key, out _);
                }
            }
            catch (ArgumentException)
            {
                // Invalid regex pattern - do nothing
            }
            finally
            {
                _semaphore.Release();
            }
        }

        // Dispose pattern for semaphore cleanup
        public void Dispose()
        {
            _semaphore?.Dispose();
        }
    }

    // Cache Keys Constants
    public static class CacheKeys
    {
        public const string CATEGORIES = "categories";
        public const string CATEGORIES_WITH_COUNT = "categories_with_count";
        public const string FEATURED_NEWS = "featured_news";
        public const string NEWS_BY_CATEGORY = "news_category_{0}";
        public const string NEWS_DETAIL = "news_detail_{0}";
        public const string RECENT_NEWS = "recent_news";
        public const string POPULAR_NEWS = "popular_news";
    }
}
