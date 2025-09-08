using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Http;

namespace habersitesi_backend.Services
{
    /// <summary>
    /// Helper class for generating secure, deterministic cache keys using SHA-256
    /// to prevent hash collisions that can occur with GetHashCode()
    /// </summary>
    public static class CacheKeyHelper
    {
        /// <summary>
        /// Generates a secure cache key using route, query parameters, and user ID
        /// </summary>
        /// <param name="route">The route/endpoint path</param>
        /// <param name="query">Query parameters as key-value pairs</param>
        /// <param name="userId">User ID for user-specific caching (optional)</param>
        /// <returns>Deterministic SHA-256 based cache key</returns>
        public static string GenerateKey(string route, IDictionary<string, string?>? query = null, string? userId = null)
        {
            var keyBuilder = new StringBuilder();
            
            // Add route (normalized)
            keyBuilder.Append(NormalizeRoute(route));
            
            // Add query parameters (sorted for deterministic output)
            if (query != null && query.Any())
            {
                keyBuilder.Append('|');
                var sortedQuery = query
                    .Where(kv => !string.IsNullOrEmpty(kv.Value))
                    .OrderBy(kv => kv.Key, StringComparer.OrdinalIgnoreCase)
                    .Select(kv => $"{kv.Key.ToLowerInvariant()}={kv.Value}");
                
                keyBuilder.Append(string.Join("&", sortedQuery));
            }
            
            // Add user ID if provided
            if (!string.IsNullOrEmpty(userId))
            {
                keyBuilder.Append('|');
                keyBuilder.Append($"user={userId}");
            }
            
            // Generate SHA-256 hash
            return GenerateSha256Hash(keyBuilder.ToString());
        }
        
        /// <summary>
        /// Generates a cache key from HTTP context
        /// </summary>
        /// <param name="httpContext">Current HTTP context</param>
        /// <param name="includeUser">Whether to include user ID in the key</param>
        /// <returns>Deterministic cache key</returns>
        public static string GenerateKey(HttpContext httpContext, bool includeUser = false)
        {
            var route = httpContext.Request.Path.Value ?? string.Empty;
            var query = httpContext.Request.Query.ToDictionary(
                kv => kv.Key, 
                kv => (string?)kv.Value.ToString());
            
            string? userId = null;
            if (includeUser && httpContext.User.Identity?.IsAuthenticated == true)
            {
                userId = httpContext.User.Identity.Name;
            }
            
            return GenerateKey(route, query, userId);
        }
        
        /// <summary>
        /// Generates a simple cache key for basic string concatenation scenarios
        /// </summary>
        /// <param name="parts">Parts to combine into cache key</param>
        /// <returns>Deterministic cache key</returns>
        public static string GenerateKey(params string?[] parts)
        {
            var normalizedParts = parts
                .Where(p => !string.IsNullOrEmpty(p))
                .Select(p => p!.Trim().ToLowerInvariant());
                
            var combined = string.Join("|", normalizedParts);
            return GenerateSha256Hash(combined);
        }
        
        /// <summary>
        /// Normalizes route path for consistent caching
        /// </summary>
        private static string NormalizeRoute(string route)
        {
            if (string.IsNullOrEmpty(route))
                return string.Empty;
                
            return route.Trim().ToLowerInvariant().TrimEnd('/');
        }
        
        /// <summary>
        /// Generates SHA-256 hash of input string
        /// </summary>
        private static string GenerateSha256Hash(string input)
        {
            if (string.IsNullOrEmpty(input))
                return string.Empty;
                
            using var sha256 = SHA256.Create();
            var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(input));
            return Convert.ToHexString(hash).ToLowerInvariant();
        }
    }
}