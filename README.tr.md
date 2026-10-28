<div align="center">

# Incursio

[English](README.md) | **Türkçe**

*Latincede "istila" demek.* Doğrudan tarayıcıda çalışan, hızlı tempolu, yukarıdan bakışlı bir nişancı oyunu.<br>
Sıfırdan saf JavaScript ve HTML5 Canvas API ile yazıldı. Oyun motoru, kütüphane veya derleme adımı yok.

### [▶ Hemen Oyna](https://enes0102.github.io/incursio/)

![Oynanış](assets/gameplay.gif)

</div>

## Hakkında

Zamanla daha hızlı, daha dayanıklı ve daha kalabalık hale gelen sonsuz düşman dalgalarına karşı olabildiğince uzun hayatta kal. XP toplayıp seviye atla, birikebilen yükseltmelerle kendi karakterini kur, her dakika gelen yeni bir boss'u alt et ve en yüksek skorun peşine düş.

> Oyun Türkçe ve İngilizce oynanabilir, ana menünün sağ üstündeki bayraklardan dili seçebilirsin.

## Neden Yaptım

Incursio'yu JavaScript öğrenmek için yaptım. Oyun motoru kullanmak yerine, bir motorun senin için neler yaptığını anlamak istedim: oyun döngüsü, canvas'a çizim, çarpışma algılama, girdi yönetimi ve kodla ses üretimi.

Geliştirme sırasında işleri hızlandırmak, kavramları anlamak ve hataları bulmak için yapay zekâ araçlarından yararlandım. Oynanış tasarımı, testler, denge ayarları ve sıradaki özelliğe dair kararlar bana ait.

## Kontroller

| Tuş | İşlev |
| --- | --- |
| `W` `A` `S` `D` | Hareket |
| Fare | Nişan alma |
| Sol tık (basılı tut) | Ateş etme |
| `F` | Otomatik ateşi açma / kapatma (varsayılan: açık) |
| `Space` | Atılma (Dash yükseltmesini alınca) |
| `1` `2` `3` (`4`) / Tıklama | Seviye atlayınca yükseltme seçme |
| `R` (seviye atlayınca) | Kartları yenileme (Atölye'den açılınca) |
| `Enter` / Tıklama | Oyunu başlatma |
| `←` `→` / `A` `D` / Oklara tıklama | Ana menüde tehlike seviyesi seçme |
| `W` (ana menüde) | Atölye'yi açma |
| `R` / Tıklama | Oyun bitince tekrar oynama |
| `Esc` / `P` | Duraklatma / devam etme |
| `R` / `Q` (duraklatılmışken) | Yeniden başlatma / menüye çıkma |
| `Esc` (oyun bitince) | Menüye dönme |
| `M` | Sesi açma / kapatma |

### Dokunmatik (telefon ve tablet)

| Dokunma | İşlev |
| --- | --- |
| Sol tarafta sürükleme | Hareket eden sanal joystick ile hareket |
| Otomatik | En yakın düşmana nişan alıp ateş eder |
| Atılma düğmesi (sağ alt) | Atılma (Dash yükseltmesini alınca) |
| Duraklatma düğmesi (sağ üst) | Duraklatma; ses, duraklatma menüsünden açılıp kapatılır |
| Dokunma | Menüler, kartlar, Atölye ve butonlar |

Telefonu yan tutarak oyna; oyunu başlatınca (tarayıcı izin veriyorsa) tam ekrana geçer.

## Özellikler

- **XP ve seviye sistemi**: yenilen düşmanlar parlayan XP kristalleri düşürür, her seviyede 17 yükseltmelik havuzdan çıkan üç karttan birini seçersin; doğru ikiliyi sonuna kadar alınca 3 evrimden biri açılır
- **Boss savaşları**: her 60 saniyede bir, her biri öncekinden güçlü
- **Ormanla çevrili, çitli büyük bir çayır** (yaklaşık 3×3 ekran), oyuncuyu takip eden kamera ve mini harita
- **Pixel art dünya**: doğal açık ve koyu bölgeleri olan çimen, ahşap çitler, ağaçlar, çiçekler, mantarlar, kütükler, çalılar ve taşlar
- **Akıcı hareket ve nişan alma**, kare hızından bağımsız fizik (delta time) ile
- **Otomatik ateş**, atış hızı sınırıyla: basılı tutmak da tıklamak kadar adil
- **Altı düşman tipi ve elite varyantları**, uzaktan saldıran, hücum eden ve bölünen düşmanlar dahil
- **Yedi güçlendirme**, yenilen düşmanlardan düşer
- **Dengeli zorluk eğrisi**: düşmanların sayısı, hızı ve canı zamanla artar, ilerleyen dakikalarda gruplar halinde gelirler; verdikleri XP de artar, böylece build'in zorluğa yetişebilir
- **Can barı**: 100 can, hasar sayıları ve az önce ne kadar can gittiğini gösteren, yavaşça eriyen "hayalet" bar; her düşman farklı miktarda hasar verir
- **Hasar sonrası dokunulmazlık**
- **Pixel art sprite'lar**, vurulunca beyaz yanıp sönme efektiyle
- **Hasar sayıları**: her vuruşta verilen hasar belirir, kritik vuruşlarda daha büyük ve turuncu
- **Oyun hissi efektleri**: parçacık patlamaları, ekran sarsıntısı, hasar flaşı ve yükselen yazılar
- **Prosedürel ses efektleri**, Web Audio API ile gerçek zamanlı üretilir, ses dosyası kullanılmaz
- **0–10 arası tehlike seviyeleri**: 10 dakika hayatta kalınca bir sonraki, daha zor seviye açılır
- **Altın ve Atölye**: oyun sırasında altın topla, oyunlar arasında kalıcı geliştirmelere harca
- **Kalıcı en yüksek skor**, her tehlike seviyesi için ayrı, tarayıcıda `localStorage` ile saklanır
- **Oyun ekranları**: başlangıç menüsü, duraklatma menüsü, seviye atlama ve oyun bitti ekranları
- **Mobil destek**: dokunmatik joystick, otomatik nişan ve her cihaza sığacak şekilde ölçeklenen ekran
- **Türkçe ve İngilizce**: ana menüdeki bayraklara tıklayarak dil değiştirme
- **Otomatik ateş**: fareye basılı tutmadan imlecin yönüne ateş eder (`F` ile aç/kapat)

### Düşmanlar

| Düşman | Açıklama |
| --- | --- |
| 🔴 Normal | Standart düşman. Baştan itibaren gelir. |
| 🟠 Hızlı | Küçük ve çevik. 15. saniyeden sonra gelir. |
| 🟣 Tank | Büyük, yavaş ve 4 vuruşta ölür. 30. saniyeden sonra gelir ve daha sık güçlendirme düşürür. |
| 🩷 Splitter | Ölünce iki küçük ve hızlı parçaya bölünen pembe bir balçık (elite ise üç). 1:30'dan sonra gelir, normal düşmanların bir kısmının yerini alır. |
| 🟡 Spitter | Mesafesini korur ve uzaktan zehir tükürür. 5:00'ten sonra gelir. |
| 🔴 Charger | Durur, gideceği yolu kırmızı çizgiyle gösterir, sonra çok hızlı hücum eder. 7:00'den sonra gelir. |
| ✨ Elite | 8:00'den sonra her düşman altın parlayan bir elite olarak gelebilir: daha büyük, 3 kat can, 1.5 kat hasar, 3 kat ödül. %5 ile başlar ve her dakika artar. |

Bütün düşman hasarları her dakika %5 artar; yani her şeyi sonuna kadar almış bir build bile hareket etmek zorunda.

### Boss

Her 60 saniyede bir, önce bir uyarıyla taçlı dev bir canavar gelir. Yavaşça seni kovalar ve iki saldırı arasında geçiş yapar: her yöne mermi halkası ve sana nişanlı yelpaze atış. Her yeni boss'un canı daha fazladır (zamanla da artar), daha çok mermi atar ve daha sık saldırır. 3. boss'tan itibaren dönen bir sarmal mermi yağmuru, 5. boss'tan itibaren de minyon çağırma saldırısı eklenir. Onu yenmek büyük skor bonusu, bol XP, garanti güçlendirme ve bir **hazine sandığı** kazandırır. Sandığın üstüne yürüyünce açılır ve rastgele bir yükseltme bedavaya gelir (açılmış bir evrim varsa o); ekranın üstünde çıkan bir pano tam olarak ne kazandığını gösterir. Her şey sonuna kadar alınmışsa canını tamamen doldurur ve bonus skor verir.

### Tehlike Seviyeleri

Ana menüden tehlike seviyesini seçebilirsin. Herkes Tehlike 0'dan başlar; açtığın en yüksek seviyede 10:00 hayatta kalınca bir sonraki açılır, Tehlike 10'a kadar. Her seviye şunları ekler:

| Seviye başına | Etkisi | Tehlike 10'da |
| --- | --- | --- |
| Düşman canı | +%12 (boss'lar dahil) | +%120 |
| Düşman hasarı | +%8 | +%80 |
| Doğma hızı | düşmanlar %2.5 daha sık doğar | %25 daha sık |
| Boss aralığı | boss'lar 1.5 sn daha erken gelir | 45 saniyede bir |
| Elite'ler | 30 sn daha erken gelir (en erken 3:00), +%1 ihtimal | 3:00'ten itibaren, +%10 |
| Altın | +%25 | ×3.5 |

Her tehlike seviyesinin kendi en yüksek skoru vardır.

### Altın ve Atölye

Düşmanlar bazen altın külçesi düşürür: sıradan düşmanlar nadiren, elite'ler her zaman, boss'lar bolca. Altın alındığı anda kaydedilir, yani ölünce kaybolmaz. Ana menüdeki **Atölye**'de harcanır. Atölye bilerek küçük tutuldu: her şeyi sonuna kadar almak sadece biraz güç katar, uzun vadeli asıl zorluk tehlike seviyelerinden gelir.

| Atölye geliştirmesi | Etkisi | Maks. |
| --- | --- | --- |
| Sağlam Yapı (Sturdy Build) | Seviye başına +4 maksimum can | 5 |
| Hafif Adım (Light Step) | Seviye başına +%1.2 hareket hızı | 5 |
| Bilgelik (Wisdom) | Seviye başına +%2 XP | 5 |
| Açgözlülük (Greed) | Seviye başına +%5 altın | 5 |
| İkinci Şans (Second Thoughts) | Her oyunda +1 kart yenileme hakkı (seviye atlayınca `R`) | 3 |
| Geniş Seçim (Wide Choice) | Seviye atlayınca 3 yerine 4 kart çıkar | 1 |
| Erken Başlangıç (Head Start) | Her oyuna rastgele bir yükseltmeyle başla | 1 |

### Yükseltmeler

| Yükseltme | Etkisi | Maks. |
| --- | --- | --- |
| Güçlü Atış (Power Shot) | Mermi hasarı +1 | 5 |
| Hızlı Tetik (Quick Trigger) | %15 daha hızlı ateş | 5 |
| Çoklu Atış (Multishot) | Her atışta +1 mermi | 3 |
| Delici Mermi (Piercing Rounds) | Mermiler +1 düşmanın içinden geçer | 3 |
| Çevik Botlar (Swift Boots) | %10 daha hızlı hareket | 5 |
| Mermi Hızı (Velocity) | Mermiler %20 daha hızlı uçar | 3 |
| Dayanıklılık (Vitality) | +20 maksimum can ve 20 can yenileme | 5 |
| Mıknatıs (Magnet) | XP'yi daha uzaktan toplama | 3 |
| Yenilenme (Regeneration) | Saniyede 0.8 / 1.4 / 2 can yenileme | 3 |
| Dönen Bıçaklar (Orbiting Blades) | Etrafında dönen 1 / 2 / 3 shuriken düşmanları keser | 3 |
| Kritik Vuruş (Critical Hit) | %10 / %20 / %30 ihtimalle 2 kat hasar | 3 |
| Patlayıcı Mermi (Explosive Rounds) | Ölen düşmanlar patlayıp yakındakilere hasar verir (zincirleme olabilir) | 3 |
| Zırh (Armor) | %10 / %20 / %30 daha az hasar | 3 |
| Atılma (Dash) | `Space` ile atılma, atılırken dokunulmazlık; bekleme süresi 3 / 2.2 / 1.5 sn | 3 |
| Can Çalma (Lifesteal) | Her öldürmede 0.5 / 1 / 1.5 can | 3 |
| Buz Aurası (Frost Aura) | Yakınındaki düşmanlar %25 / %35 / %45 yavaşlar (boss'a yarı etki) | 3 |
| Şans (Lucky) | Güçlendirmeler ×1.4 / ×1.8 / ×2.2 daha sık düşer | 3 |

Her seviye atlamada en az bir saldırı yükseltmesi teklif edilir, böylece hasarın her zaman zorluğa yetişebilir.

### Evrimler

Bir ikilideki iki yükseltme de sonuna kadar alınınca, evrimleşmiş hali bir sonraki seviye atlamada parlayan mor bir kartla mutlaka çıkar. Her evrim bir kez alınabilir.

| Evrim | Gereken | Etkisi |
| --- | --- | --- |
| Ray Tüfeği (Railgun) | Çoklu Atış + Delici Mermi | Mermiler bütün düşmanları deler ve %25 daha fazla hasar verir |
| Buz Bıçakları (Frost Blades) | Dönen Bıçaklar + Buz Aurası | +1 bıçak, bıçaklar kestiği düşmanı dondurur (1.5 sn boyunca %60 yavaşlama) |
| İnfilak (Detonation) | Patlayıcı Mermi + Kritik Vuruş | +%10 kritik şansı, kritik vuruşlar çarptığı yerde patlar |

### Güçlendirmeler

| Güçlendirme | Etkisi |
| --- | --- |
| 🟢 `+` Health | 25 can yeniler |
| 🟡 `R` Rapid Fire | 6 saniye boyunca 2.5 kat hızlı ateş |
| 🔵 `3` Triple Shot | 8 saniye boyunca aynı anda üç mermi |
| 🟣 `S` Shield | Alacağın bir sonraki hasarı engeller |
| 🧲 Magnet (Mıknatıs) | Haritadaki bütün XP kristallerini sana çeker |
| ❄️ Freeze (Dondurma) | Bütün düşmanları 4 saniye yerinde dondurur (boss'lar yarı hıza düşer) |
| 💣 Bomb (Bomba) | Ekrandaki bütün düşmanları yok eder, düşman mermilerini siler ve boss'un maksimum canının %8'i kadar hasar verir |

En sık can düşer, en nadir bomba.

## Yerelde Çalıştırma

Kurulum gerekmez. Repoyu klonla ve `index.html` dosyasını herhangi bir modern tarayıcıda aç:

```bash
git clone https://github.com/Enes0102/incursio.git
cd incursio
```

Düzenleme yaparken otomatik yenileme için VS Code'daki **Live Server** eklentisini kullanabilirsin.

## Proje Yapısı

```
incursio/
├── assets/
│   ├── gameplay.gif   # Oynanış önizlemesi
│   └── sprites/       # Pixel art sprite'lar (PNG)
│       └── tiles/     # Çimen, çit, ağaç ve süs karoları
├── index.html         # Sayfa ve canvas elementi
├── style.css          # Sayfa düzeni ve stil
├── game.js            # Tüm oyun mantığı: girdi, nesneler, efektler, ses ve çizim
├── README.md          # İngilizce dokümantasyon
└── README.tr.md       # Türkçe dokümantasyon
```

## Kullanılan Teknolojiler

- JavaScript (ES6+)
- HTML5 Canvas API
- Web Audio API
- CSS

## Geliştirici

**Enescan Güleryüz** — [@Enes0102](https://github.com/Enes0102)
