using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Identity.UI.Services;

[ApiController]
[Route("api/newsletter")]
public class NewsletterController : ControllerBase
{
    private readonly IEmailSender _emailSender;
    public NewsletterController(IEmailSender emailSender)
    {
        _emailSender = emailSender;
    }

    [HttpPost]
    public async Task<IActionResult> Subscribe([FromBody] NewsletterDto dto)
    {
        // Basit e-posta doğrulama
        if (string.IsNullOrEmpty(dto.Email) || !dto.Email.Contains("@"))
            return BadRequest(new { message = "Geçersiz e-posta" });

        // Burada veritabanına kaydedebilirsiniz (isteğe bağlı)
        // Örnek: if (await _context.Newsletter.AnyAsync(x => x.Email == dto.Email)) return BadRequest(new { message = "Bu e-posta zaten abone." });
        // await _context.Newsletter.AddAsync(new Newsletter { Email = dto.Email }); await _context.SaveChangesAsync();

        await _emailSender.SendEmailAsync(dto.Email, "Bülten Aboneliği", "Bültenimize abone olduğunuz için teşekkürler!");
        return Ok(new { message = "Abonelik başarılı, e-posta gönderildi." });
    }
}

public class NewsletterDto
{
    public string Email { get; set; } = "";
}
