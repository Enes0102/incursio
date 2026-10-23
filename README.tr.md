<div align="center">

# Browser Shooter Game

[English](README.md) | **Türkçe**

Doğrudan tarayıcıda çalışan, hızlı tempolu, yukarıdan bakışlı bir nişancı oyunu.<br>
Sıfırdan saf JavaScript ve HTML5 Canvas API ile yazıldı. Oyun motoru, kütüphane veya derleme adımı yok.

### [▶ Hemen Oyna](https://enes0102.github.io/browser-shooter-game/)

![Oynanış](assets/gameplay.gif)

</div>

## Hakkında

Zamanla daha hızlı, daha dayanıklı ve daha kalabalık hale gelen sonsuz düşman dalgalarına karşı olabildiğince uzun hayatta kal. XP toplayıp seviye atla, birikebilen yükseltmelerle kendi karakterini kur, her dakika gelen yeni bir boss'u alt et ve en yüksek skorun peşine düş.

> Oyunun arayüzü İngilizcedir.

## Kontroller

| Tuş | İşlev |
| --- | --- |
| `W` `A` `S` `D` | Hareket |
| Fare | Nişan alma |
| Sol tık (basılı tut) | Ateş etme |
| `1` `2` `3` / Tıklama | Seviye atlayınca yükseltme seçme |
| `Enter` / Tıklama | Oyunu başlatma |
| `R` | Oyun bitince tekrar oynama |
| `Esc` / `P` | Duraklatma / devam etme |
| `R` / `Q` (duraklatılmışken) | Yeniden başlatma / menüye çıkma |
| `Esc` (oyun bitince) | Menüye dönme |
| `M` | Sesi açma / kapatma |

## Özellikler

- **XP ve seviye sistemi**: yenilen düşmanlar XP kristali düşürür, her seviyede üç rastgele yükseltmeden birini seçersin
- **Boss savaşları**: her 60 saniyede bir, her biri öncekinden güçlü
- **Akıcı hareket ve nişan alma**, kare hızından bağımsız fizik (delta time) ile
- **Otomatik ateş**, atış hızı sınırıyla: basılı tutmak da tıklamak kadar adil
- **Üç düşman tipi**, farklı boyut, hız ve can değerleriyle
- **Dört güçlendirme**, yenilen düşmanlardan düşer
- **Dinamik zorluk**: hayatta kaldıkça düşmanlar daha sık doğar ve daha hızlı hareket eder
- **Hasar sonrası dokunulmazlık**
- **Pixel art sprite'lar**, vurulunca beyaz yanıp sönme efektiyle
- **Oyun hissi efektleri**: parçacık patlamaları, ekran sarsıntısı, hasar flaşı ve yükselen yazılar
- **Prosedürel ses efektleri**, Web Audio API ile gerçek zamanlı üretilir, ses dosyası kullanılmaz
- **Kalıcı en yüksek skor**, tarayıcıda `localStorage` ile saklanır
- **Oyun ekranları**: başlangıç menüsü, duraklatma menüsü, seviye atlama ve oyun bitti ekranları

### Düşmanlar

| Düşman | Açıklama |
| --- | --- |
| 🔴 Normal | Standart düşman. Baştan itibaren gelir. |
| 🟠 Hızlı | Küçük ve çevik. 15. saniyeden sonra gelir. |
| 🟣 Tank | Büyük, yavaş ve 4 vuruşta ölür. 30. saniyeden sonra gelir ve daha sık güçlendirme düşürür. |

### Boss

Her 60 saniyede bir, önce bir uyarıyla taçlı dev bir canavar gelir. Yavaşça seni kovalar ve iki saldırı arasında geçiş yapar: her yöne mermi halkası ve sana nişanlı yelpaze atış. Her yeni boss'un canı daha fazladır, daha çok mermi atar ve daha sık saldırır. Onu yenmek büyük skor bonusu, bol XP ve garanti güçlendirme kazandırır.

### Yükseltmeler

| Yükseltme | Etkisi | Maks. |
| --- | --- | --- |
| Power Shot | Mermi hasarı +1 | 5 |
| Quick Trigger | %15 daha hızlı ateş | 5 |
| Multishot | Her atışta +1 mermi | 3 |
| Piercing Rounds | Mermiler +1 düşmanın içinden geçer | 3 |
| Swift Boots | %10 daha hızlı hareket | 5 |
| Velocity | Mermiler %20 daha hızlı uçar | 3 |
| Vitality | +1 maksimum can ve 1 can yenileme | 5 |
| Magnet | XP'yi daha uzaktan toplama | 3 |

### Güçlendirmeler

| Güçlendirme | Etkisi |
| --- | --- |
| 🟢 `+` Health | 1 can yeniler |
| 🟡 `R` Rapid Fire | 6 saniye boyunca 2.5 kat hızlı ateş |
| 🔵 `3` Triple Shot | 8 saniye boyunca aynı anda üç mermi |
| 🟣 `S` Shield | Alacağın bir sonraki hasarı engeller |

## Yerelde Çalıştırma

Kurulum gerekmez. Repoyu klonla ve `index.html` dosyasını herhangi bir modern tarayıcıda aç:

```bash
git clone https://github.com/Enes0102/browser-shooter-game.git
cd browser-shooter-game
```

Düzenleme yaparken otomatik yenileme için VS Code'daki **Live Server** eklentisini kullanabilirsin.

## Proje Yapısı

```
browser-shooter-game/
├── assets/
│   ├── gameplay.gif   # Oynanış önizlemesi
│   └── sprites/       # Pixel art sprite'lar (PNG)
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
