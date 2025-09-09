using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Microsoft.Extensions.DependencyInjection;
using Swashbuckle.AspNetCore.SwaggerGen;
using Npgsql.EntityFrameworkCore.PostgreSQL;
using habersitesi_backend.Models;
using Microsoft.AspNetCore.Identity.UI.Services;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.HttpOverrides;
using System.Net.Mail;
using System.Net;
using habersitesi_backend.Services;
using WebPush;
using Microsoft.AspNetCore.ResponseCompression;
using System.IO.Compression;
using AspNetCoreRateLimit;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using habersitesi_backend.Middleware;
using habersitesi_backend.Settings;
using DotNetEnv;
using Microsoft.AspNetCore.Server.Kestrel.Core;



var builder = WebApplication.CreateBuilder(args);

var envPath = Path.Combine(builder.Environment.ContentRootPath, ".env.secrets");
if (File.Exists(envPath))
{
    Env.Load(envPath);
    builder.Configuration.AddEnvironmentVariables();
    
    var connString = Environment.GetEnvironmentVariable("DefaultConnection");
    var jwtKey = Environment.GetEnvironmentVariable("Jwt__Key");
    
    var siteBaseUrl = Environment.GetEnvironmentVariable("SiteSettings__BaseUrl");
    if (!string.IsNullOrEmpty(siteBaseUrl))
    {
        builder.Configuration["SiteSettings:BaseUrl"] = siteBaseUrl;
    }
    
    var siteProductionUrl = Environment.GetEnvironmentVariable("SiteSettings__ProductionUrl");
    if (!string.IsNullOrEmpty(siteProductionUrl))
    {
        builder.Configuration["SiteSettings:ProductionUrl"] = siteProductionUrl;
    }
}

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// Add Antiforgery (CSRF Protection)
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN";
    options.Cookie.Name = "__RequestVerificationToken";
    options.Cookie.HttpOnly = false; // Frontend needs to access token
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy = builder.Environment.IsDevelopment() 
        ? CookieSecurePolicy.SameAsRequest 
        : CookieSecurePolicy.Always;
});

if (builder.Environment.IsDevelopment())
{
    builder.Configuration["AllowedHosts"] = "*";
}
else
{
    var allowedHosts = Environment.GetEnvironmentVariable("AllowedHosts");
    if (!string.IsNullOrEmpty(allowedHosts))
    {
        builder.Configuration["AllowedHosts"] = allowedHosts;
        // Production AllowedHosts configured
    }
}

// Add Memory Cache
builder.Services.AddMemoryCache();

// Bind Moderation settings
builder.Services.Configure<ModerationSettings>(builder.Configuration.GetSection("Moderation"));

// Add Response Compression
builder.Services.AddResponseCompression(options =>
{
    options.EnableForHttps = true;
    options.Providers.Add<BrotliCompressionProvider>();
    options.Providers.Add<GzipCompressionProvider>();
    options.MimeTypes = ResponseCompressionDefaults.MimeTypes.Concat(new[]
    {
        "application/json",
        "text/json",
        "text/css",
        "application/javascript",
        "text/html",
        "application/xml",
        "text/xml",
        "application/atom+xml",
        "image/svg+xml"
    });
});

builder.Services.Configure<BrotliCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.Fastest;
});

builder.Services.Configure<GzipCompressionProviderOptions>(options =>
{
    options.Level = CompressionLevel.SmallestSize;
});

// Add Rate Limiting
builder.Services.Configure<IpRateLimitOptions>(builder.Configuration.GetSection("IpRateLimiting"));
builder.Services.Configure<IpRateLimitPolicies>(builder.Configuration.GetSection("IpRateLimitPolicies"));
builder.Services.AddSingleton<IIpPolicyStore, MemoryCacheIpPolicyStore>();
builder.Services.AddSingleton<IRateLimitCounterStore, MemoryCacheRateLimitCounterStore>();
builder.Services.AddSingleton<IRateLimitConfiguration, RateLimitConfiguration>();
builder.Services.AddSingleton<IProcessingStrategy, AsyncKeyLockProcessingStrategy>();

// Add CORS
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend",
        policy => {
            if (builder.Environment.IsDevelopment())
            {
                // Development: Allow localhost
                policy.AllowAnyOrigin()
                      .AllowAnyHeader()
                      .AllowAnyMethod();
            }
            else
            {
                // Production: Allow specific frontend origins
                var allowedOrigins = new[] {
                    "https://habersitesi.rumbara.online",
                    "https://www.habersitesi.rumbara.online",
                    "http://habersitesi.rumbara.online"
                };
                
                policy.WithOrigins(allowedOrigins)
                .AllowAnyHeader()
                .AllowAnyMethod()
                .AllowCredentials();
            }
        });
});

// Add PostgreSQL EF Core with performance optimizations
builder.Services.AddDbContext<AppDbContext>(options =>
{
    // Environment variable'dan veya appsettings'den connection string al
    var connectionString = Environment.GetEnvironmentVariable("DefaultConnection") 
                         ?? builder.Configuration.GetConnectionString("DefaultConnection");
    
    if (string.IsNullOrEmpty(connectionString))
    {
        throw new InvalidOperationException("Connection string 'DefaultConnection' not found in environment variables or appsettings.json");
    }
    
    // Connection string configured successfully
    
    // Database connection test - production'da hızlı test
    if (builder.Environment.IsDevelopment())
    {
        try 
        {
            using var testConnection = new Npgsql.NpgsqlConnection(connectionString);
            testConnection.Open();
            // Database connection test successful
            testConnection.Close();
        }
        catch (Exception ex)
        {
            // Database connection failed - startup will continue
            throw new InvalidOperationException($"Database connection failed: {ex.Message}", ex);
        }
    }
    else
    {
        // Production mode: Skipping database connection test at startup
    }
    
    options.UseNpgsql(connectionString, npgsqlOptions =>
    {
        npgsqlOptions.EnableRetryOnFailure(maxRetryCount: 3, maxRetryDelay: TimeSpan.FromSeconds(30), errorCodesToAdd: null);
        npgsqlOptions.CommandTimeout(30);
    });
    
    // Performance optimizations
    options.EnableSensitiveDataLogging(false);
    options.EnableServiceProviderCaching();
    options.EnableDetailedErrors(builder.Environment.IsDevelopment());
});

// Add JWT Authentication
builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        var jwtKey = Environment.GetEnvironmentVariable("Jwt__Key") 
                   ?? builder.Configuration["Jwt:Key"];
        
        if (string.IsNullOrEmpty(jwtKey))
        {
            if (builder.Environment.IsDevelopment())
                jwtKey = "development-key-min-32-chars-long-1234567890"; // Development fallback
            else
                throw new InvalidOperationException("JWT key must be configured in production");
        }
        
        if (jwtKey.Length < 32)
            throw new InvalidOperationException("JWT key must be at least 32 characters long");
        
        options.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey))
        };
    });

// Google Auth konfigürasyonunu environment variable'lardan al
builder.Configuration["GoogleAuth:ClientId"] = Environment.GetEnvironmentVariable("GoogleAuth__ClientId") ?? builder.Configuration["GoogleAuth:ClientId"];
builder.Configuration["GoogleAuth:ClientSecret"] = Environment.GetEnvironmentVariable("GoogleAuth__ClientSecret") ?? builder.Configuration["GoogleAuth:ClientSecret"];
builder.Configuration["GoogleAuth:RedirectUri"] = Environment.GetEnvironmentVariable("GoogleAuth__RedirectUri") ?? builder.Configuration["GoogleAuth:RedirectUri"];
builder.Configuration["GoogleAuth:RequireEmailVerification"] = Environment.GetEnvironmentVariable("GoogleAuth__RequireEmailVerification") ?? builder.Configuration["GoogleAuth:RequireEmailVerification"];
builder.Configuration["GoogleAuth:AutoCreateUsers"] = Environment.GetEnvironmentVariable("GoogleAuth__AutoCreateUsers") ?? builder.Configuration["GoogleAuth:AutoCreateUsers"];
builder.Configuration["GoogleAuth:DefaultRole"] = Environment.GetEnvironmentVariable("GoogleAuth__DefaultRole") ?? builder.Configuration["GoogleAuth:DefaultRole"];
builder.Configuration["GoogleAuth:RequireAdminApproval"] = Environment.GetEnvironmentVariable("GoogleAuth__RequireAdminApproval") ?? builder.Configuration["GoogleAuth:RequireAdminApproval"];

builder.Services.Configure<GoogleAuthSettings>(builder.Configuration.GetSection("GoogleAuth"));

// Add Google Auth Service
builder.Services.AddScoped<IGoogleAuthService, GoogleAuthService>();

// Add Email Sender
builder.Services.AddSingleton<IEmailService, MailKitEmailService>();
builder.Services.AddHttpClient();
builder.Services.AddScoped<IFileService, FileService>();
builder.Services.AddScoped<IPushNotificationService, PushNotificationService>();
builder.Services.AddSingleton<IModerationService, ModerationService>();

// Add Related News Service
builder.Services.AddScoped<IRelatedNewsService, RelatedNewsService>();

// Add Cache Service
builder.Services.AddSingleton<ICacheService, MemoryCacheService>();

// Add Performance Monitoring
builder.Services.AddSingleton<PerformanceMonitoringService>();

// Add Analytics Service (in-memory)
builder.Services.AddSingleton<IAnalyticsService, InMemoryAnalyticsService>();

// Add Health Checks
builder.Services.AddHealthChecks()
    .AddCheck<PerformanceHealthCheck>("performance");

// Add HTTP Context Accessor for performance tracking
builder.Services.AddHttpContextAccessor();

var app = builder.Build();

// Optional: Apply pending migrations automatically on startup (controlled by env var)
try
{
    var migrateFlag = Environment.GetEnvironmentVariable("MIGRATE_ON_STARTUP");
    if (!string.IsNullOrEmpty(migrateFlag) && migrateFlag.Equals("true", StringComparison.OrdinalIgnoreCase))
    {
        using var scope = app.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        // MIGRATE_ON_STARTUP=true → Applying pending EF Core migrations...
        context.Database.Migrate();
        // Database migrations applied
    }
}
catch (Exception)
{
    // Migration error (startup will continue)
}

// Global error handling with CORS support
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (Exception ex)
    {
        context.Response.StatusCode = 500;

        // CORS headers for error responses
        if (context.Request.Headers.ContainsKey("Origin"))
        {
            var origin = context.Request.Headers["Origin"].ToString();
            var allowedOrigins = new[]
            {
                "https://habersitesi.rumbara.online",
                "https://www.habersitesi.rumbara.online",
                "http://habersitesi.rumbara.online"
            };

            if (allowedOrigins.Contains(origin))
            {
                context.Response.Headers["Access-Control-Allow-Origin"] = origin;
                context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
                context.Response.Headers["Vary"] = "Origin";
            }
        }

        await context.Response.WriteAsJsonAsync(new { message = "Bir hata oluştu.", detail = ex.Message });
        // TODO: Log error to file/db
    }
});

// Add Google Auth Rate Limiting
app.UseGoogleAuthRateLimit(maxAttempts: 5, timeWindowMinutes: 15);

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

// Enable CORS
app.UseCors("AllowFrontend");

// Response header management
app.Use(async (context, next) =>
{
    var origin = context.Request.Headers["Origin"].ToString();
    
    await next();
    
    // Ensure CORS headers for error responses
    if (!string.IsNullOrEmpty(origin))
    {
        var corsHeader = context.Response.Headers["Access-Control-Allow-Origin"].ToString();
        
        if (string.IsNullOrEmpty(corsHeader) && context.Response.StatusCode >= 400)
        {
            var allowedOrigins = new[]
            {
                "https://habersitesi.rumbara.online",
                "https://www.habersitesi.rumbara.online",
                "http://habersitesi.rumbara.online"
            };

            if (allowedOrigins.Contains(origin))
            {
                context.Response.Headers["Access-Control-Allow-Origin"] = origin;
                context.Response.Headers["Access-Control-Allow-Credentials"] = "true";
                context.Response.Headers["Vary"] = "Origin";
            }
        }
    }
});

app.UseHttpsRedirection();

// Enable Response Compression
app.UseResponseCompression();

// Enable Performance Tracking
app.UseMiddleware<habersitesi_backend.Middleware.PerformanceTrackingMiddleware>();

// Enable Rate Limiting
app.UseIpRateLimiting();

// Static files for uploads
app.UseStaticFiles();

app.UseAuthentication();
app.UseAuthorization();

// Security headers
app.Use(async (context, next) =>
{
    // Basic security headers
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["X-Frame-Options"] = "DENY";
    context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
    context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
    
    // Production-only security headers
    if (!app.Environment.IsDevelopment())
    {
        context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload";
        context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; object-src 'none'; frame-ancestors 'none';";
        context.Response.Headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=(), usb=()";
    }
    
    // Remove server information
    context.Response.Headers.Remove("Server");
    
    await next();
});

app.MapControllers();

// Add health check endpoint
app.MapHealthChecks("/health");

app.Run();
