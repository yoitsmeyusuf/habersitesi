using Google.Apis.Auth;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Logging;
using habersitesi_backend.Models;
using habersitesi_backend.Dtos;
using System.Text.Json;

namespace habersitesi_backend.Services
{
    public interface IGoogleAuthService
    {
        Task<GoogleJsonWebSignature.Payload> ValidateGoogleTokenAsync(string credential);
        Task<GoogleUserInfoDto?> GetUserInfoAsync(string accessToken);
        Task<bool> IsValidDomainAsync(string email);
        Task<string> GenerateGoogleAuthUrlAsync(string state = "");
        Task<(bool Success, string? AccessToken, string? Error)> ExchangeCodeForTokenAsync(string code);
    }

    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly GoogleAuthSettings _googleSettings;
        private readonly ILogger<GoogleAuthService> _logger;
        private readonly IHttpClientFactory _httpClientFactory;

        public GoogleAuthService(
            IOptions<GoogleAuthSettings> googleSettings,
            ILogger<GoogleAuthService> logger,
            IHttpClientFactory httpClientFactory)
        {
            _googleSettings = googleSettings.Value;
            _logger = logger;
            _httpClientFactory = httpClientFactory;
        }

        public async Task<GoogleJsonWebSignature.Payload> ValidateGoogleTokenAsync(string credential)
        {
            try
            {
                var settings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new[] { _googleSettings.ClientId }
                };

                var payload = await GoogleJsonWebSignature.ValidateAsync(credential, settings);
                
                _logger.LogInformation("Google token validated for user: {Email}", payload.Email);
                return payload;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Google token validation failed");
                throw new UnauthorizedAccessException("Google kimlik doğrulama başarısız", ex);
            }
        }

        public async Task<GoogleUserInfoDto?> GetUserInfoAsync(string accessToken)
        {
            try
            {
                var httpClient = _httpClientFactory.CreateClient();
                var response = await httpClient.GetAsync($"https://www.googleapis.com/oauth2/v2/userinfo?access_token={accessToken}");
                
                if (!response.IsSuccessStatusCode)
                {
                    _logger.LogError("Failed to get user info from Google: {StatusCode}", response.StatusCode);
                    return null;
                }

                var json = await response.Content.ReadAsStringAsync();
                var userInfo = JsonSerializer.Deserialize<GoogleUserInfoDto>(json, new JsonSerializerOptions
                {
                    PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower
                });

                return userInfo;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting user info from Google");
                return null;
            }
        }

        public Task<bool> IsValidDomainAsync(string email)
        {
            if (!_googleSettings.AllowedDomains.Any())
                return Task.FromResult(true); // Tüm domainlere izin ver

            var domain = email.Split('@').LastOrDefault();
            var isValid = _googleSettings.AllowedDomains.Contains(domain, StringComparer.OrdinalIgnoreCase);
            
            if (!isValid)
                _logger.LogWarning("Login attempt from unauthorized domain: {Domain} for email: {Email}", domain, email);
            
            return Task.FromResult(isValid);
        }

        public Task<string> GenerateGoogleAuthUrlAsync(string state = "")
        {
            var scopes = new[]
            {
                "openid",
                "email",
                "profile"
            };

            var authUrl = $"https://accounts.google.com/o/oauth2/v2/auth?" +
                         $"client_id={Uri.EscapeDataString(_googleSettings.ClientId)}&" +
                         $"redirect_uri={Uri.EscapeDataString(_googleSettings.RedirectUri)}&" +
                         $"response_type=code&" +
                         $"scope={Uri.EscapeDataString(string.Join(" ", scopes))}&" +
                         $"access_type=offline&" +
                         $"include_granted_scopes=true";

            if (!string.IsNullOrEmpty(state))
                authUrl += $"&state={Uri.EscapeDataString(state)}";

            return Task.FromResult(authUrl);
        }

        public async Task<(bool Success, string? AccessToken, string? Error)> ExchangeCodeForTokenAsync(string code)
        {
            try
            {
                var httpClient = _httpClientFactory.CreateClient();
                var parameters = new Dictionary<string, string>
                {
                    {"code", code},
                    {"client_id", _googleSettings.ClientId},
                    {"client_secret", _googleSettings.ClientSecret},
                    {"redirect_uri", _googleSettings.RedirectUri},
                    {"grant_type", "authorization_code"}
                };

                var content = new FormUrlEncodedContent(parameters);
                var response = await httpClient.PostAsync("https://oauth2.googleapis.com/token", content);

                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError("Token exchange failed: {StatusCode} - {Content}", response.StatusCode, errorContent);
                    return (false, null, "Token değişimi başarısız");
                }

                var json = await response.Content.ReadAsStringAsync();
                var tokenResponse = JsonSerializer.Deserialize<JsonElement>(json);

                if (tokenResponse.TryGetProperty("access_token", out var accessTokenElement))
                {
                    return (true, accessTokenElement.GetString(), null);
                }

                return (false, null, "Access token alınamadı");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error exchanging code for token");
                return (false, null, ex.Message);
            }
        }
    }
}
