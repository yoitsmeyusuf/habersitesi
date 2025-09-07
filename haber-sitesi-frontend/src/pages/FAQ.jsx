import React from 'react'
import SEOHead from '../components/SEOHead'

const FAQ = () => {
  const faqData = [
    {
      category: "Genel",
      questions: [
        {
          question: "HaberSitesi nedir?",
          answer: "HaberSitesi, Türkiye'nin güncel haberlerini takip edebileceğiniz, güvenilir ve tarafsız bir haber platformudur. Siyaset, ekonomi, spor, teknoloji ve daha birçok kategoride güncel haberleri bulabilirsiniz."
        },
        {
          question: "Haberler ne sıklıkla güncelleniyor?",
          answer: "Haberlerimiz 7/24 güncellenmektedir. Önemli gelişmeleri an be an takip ederek okuyucularımıza en güncel bilgileri sunmaya çalışıyoruz."
        },
        {
          question: "Haber kaynaklarınız nelerdir?",
          answer: "Haberlerimizi güvenilir kaynaklardan derliyor, kendi muhabir ağımızla üretiyoruz. Tüm haberlerimiz editöryal süreçten geçerek yayınlanır."
        }
      ]
    },
    {
      category: "Hesap ve Üyelik",
      questions: [
        {
          question: "Nasıl üye olabilirim?",
          answer: "Sağ üst köşedeki 'Kayıt Ol' butonuna tıklayarak ücretsiz hesap oluşturabilirsiniz. Sadece e-posta adresiniz ve bir şifre yeterlidir."
        },
        {
          question: "Şifremi unuttum, ne yapmalıyım?",
          answer: "Giriş sayfasındaki 'Şifremi Unuttum' linkine tıklayarak e-posta adresinizi girin. Size şifre sıfırlama linki gönderilecektir."
        },
        {
          question: "Hesabımı nasıl silebilirim?",
          answer: "Hesap silme işlemi için bizimle iletişime geçmeniz gerekmektedir. İletişim sayfasından bize ulaşabilirsiniz."
        },
        {
          question: "E-posta adresimi değiştirebilir miyim?",
          answer: "Evet, profil ayarlarından e-posta adresinizi değiştirebilirsiniz. Yeni e-posta adresi doğrulama gerektirmektedir."
        }
      ]
    },
    {
      category: "Yorumlar ve Etkileşim",
      questions: [
        {
          question: "Yorum yapmak için ne yapmalıyım?",
          answer: "Yorum yapmak için önce siteye giriş yapmanız gerekir. Giriş yaptıktan sonra haberlerin altındaki yorum bölümünü kullanabilirsiniz."
        },
        {
          question: "Yorumlarım neden görünmüyor?",
          answer: "Yorumlar moderasyon sürecinden geçmektedir. Uygun olmayan içerik barındırmayan yorumlar kısa süre içinde yayınlanır."
        },
        {
          question: "Uygunsuz yorum nasıl şikayet edebilirim?",
          answer: "Her yorumun yanındaki şikayet butonunu kullanarak uygunsuz yorumları bildirebilirsiniz. Ekibimiz en kısa sürede inceleyecektir."
        }
      ]
    },
    {
      category: "Teknik Destek",
      questions: [
        {
          question: "Site neden yavaş açılıyor?",
          answer: "İnternet bağlantınızı kontrol edin. Sorun devam ederse tarayıcınızın önbelleğini temizlemeyi deneyin. Hala sorun varsa bizimle iletişime geçin."
        },
        {
          question: "Mobil uygulamanız var mı?",
          answer: "Şu anda sadece web sitesi mevcuttur. Ancak sitemiz mobil cihazlar için optimize edilmiştir ve tarayıcıdan rahatlıkla kullanabilirsiniz."
        },
        {
          question: "Hangi tarayıcıları destekliyorsunuz?",
          answer: "Chrome, Firefox, Safari ve Edge'in güncel sürümlerini destekliyoruz. En iyi deneyim için tarayıcınızı güncel tutmanızı öneririz."
        },
        {
          question: "Bildirimler nasıl açılır?",
          answer: "Giriş yaptıktan sonra ana sayfada çıkan bildirim iznini kabul ederek son dakika haberlerinden haberdar olabilirsiniz."
        }
      ]
    },
    {
      category: "Gizlilik ve Güvenlik",
      questions: [
        {
          question: "Kişisel bilgilerim güvende mi?",
          answer: "Evet, kişisel bilgileriniz KVKK kapsamında korunmaktadır. Gizlilik politikamızı inceleyerek detaylı bilgi alabilirsiniz."
        },
        {
          question: "Çerez politikanız nedir?",
          answer: "Site deneyiminizi iyileştirmek için çerezler kullanıyoruz. Çerez politikamızda hangi çerezleri kullandığımızı açıklıyoruz."
        },
        {
          question: "Verilerim satılıyor mu?",
          answer: "Hayır, kişisel verilerinizi üçüncü taraflarla paylaşmıyor veya satmıyoruz. Verileriniz sadece size daha iyi hizmet vermek için kullanılır."
        }
      ]
    },
    {
      category: "İçerik ve Telif",
      questions: [
        {
          question: "Haberlerinizi paylaşabilir miyim?",
          answer: "Evet, sosyal medya paylaşım butonlarını kullanarak haberlerimizi paylaşabilirsiniz. Kaynak belirtmek şartıyla kısa alıntılar yapabilirsiniz."
        },
        {
          question: "Telif hakkı ihlali nasıl bildirilir?",
          answer: "Telif hakkı ihlali durumunda iletişim sayfamızdan bizimle iletişime geçebilirsiniz. Gerekli incelemeyi yaparak işlem gerçekleştiririz."
        },
        {
          question: "Kendi haberimi nasıl gönderebilirim?",
          answer: "Şu anda kullanıcı kaynaklı haber kabul etmiyoruz. Ancak haber ipuçlarınızı iletişim sayfamızdan gönderebilirsiniz."
        }
      ]
    }
  ]

  return (
    <div className="bg-white min-h-screen">
      {/* SEO Head */}
      <SEOHead
        title="Sıkça Sorulan Sorular - HaberSitesi"
        description="HaberSitesi hakkında sıkça sorulan soruların cevaplarını burada bulabilirsiniz. Hesap, teknik destek, gizlilik ve daha fazlası."
        keywords="sss, sıkça sorulan sorular, yardım, destek, haber sitesi"
        url={`${window.location.origin}/sss`}
      />

      <div className="max-w-4xl mx-auto px-3 sm:px-4 lg:px-6 py-8 sm:py-10 lg:py-12">
        {/* Header */}
        <div className="text-center mb-8 sm:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-4">
            Sıkça Sorulan Sorular
          </h1>
          <p className="text-lg sm:text-xl text-gray-600 max-w-2xl mx-auto">
            Merak ettiğiniz konular hakkında yanıtlar bulun. Aradığınızı bulamazsanız bizimle iletişime geçin.
          </p>
        </div>

        {/* Quick Search */}
        <div className="mb-8 sm:mb-12">
          <div className="relative max-w-md mx-auto">
            <input
              type="text"
              placeholder="SSS'de ara..."
              className="w-full px-4 py-3 pl-12 rounded-xl border-2 border-gray-200 focus:outline-none focus:ring-4 focus:ring-primary-100 focus:border-primary-500 transition-all duration-200"
              onChange={(e) => {
                const searchTerm = e.target.value.toLowerCase()
                const sections = document.querySelectorAll('.faq-section')
                const questions = document.querySelectorAll('.faq-question')
                
                if (!searchTerm) {
                  sections.forEach(section => section.style.display = 'block')
                  questions.forEach(question => question.style.display = 'block')
                  return
                }
                
                questions.forEach(question => {
                  const text = question.textContent.toLowerCase()
                  question.style.display = text.includes(searchTerm) ? 'block' : 'none'
                })
                
                sections.forEach(section => {
                  const visibleQuestions = section.querySelectorAll('.faq-question[style*="block"]')
                  section.style.display = visibleQuestions.length > 0 ? 'block' : 'none'
                })
              }}
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* FAQ Categories */}
        <div className="space-y-8">
          {faqData.map((category, categoryIndex) => (
            <div key={categoryIndex} className="faq-section">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-r from-primary-500 to-accent-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">{categoryIndex + 1}</span>
                </div>
                {category.category}
              </h2>
              
              <div className="space-y-4">
                {category.questions.map((item, questionIndex) => (
                  <div key={questionIndex} className="faq-question card p-6">
                    <details className="group">
                      <summary className="flex items-center justify-between cursor-pointer list-none">
                        <h3 className="text-lg font-semibold text-gray-900 group-open:text-primary-600 transition-colors duration-200">
                          {item.question}
                        </h3>
                        <div className="ml-4 flex-shrink-0">
                          <svg className="w-5 h-5 text-gray-500 group-open:text-primary-600 group-open:rotate-45 transition-all duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                        </div>
                      </summary>
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-gray-700 leading-relaxed">
                          {item.answer}
                        </p>
                      </div>
                    </details>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-12 text-center">
          <div className="card p-8 bg-gradient-to-r from-primary-50 to-accent-50 border border-primary-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Cevabını Bulamadınız mı?
            </h2>
            <p className="text-gray-600 mb-6">
              Aradığınız sorunun cevabını bulamadıysanız, bizimle doğrudan iletişime geçin
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a 
                href="/iletisim"
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-primary-500 to-accent-500 text-white rounded-xl hover:from-primary-600 hover:to-accent-600 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:scale-105"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                İletişime Geç
              </a>
              <a 
                href="mailto:destek@habersitesi.com"
                className="inline-flex items-center gap-2 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 transition-all duration-200 font-semibold"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                E-posta Gönder
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default FAQ
