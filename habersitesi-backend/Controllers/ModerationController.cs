using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using habersitesi_backend.Services;

[ApiController]
[Route("api/admin/moderation")]
public class ModerationController : ControllerBase
{
    private readonly IModerationService _moderation;
    public ModerationController(IModerationService moderation)
    {
        _moderation = moderation;
    }

    [HttpGet("banned-words")]
    [Authorize(Roles = "admin")]
    public IActionResult GetBannedWords()
    {
        var words = _moderation.GetBannedWords();
        return Ok(new { words });
    }

    public class UpdateBannedWordsDto
    {
        public List<string> Words { get; set; } = new();
    }

    [HttpPut("banned-words")]
    [Authorize(Roles = "admin")]
    public async Task<IActionResult> UpdateBannedWords([FromBody] UpdateBannedWordsDto dto)
    {
        await _moderation.UpdateBannedWordsAsync(dto.Words ?? new List<string>());
        return Ok(new { success = true });
    }
}
