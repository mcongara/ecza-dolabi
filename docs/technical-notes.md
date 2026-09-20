# Teknik notlar

Önceki README’deki ayrıntılı kullanım ve uygulama notları burada korunmuştur. Projenin tanıtımı ve hızlı kurulum için [README](../README.md).

## Çalıştırma

`npm install` ardından `.env.example` dosyasını `.env.local` olarak kopyala ve `AI_GATEWAY_API_KEY` değerini ayarla. `npm run dev` ile http://127.0.0.1:3000 adresini aç.

## Elle ekleme ve canlı değerlendirme

Açık formda ilaç adı/dozu, isteğe bağlı etken madde ve tarihi girip **Listeye ekle** düğmesine bas (Enter da ekler). Form temizlenir; ilaç soldaki sıraya eklenir. Onay kutusu yok; seri giriş için akış engelsizdir. Tarih metin olarak AA/YY yazılır (örn. `09/26`, ayraçsız `0926` da olur); boş bırakılabilir. Takvim açılmaz, Tab ile sonraki alana geçilir.

**Jev ile değerlendir** yalnızca henüz sonucu olmayan kayıtları, 12’şer kayıt içeren toplu HTTP çağrılarıyla işler; sonuçları yanıt gelir gelmez birlikte gösterir. Tamamlanan kayıtlar tekrar gönderilmez. Hata alan kayıtlar yeniden denemede bekleyenler arasında kalır; başarılı sonuçlar korunur. Çalışma sırasında eklenen yeni kayıtlar sonraki çalışmada değerlendirilir.

Sağ panel o an işlenen ilacı, gerçek model olasılıklarını, yanıt süresini, token kullanımını ve ham yanıtı gösterir. Sonuç kartları panelin altında birikir; işlem bittikten sonra bir karta tıklayarak ayrıntısını tekrar açabilirsin. Üst sayaçlar mevcut oturumdaki kayıtları ve başarılı çağrıların toplam token miktarını gösterir.

Sonuçlar arasında yapay bekleme yoktur. Her toplu çağrının sonuçları yanıt geldiğinde birlikte gösterilir.

OCR ve fotoğraf yükleme kaldırıldı. Uygulama veritabanına veya localStorage'a kayıt yapmaz; sayfa yenilenince oturum temizlenir. Kaybetmek istemiyorsan **JSON indir** ile listeyi (değerlendirme sonuçlarıyla birlikte) dosyaya al, sonra **JSON yükle** ile geri getir. Yalnızca isim ve ek kutu bilgisi modele gönderilir; kişisel bilgi eklemeyin. Kodda Zero Data Retention talep edilmez; Gateway ve sağlayıcının geçerli veri saklama koşullarını kullanmadan önce kontrol edin.

## Sonuçlar sayfası

`/sonuclar` sayfası tamamlanan ilaçları kartlar halinde gösterir. Ana sayfa ve sonuçlar sayfası ortak bir React context kullanır; uygulama içi gezinmede kayıtlar korunur, tam sayfa yenilemesinde temizlenir.

## Sınırlar

Bu bir tıbbi karar veya reçete doğrulama sistemi değildir. Jev ilaç grubunu ve ayrı bir boolean sorusuyla Türkiye’de reçetesiz temin edilebilirliğini tahmin eder. Boolean yanıtın evet olasılığı %50 üzerinde Evet, altında Hayır, tam %50 ise Belirsiz gösterilir. Antibiyotikler dahil hiçbir grubun boolean yanıtına yerel müdahale yapılmaz. Ham yanıt JSON yedeğinde korunur; eski kayıtlarda bu soru henüz değerlendirilmedi gösterilir. Resmi Türkiye ilaç veritabanı entegrasyonu yoktur; resmi reçete durumu doğrulanmadı gösterilir. Grup olasılığı %65 altında veya eksikse bilinmiyor kabul edilir. Bu eşik klinik olarak doğrulanmış değildir. Model olasılıkları tıbbi güven yüzdesi değildir.

Bertaraf yönlendirmesi tarih/hasar bilgisi ve reçetesiz temin yanıtına uygulanan yerel envanter kurallarıyla yapılır. Reçetesiz temin yanıtı Hayır ise (evet olasılığı %50 altında) kayıt bertaraf grubuna ayrılır; ham model yanıtı değiştirilmez. Bu kural ilacın bozuk olduğunu göstermez veya düzenli tedaviyi bırakma talimatı değildir. Geçmiş tarihler, mevcut ay ve sonraki üç ay içinde dolan tarihler bertaraf için ayrılır (Türkiye saat dilimi). Reçetesiz ilaçlar için bile kişisel kullanım onayı verilmez. Düzenli tedavi kesilmemeli; atık ilaçlar yerel toplama noktasına teslim edilmelidir.

Yerel kişisel kullanım içindir. İnternete açmadan önce kimlik doğrulama ve kalıcı hız/harcama sınırı ekleyin; API ücretli çağrı yapabilir. Anahtar tarayıcıya verilmez ve `.env.local` git dışında tutulur.

## Kontrol

`npm test` karar sınırları ve girdi doğrulamasını test eder. `npm run build` üretim derlemesi ve TypeScript kontrolünü çalıştırır.

## Kaynaklar

- https://docs.typesafe.ai/models
- https://vercel.com/docs/ai-gateway/modalities/evaluation
- https://tokatism.saglik.gov.tr/TR-232414/atik-ilac-cop-degildir.html
