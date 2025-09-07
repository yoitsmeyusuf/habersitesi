using System.Collections.Generic;
using System.Threading.Tasks;

namespace habersitesi_backend.Services
{
    public interface IModerationService
    {
        IReadOnlyCollection<string> GetBannedWords();
        Task UpdateBannedWordsAsync(IEnumerable<string> words);
    }
}
