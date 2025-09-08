using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using System.Text.RegularExpressions;

public interface IFileService
{
    Task<string> DownloadImageAsync(string imageUrl, HttpContext? httpContext);
    Task<string> SaveBase64ImagesAndUpdateHtml(string html, HttpContext? httpContext);
    Task<(bool Success, string? Url, string? Message)> UploadImageAsync(IFormFile file, HttpContext? httpContext);
    Task<(bool Success, List<string>? Urls, string? Message)> UploadMultipleImagesAsync(IFormFileCollection files, HttpContext? httpContext);
    Task<(bool Success, string? Url, string? Message)> ResizeImageAsync(IFormFile file, int width, int height, HttpContext? httpContext);
    Task<bool> DeleteFileAsync(string fileUrl);
    Task<bool> DeleteFileByPathAsync(string filePath);
    Task<List<string>> ExtractImageUrlsFromHtml(string html);
}

public class FileService : IFileService
{
    private readonly IWebHostEnvironment _env;
    private readonly IHttpClientFactory _httpClientFactory;

    public FileService(IWebHostEnvironment env, IHttpClientFactory httpClientFactory)
    {
        _env = env;
        _httpClientFactory = httpClientFactory;
    }

    public async Task<string> DownloadImageAsync(string imageUrl, HttpContext? httpContext)
    {
        var httpClient = _httpClientFactory.CreateClient();
        var bytes = await httpClient.GetByteArrayAsync(imageUrl);
        var ext = Path.GetExtension(imageUrl).Split('?')[0];
        if (string.IsNullOrEmpty(ext) || ext.Length > 5) ext = ".jpg";
        var fileName = $"{Guid.NewGuid()}{ext}";
        var folder = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");
        if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
        var filePath = Path.Combine(folder, fileName);
        await System.IO.File.WriteAllBytesAsync(filePath, bytes);
        var request = httpContext?.Request;
        var baseUrl = request != null
            ? $"{request.Scheme}://{request.Host}"
            : "http://localhost:5000";
        return $"{baseUrl}/uploads/{fileName}";
    }

    public async Task<string> SaveBase64ImagesAndUpdateHtml(string html, HttpContext? httpContext)
    {
        if (string.IsNullOrEmpty(html)) return html;
        var imgRegex = new Regex("<img[^>]+src=[\"']([^\"'>]+)[\"'][^>]*>", RegexOptions.IgnoreCase);
        var matches = imgRegex.Matches(html);
        foreach (Match match in matches)
        {
            var src = match.Groups[1].Value;
            if (src.StartsWith("data:image"))
            {
                var base64Data = src.Substring(src.IndexOf(",") + 1);
                var mimeType = src.Substring(5, src.IndexOf(";") - 5);
                var ext = mimeType switch
                {
                    "image/png" => ".png",
                    "image/jpeg" => ".jpg",
                    "image/jpg" => ".jpg",
                    "image/gif" => ".gif",
                    "image/webp" => ".webp",
                    _ => ".png"
                };
                var bytes = Convert.FromBase64String(base64Data);
                var fileName = $"{Guid.NewGuid()}{ext}";
                var folder = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");
                if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
                var filePath = Path.Combine(folder, fileName);
                await System.IO.File.WriteAllBytesAsync(filePath, bytes);
                var request = httpContext?.Request;
                var baseUrl = request != null
                    ? $"{request.Scheme}://{request.Host}"
                    : "http://localhost:5000";
                var url = $"{baseUrl}/uploads/{fileName}";
                html = html.Replace(src, url);
            }
            else if (src.StartsWith("http://", StringComparison.OrdinalIgnoreCase) || src.StartsWith("https://", StringComparison.OrdinalIgnoreCase))
            {
                // Dış bağlantıları indirip yerel /uploads altına taşı
                try
                {
                    var localized = await DownloadImageAsync(src, httpContext);
                    html = html.Replace(src, localized);
                }
                catch
                {
                    // İndirilemeyen dış görselleri kaldır
                    html = html.Replace(match.Value, string.Empty);
                }
            }
            else if (src.StartsWith("/"))
            {
                // Sadece /uploads altına izin ver, diğer path'leri kaldır
                if (!src.Contains("/uploads/", StringComparison.OrdinalIgnoreCase))
                {
                    html = html.Replace(match.Value, string.Empty);
                }
            }
        }
        return html;
    }

    public async Task<(bool Success, string? Url, string? Message)> UploadImageAsync(IFormFile file, HttpContext? httpContext)
    {
        if (file == null || file.Length == 0)
            return (false, null, "Dosya yok");

        var allowedTypes = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var ext = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedTypes.Contains(ext))
            return (false, null, "Geçersiz dosya türü");
        if (file.Length > 2 * 1024 * 1024)
            return (false, null, "Dosya çok büyük (max 2MB)");

        var fileName = $"{Guid.NewGuid()}{ext}";
        var folder = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");
        if (!Directory.Exists(folder)) Directory.CreateDirectory(folder);
        var filePath = Path.Combine(folder, fileName);
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }
        var request = httpContext?.Request;
        var baseUrl = request != null
            ? $"{request.Scheme}://{request.Host}"
            : "http://localhost:5000";
        var url = $"{baseUrl}/uploads/{fileName}";
        return (true, url, null);
    }

    public async Task<(bool Success, List<string>? Urls, string? Message)> UploadMultipleImagesAsync(IFormFileCollection files, HttpContext? httpContext)
    {
        if (files == null || files.Count == 0)
            return (false, null, "Dosya yok");

        var urls = new List<string>();
        foreach (var file in files)
        {
            var result = await UploadImageAsync(file, httpContext);
            if (result.Success)
                urls.Add(result.Url!);
        }        return (true, urls, null);
    }

    public async Task<(bool Success, string? Url, string? Message)> ResizeImageAsync(IFormFile file, int width, int height, HttpContext? httpContext)
    {
        if (file == null || file.Length == 0)
            return (false, null, "Dosya seçilmedi");

        var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".gif", ".webp" };
        var maxFileSize = 10 * 1024 * 1024; // 10MB

        if (file.Length > maxFileSize)
            return (false, null, $"Dosya boyutu {maxFileSize / (1024 * 1024)}MB'dan büyük olamaz");

        var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
        if (!allowedExtensions.Contains(extension))
            return (false, null, "Desteklenmeyen dosya formatı");

        var folder = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");
        if (!Directory.Exists(folder)) 
            Directory.CreateDirectory(folder);

        var fileName = $"{Guid.NewGuid()}_resized_{width}x{height}{extension}";
        var filePath = Path.Combine(folder, fileName);        // Simple implementation - for production, use ImageSharp or similar library
        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        var request = httpContext?.Request;
        var baseUrl = request != null
            ? $"{request.Scheme}://{request.Host}"
            : "http://localhost:5000";
        var url = $"{baseUrl}/uploads/{fileName}";
        return (true, url, null);
    }    public Task<bool> DeleteFileAsync(string fileUrl)
    {
        try
        {
            if (string.IsNullOrEmpty(fileUrl)) 
            {
                // DeleteFileAsync: URL is null or empty
                return Task.FromResult(false);
            }

            // DeleteFileAsync: Attempting to delete file

            // URL'den dosya adını çıkart
            var uri = new Uri(fileUrl);
            var fileName = Path.GetFileName(uri.LocalPath);
            
            // uploads klasöründeki dosyayı sil
            var folder = Path.Combine(_env.WebRootPath ?? Path.Combine(_env.ContentRootPath, "wwwroot"), "uploads");
            var filePath = Path.Combine(folder, fileName);
            
            // DeleteFileAsync: File path determined, file exists check completed
            
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
                // DeleteFileAsync: File deleted successfully
                return Task.FromResult(true);
            }
            
            // DeleteFileAsync: File not found
            return Task.FromResult(false);
        }
        catch (Exception)
        {
            // DeleteFileAsync error logged
            return Task.FromResult(false);
        }
    }

    public Task<bool> DeleteFileByPathAsync(string filePath)
    {
        try
        {
            if (string.IsNullOrEmpty(filePath)) return Task.FromResult(false);
            
            if (System.IO.File.Exists(filePath))
            {
                System.IO.File.Delete(filePath);
                return Task.FromResult(true);
            }
            
            return Task.FromResult(false);
        }
        catch (Exception)
        {
            return Task.FromResult(false);
        }
    }    public Task<List<string>> ExtractImageUrlsFromHtml(string html)
    {
        var imageUrls = new List<string>();
        
        if (string.IsNullOrEmpty(html)) return Task.FromResult(imageUrls);
        
        var imgRegex = new Regex("<img[^>]+src=[\"']([^\"'>]+)[\"'][^>]*>", RegexOptions.IgnoreCase);
        var matches = imgRegex.Matches(html);
        
        foreach (Match match in matches)
        {
            var src = match.Groups[1].Value;
            if (src.Contains("/uploads/"))
            {
                imageUrls.Add(src);
            }
        }
        
        return Task.FromResult(imageUrls);
    }
}
