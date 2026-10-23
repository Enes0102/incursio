// =====================================================
//  KURULUM
// =====================================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");


// =====================================================
//  GİRDİ (KLAVYE + FARE)
// =====================================================
const keys = {};

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;
    initAudio(); // tarayıcılar sesi ancak kullanıcı bir tuşa bastıktan sonra açmaya izin verir
    handleKeyPress(key); // menü / yeniden başlama tuşları
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
    mouse.down = true;
    initAudio();
    if (state === "menu") startGame(); // menüdeyken tıklayınca oyun başlasın
});

// window'a bağlıyoruz: fareyi canvas dışında bıraksan bile ateş dursun
window.addEventListener("mouseup", () => {
    mouse.down = false;
});


// =====================================================
//  OYUNCU
// =====================================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.speed = 250;
        this.angle = 0;
        this.health = 3;
        this.maxHealth = 5; // can yenileme ile en fazla bu kadar olabilir

        // OTOMATİK ATEŞ: iki atış arası en az bu kadar saniye
        this.fireRate = 0.2;  // = saniyede 5 mermi
        this.fireTimer = 0;   // bir sonraki atışa kalan süre

        // GÜÇLENDİRMELER: her birinin kalan süresi (saniye). 0 = aktif değil
        this.powerTimers = { rapid: 0, triple: 0, shield: 0 };
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

        // Güçlendirme sürelerini azalt
        for (const key in this.powerTimers) {
            this.powerTimers[key] = Math.max(0, this.powerTimers[key] - dt);
        }

        // OTOMATİK ATEŞ: sayaç sıfıra indiyse ve fare basılıysa ateş et
        // Hızlı ateş aktifse bekleme süresi 2.5 kat kısalır
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

        // Üçlü atış aktifse ortadakinin yanına biraz açılı iki mermi daha
        const angles = this.powerTimers.triple > 0
            ? [this.angle - 0.2, this.angle, this.angle + 0.2]
            : [this.angle];

        for (const angle of angles) {
            bullets.push(new Bullet(bx, by, angle));
        }

        playSound("shoot");
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        ctx.fillStyle = "#6b7280";
        ctx.fillRect(0, -5, this.radius + 14, 10);

        ctx.fillStyle = "#4fc3f7";
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Kalkan aktifse etrafında bir halka
        if (this.powerTimers.shield > 0) {
            ctx.strokeStyle = "rgba(206, 147, 216, 0.8)";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(0, 0, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        ctx.restore();
    }
}


// =====================================================
//  MERMİ
// =====================================================
class Bullet {
    constructor(x, y, angle) {
        this.x = x;
        this.y = y;
        this.radius = 4;
        this.speed = 600;
        this.vx = Math.cos(angle) * this.speed;
        this.vy = Math.sin(angle) * this.speed;
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
        ctx.fillStyle = "#ffd54f";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}


// =====================================================
//  DÜŞMAN TİPLERİ
// =====================================================
// Yeni bir düşman tipi eklemek için buraya bir satır eklemen yeterli
// dropChance: ölünce güçlendirme düşürme ihtimali (0.1 = %10)
const ENEMY_TYPES = {
    normal: { radius: 14, speed: 100, health: 1, color: "#ef5350", score: 10, dropChance: 0.08 },
    fast:   { radius: 10, speed: 170, health: 1, color: "#ffb74d", score: 15, dropChance: 0.10 }, // küçük ve hızlı
    tank:   { radius: 22, speed: 60,  health: 4, color: "#ab47bc", score: 30, dropChance: 0.40 }, // büyük, yavaş, dayanıklı
};

class Enemy {
    constructor(x, y, typeName) {
        const type = ENEMY_TYPES[typeName];

        this.x = x;
        this.y = y;
        this.radius = type.radius;
        this.speed = type.speed;
        this.health = type.health;
        this.maxHealth = type.health;
        this.color = type.color;
        this.score = type.score;
        this.dropChance = type.dropChance;
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
    takeHit() {
        this.health -= 1;
        this.hitTimer = 0.08;
        return this.health <= 0;
    }

    draw() {
        // Vurulduysa beyaz, değilse kendi rengi
        ctx.fillStyle = this.hitTimer > 0 ? "#ffffff" : this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();

        // Birden fazla canı olan düşmanların üstünde can barı
        if (this.maxHealth > 1) {
            const barWidth = this.radius * 2;
            const barX = this.x - this.radius;
            const barY = this.y - this.radius - 10;

            ctx.fillStyle = "#333";
            ctx.fillRect(barX, barY, barWidth, 4);
            ctx.fillStyle = "#66bb6a";
            ctx.fillRect(barX, barY, barWidth * (this.health / this.maxHealth), 4);
        }
    }
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
//  EFEKTLER: YÜKSELEN YAZI ("+1 CAN" gibi)
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

// Süreli güçlendirmeler kaç saniye sürsün
const POWERUP_DURATION = { rapid: 6, triple: 8, shield: 6 };

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

        ctx.fillStyle = info.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y + bob, this.radius, 0, Math.PI * 2);
        ctx.fill();

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
    powerup: () => {
        // Yükselen üç nota (do - mi - sol)
        playTone("sine", 523, 523, 0.08, 0.15, 0);
        playTone("sine", 659, 659, 0.08, 0.15, 0.08);
        playTone("sine", 784, 784, 0.12, 0.15, 0.16);
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
// state: "menu" | "playing" | "gameover"
let state = "menu";

let player = new Player(canvas.width / 2, canvas.height / 2);
let bullets = [];
let enemies = [];
let particles = [];
let powerUps = [];
let texts = [];

let score = 0;
let gameTime = 0;
let spawnTimer = 0;
let spawnInterval = 1.5;

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
    enemies = [];
    particles = [];
    powerUps = [];
    texts = [];
    score = 0;
    gameTime = 0;
    spawnTimer = 0;
    spawnInterval = 1.5;
    shakeTime = 0;
    damageFlash = 0;
    newRecord = false;
    state = "playing";
}

function endGame() {
    state = "gameover";

    if (score > highScore) {
        highScore = score;
        newRecord = true;
        saveHighScore();
    }
}

function handleKeyPress(key) {
    // M her ekranda sesi açıp kapatsın
    if (key === "m") {
        toggleMute();
        return;
    }

    if (state === "menu" && (key === "enter" || key === " ")) {
        startGame();
    } else if (state === "gameover") {
        if (key === "r") startGame();
        if (key === "escape") state = "menu";
    }
}


// =====================================================
//  DÜŞMAN DOĞURMA
// =====================================================
// Zamana göre hangi tip düşman doğacağını seç
function chooseEnemyType() {
    const roll = Math.random(); // 0 ile 1 arası rastgele sayı

    if (gameTime > 30 && roll < 0.15) return "tank"; // 30. saniyeden sonra %15
    if (gameTime > 15 && roll < 0.45) return "fast"; // 15. saniyeden sonra
    return "normal";
}

function spawnEnemy() {
    const side = Math.floor(Math.random() * 4);
    const margin = 30;
    let x, y;

    if (side === 0) { x = Math.random() * canvas.width; y = -margin; }
    else if (side === 1) { x = canvas.width + margin; y = Math.random() * canvas.height; }
    else if (side === 2) { x = Math.random() * canvas.width; y = canvas.height + margin; }
    else { x = -margin; y = Math.random() * canvas.height; }

    const enemy = new Enemy(x, y, chooseEnemyType());
    // Zamanla tüm düşmanlar hızlansın, ama en fazla 2 katına kadar
    enemy.speed *= Math.min(2, 1 + gameTime * 0.015);
    enemies.push(enemy);
}

function isColliding(a, b) {
    const distance = Math.hypot(a.x - b.x, a.y - b.y);
    return distance < a.radius + b.radius;
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

    // Oyun oynanmıyorsa geri kalanı çalışmasın
    if (state !== "playing") return;

    player.update(dt);

    gameTime += dt;
    spawnInterval = Math.max(0.3, 1.5 - gameTime * 0.02);

    spawnTimer += dt;
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        spawnEnemy();
    }

    for (const bullet of bullets) {
        bullet.update(dt);
    }

    for (const enemy of enemies) {
        enemy.update(dt);
    }

    // Mermi - düşman çarpışması
    for (const bullet of bullets) {
        for (const enemy of enemies) {
            if (!bullet.dead && !enemy.dead && isColliding(bullet, enemy)) {
                bullet.dead = true;
                spawnParticles(bullet.x, bullet.y, "#ffd54f", 4); // küçük kıvılcım

                if (enemy.takeHit()) {
                    enemy.dead = true;
                    score += enemy.score;
                    // Büyük düşman = büyük patlama
                    spawnParticles(enemy.x, enemy.y, enemy.color, 10 + enemy.radius);
                    maybeDropPowerUp(enemy);
                    playSound("explode");
                } else {
                    playSound("hit"); // vurduk ama ölmedi (tanklar)
                }
            }
        }
    }

    // Düşman - oyuncu çarpışması
    for (const enemy of enemies) {
        if (!enemy.dead && isColliding(player, enemy)) {
            enemy.dead = true;

            // Kalkan aktifse hasar alma, düşman yok olsun ve puan ver
            if (player.powerTimers.shield > 0) {
                score += enemy.score;
                spawnParticles(enemy.x, enemy.y, "#ce93d8", 15);
                playSound("explode");
                continue; // bu düşmanı geç, sıradakine bak
            }

            player.health -= 1;

            spawnParticles(enemy.x, enemy.y, enemy.color, 15);
            shakeScreen(10, 0.3);
            damageFlash = 0.25;

            if (player.health <= 0) {
                spawnParticles(player.x, player.y, "#4fc3f7", 40);
                shakeScreen(18, 0.5);
                playSound("gameover");
                endGame();
            } else {
                playSound("hurt");
            }
        }
    }

    // Güçlendirmeleri güncelle ve oyuncu üstünden geçtiyse topla
    for (const powerUp of powerUps) {
        powerUp.update(dt);

        if (!powerUp.dead && isColliding(player, powerUp)) {
            powerUp.dead = true;
            applyPowerUp(powerUp.type);
        }
    }

    bullets = bullets.filter((bullet) => !bullet.dead);
    enemies = enemies.filter((enemy) => !enemy.dead);
    powerUps = powerUps.filter((powerUp) => !powerUp.dead);
}


// =====================================================
//  ÇİZİM
// =====================================================
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // --- Oyun dünyası (sarsıntıdan etkilenir) ---
    ctx.save();

    if (shakeTime > 0) {
        const offsetX = (Math.random() * 2 - 1) * shakeStrength;
        const offsetY = (Math.random() * 2 - 1) * shakeStrength;
        ctx.translate(offsetX, offsetY);
    }

    for (const particle of particles) particle.draw();
    for (const powerUp of powerUps) powerUp.draw();
    for (const bullet of bullets) bullet.draw();
    for (const enemy of enemies) enemy.draw();
    if (state !== "gameover") player.draw();
    for (const text of texts) text.draw();

    ctx.restore();

    // --- Hasar flaşı ---
    if (damageFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${damageFlash})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    // --- Arayüz (sarsıntıdan etkilenmez) ---
    if (state === "playing") drawHUD();
    else if (state === "menu") drawMenu();
    else drawGameOver();

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

    ctx.fillStyle = "#ef5350";
    ctx.fillText("♥ ".repeat(player.health), 16, 60);

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
    ctx.font = "20px Arial";

    ctx.textAlign = "right";
    ctx.fillStyle = "#9ca3af";
    ctx.fillText("Best: " + highScore, canvas.width - 16, 32);
    ctx.textAlign = "left";
}

// Ortalanmış yazı yazmak için yardımcı fonksiyon
function drawCenteredText(text, y, size, color) {
    ctx.font = size;
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.fillText(text, canvas.width / 2, y);
    ctx.textAlign = "left";
}

function drawMenu() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cy = canvas.height / 2;
    drawCenteredText("TOP-DOWN SHOOTER", cy - 60, "bold 56px Arial", "#4fc3f7");
    drawCenteredText("Click or press Enter to start", cy + 10, "24px Arial", "#ffffff");
    drawCenteredText("WASD: move   •   Mouse: aim, hold to shoot   •   M: sound", cy + 50, "18px Arial", "#9ca3af");
    drawCenteredText("High score: " + highScore, cy + 100, "20px Arial", "#ffd54f");
}

function drawGameOver() {
    ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const cy = canvas.height / 2;
    drawCenteredText("GAME OVER", cy - 50, "bold 48px Arial", "#ffffff");
    drawCenteredText("Score: " + score, cy, "26px Arial", "#ffffff");

    if (newRecord) {
        drawCenteredText("NEW HIGH SCORE!", cy + 38, "bold 24px Arial", "#ffd54f");
    } else {
        drawCenteredText("Best: " + highScore, cy + 38, "22px Arial", "#9ca3af");
    }

    drawCenteredText("R: play again   •   Esc: menu", cy + 85, "20px Arial", "#ffffff");
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