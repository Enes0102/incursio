// =====================================================
//  KURULUM
// =====================================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");


// =====================================================
//  SPRITE'LAR (PIXEL ART RESİMLER)
// =====================================================
// Her sprite küçük çizildi, oyunda bu kat büyütülerek gösteriliyor
const SPRITE_SCALE = 2;

function loadSprite(name) {
    const img = new Image();
    img.src = "assets/sprites/" + name + ".png";
    return img;
}

const sprites = {
    player: loadSprite("player"),
    bullet: loadSprite("bullet"),
    enemy_normal: loadSprite("enemy_normal"),
    enemy_fast: loadSprite("enemy_fast"),
    enemy_tank: loadSprite("enemy_tank"),
    powerup_heal: loadSprite("powerup_heal"),
    powerup_rapid: loadSprite("powerup_rapid"),
    powerup_triple: loadSprite("powerup_triple"),
    powerup_shield: loadSprite("powerup_shield"),
    xp_gem: loadSprite("xp_gem"),
    enemy_bullet: loadSprite("enemy_bullet"),
    boss: loadSprite("boss"),
};

// Resim yüklendi mi? Yüklenmediyse eski daireler çizilir, oyun yine çalışır
function isReady(img) {
    return img && img.complete && img.naturalWidth > 0;
}

// Sprite'ı (x, y) merkezli, istenirse döndürerek çiz
function drawSprite(img, x, y, angle = 0) {
    const w = (img.naturalWidth || img.width) * SPRITE_SCALE;
    const h = (img.naturalHeight || img.height) * SPRITE_SCALE;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.drawImage(img, -w / 2, -h / 2, w, h);
    ctx.restore();
}

// Vurulma efekti için sprite'ın tamamen beyaz bir kopyasını üret (bir kez, sonra sakla)
function getFlashSprite(img) {
    if (!img.flashVersion) {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = "source-in"; // sadece dolu piksellere boya
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, c.width, c.height);
        img.flashVersion = c;
    }
    return img.flashVersion;
}

// Daire çizmek için kısa yardımcı (sprite yüklenmezse yedek olarak)
function drawCircle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}


// =====================================================
//  GİRDİ (KLAVYE + FARE)
// =====================================================
const keys = {};

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    initAudio(); // tarayıcılar sesi ancak kullanıcı bir tuşa bastıktan sonra açmaya izin verir
    handleKeyPress(key); // menü / yeniden başlama / yükseltme seçimi tuşları
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

// down: fare tuşu şu an basılı mı? (otomatik ateş için)
const mouse = { x: 0, y: 0, down: false };

canvas.addEventListener("mousemove", (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouse.y = (e.clientY - rect.top) * (canvas.height / rect.height);
});

canvas.addEventListener("mousedown", () => {
    initAudio();

    // Seviye atlama ekranındaysak tıklama kart seçmek içindir, ateş etmek için değil
    if (state === "levelup") {
        const index = getCardIndexAt(mouse.x, mouse.y);
        if (index >= 0) chooseUpgrade(index);
        return;
    }

    // Duraklatma menüsündeysek tıklama buton seçmek içindir
    if (state === "paused") {
        const index = getPauseButtonAt(mouse.x, mouse.y);
        if (index >= 0) PAUSE_BUTTONS[index].action();
        return;
    }

    mouse.down = true;
    if (state === "menu") startGame(); // menüdeyken tıklayınca oyun başlasın
});

// window'a bağlıyoruz: fareyi canvas dışında bıraksan bile ateş dursun
window.addEventListener("mouseup", () => {
    mouse.down = false;
});

// Başka pencereye/sekmeye geçince oyun kendiliğinden dursun
window.addEventListener("blur", () => {
    if (state === "playing") pauseGame();
});


// =====================================================
//  OYUNCU
// =====================================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.angle = 0;
        this.health = 3;
        this.maxHealth = 5;

        // Yükseltmelerle değişen özellikler
        this.speed = 250;         // hareket hızı
        this.fireRate = 0.2;      // iki atış arası saniye (= saniyede 5 mermi)
        this.damage = 1;          // her merminin verdiği hasar
        this.bulletSpeed = 600;   // mermi hızı
        this.extraShots = 0;      // her atışta fazladan kaç mermi
        this.pierce = 0;          // bir mermi kaç düşmanın içinden geçebilir
        this.magnetRange = 90;    // XP kristallerini ne kadar uzaktan çeker

        this.fireTimer = 0;       // bir sonraki atışa kalan süre
        this.invincibleTimer = 0; // hasar aldıktan sonraki dokunulmazlık süresi
        this.time = 0;            // yanıp sönme animasyonu için

        // GÜÇLENDİRMELER: her birinin kalan süresi (saniye). 0 = aktif değil
        this.powerTimers = { rapid: 0, triple: 0 };

        // KALKAN: süreli değil, bir sonraki hasarı engelleyip kırılır
        this.hasShield = false;
    }

    update(dt) {
        let dx = 0;
        let dy = 0;
        if (keys["w"]) dy -= 1;
        if (keys["s"]) dy += 1;
        if (keys["a"]) dx -= 1;
        if (keys["d"]) dx += 1;

        const length = Math.hypot(dx, dy);
        if (length > 0) {
            dx /= length;
            dy /= length;
        }

        this.x += dx * this.speed * dt;
        this.y += dy * this.speed * dt;

        this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));

        this.angle = Math.atan2(mouse.y - this.y, mouse.x - this.x);

        this.time += dt;
        this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);

        // Güçlendirme sürelerini azalt
        for (const key in this.powerTimers) {
            this.powerTimers[key] = Math.max(0, this.powerTimers[key] - dt);
        }

        // OTOMATİK ATEŞ: hızlı ateş aktifse bekleme süresi 2.5 kat kısalır
        const currentFireRate = this.powerTimers.rapid > 0 ? this.fireRate * 0.4 : this.fireRate;

        this.fireTimer -= dt;
        if (mouse.down && this.fireTimer <= 0) {
            this.shoot();
            this.fireTimer = currentFireRate;
        }
    }

    shoot() {
        const barrelLength = this.radius + 14;
        const bx = this.x + Math.cos(this.angle) * barrelLength;
        const by = this.y + Math.sin(this.angle) * barrelLength;

        // Kaç mermi atılacak: 1 + yükseltmeler + (üçlü atış aktifse 2 tane daha)
        let count = 1 + this.extraShots;
        if (this.powerTimers.triple > 0) count += 2;

        // Mermileri nişan yönünün etrafına eşit aralıklarla yay
        const spread = 0.15; // iki mermi arası açı (radyan)
        const startAngle = this.angle - (spread * (count - 1)) / 2;

        for (let i = 0; i < count; i++) {
            const angle = startAngle + spread * i;
            bullets.push(new Bullet(bx, by, angle, this.bulletSpeed, this.damage, this.pierce));
        }

        playSound("shoot");
    }

    draw() {
        // Dokunulmazken yanıp sönsün
        if (this.invincibleTimer > 0 && Math.floor(this.time * 15) % 2 === 0) {
            ctx.globalAlpha = 0.35;
        }

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (isReady(sprites.player)) {
            const w = sprites.player.naturalWidth * SPRITE_SCALE;
            const h = sprites.player.naturalHeight * SPRITE_SCALE;
            ctx.drawImage(sprites.player, -w / 2, -h / 2, w, h);
        } else {
            ctx.fillStyle = "#6b7280";
            ctx.fillRect(0, -5, this.radius + 14, 10);
            drawCircle(0, 0, this.radius, "#4fc3f7");
        }

        // Kalkan varsa etrafında bir halka
        if (this.hasShield) {
            ctx.strokeStyle = "rgba(206, 147, 216, 0.8)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
        ctx.globalAlpha = 1;
    }
}


// =====================================================
//  OYUNCU MERMİSİ
// =====================================================
class Bullet {
    constructor(x, y, angle, speed, damage, pierce) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.angle = angle;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.damage = damage;
        this.pierce = pierce;          // kalan delme hakkı
        this.hitEnemies = new Set();   // aynı düşmana iki kez vurmasın
        this.dead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (this.x < 0 || this.x > canvas.width || this.y < 0 || this.y > canvas.height) {
            this.dead = true;
        }
    }

    draw() {
        if (isReady(sprites.bullet)) {
            drawSprite(sprites.bullet, this.x, this.y, this.angle);
        } else {
            drawCircle(this.x, this.y, this.radius, "#ffd54f");
        }
    }
}


// =====================================================
//  DÜŞMAN MERMİSİ (boss atıyor)
// =====================================================
class EnemyBullet {
    constructor(x, y, angle, speed) {
        this.x = x;
        this.y = y;
        this.radius = 6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.dead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        const margin = 20;
        if (this.x < -margin || this.x > canvas.width + margin ||
            this.y < -margin || this.y > canvas.height + margin) {
            this.dead = true;
        }
    }

    draw() {
        if (isReady(sprites.enemy_bullet)) {
            drawSprite(sprites.enemy_bullet, this.x, this.y);
        } else {
            drawCircle(this.x, this.y, this.radius, "#ff4081");
        }
    }
}


// =====================================================
//  DÜŞMAN TİPLERİ
// =====================================================
// Yeni bir düşman tipi eklemek için buraya bir satır eklemen yeterli
// dropChance: ölünce güçlendirme düşürme ihtimali (0.1 = %10)
// xp: ölünce düşürdüğü XP miktarı
const ENEMY_TYPES = {
    normal: { radius: 14, speed: 100, health: 1, color: "#ef5350", score: 10, dropChance: 0.08, xp: 1 },
    fast:   { radius: 10, speed: 170, health: 1, color: "#ffb74d", score: 15, dropChance: 0.10, xp: 2 }, // küçük ve hızlı
    tank:   { radius: 22, speed: 60,  health: 4, color: "#ab47bc", score: 30, dropChance: 0.40, xp: 5 }, // büyük, yavaş, dayanıklı
};

class Enemy {
    constructor(x, y, typeName) {
        const type = ENEMY_TYPES[typeName];

        // Oyun ilerledikçe düşmanların canı da artsın (her 60 saniyede bir kat daha)
        const healthMultiplier = 1 + Math.floor(gameTime / 60);

        this.x = x;
        this.y = y;
        this.radius = type.radius;
        this.speed = type.speed;
        this.health = type.health * healthMultiplier;
        this.maxHealth = this.health;
        this.color = type.color;
        this.score = type.score;
        this.dropChance = type.dropChance;
        this.xp = type.xp;
        this.sprite = sprites["enemy_" + typeName]; // örn. sprites.enemy_tank
        this.isBoss = false;
        this.dead = false;

        this.hitTimer = 0; // vurulunca kısa süre beyaz yanıp sönsün
    }

    update(dt) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            this.x += (dx / distance) * this.speed * dt;
            this.y += (dy / distance) * this.speed * dt;
        }

        this.hitTimer -= dt;
    }

    // Hasar al. Öldüyse true döndürür.
    takeHit(damage) {
        this.health -= damage;
        this.hitTimer = 0.08;
        return this.health <= 0;
    }

    draw() {
        if (isReady(this.sprite)) {
            // Vurulduysa beyaz kopyasını, değilse normal halini çiz
            const img = this.hitTimer > 0 ? getFlashSprite(this.sprite) : this.sprite;
            drawSprite(img, this.x, this.y);
        } else {
            drawCircle(this.x, this.y, this.radius, this.hitTimer > 0 ? "#ffffff" : this.color);
        }

        // Birden fazla canı olan düşmanların üstünde can barı
        if (this.maxHealth > 1) {
            const barWidth = this.radius * 2;
            const barX = this.x - this.radius;
            const barY = this.y - this.radius - 10;

            ctx.fillStyle = "#333";
            ctx.fillRect(barX, barY, barWidth, 4);
            ctx.fillStyle = "#66bb6a";
            ctx.fillRect(barX, barY, barWidth * Math.max(0, this.health / this.maxHealth), 4);
        }
    }
}


// =====================================================
//  BOSS
// =====================================================
// Boss da düşman listesinde duruyor, böylece mermi çarpışmaları aynı kodla çalışıyor
class Boss {
    constructor(x, y, number) {
        this.x = x;
        this.y = y;
        this.number = number;              // kaçıncı boss (her biri daha güçlü)
        this.radius = 36;
        this.speed = 50 + number * 5;
        this.maxHealth = 60 + (number - 1) * 50;
        this.health = this.maxHealth;
        this.color = "#c62828";
        this.score = 500 * number;
        this.dropChance = 1;               // güçlendirme düşürmesi garanti
        this.xp = 25 + number * 10;
        this.sprite = sprites.boss;
        this.isBoss = true;
        this.dead = false;

        this.hitTimer = 0;
        this.attackTimer = 2;   // ilk saldırıdan önce 2 saniye bekle
        this.attackCount = 0;   // saldırı tipleri sırayla değişsin diye
    }

    update(dt) {
        // Yavaşça oyuncuya doğru gel
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance > 0) {
            this.x += (dx / distance) * this.speed * dt;
            this.y += (dy / distance) * this.speed * dt;
        }

        this.hitTimer -= dt;

        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            this.attack();
        }
    }

    attack() {
        const toPlayer = Math.atan2(player.y - this.y, player.x - this.x);

        if (this.attackCount % 2 === 0) {
            // SALDIRI 1: Her yöne mermi halkası
            const count = 12 + this.number * 2;
            const offset = Math.random() * Math.PI; // her halka biraz farklı açıda
            for (let i = 0; i < count; i++) {
                const angle = offset + (Math.PI * 2 * i) / count;
                enemyBullets.push(new EnemyBullet(this.x, this.y, angle, 170));
            }
        } else {
            // SALDIRI 2: Oyuncuya nişanlı yelpaze atış
            const count = 3 + this.number;
            const spread = 0.18;
            const startAngle = toPlayer - (spread * (count - 1)) / 2;
            for (let i = 0; i < count; i++) {
                enemyBullets.push(new EnemyBullet(this.x, this.y, startAngle + spread * i, 260));
            }
        }

        this.attackCount++;
        this.attackTimer = Math.max(0.9, 1.8 - this.number * 0.15); // sonraki boss'lar daha sık saldırır
        playSound("bossShoot");
    }

    takeHit(damage) {
        this.health -= damage;
        this.hitTimer = 0.06;
        return this.health <= 0;
    }

    draw() {
        if (isReady(this.sprite)) {
            const img = this.hitTimer > 0 ? getFlashSprite(this.sprite) : this.sprite;
            drawSprite(img, this.x, this.y);
        } else {
            drawCircle(this.x, this.y, this.radius, this.hitTimer > 0 ? "#ffffff" : this.color);
        }
        // Boss'un can barı ekranın üstünde, drawHUD içinde çiziliyor
    }
}


// =====================================================
//  XP KRİSTALLERİ
// =====================================================
class XpGem {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.radius = 6;
        this.dead = false;

        // Doğunca hafifçe etrafa saçılsın
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 80;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update(dt) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (distance < player.magnetRange) {
            // MIKNATIS: oyuncuya yakınsa ona doğru uç, yaklaştıkça hızlan
            const pull = 500 * (1 - distance / player.magnetRange) + 150;
            this.vx = (dx / distance) * pull;
            this.vy = (dy / distance) * pull;
        } else {
            // Değilse saçılma hızı yavaşça sönsün
            this.vx *= 1 - 4 * dt;
            this.vy *= 1 - 4 * dt;
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    draw() {
        if (isReady(sprites.xp_gem)) {
            drawSprite(sprites.xp_gem, this.x, this.y);
        } else {
            drawCircle(this.x, this.y, this.radius, "#4dd0e1");
        }
    }
}

// Ölen düşmanın XP'sini birkaç kristale böl
function dropXp(enemy) {
    let remaining = enemy.xp;
    while (remaining > 0) {
        const value = Math.min(remaining, enemy.isBoss ? 5 : 2);
        xpGems.push(new XpGem(enemy.x, enemy.y, value));
        remaining -= value;
    }
}


// =====================================================
//  SEVİYE ATLAMA VE YÜKSELTMELER
// =====================================================
// Yeni bir yükseltme eklemek için listeye bir satır ekle:
// max: en fazla kaç kez alınabilir, apply: oyuncuya ne yapar
const UPGRADES = [
    { id: "damage",      name: "Power Shot",      desc: "+1 bullet damage",               max: 5, apply: (p) => { p.damage += 1; } },
    { id: "firerate",    name: "Quick Trigger",   desc: "Shoot 15% faster",               max: 5, apply: (p) => { p.fireRate *= 0.85; } },
    { id: "multishot",   name: "Multishot",       desc: "+1 bullet per shot",             max: 3, apply: (p) => { p.extraShots += 1; } },
    { id: "pierce",      name: "Piercing Rounds", desc: "Bullets pass through +1 enemy",  max: 3, apply: (p) => { p.pierce += 1; } },
    { id: "speed",       name: "Swift Boots",     desc: "Move 10% faster",                max: 5, apply: (p) => { p.speed *= 1.1; } },
    { id: "bulletspeed", name: "Velocity",        desc: "Bullets fly 20% faster",         max: 3, apply: (p) => { p.bulletSpeed *= 1.2; } },
    { id: "vitality",    name: "Vitality",        desc: "+1 max health and heal 1",       max: 5, apply: (p) => { p.maxHealth += 1; p.health = Math.min(p.maxHealth, p.health + 1); } },
    { id: "magnet",      name: "Magnet",          desc: "Collect XP from farther away",   max: 3, apply: (p) => { p.magnetRange *= 1.5; } },
];

// Bir sonraki seviye için gereken XP: her seviyede biraz daha fazla
function xpNeededFor(lvl) {
    return 5 + (lvl - 1) * 7;
}

function addXp(amount) {
    xp += amount;
    while (xp >= xpToNext) {
        xp -= xpToNext;
        level++;
        xpToNext = xpNeededFor(level);
        pendingLevelUps++; // aynı anda birden fazla seviye atlanabilir
    }
}

// Rastgele 3 yükseltme seç (sonuna kadar alınmış olanlar hariç)
function rollUpgradeChoices() {
    const available = UPGRADES.filter((u) => (upgradeLevels[u.id] || 0) < u.max);

    // Listeyi karıştır (Fisher-Yates)
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    return available.slice(0, 3);
}

function openLevelUp() {
    upgradeChoices = rollUpgradeChoices();

    // Her şey sonuna kadar alındıysa ödül olarak can ve puan ver
    if (upgradeChoices.length === 0) {
        pendingLevelUps--;
        player.health = Math.min(player.maxHealth, player.health + 1);
        score += 100;
        return;
    }

    state = "levelup";
    mouse.down = false;
    playSound("levelup");
}

function chooseUpgrade(index) {
    const upgrade = upgradeChoices[index];
    if (!upgrade) return;

    upgrade.apply(player);
    upgradeLevels[upgrade.id] = (upgradeLevels[upgrade.id] || 0) + 1;
    pendingLevelUps--;

    texts.push(new FloatingText(player.x, player.y - 30, upgrade.name.toUpperCase(), "#4dd0e1"));
    spawnParticles(player.x, player.y, "#4dd0e1", 20);
    playSound("powerup");

    state = "playing";
    mouse.down = false;

    // Hâlâ bekleyen seviye varsa hemen bir sonraki seçimi aç
    if (pendingLevelUps > 0) openLevelUp();
}

// Seviye atlama kartlarının ekrandaki konumu
const CARD_WIDTH = 220;
const CARD_HEIGHT = 190;
const CARD_GAP = 30;

function getCardRect(index, count) {
    const totalWidth = count * CARD_WIDTH + (count - 1) * CARD_GAP;
    const startX = (canvas.width - totalWidth) / 2;
    return {
        x: startX + index * (CARD_WIDTH + CARD_GAP),
        y: canvas.height / 2 - CARD_HEIGHT / 2 + 30,
        w: CARD_WIDTH,
        h: CARD_HEIGHT,
    };
}

// Fare hangi kartın üstünde? (yoksa -1)
function getCardIndexAt(x, y) {
    for (let i = 0; i < upgradeChoices.length; i++) {
        const r = getCardRect(i, upgradeChoices.length);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
}


// =====================================================
//  EFEKTLER: PARÇACIKLAR
// =====================================================
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;

        // Rastgele bir yöne, rastgele bir hızla fırla
        const angle = Math.random() * Math.PI * 2;
        const speed = 50 + Math.random() * 200;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;

        this.life = 0.3 + Math.random() * 0.4; // kaç saniye yaşayacak
        this.maxLife = this.life;
        this.size = 2 + Math.random() * 3;
        this.dead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        // Zamanla yavaşlasın
        this.vx *= 1 - 3 * dt;
        this.vy *= 1 - 3 * dt;

        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }

    draw() {
        // Ömrü azaldıkça saydamlaşsın
        ctx.globalAlpha = this.life / this.maxLife;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - this.size / 2, this.y - this.size / 2, this.size, this.size);
        ctx.globalAlpha = 1;
    }
}

function spawnParticles(x, y, color, count) {
    for (let i = 0; i < count; i++) {
        particles.push(new Particle(x, y, color));
    }
}


// =====================================================
//  EFEKTLER: YÜKSELEN YAZI ("+1 HEALTH" gibi)
// =====================================================
class FloatingText {
    constructor(x, y, text, color) {
        this.x = x;
        this.y = y;
        this.text = text;
        this.color = color;
        this.life = 1; // 1 saniye yaşar
        this.dead = false;
    }

    update(dt) {
        this.y -= 40 * dt; // yukarı doğru süzülsün
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }

    draw() {
        ctx.globalAlpha = Math.max(0, this.life);
        ctx.font = "bold 18px Arial";
        ctx.fillStyle = this.color;
        ctx.textAlign = "center";
        ctx.fillText(this.text, this.x, this.y);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
    }
}


// =====================================================
//  GÜÇLENDİRMELER
// =====================================================
// Yeni bir güçlendirme eklemek için: buraya bir satır ekle,
// sonra applyPowerUp içinde ne yapacağını yaz
const POWERUP_TYPES = {
    heal:   { color: "#66bb6a", label: "+", name: "+1 HEALTH" },
    rapid:  { color: "#ffd54f", label: "R", name: "RAPID FIRE" },
    triple: { color: "#4fc3f7", label: "3", name: "TRIPLE SHOT" },
    shield: { color: "#ce93d8", label: "S", name: "SHIELD" },
};

// Süreli güçlendirmeler kaç saniye sürsün (kalkan süreli değil, tek vuruşluk)
const POWERUP_DURATION = { rapid: 6, triple: 8 };

class PowerUp {
    constructor(x, y, type) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.radius = 12;
        this.life = 8;  // 8 saniye içinde alınmazsa kaybolur
        this.time = 0;  // animasyon için
        this.dead = false;
    }

    update(dt) {
        this.time += dt;
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }

    draw() {
        // Son 2 saniyede yanıp sönsün (kaybolmak üzere uyarısı)
        if (this.life < 2 && Math.floor(this.time * 10) % 2 === 0) return;

        const info = POWERUP_TYPES[this.type];
        const bob = Math.sin(this.time * 4) * 3; // hafifçe aşağı yukarı sallansın

        const sprite = sprites["powerup_" + this.type];
        if (isReady(sprite)) {
            drawSprite(sprite, this.x, this.y + bob);
            return;
        }

        drawCircle(this.x, this.y + bob, this.radius, info.color);
        ctx.fillStyle = "#111111";
        ctx.font = "bold 14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(info.label, this.x, this.y + bob + 1);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    }
}

// Ölen düşman şansına göre güçlendirme düşürsün
function maybeDropPowerUp(enemy) {
    if (Math.random() < enemy.dropChance) {
        const types = Object.keys(POWERUP_TYPES); // ["heal", "rapid", "triple", "shield"]
        const type = types[Math.floor(Math.random() * types.length)];
        powerUps.push(new PowerUp(enemy.x, enemy.y, type));
    }
}

function applyPowerUp(type) {
    const info = POWERUP_TYPES[type];

    if (type === "heal") {
        player.health = Math.min(player.maxHealth, player.health + 1);
    } else if (type === "shield") {
        player.hasShield = true; // zaten varsa üst üste binmez
    } else {
        player.powerTimers[type] = POWERUP_DURATION[type];
    }

    texts.push(new FloatingText(player.x, player.y - 30, info.name, info.color));
    spawnParticles(player.x, player.y, info.color, 15);
    playSound("powerup");
}


// =====================================================
//  EFEKTLER: EKRAN SARSINTISI VE HASAR FLAŞI
// =====================================================
let shakeTime = 0;
let shakeStrength = 0;
let damageFlash = 0; // hasar alınca ekran kısa süre kırmızılaşsın

function shakeScreen(strength, duration) {
    shakeStrength = strength;
    shakeTime = duration;
}


// =====================================================
//  SES EFEKTLERİ (Web Audio API ile, dosya kullanmadan)
// =====================================================
let audioCtx = null;      // tarayıcının "ses motoru"
let muted = loadMuted();  // ses kapalı mı? (M tuşu)

// Ses motorunu ilk tıklama / tuş basımında başlat
function initAudio() {
    if (!audioCtx) {
        try {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        } catch {
            audioCtx = null; // ses desteklenmiyorsa oyun sessiz devam etsin
        }
    }
    if (audioCtx && audioCtx.state === "suspended") {
        audioCtx.resume();
    }
}

// Bir "bip" sesi: frekansı startFreq'ten endFreq'e kayar, sesi yavaşça söner
// waveType: "sine" (yumuşak), "square" (retro), "sawtooth" (sert), "triangle" (arası)
function playTone(waveType, startFreq, endFreq, duration, volume, delay = 0) {
    const t = audioCtx.currentTime + delay;

    const osc = audioCtx.createOscillator();  // ses üreteci
    const gain = audioCtx.createGain();       // ses seviyesi

    osc.type = waveType;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(endFreq, t + duration);

    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    // üreteç → ses seviyesi → hoparlör
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + duration);
}

// Patlama sesi: rastgele gürültü, gittikçe boğuklaşır
function playNoise(duration, volume) {
    const t = audioCtx.currentTime;

    // Rastgele sayılarla dolu bir ses parçası oluştur
    const size = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, size, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const source = audioCtx.createBufferSource();
    source.buffer = buffer;

    // Tizden bose doğru kayan filtre = "bum" hissi
    const filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, t);
    filter.frequency.exponentialRampToValueAtTime(100, t + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(volume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    source.connect(filter).connect(gain).connect(audioCtx.destination);
    source.start(t);
}

// Oyundaki bütün sesler burada. Sayılarla oynayarak sesleri değiştirebilirsin.
const SOUNDS = {
    shoot:   () => playTone("square", 880, 220, 0.08, 0.04),
    hit:     () => playTone("triangle", 300, 150, 0.05, 0.08),
    explode: () => playNoise(0.25, 0.3),
    hurt:    () => playTone("sawtooth", 220, 60, 0.3, 0.15),
    xp:      () => playTone("sine", 1200, 1700, 0.05, 0.03),
    powerup: () => {
        // Yükselen üç nota (do - mi - sol)
        playTone("sine", 523, 523, 0.08, 0.15, 0);
        playTone("sine", 659, 659, 0.08, 0.15, 0.08);
        playTone("sine", 784, 784, 0.12, 0.15, 0.16);
    },
    levelup: () => {
        // Yükselen dört nota, bir oktav yukarı çıkıyor
        playTone("square", 523, 523, 0.1, 0.08, 0);
        playTone("square", 659, 659, 0.1, 0.08, 0.1);
        playTone("square", 784, 784, 0.1, 0.08, 0.2);
        playTone("square", 1047, 1047, 0.25, 0.08, 0.3);
    },
    bossWarning: () => {
        // Alçak, iki kez çalan alarm
        playTone("sawtooth", 140, 90, 0.5, 0.15, 0);
        playTone("sawtooth", 140, 90, 0.5, 0.15, 0.6);
    },
    bossShoot: () => playTone("square", 320, 120, 0.18, 0.05),
    shieldBreak: () => {
        // Cam kırılması gibi: tiz, aşağı kayan ses ve kısa gürültü
        playTone("triangle", 1400, 300, 0.25, 0.12);
        playNoise(0.15, 0.15);
    },
    bossDeath: () => {
        playNoise(1.2, 0.5);
        playTone("sawtooth", 300, 30, 1.4, 0.15);
    },
    gameover: () => {
        playNoise(0.6, 0.4);
        playTone("sawtooth", 400, 50, 0.9, 0.15);
    },
};

function playSound(name) {
    if (muted || !audioCtx) return;
    SOUNDS[name]();
}

function toggleMute() {
    muted = !muted;
    try {
        localStorage.setItem("shooterMuted", muted ? "1" : "0");
    } catch {}
}

function loadMuted() {
    try {
        return localStorage.getItem("shooterMuted") === "1";
    } catch {
        return false;
    }
}


// =====================================================
//  OYUN DURUMU
// =====================================================
// state: "menu" | "playing" | "paused" | "levelup" | "gameover"
let state = "menu";

let player = new Player(canvas.width / 2, canvas.height / 2);
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let powerUps = [];
let xpGems = [];
let texts = [];

let score = 0;
let gameTime = 0;
let spawnTimer = 0;
let spawnInterval = 1.5;

// Seviye sistemi
let level = 1;
let xp = 0;
let xpToNext = xpNeededFor(1);
let pendingLevelUps = 0;   // seçim bekleyen seviye sayısı
let upgradeChoices = [];   // ekrandaki 3 kart
let upgradeLevels = {};    // hangi yükseltmeden kaç tane alındı

// Boss sistemi
const BOSS_INTERVAL = 60;  // kaç saniyede bir boss gelsin
let boss = null;           // sahnedeki boss (yoksa null)
let bossTimer = 0;         // son boss'tan beri geçen süre
let bossCount = 0;         // şimdiye kadar kaç boss geldi
let bossWarning = 0;       // "BOSS INCOMING" uyarısının kalan süresi
let bossWarned = false;    // bu boss için uyarı verildi mi?

let highScore = loadHighScore();
let newRecord = false;

// EN YÜKSEK SKOR: tarayıcının hafızasında (localStorage) saklanır,
// sayfayı kapatıp açsan bile kaybolmaz
function loadHighScore() {
    try {
        return Number(localStorage.getItem("shooterHighScore")) || 0;
    } catch {
        return 0;
    }
}

function saveHighScore() {
    try {
        localStorage.setItem("shooterHighScore", highScore);
    } catch {
        // gizli sekme vb. durumlarda kaydedemezsek oyun yine çalışsın
    }
}

function startGame() {
    player = new Player(canvas.width / 2, canvas.height / 2);
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    powerUps = [];
    xpGems = [];
    texts = [];
    score = 0;
    gameTime = 0;
    spawnTimer = 0;
    spawnInterval = 1.5;
    shakeTime = 0;
    damageFlash = 0;
    newRecord = false;

    level = 1;
    xp = 0;
    xpToNext = xpNeededFor(1);
    pendingLevelUps = 0;
    upgradeChoices = [];
    upgradeLevels = {};

    boss = null;
    bossTimer = 0;
    bossCount = 0;
    bossWarning = 0;
    bossWarned = false;

    state = "playing";
}

function endGame() {
    state = "gameover";
    mouse.down = false;

    if (score > highScore) {
        highScore = score;
        newRecord = true;
        saveHighScore();
    }
}

// =====================================================
//  DURAKLATMA MENÜSÜ
// =====================================================
function pauseGame() {
    state = "paused";
    mouse.down = false;
    // Basılı kalmış tuşları bırak, yoksa devam edince oyuncu kendi kendine yürür
    for (const key in keys) keys[key] = false;
}

function resumeGame() {
    state = "playing";
    mouse.down = false;
}

// Menüdeki butonlar: yazı ve tıklayınca ne yapacağı
const PAUSE_BUTTONS = [
    { label: "Resume  (Esc)",    action: () => resumeGame() },
    { label: "Restart  (R)",     action: () => startGame() },
    { label: "Main menu  (Q)",   action: () => { state = "menu"; } },
];

const BUTTON_WIDTH = 260;
const BUTTON_HEIGHT = 46;
const BUTTON_GAP = 14;

function getPauseButtonRect(index) {
    return {
        x: (canvas.width - BUTTON_WIDTH) / 2,
        y: canvas.height / 2 - 60 + index * (BUTTON_HEIGHT + BUTTON_GAP),
        w: BUTTON_WIDTH,
        h: BUTTON_HEIGHT,
    };
}

// Fare hangi butonun üstünde? (yoksa -1)
function getPauseButtonAt(x, y) {
    for (let i = 0; i < PAUSE_BUTTONS.length; i++) {
        const r = getPauseButtonRect(i);
        if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) return i;
    }
    return -1;
}

function handleKeyPress(key) {
    // M her ekranda sesi açıp kapatsın
    if (key === "m") {
        toggleMute();
        return;
    }

    if (state === "menu" && (key === "enter" || key === " ")) {
        startGame();
    } else if (state === "playing") {
        if (key === "escape" || key === "p") pauseGame();
    } else if (state === "paused") {
        if (key === "escape" || key === "p") resumeGame();
        if (key === "r") startGame();
        if (key === "q") state = "menu";
    } else if (state === "levelup") {
        if (key === "1" || key === "2" || key === "3") {
            chooseUpgrade(Number(key) - 1);
        }
    } else if (state === "gameover") {
        if (key === "r") startGame();
        if (key === "escape") state = "menu";
    }
}


// =====================================================
//  DÜŞMAN VE BOSS DOĞURMA
// =====================================================
// Zamana göre hangi tip düşman doğacağını seç
function chooseEnemyType() {
    const roll = Math.random(); // 0 ile 1 arası rastgele sayı

    if (gameTime > 30 && roll < 0.15) return "tank"; // 30. saniyeden sonra %15
    if (gameTime > 15 && roll < 0.45) return "fast"; // 15. saniyeden sonra
    return "normal";
}

// Ekranın rastgele bir kenarında, biraz dışarıda bir nokta
function randomEdgePosition(margin) {
    const side = Math.floor(Math.random() * 4);

    if (side === 0) return { x: Math.random() * canvas.width, y: -margin };
    if (side === 1) return { x: canvas.width + margin, y: Math.random() * canvas.height };
    if (side === 2) return { x: Math.random() * canvas.width, y: canvas.height + margin };
    return { x: -margin, y: Math.random() * canvas.height };
}

function spawnEnemy() {
    const pos = randomEdgePosition(30);
    const enemy = new Enemy(pos.x, pos.y, chooseEnemyType());
    // Zamanla tüm düşmanlar hızlansın, ama en fazla 2 katına kadar
    enemy.speed *= Math.min(2, 1 + gameTime * 0.015);
    enemies.push(enemy);
}

function spawnBoss() {
    bossCount++;
    // Oyuncudan uzak taraftan, ekranın üstünden ya da altından gelsin
    const y = player.y > canvas.height / 2 ? -50 : canvas.height + 50;
    boss = new Boss(canvas.width / 2, y, bossCount);
    enemies.push(boss);
}

function isColliding(a, b) {
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    return distance < a.radius + b.radius;
}


// =====================================================
//  ÖLDÜRME VE HASAR
// =====================================================
function killEnemy(enemy) {
    enemy.dead = true;
    score += enemy.score;
    dropXp(enemy);
    maybeDropPowerUp(enemy);

    if (enemy.isBoss) {
        // Boss ölümü: büyük patlama, sarsıntı ve ekstra güçlendirme
        spawnParticles(enemy.x, enemy.y, "#c62828", 60);
        spawnParticles(enemy.x, enemy.y, "#ffd54f", 30);
        shakeScreen(20, 0.8);
        maybeDropPowerUp(enemy);
        texts.push(new FloatingText(enemy.x, enemy.y - 50, "BOSS DEFEATED! +" + enemy.score, "#ffd54f"));
        playSound("bossDeath");
        boss = null;
        bossTimer = 0;
        bossWarned = false;
    } else {
        // Büyük düşman = büyük patlama
        spawnParticles(enemy.x, enemy.y, enemy.color, 10 + enemy.radius);
        playSound("explode");
    }
}

// Oyuncu hasar alır. Dokunulmazsa hiçbir şey olmaz, false döner.
function damagePlayer() {
    if (player.invincibleTimer > 0) return false;

    // Kalkan varsa hasarı o yer ve kırılır
    if (player.hasShield) {
        player.hasShield = false;
        player.invincibleTimer = 1; // kırıldıktan sonra da kısa bir koruma
        spawnParticles(player.x, player.y, "#ce93d8", 25);
        texts.push(new FloatingText(player.x, player.y - 30, "SHIELD BROKEN", "#ce93d8"));
        shakeScreen(5, 0.15);
        playSound("shieldBreak");
        return true;
    }

    player.health -= 1;
    player.invincibleTimer = 1; // 1 saniye dokunulmazlık

    shakeScreen(10, 0.3);
    damageFlash = 0.25;

    if (player.health <= 0) {
        spawnParticles(player.x, player.y, "#7a9a3a", 40);
        shakeScreen(18, 0.5);
        playSound("gameover");
        endGame();
    } else {
        playSound("hurt");
    }

    return true;
}


// =====================================================
//  GÜNCELLEME
// =====================================================
function update(dt) {
    // Efektler her durumda devam etsin (ölüm patlaması game over'da da oynasın)
    shakeTime = Math.max(0, shakeTime - dt);
    damageFlash = Math.max(0, damageFlash - dt);

    for (const particle of particles) {
        particle.update(dt);
    }
    particles = particles.filter((particle) => !particle.dead);

    for (const text of texts) {
        text.update(dt);
    }
    texts = texts.filter((text) => !text.dead);

    // Oyun oynanmıyorsa (menü, seviye atlama, oyun bitti) geri kalanı dursun
    if (state !== "playing") return;

    player.update(dt);

    gameTime += dt;
    spawnInterval = Math.max(0.3, 1.5 - gameTime * 0.02);

    // --- Düşman doğurma (boss varken daha yavaş) ---
    spawnTimer += boss ? dt * 0.4 : dt;
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnEnemy();
    }

    // --- Boss zamanlayıcısı (boss sahnedeyken durur) ---
    if (!boss) {
        bossTimer += dt;

        // Gelmeden 3 saniye önce uyar
        if (bossTimer >= BOSS_INTERVAL - 3 && !bossWarned) {
            bossWarned = true;
            bossWarning = 3;
            playSound("bossWarning");
        }
        if (bossTimer >= BOSS_INTERVAL) {
            spawnBoss();
        }
    }
    bossWarning = Math.max(0, bossWarning - dt);

    // --- Hareketler ---
    for (const bullet of bullets) bullet.update(dt);
    for (const bullet of enemyBullets) bullet.update(dt);
    for (const enemy of enemies) enemy.update(dt);
    for (const gem of xpGems) gem.update(dt);

    // --- Mermi - düşman çarpışması ---
    for (const bullet of bullets) {
        for (const enemy of enemies) {
            if (bullet.dead || enemy.dead) continue;
            if (bullet.hitEnemies.has(enemy)) continue; // bu düşmana zaten vurdu
            if (!isColliding(bullet, enemy)) continue;

            bullet.hitEnemies.add(enemy);
            spawnParticles(bullet.x, bullet.y, "#ffd54f", 4); // küçük kıvılcım

            if (enemy.takeHit(bullet.damage)) {
                killEnemy(enemy);
            } else {
                playSound("hit"); // vurduk ama ölmedi
            }

            // Delme hakkı varsa devam etsin, yoksa yok olsun
            if (bullet.pierce > 0) {
                bullet.pierce--;
            } else {
                bullet.dead = true;
            }
        }
    }

    // --- Düşman - oyuncu çarpışması ---
    for (const enemy of enemies) {
        if (enemy.dead || !isColliding(player, enemy)) continue;

        // Hasar aldıysak (ya da kalkan kırıldıysa) normal düşman da patlasın (boss patlamaz)
        if (damagePlayer() && !enemy.isBoss) {
            enemy.dead = true;
            spawnParticles(enemy.x, enemy.y, enemy.color, 15);
        }

        if (state !== "playing") return; // öldüysek dur
    }

    // --- Düşman mermisi - oyuncu çarpışması ---
    for (const bullet of enemyBullets) {
        if (bullet.dead || !isColliding(player, bullet)) continue;

        if (damagePlayer()) {
            bullet.dead = true;
            spawnParticles(bullet.x, bullet.y, "#ff4081", 8);
        }

        if (state !== "playing") return;
    }

    // --- Güçlendirmeleri topla ---
    for (const powerUp of powerUps) {
        powerUp.update(dt);

        if (!powerUp.dead && isColliding(player, powerUp)) {
            powerUp.dead = true;
            applyPowerUp(powerUp.type);
        }
    }

    // --- XP kristallerini topla ---
    for (const gem of xpGems) {
        if (!gem.dead && isColliding(player, gem)) {
            gem.dead = true;
            addXp(gem.value);
            playSound("xp");
        }
    }

    bullets = bullets.filter((bullet) => !bullet.dead);
    enemyBullets = enemyBullets.filter((bullet) => !bullet.dead);
    enemies = enemies.filter((enemy) => !enemy.dead);
    powerUps = powerUps.filter((powerUp) => !powerUp.dead);
    xpGems = xpGems.filter((gem) => !gem.dead);

    // Seviye atladıysak yükseltme ekranını aç
    if (pendingLevelUps > 0) {
        openLevelUp();
    }
}


// =====================================================
//  ÇİZİM
// =====================================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Pixel art büyütülünce bulanıklaşmasın, keskin kalsın
    ctx.imageSmoothingEnabled = false;

    // --- Oyun dünyası (sarsıntıdan etkilenir) ---
    ctx.save();

    if (shakeTime > 0) {
        const offsetX = (Math.random() * 2 - 1) * shakeStrength;
        const offsetY = (Math.random() * 2 - 1) * shakeStrength;
        ctx.translate(offsetX, offsetY);
    }

    for (const particle of particles) particle.draw();
    for (const gem of xpGems) gem.draw();
    for (const powerUp of powerUps) powerUp.draw();
    for (const bullet of bullets) bullet.draw();
    for (const enemy of enemies) enemy.draw();
    for (const bullet of enemyBullets) bullet.draw();
    if (state !== "gameover") player.draw();
    for (const text of texts) text.draw();

    ctx.restore();

    // --- Hasar flaşı ---
    if (damageFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${damageFlash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // --- Arayüz (sarsıntıdan etkilenmez) ---
    if (state === "playing") {
        drawHUD();
    } else if (state === "levelup") {
        drawHUD();
        drawLevelUp();
    } else if (state === "paused") {
        drawHUD();
        drawPause();
    } else if (state === "menu") {
        drawMenu();
    } else {
        drawGameOver();
    }

    // Ses kapalıysa sağ üstte küçük bir uyarı
    if (muted) {
        ctx.font = "16px Arial";
        ctx.fillStyle = "#9ca3af";
        ctx.textAlign = "right";
        ctx.fillText("Sound off (M)", canvas.width - 16, 58);
        ctx.textAlign = "left";
    }
}

function drawHUD() {
    ctx.font = "20px Arial";

    ctx.fillStyle = "#ffffff";
    ctx.fillText("Score: " + score, 16, 32);

    // Canlar: dolu kalpler kırmızı, boşlar gri
    ctx.fillStyle = "#ef5350";
    const fullHearts = "♥ ".repeat(Math.max(0, player.health));
    ctx.fillText(fullHearts, 16, 60);
    ctx.fillStyle = "#4b5563";
    ctx.fillText("♥ ".repeat(Math.max(0, player.maxHealth - player.health)), 16 + ctx.measureText(fullHearts).width, 60);

    ctx.fillStyle = "#ffffff";
    ctx.fillText("Time: " + Math.floor(gameTime) + "s", 16, 88);

    // Aktif güçlendirmeler ve kalan süreleri
    let y = 120;
    ctx.font = "16px Arial";
    for (const type in player.powerTimers) {
        const timeLeft = player.powerTimers[type];
        if (timeLeft > 0) {
            ctx.fillStyle = POWERUP_TYPES[type].color;
            ctx.fillText(POWERUP_TYPES[type].name + "  " + timeLeft.toFixed(1) + "s", 16, y);
            y += 24;
        }
    }
    if (player.hasShield) {
        ctx.fillStyle = POWERUP_TYPES.shield.color;
        ctx.fillText("SHIELD  (blocks next hit)", 16, y);
    }
    ctx.font = "20px Arial";

    ctx.textAlign = "right";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Best: " + highScore, canvas.width - 16, 32);
    ctx.textAlign = "left";

    // --- XP barı (ekranın en altında) ---
    const barX = 16;
    const barY = canvas.height - 18;
    const barW = canvas.width - 32;
    ctx.fillStyle = "#2c333b";
    ctx.fillRect(barX, barY, barW, 8);
    ctx.fillStyle = "#4dd0e1";
    ctx.fillRect(barX, barY, barW * (xp / xpToNext), 8);

    ctx.font = "bold 16px Arial";
    ctx.fillStyle = "#4dd0e1";
    ctx.fillText("Lv " + level, barX, barY - 8);

    // --- Boss can barı (ekranın üstünde ortada) ---
    if (boss) {
        const bw = 400;
        const bx = (canvas.width - bw) / 2;
        const by = 40;

        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "#ef5350";
        ctx.textAlign = "center";
        ctx.fillText("BOSS " + boss.number, canvas.width / 2, by - 8);
        ctx.textAlign = "left";

        ctx.fillStyle = "#2c333b";
        ctx.fillRect(bx, by, bw, 12);
        ctx.fillStyle = "#c62828";
        ctx.fillRect(bx, by, bw * Math.max(0, boss.health / boss.maxHealth), 12);
        ctx.strokeStyle = "#ffd54f";
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, 12);
    }

    // --- Boss uyarısı (yanıp söner) ---
    if (bossWarning > 0 && Math.floor(bossWarning * 4) % 2 === 0) {
        drawCenteredText("WARNING: BOSS INCOMING", canvas.height / 2 - 120, "bold 36px Arial", "#ef5350");
    }
}

// Ortalanmış yazı yazmak için yardımcı fonksiyon
function drawCenteredText(text, y, size, color) {
    ctx.font = size;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, y);
    ctx.textAlign = "left";
}

// Uzun yazıyı kelime kelime bölüp satırlara sığdır
function drawWrappedText(text, centerX, y, maxWidth, lineHeight) {
    const words = text.split(" ");
    let line = "";

    for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            ctx.fillText(line, centerX, y);
            line = word;
            y += lineHeight;
        } else {
            line = test;
        }
    }
    ctx.fillText(line, centerX, y);
}

function drawLevelUp() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawCenteredText("LEVEL UP!", 110, "bold 44px Arial", "#4dd0e1");
    drawCenteredText("Choose an upgrade (click or press 1, 2, 3)", 145, "18px Arial", "#9ca3af");

    const hovered = getCardIndexAt(mouse.x, mouse.y);

    upgradeChoices.forEach((upgrade, i) => {
        const r = getCardRect(i, upgradeChoices.length);
        const cx = r.x + r.w / 2;
        const currentLevel = upgradeLevels[upgrade.id] || 0;

        // Kart arka planı ve çerçevesi (fare üstündeyse parlak)
        ctx.fillStyle = i === hovered ? "#263238" : "#1b1f24";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = i === hovered ? "#4dd0e1" : "#4b5563";
        ctx.lineWidth = i === hovered ? 3 : 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        ctx.textAlign = "center";

        // Tuş numarası
        ctx.font = "bold 16px Arial";
        ctx.fillStyle = "#6b7280";
        ctx.fillText("[" + (i + 1) + "]", cx, r.y + 28);

        // Yükseltme adı
        ctx.font = "bold 20px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(upgrade.name, cx, r.y + 66);

        // Açıklama
        ctx.font = "16px Arial";
        ctx.fillStyle = "#d1d5db";
        drawWrappedText(upgrade.desc, cx, r.y + 100, r.w - 30, 20);

        // Seviye bilgisi
        ctx.font = "bold 14px Arial";
        ctx.fillStyle = "#4dd0e1";
        const levelText = currentLevel === 0 ? "NEW" : "Lv " + currentLevel + " → " + (currentLevel + 1);
        ctx.fillText(levelText + "  (max " + upgrade.max + ")", cx, r.y + r.h - 18);

        ctx.textAlign = "left";
    });
}

function drawPause() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.65)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawCenteredText("PAUSED", canvas.height / 2 - 110, "bold 48px Arial", "#ffffff");

    // Butonlar (fare üstündeyse parlak)
    const hovered = getPauseButtonAt(mouse.x, mouse.y);

    PAUSE_BUTTONS.forEach((button, i) => {
        const r = getPauseButtonRect(i);

        ctx.fillStyle = i === hovered ? "#263238" : "#1b1f24";
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.strokeStyle = i === hovered ? "#4fc3f7" : "#4b5563";
        ctx.lineWidth = i === hovered ? 3 : 2;
        ctx.strokeRect(r.x, r.y, r.w, r.h);

        ctx.font = "20px Arial";
        ctx.fillStyle = "#ffffff";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(button.label, r.x + r.w / 2, r.y + r.h / 2);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    });

    // Şu ana kadar alınan yükseltmeler
    const owned = UPGRADES
        .filter((u) => upgradeLevels[u.id])
        .map((u) => u.name + " " + upgradeLevels[u.id]);

    const lastButton = getPauseButtonRect(PAUSE_BUTTONS.length - 1);
    const infoY = lastButton.y + lastButton.h + 40;

    ctx.font = "16px Arial";
    ctx.fillStyle = "#9ca3af";
    ctx.textAlign = "center";
    ctx.fillText("Level " + level + "   •   Sound: " + (muted ? "off" : "on") + " (M)", canvas.width / 2, infoY);
    ctx.fillStyle = "#4dd0e1";
    drawWrappedText(owned.length ? "Upgrades: " + owned.join(", ") : "No upgrades yet", canvas.width / 2, infoY + 26, 640, 20);
    ctx.textAlign = "left";
}

function drawMenu() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cy = canvas.height / 2;
    drawCenteredText("TOP-DOWN SHOOTER", cy - 60, "bold 56px Arial", "#4fc3f7");
    drawCenteredText("Click or press Enter to start", cy + 10, "24px Arial", "#ffffff");
    drawCenteredText("WASD: move   •   Mouse: aim, hold to shoot   •   Esc: pause   •   M: sound", cy + 50, "18px Arial", "#9ca3af");
    drawCenteredText("High score: " + highScore, cy + 100, "20px Arial", "#ffd54f");
}

function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cy = canvas.height / 2;
    drawCenteredText("GAME OVER", cy - 60, "bold 48px Arial", "#ffffff");
    drawCenteredText("Score: " + score, cy - 10, "26px Arial", "#ffffff");
    drawCenteredText("Level " + level + "   •   Bosses defeated: " + Math.max(0, bossCount - (boss ? 1 : 0)), cy + 22, "18px Arial", "#9ca3af");

    if (newRecord) {
        drawCenteredText("NEW HIGH SCORE!", cy + 58, "bold 24px Arial", "#ffd54f");
    } else {
        drawCenteredText("Best: " + highScore, cy + 58, "22px Arial", "#9ca3af");
    }

    drawCenteredText("R: play again   •   Esc: menu", cy + 100, "20px Arial", "#ffffff");
}


// =====================================================
//  OYUN DÖNGÜSÜ
// =====================================================
let lastTime = performance.now();

function gameLoop(time) {
    const dt = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;

    update(dt);
    draw();

    requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);