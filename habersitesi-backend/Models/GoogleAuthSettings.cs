namespace habersitesi_backend.Models
{
    public class GoogleAuthSettings
    {
        public string ClientId { get; set; } = null!;
        public string ClientSecret { get; set; } = null!;
        public string RedirectUri { get; set; } = null!;
        public List<string> AllowedDomains { get; set; } = new();
        public bool RequireEmailVerification { get; set; } = true;
        public bool AutoCreateUsers { get; set; } = true;
        public string DefaultRole { get; set; } = "user";
        public bool RequireAdminApproval { get; set; } = true;
    }
}
