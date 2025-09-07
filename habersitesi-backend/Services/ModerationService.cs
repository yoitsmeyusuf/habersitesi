using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Threading.Tasks;
using habersitesi_backend.Settings;
using habersitesi_backend.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace habersitesi_backend.Services
{
    public class ModerationService : IModerationService
    {
        private readonly object _lock = new object();
        private readonly string _storagePath;
        private HashSet<string> _bannedWords;
        private readonly IServiceScopeFactory _scopeFactory;

        public ModerationService(IOptions<ModerationSettings> options, IServiceScopeFactory scopeFactory)
        {
            _scopeFactory = scopeFactory;
            _storagePath = Path.Combine(Directory.GetCurrentDirectory(), "banned-words.json");
            var initial = options?.Value?.BannedWords ?? new List<string>();
            _bannedWords = new HashSet<string>(initial, System.StringComparer.OrdinalIgnoreCase);
            // Prefer DB values if exist
            if (!LoadFromDatabase())
            {
                // Fallback to file override
                LoadFromFile();
            }
        }

        private void LoadFromFile()
        {
            try
            {
                if (File.Exists(_storagePath))
                {
                    var json = File.ReadAllText(_storagePath);
                    var arr = JsonSerializer.Deserialize<List<string>>(json) ?? new List<string>();
                    _bannedWords = new HashSet<string>(arr, System.StringComparer.OrdinalIgnoreCase);
                }
            }
            catch
            {
                // ignore
            }
        }

        private async Task SaveToFileAsync()
        {
            try
            {
                var list = _bannedWords.OrderBy(x => x).ToList();
                var json = JsonSerializer.Serialize(list, new JsonSerializerOptions { WriteIndented = true });
                await File.WriteAllTextAsync(_storagePath, json);
            }
            catch
            {
                // ignore
            }
        }

        public IReadOnlyCollection<string> GetBannedWords()
        {
            lock (_lock)
            {
                return _bannedWords.ToList().AsReadOnly();
            }
        }

        public async Task UpdateBannedWordsAsync(IEnumerable<string> words)
        {
            lock (_lock)
            {
                _bannedWords = new HashSet<string>(words ?? Enumerable.Empty<string>(), System.StringComparer.OrdinalIgnoreCase);
            }
            await SaveToFileAsync();
            await SaveToDatabaseAsync();
        }

        private async Task SaveToDatabaseAsync()
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();

                // Fetch current words
                var existing = await context.BannedWords.AsNoTracking().ToListAsync();
                var desired = _bannedWords.ToList();

                // Delete removed
                foreach (var row in existing)
                {
                    if (!desired.Any(w => string.Equals(w, row.Word, System.StringComparison.OrdinalIgnoreCase)))
                    {
                        context.BannedWords.Remove(new BannedWord { Id = row.Id });
                    }
                }
                // Add new
                foreach (var w in desired)
                {
                    if (!existing.Any(e => string.Equals(e.Word, w, System.StringComparison.OrdinalIgnoreCase)))
                    {
                        context.BannedWords.Add(new BannedWord { Word = w });
                    }
                }
                await context.SaveChangesAsync();
            }
            catch
            {
                // ignore persistence failures
            }
        }

        private bool LoadFromDatabase()
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var context = scope.ServiceProvider.GetRequiredService<AppDbContext>();
                var words = context.BannedWords.AsNoTracking().Select(b => b.Word).ToList();
                if (words.Count > 0)
                {
                    lock (_lock)
                    {
                        _bannedWords = new HashSet<string>(words, System.StringComparer.OrdinalIgnoreCase);
                    }
                    return true;
                }
            }
            catch
            {
                // ignore
            }
            return false;
        }
    }
}
