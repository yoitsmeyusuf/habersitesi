using System;

namespace habersitesi_backend.Models
{
    public class BannedWord
    {
        public int Id { get; set; }
        public string Word { get; set; } = string.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
