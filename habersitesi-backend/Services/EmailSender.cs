using System.Threading.Tasks;
using MailKit.Net.Smtp;
using MailKit.Security;
using MimeKit;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using habersitesi_backend.Models;
using System.Net;

namespace habersitesi_backend.Services
{    public interface IEmailService
    {
        Task SendEmailConfirmationAsync(User user, string verificationLink);
        Task SendPasswordResetAsync(User user, string resetLink);
        Task SendCustomEmailAsync(string toEmail, string subject, string htmlBody);
        Task<bool> TestEmailConnectionAsync();
    }

    public class MailKitEmailService : IEmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<MailKitEmailService> _logger;

        public MailKitEmailService(IConfiguration config, ILogger<MailKitEmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task<bool> TestEmailConnectionAsync()
        {
            try
            {
                // Environment variable'lardan SMTP ayarlarını al
                var smtpFrom = Environment.GetEnvironmentVariable("Smtp__From") ?? _config["Smtp:From"];
                
                var testMessage = new MimeMessage();
                testMessage.From.Add(MailboxAddress.Parse(smtpFrom!));
                testMessage.To.Add(MailboxAddress.Parse(smtpFrom!)); // Kendimize test
                testMessage.Subject = "Test Connection";
                testMessage.Body = new TextPart("plain") { Text = "Test connection message" };

                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                var host = Environment.GetEnvironmentVariable("Smtp__Host") ?? _config["Smtp:Host"];
                var port = int.Parse(Environment.GetEnvironmentVariable("Smtp__Port") ?? _config["Smtp:Port"] ?? "587");
                var username = Environment.GetEnvironmentVariable("Smtp__Username") ?? _config["Smtp:Username"];
                var password = Environment.GetEnvironmentVariable("Smtp__Password") ?? _config["Smtp:Password"];

                _logger.LogInformation("Trying to connect to SMTP: {Host}:{Port} with {Username}", host, port, username);

                await smtp.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
                await smtp.AuthenticateAsync(username, password);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation("SMTP connection test successful");
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "SMTP connection test failed: {Message}", ex.Message);
                return false;
            }
        }

        public async Task SendEmailConfirmationAsync(User user, string verificationLink)
        {
            var subject = "E-posta Doğrulama";
            var body = $"""
                <html>
                <body>
                    <h2>Merhaba {user.Username},</h2>
                    <p>Lütfen e-posta adresinizi doğrulamak için aşağıdaki bağlantıya tıklayın:</p>
                    <p><a href="{verificationLink}" style="background-color: #4CAF50; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">E-postamı Doğrula</a></p>
                    <p>Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
                    <br>
                    <p>İyi günler dileriz!</p>
                </body>
                </html>
            """;
            await SendEmailAsync(user.Email, subject, body);
        }        public async Task SendPasswordResetAsync(User user, string resetLink)
        {
            var subject = "Şifre Sıfırlama";
            var body = $"""
                <html>
                <body>
                    <h2>Merhaba {user.Username},</h2>
                    <p>Şifrenizi sıfırlamak için aşağıdaki bağlantıya tıklayın:</p>
                    <p><a href="{resetLink}" style="background-color: #f44336; color: white; padding: 14px 20px; text-decoration: none; border-radius: 4px;">Şifremi Sıfırla</a></p>
                    <p><strong>Bu bağlantı 1 saat geçerlidir.</strong></p>
                    <p>Eğer bu işlemi siz yapmadıysanız, bu e-postayı görmezden gelebilirsiniz.</p>
                    <br>
                    <p>İyi günler dileriz!</p>
                </body>
                </html>
            """;
            await SendEmailAsync(user.Email, subject, body);
        }

        public async Task SendCustomEmailAsync(string toEmail, string subject, string htmlBody)
        {
            await SendEmailAsync(toEmail, subject, htmlBody);
        }

        private async Task SendEmailAsync(string toEmail, string subject, string htmlBody)
        {
            var message = new MimeMessage();
            
            // Environment variable'lardan SMTP ayarlarını al
            var smtpFrom = Environment.GetEnvironmentVariable("Smtp__From") ?? _config["Smtp:From"];
            message.From.Add(MailboxAddress.Parse(smtpFrom!));
            message.To.Add(MailboxAddress.Parse(toEmail));
            message.Subject = subject;

            var bodyBuilder = new BodyBuilder { HtmlBody = htmlBody };
            message.Body = bodyBuilder.ToMessageBody();

            var host = Environment.GetEnvironmentVariable("Smtp__Host") ?? _config["Smtp:Host"];
            var port = int.Parse(Environment.GetEnvironmentVariable("Smtp__Port") ?? _config["Smtp:Port"] ?? "587");
            var username = Environment.GetEnvironmentVariable("Smtp__Username") ?? _config["Smtp:Username"];
            var password = Environment.GetEnvironmentVariable("Smtp__Password") ?? _config["Smtp:Password"];

            _logger.LogInformation("Attempting to send email to {ToEmail} via {Host}:{Port}", toEmail, host, port);

            // İlk olarak MailKit ile deneyelim
            try
            {
                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                // SSL bağlantısı
                await smtp.ConnectAsync(host, port, SecureSocketOptions.SslOnConnect);
                await smtp.AuthenticateAsync(username, password);
                await smtp.SendAsync(message);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation("E-posta başarıyla gönderildi (MailKit SSL): {ToEmail}", toEmail);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "MailKit SSL ile gönderim başarısız, STARTTLS deneniyor: {Message}", ex.Message);
            }

            // STARTTLS ile deneyelim
            try
            {
                using var smtp = new SmtpClient();
                smtp.ServerCertificateValidationCallback = (s, c, h, e) => true;

                await smtp.ConnectAsync(host, port == 465 ? 587 : port, SecureSocketOptions.StartTls);
                await smtp.AuthenticateAsync(username, password);
                await smtp.SendAsync(message);
                await smtp.DisconnectAsync(true);

                _logger.LogInformation("E-posta başarıyla gönderildi (MailKit STARTTLS): {ToEmail}", toEmail);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "MailKit STARTTLS ile gönderim başarısız, System.Net.Mail deneniyor: {Message}", ex.Message);
            }

            // System.Net.Mail ile deneyelim (fallback)
            try
            {
                using var client = new System.Net.Mail.SmtpClient(host, port);
                client.Credentials = new NetworkCredential(username, password);
                client.EnableSsl = true;

                var mailMessage = new System.Net.Mail.MailMessage();
                mailMessage.From = new System.Net.Mail.MailAddress(_config["Smtp:From"]!);
                mailMessage.To.Add(toEmail);
                mailMessage.Subject = subject;
                mailMessage.Body = htmlBody;
                mailMessage.IsBodyHtml = true;

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation("E-posta başarıyla gönderildi (System.Net.Mail): {ToEmail}", toEmail);
                return;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Tüm e-posta gönderim yöntemleri başarısız oldu: {Message}", ex.Message);
                throw new Exception($"E-posta gönderilemedi. Son hata: {ex.Message}");
            }
        }
    }
}

