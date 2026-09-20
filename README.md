# ecza dolabı

Evde ecza dolabında biriken ilaçları listelemek, gruplamak ve ayırmak için küçük bir web uygulaması.

Bu proje, **TypeSafe AI’ın Jev modelini gerçek bir kullanım senaryosunda denemek** için yapıldı. “Evde biriken ilaçları nasıl düzenlerim?” sorusu üzerinden Jev’in yapılandırılmış sorulara verdiği yanıtları, olasılıklarını ve toplu değerlendirme akışını gözlemlemeyi amaçlıyor.

**Vibe coding ile geliştirildi:** AI kodlama araçlarıyla, uygulamayı kullanıp geri bildirim vererek ve küçük değişikliklerle ilerleyerek ortaya çıktı. Açık kaynak bir deney; doğrulanmış bir tıbbi ürün veya model performansını ölçen bir benchmark değil.

## Neler yapıyor?

- İlaç adı ve dozunu, isteğe bağlı kutu bilgisini ve son kullanma tarihini elle ekleme.
- Jev ile ilaç grubu ve reçetesiz temin tahmini; olasılıkları ve ham yanıtları inceleme.
- En fazla 12 ilacı tek çağrıda değerlendirme; sonuçları bekletmeden gösterme.
- Tamamlanan ilaçları ayrı bir sayfada kartlar halinde görme.
- Listeyi ve sonuçları JSON olarak indirme ve geri yükleme.

Fotoğraf/OCR, kullanıcı hesabı ve veritabanı yok. Arayüz Türkçe.

## Yerelde çalıştırma

### Gerekenler

- Node.js 22 ve npm. Proje Node.js 22.22.0 ile kontrol edildi; kurulu Next.js sürümünün minimum gereksinimi Node.js 20.9.
- `typesafe-ai/jev` modeline erişebilen bir **Vercel AI Gateway API anahtarı**. Model çağrıları hesabında ücret oluşturabilir.

Depoyu klonla veya ZIP olarak indir, ardından proje klasöründe:

```sh
npm ci
cp .env.example .env.local
```

`.env.local` dosyasındaki örnek değeri kendi anahtarınla değiştir:

```dotenv
AI_GATEWAY_API_KEY=your_vercel_ai_gateway_key
```

Geliştirme sunucusunu başlat:

```sh
npm run dev
```

[http://127.0.0.1:3000](http://127.0.0.1:3000) adresini aç. Anahtarı değiştirdiğinde sunucuyu yeniden başlat.

Üretim derlemesini yerelde çalıştırmak için:

```sh
npm run build
npm start
```

## Kullanım

1. İlacın adını ve dozunu yaz. Etken madde/kutu bilgisi ve tarih isteğe bağlıdır; kişisel bilgi ekleme.
2. Tarihi `09/26` veya `0926` gibi girip **Listeye ekle** düğmesine bas.
3. **Jev ile değerlendir** ile bekleyen kayıtları gönder. Başarılı sonuçlar tekrar gönderilmez; hatalı kayıtları yeniden deneyebilirsin.
4. Ayrıntıları sağ panelden, tüm kartları **Tamamlanan sonuçlar → Tümünü gör** bağlantısından incele.
5. Oturumu saklamak için **JSON indir**, geri almak için **JSON yükle** kullan.

Kayıtlar yalnızca uygulamanın belleğinde tutulur. Sayfalar arasında gezinirken korunur; **sayfayı yenilediğinde veya kapattığında silinir**.

## Jev burada ne yapıyor?

Next.js sunucusu, Vercel AI Gateway’in `/v1/evaluate` uç noktasına her ilaç için iki soru gönderir:

| Soru | Tip | Çıktı |
| --- | --- | --- |
| İlaç hangi grupta? | `choice` | Grup seçimi ve sınıf olasılıkları |
| Türkiye’de reçetesiz temin edilebilir mi? | `boolean` | “Evet” olasılığı |

Bu sorular aynı toplu istekte çalışır. Modele yalnızca **ilaç adı/dozu ve ek kutu bilgisi** gönderilir; tarih ve paket durumu gönderilmez. Antibiyotikler dahil hiçbir grubun reçetesiz temin yanıtı yerel kodla zorla “Hayır” yapılmaz.

Karttaki `Reçetesiz temin: Hayır · %10` ifadesinde yüzde, **“Evet” olasılığıdır**. %50 üzeri “Evet”, altı “Hayır”, tam %50 “Belirsiz” gösterilir. Bu değer kişisel kullanım güvenliği yüzdesi değildir.

Grup kararı için eşik %65’tir. Bunun altındaki tahmin arayüzde yüzdesiyle görünür, ancak yerel karar mantığında grup doğrulanmamış kabul edilir.

## Yerel ayırma kuralları ve sınırlar

“Bertaraf için ayır” etiketi modelin doğrudan kararı değildir. Uygulamanın deney amaçlı envanter kurallarıyla üretilir:

- Tarihi geçmiş veya bu ay / önümüzdeki üç ay içinde dolacak kayıtlar ayrılır.
- Reçetesiz temin tahmini “Hayır” olan kayıtlar ayrılır.
- Eski JSON kayıtlarında hasarlı olarak işaretlenmiş ürünler de ayrılır; mevcut formda paket durumu alanı yoktur.

**Bu uygulama tıbbi tavsiye veya resmi reçete doğrulama sistemi değildir.** Resmi ilaç veritabanına bağlı değildir; model yanıtları ve eşikler klinik olarak doğrulanmamıştır. Özellikle reçetesiz temin sonucuna göre ayırma, bu deneye ait bir tercihtir; ilacın bozuk olduğu veya gerçekten atılması gerektiği anlamına gelmez. Kullanıma başlama, tedaviyi bırakma veya bertaraf etme kararını bu çıktıya dayanarak verme; eczacınla doğrula.

## Veri ve anahtarlar

- `AI_GATEWAY_API_KEY` yalnızca sunucu tarafında kullanılır. `.env.local` Git dışında tutulur; anahtarı kaynak koda veya `NEXT_PUBLIC_*` değişkenlerine koyma.
- İlaç adı ve kutu bilgisi değerlendirme sırasında Vercel AI Gateway üzerinden model sağlayıcısına gider. Veritabanı olmaması, hiçbir dış servise veri gönderilmediği anlamına gelmez.
- JSON yedekleri ilaç listenizi içerir. Kendi yedeklerini ve anahtarlarını issue veya pull request içine ekleme.
- Repo public paylaşılabilir; çalışan uygulama şu anda yerel kullanım içindir. API’de kullanıcı doğrulaması ve kalıcı hız/harcama sınırı yoktur. İnternete açık bir kurulum yapmadan önce bunları ekle.

## Geliştirme

Next.js App Router, React, TypeScript, Zod ve Lucide kullanılıyor. Model entegrasyonu doğrudan HTTP üzerinden çalışıyor.

```sh
npm test              # Yerel kurallar, API yanıt işleme ve JSON yedek testleri
npm run typecheck    # TypeScript kontrolü
npm run build        # Üretim derlemesi
```

Testler gerçek Jev çağrısı yapmaz; API yanıtları mock edilir. Test ve derleme için gerçek API anahtarı gerekmez.

| Dosya | Görevi |
| --- | --- |
| `app/page.tsx` | İlaç ekleme ve toplu değerlendirme akışı |
| `app/sonuclar/page.tsx` | Tamamlanan sonuçların kart görünümü |
| `app/api/analyze/route.ts` | Sunucu tarafındaki Jev çağrısı |
| `app/components/inventory-provider.tsx` | Sayfalar arasında paylaşılan oturum verisi |
| `lib/analysis.ts` | Girdi doğrulama, tarih ve ayırma kuralları |
| `lib/queue.ts` | Sonuç gösterimi, bekleyen kayıtlar ve yedek doğrulama |

Önceki README’deki ayrıntılar [teknik notlarda](docs/technical-notes.md) korunuyor.

## Katkı

Issue ve pull request’ler açık. Hata bildirirken tekrar üretme adımlarını ve beklenen davranışı yaz; mümkünse kişisel olmayan örnek veri kullan. Karar kurallarını değiştiren katkılarda ilgili sınır durumlarını test et. Commit öncesinde testleri, tip kontrolünü ve derlemeyi çalıştır.

## Lisans

[ISC](LICENSE). Mevcut `package.json` lisans tanımıyla aynıdır.

## Bağlantılar

- [TypeSafe AI modelleri](https://docs.typesafe.ai/models)
- [Vercel AI Gateway Evaluation dokümantasyonu](https://vercel.com/docs/ai-gateway/modalities/evaluation)
