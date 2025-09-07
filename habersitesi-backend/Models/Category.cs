using System.ComponentModel.DataAnnotations;

namespace habersitesi_backend.Models
{
    public class Category
    {
        public int Id { get; set; }

        [Required]
        public string Name { get; set; } = null!;

        public ICollection<News>? News { get; set; }
    }
}
