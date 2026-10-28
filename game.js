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
    xp_gem_big: loadSprite("xp_gem_big"),
    enemy_bullet: loadSprite("enemy_bullet"),
    boss: loadSprite("boss"),
    blade: loadSprite("blade"),
    enemy_spitter: loadSprite("enemy_spitter"),
    enemy_charger: loadSprite("enemy_charger"),
    enemy_splitter: loadSprite("enemy_splitter"),
    enemy_splitling: loadSprite("enemy_splitling"),
    chest_closed: loadSprite("chest_closed"),
    chest_open: loadSprite("chest_open"),
    bullet_rail: loadSprite("bullet_rail"),
    powerup_magnet: loadSprite("powerup_magnet"),
    powerup_bomb: loadSprite("powerup_bomb"),
    powerup_freeze: loadSprite("powerup_freeze"),
    gold: loadSprite("gold"),
};

// Resim yüklendi mi? Yüklenmediyse eski daireler çizilir, oyun yine çalışır
function isReady(img) {
    return img && img.complete && img.naturalWidth > 0;
}

// Sprite'ı (x, y) merkezli, istenirse döndürerek çiz
function drawSprite(img, x, y, angle = 0, scale = 1) {
    const w = (img.naturalWidth || img.width) * SPRITE_SCALE * scale;
    const h = (img.naturalHeight || img.height) * SPRITE_SCALE * scale;

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
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = "source-in"; // sadece dolu piksellere boya
        g.fillStyle = "#ffffff";
        g.fillRect(0, 0, c.width, c.height);
        img.flashVersion = c;
    }
    return img.flashVersion;
}

// Sprite'ın etrafına 1 piksel kalın koyu kontur ekle (bir kez üretilip saklanır).
// Düşmanların çimenden net ayrılmasını sağlıyor.
function getOutlinedSprite(img, color = "#0b0b0f") {
    const cacheKey = "outlined_" + color;
    if (!img[cacheKey]) {
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        // Önce sprite'ın koyu renkli siluetini çıkar
        const silhouette = document.createElement("canvas");
        silhouette.width = w;
        silhouette.height = h;
        const sg = silhouette.getContext("2d");
        sg.drawImage(img, 0, 0);
        sg.globalCompositeOperation = "source-in";
        sg.fillStyle = color;
        sg.fillRect(0, 0, w, h);

        // Siluet dört yöne 1 piksel kaydırılarak çizilir, üstüne sprite'ın kendisi
        const c = document.createElement("canvas");
        c.width = w + 2;
        c.height = h + 2;
        const g = c.getContext("2d");
        g.drawImage(silhouette, 1, 0);
        g.drawImage(silhouette, 1, 2);
        g.drawImage(silhouette, 0, 1);
        g.drawImage(silhouette, 2, 1);
        g.drawImage(img, 1, 1);
        img[cacheKey] = c;
    }
    return img[cacheKey];
}

// Frost Aura'daki düşmanlar için buz mavisi tonlu kopya
function getFrozenSprite(img) {
    if (!img.frozenVersion) {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth || img.width;
        c.height = img.naturalHeight || img.height;
        const g = c.getContext("2d");
        g.drawImage(img, 0, 0);
        g.globalCompositeOperation = "source-atop"; // sadece dolu piksellerin üstüne
        g.fillStyle = "rgba(140, 210, 255, 0.45)";
        g.fillRect(0, 0, c.width, c.height);
        img.frozenVersion = c;
    }
    return img.frozenVersion;
}

// Nesnenin altında yarı saydam oval gölge
function drawShadow(x, y, radiusX, radiusY) {
    ctx.fillStyle = "rgba(0, 0, 0, 0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.fill();
}

// Daire çizmek için kısa yardımcı (sprite yüklenmezse yedek olarak)
function drawCircle(x, y, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
}


// =====================================================
//  DÜNYA (HARİTA) VE KAMERA
// =====================================================
// Harita karolardan oluşuyor: her karo 16x16 piksel çizildi, oyunda 2 kat büyük (32x32)
const TILE_PIXELS = 16;
const TILE_SIZE = TILE_PIXELS * SPRITE_SCALE;
const WORLD_COLS = 96;
const WORLD_ROWS = 56;
const WORLD_WIDTH = WORLD_COLS * TILE_SIZE;   // 3072 piksel
const WORLD_HEIGHT = WORLD_ROWS * TILE_SIZE;  // 1792 piksel

// Haritanın kenarında 3 karo kalınlığında orman, onun içinde ahşap çit
const FOREST_TILES = 3;
const WALL = (FOREST_TILES + 1) * TILE_SIZE;  // orman + çit: oynanabilir alanın başladığı yer

function loadTile(name) {
    return loadSprite("tiles/" + name);
}

const tiles = {
    grass_1: loadTile("grass_1"),
    grass_2: loadTile("grass_2"),
    grass_3: loadTile("grass_3"),
    grass_4: loadTile("grass_4"),
    grass_dark_1: loadTile("grass_dark_1"),
    grass_dark_2: loadTile("grass_dark_2"),
    fence_h: loadTile("fence_h"),
    fence_v: loadTile("fence_v"),
    fence_post: loadTile("fence_post"),
    tree_1: loadTile("tree_1"),
    tree_2: loadTile("tree_2"),
    tree_3: loadTile("tree_3"),
    flowers_yellow: loadTile("flowers_yellow"),
    flowers_white: loadTile("flowers_white"),
    flowers_purple: loadTile("flowers_purple"),
    tall_grass: loadTile("tall_grass"),
    rock: loadTile("rock"),
    mushroom: loadTile("mushroom"),
    stump: loadTile("stump"),
    bush: loadTile("bush"),
};

// Listede birden fazla geçen daha sık çıkar
const TREES = ["tree_1", "tree_1", "tree_2", "tree_3"];
const FLOWERS = ["flowers_yellow", "flowers_white", "flowers_purple"];
const MEADOW_DECOR = ["tall_grass", "tall_grass", "mushroom", "bush"];
const COMMON_DECOR = ["rock", "tall_grass", "stump", "bush", "flowers_yellow"];

// Kamera: ekranın sol üst köşesinin dünyadaki konumu
const camera = { x: 0, y: 0 };

// Kamerayı oyuncuya ortala, ama haritanın dışını göstermesin
function updateCamera() {
    let x = player.x - canvas.width / 2;
    let y = player.y - canvas.height / 2;

    x = Math.max(0, Math.min(WORLD_WIDTH - canvas.width, x));
    y = Math.max(0, Math.min(WORLD_HEIGHT - canvas.height, y));

    // Pixel art titremesin diye kamerayı tam piksellere yuvarla
    camera.x = Math.round(x / SPRITE_SCALE) * SPRITE_SCALE;
    camera.y = Math.round(y / SPRITE_SCALE) * SPRITE_SCALE;
}

// Bir nesneyi çitin içinde tut
function clampToWorld(obj) {
    obj.x = Math.max(WALL + obj.radius, Math.min(WORLD_WIDTH - WALL - obj.radius, obj.x));
    obj.y = Math.max(WALL + obj.radius, Math.min(WORLD_HEIGHT - WALL - obj.radius, obj.y));
}

// Nokta çitin içinde mi?
function isInsideWalls(x, y) {
    return x > WALL && x < WORLD_WIDTH - WALL && y > WALL && y < WORLD_HEIGHT - WALL;
}

// Nokta ekranda (ya da ekranın margin kadar yakınında) mı?
function isNearView(x, y, margin) {
    return x > camera.x - margin && x < camera.x + canvas.width + margin &&
           y > camera.y - margin && y < camera.y + canvas.height + margin;
}

// Tohumlu rastgele sayı üreteci: aynı tohum = her açılışta aynı harita
function seededRandom(seed) {
    return function () {
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

// Yumuşak gürültü (value noise): yan yana noktalar benzer değer verir,
// böylece koyu/açık çimen bölgeleri doğal öbekler halinde dağılır
function makeNoise(seed) {
    const rand = seededRandom(seed);
    const N = 64;
    const grid = [];
    for (let i = 0; i < N * N; i++) grid.push(rand());

    const at = (x, y) => grid[(((y % N) + N) % N) * N + (((x % N) + N) % N)];
    const smooth = (t) => t * t * (3 - 2 * t);

    return function (x, y) {
        const xi = Math.floor(x);
        const yi = Math.floor(y);
        const u = smooth(x - xi);
        const v = smooth(y - yi);
        const top = at(xi, yi) + (at(xi + 1, yi) - at(xi, yi)) * u;
        const bottom = at(xi, yi + 1) + (at(xi + 1, yi + 1) - at(xi, yi + 1)) * u;
        return top + (bottom - top) * v;
    };
}

// Pixel art taraması (Bayer matrisi): bölge kenarlarını piksel piksel yumuşatır
const BAYER = [
    [0, 8, 2, 10],
    [12, 4, 14, 6],
    [3, 11, 1, 9],
    [15, 7, 13, 5],
];

// Bütün zemini bir kez görünmez bir canvas'a çiz, sonra her karede sadece görünen kısmını kopyala.
// (Her karede binlerce karo çizmekten çok daha hızlı)
let groundCanvas = null;

function buildGround() {
    if (groundCanvas) return true;
    for (const key in tiles) {
        if (!isReady(tiles[key])) return false; // karolar henüz yüklenmedi
    }

    const T = TILE_PIXELS;
    const W = WORLD_COLS * T;
    const H = WORLD_ROWS * T;
    const F = FOREST_TILES;               // çitin olduğu karo sırası
    const lastCol = WORLD_COLS - 1 - F;
    const lastRow = WORLD_ROWS - 1 - F;

    const c = document.createElement("canvas");
    c.width = W;
    c.height = H;
    const g = c.getContext("2d");
    const rand = seededRandom(2026);
    const noise = makeNoise(7);
    const pick = (list) => list[Math.floor(rand() * list.length)];

    const isForest = (col, row) => col < F || row < F || col > WORLD_COLS - 1 - F || row > WORLD_ROWS - 1 - F;
    const isFence = (col, row) => !isForest(col, row) && (col === F || row === F || col === lastCol || row === lastRow);

    const treesBehind = [];   // çitin arkasında kalacak ağaçlar (üst ve yanlar)
    const treesInFront = [];  // çitin önünde kalacak ağaçlar (alt)
    const decorations = [];

    // 1) Çimen karoları, ağaç ve süs yerleri
    for (let row = 0; row < WORLD_ROWS; row++) {
        for (let col = 0; col < WORLD_COLS; col++) {
            const x = col * T;
            const y = row * T;

            if (isForest(col, row)) {
                g.drawImage(rand() < 0.5 ? tiles.grass_dark_1 : tiles.grass_dark_2, x, y);
                if (rand() < 0.7) {
                    const tree = {
                        name: pick(TREES),
                        x: x - 8 + Math.floor(rand() * 13) - 6,
                        y: y - 12 + Math.floor(rand() * 13) - 6,
                    };
                    (row > lastRow ? treesInFront : treesBehind).push(tree);
                }
                continue;
            }

            g.drawImage(tiles["grass_" + (1 + Math.floor(rand() * 4))], x, y);
            if (isFence(col, row)) continue;

            // Açık bölgelerde çiçek, koyu bölgelerde uzun çimen ve mantar daha sık
            const n = noise(col / 6, row / 6);
            const p = rand();
            let deco = null;
            if (n < 0.35 && p < 0.10) deco = pick(FLOWERS);
            else if (n > 0.6 && p < 0.10) deco = pick(MEADOW_DECOR);
            else if (p < 0.035) deco = pick(COMMON_DECOR);

            if (deco) {
                // Izgaraya dizilmiş gibi durmasın diye karo içinde biraz kaydır
                decorations.push({ name: deco, x: x + Math.floor(rand() * 11) - 5, y: y + Math.floor(rand() * 11) - 5 });
            }
        }
    }

    // 2) Koyu ve açık çimen bölgeleri (piksel piksel, taramalı kenarlarla)
    const shade = g.createImageData(W, H);
    const data = shade.data;
    const minP = (F + 1) * T;
    for (let py = minP; py < H - minP; py++) {
        for (let px = minP; px < W - minP; px++) {
            const n = noise(px / (T * 6), py / (T * 6)) + (BAYER[py % 4][px % 4] / 16 - 0.5) * 0.05;
            const i = (py * W + px) * 4;
            if (n > 0.6) {
                data[i] = 20; data[i + 1] = 55; data[i + 2] = 15; data[i + 3] = 60;     // koyu çimen
            } else if (n < 0.3) {
                data[i] = 230; data[i + 1] = 255; data[i + 2] = 160; data[i + 3] = 22;  // güneşli çimen
            }
        }
    }
    const shadeCanvas = document.createElement("canvas");
    shadeCanvas.width = W;
    shadeCanvas.height = H;
    shadeCanvas.getContext("2d").putImageData(shade, 0, 0);
    g.drawImage(shadeCanvas, 0, 0);

    // 3) Süsler, arkadaki ağaçlar, çit, öndeki ağaçlar (üstten alta doğru sırayla)
    for (const d of decorations) g.drawImage(tiles[d.name], d.x, d.y);

    treesBehind.sort((a, b) => a.y - b.y);
    for (const t of treesBehind) g.drawImage(tiles[t.name], t.x, t.y);

    for (let row = F; row <= lastRow; row++) {
        for (let col = F; col <= lastCol; col++) {
            if (!isFence(col, row)) continue;
            const corner = (col === F || col === lastCol) && (row === F || row === lastRow);
            const piece = corner ? tiles.fence_post : (row === F || row === lastRow) ? tiles.fence_h : tiles.fence_v;
            g.drawImage(piece, col * T, row * T);
        }
    }

    treesInFront.sort((a, b) => a.y - b.y);
    for (const t of treesInFront) g.drawImage(tiles[t.name], t.x, t.y);

    groundCanvas = c;
    return true;
}

function drawGround() {
    if (buildGround()) {
        // Sadece kameranın gördüğü kısmı (sarsıntı payıyla biraz fazlasını) çiz,
        // ama haritanın dışına taşmasın
        const pad = 24;
        const x0 = Math.max(0, camera.x - pad);
        const y0 = Math.max(0, camera.y - pad);
        const x1 = Math.min(WORLD_WIDTH, camera.x + canvas.width + pad);
        const y1 = Math.min(WORLD_HEIGHT, camera.y + canvas.height + pad);

        ctx.drawImage(
            groundCanvas,
            x0 / SPRITE_SCALE, y0 / SPRITE_SCALE, (x1 - x0) / SPRITE_SCALE, (y1 - y0) / SPRITE_SCALE, // kaynak (küçük çizim)
            x0, y0, x1 - x0, y1 - y0                                                                  // hedef (dünyada)
        );
    } else {
        // Karolar yüklenmediyse düz renk çimen ve çit
        ctx.fillStyle = "#4f8a3a";
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
        ctx.strokeStyle = "#a0703c";
        ctx.lineWidth = 8;
        ctx.strokeRect(WALL - 4, WALL - 4, WORLD_WIDTH - WALL * 2 + 8, WORLD_HEIGHT - WALL * 2 + 8);
    }
}


// =====================================================
//  GİRDİ (KLAVYE + FARE)
// =====================================================
const keys = {};

window.addEventListener("keydown", (e) => {
    const key = e.key.toLowerCase();
    if (key === " ") e.preventDefault(); // Space sayfayı aşağı kaydırmasın (dash tuşu)
    keys[key] = true;
    initAudio(); // tarayıcılar sesi ancak kullanıcı bir tuşa bastıktan sonra açmaya izin verir
    handleKeyPress(key); // menü / yeniden başlama / yükseltme seçimi tuşları
});

window.addEventListener("keyup", (e) => {
    keys[e.key.toLowerCase()] = false;
});

// down: fare tuşu şu an basılı mı? (otomatik ateş için)
const mouse = { x: 0, y: 0, down: false };

function toCanvasPoint(clientX, clientY) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: (clientX - rect.left) * (canvas.width / rect.width),
        y: (clientY - rect.top) * (canvas.height / rect.height),
    };
}

canvas.addEventListener("mousemove", (e) => {
    const p = toCanvasPoint(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
});

canvas.addEventListener("mousedown", (e) => {
    touchMode = false;
    const p = toCanvasPoint(e.clientX, e.clientY);
    mouse.x = p.x;
    mouse.y = p.y;
    handlePress();
});

let touchMode = false;
let joystick = null;
const JOYSTICK_RADIUS = 56;
const JOYSTICK_DEADZONE = 0.15;
const TOUCH_AIM_RANGE = 560;
const DASH_BUTTON = { x: canvas.width - 84, y: canvas.height - 104, r: 38 };

canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    touchMode = true;
    initAudio();

    for (const touch of e.changedTouches) {
        const p = toCanvasPoint(touch.clientX, touch.clientY);
        if (state === "playing") {
            handlePlayTouch(touch.identifier, p);
        } else {
            if (state === "menu") tryFullscreen();
            mouse.x = p.x;
            mouse.y = p.y;
            handlePress();
            mouse.down = false;
        }
    }
}, { passive: false });

canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    for (const touch of e.changedTouches) {
        if (!joystick || touch.identifier !== joystick.id) continue;
        const p = toCanvasPoint(touch.clientX, touch.clientY);
        joystick.x = p.x;
        joystick.y = p.y;
        const dx = p.x - joystick.baseX;
        const dy = p.y - joystick.baseY;
        const distance = Math.hypot(dx, dy);
        if (distance > JOYSTICK_RADIUS) {
            joystick.baseX = p.x - (dx / distance) * JOYSTICK_RADIUS;
            joystick.baseY = p.y - (dy / distance) * JOYSTICK_RADIUS;
        }
    }
}, { passive: false });

function endTouch(e) {
    e.preventDefault();
    for (const touch of e.changedTouches) {
        if (joystick && touch.identifier === joystick.id) joystick = null;
    }
    if (e.touches.length === 0) {
        mouse.x = -1000;
        mouse.y = -1000;
    }
}

canvas.addEventListener("touchend", endTouch, { passive: false });
canvas.addEventListener("touchcancel", endTouch, { passive: false });

function handlePlayTouch(id, p) {
    if (isInRect(p.x, p.y, getTouchPauseRect())) {
        pauseGame();
        return;
    }
    if (player.dashLevel > 0 && Math.hypot(p.x - DASH_BUTTON.x, p.y - DASH_BUTTON.y) < DASH_BUTTON.r + 12) {
        player.tryDash();
        return;
    }
    if (!joystick && p.x < canvas.width * 0.6) {
        joystick = { id, baseX: p.x, baseY: p.y, x: p.x, y: p.y };
    }
}

function getTouchPauseRect() {
    return { x: canvas.width - 168 - 16 - 16 - 40, y: 16, w: 40, h: 40 };
}

function tryFullscreen() {
    const el = document.documentElement;
    if (!el || !el.requestFullscreen || document.fullscreenElement) return;
    el.requestFullscreen()
        .then(() => {
            if (screen.orientation && screen.orientation.lock) screen.orientation.lock("landscape").catch(() => {});
        })
        .catch(() => {});
}

function isPortrait() {
    return typeof window.innerHeight === "number" && window.innerHeight > window.innerWidth;
}

function getMoveInput() {
    const x = (keys["d"] ? 1 : 0) - (keys["a"] ? 1 : 0);
    const y = (keys["s"] ? 1 : 0) - (keys["w"] ? 1 : 0);
    const length = Math.hypot(x, y);
    if (length > 0) return { x: x / length, y: y / length };

    if (joystick) {
        const jx = (joystick.x - joystick.baseX) / JOYSTICK_RADIUS;
        const jy = (joystick.y - joystick.baseY) / JOYSTICK_RADIUS;
        const m = Math.hypot(jx, jy);
        if (m > JOYSTICK_DEADZONE) {
            const strength = Math.min(1, m);
            return { x: (jx / m) * strength, y: (jy / m) * strength };
        }
    }
    return { x: 0, y: 0 };
}

function findAimTarget(from) {
    let best = null;
    let bestDistance = TOUCH_AIM_RANGE;
    for (const enemy of enemies) {
        if (enemy.dead) continue;
        const distance = Math.hypot(enemy.x - from.x, enemy.y - from.y);
        if (distance < bestDistance) {
            best = enemy;
            bestDistance = distance;
        }
    }
    return best;
}

function handlePress() {
    initAudio();

    // Seviye atlama ekranındaysak tıklama kart seçmek içindir, ateş etmek için değil
    if (state === "levelup") {
        if (hasRerollButton() && isInRect(mouse.x, mouse.y, getRerollRect())) {
            rerollChoices();
        } else {
            const index = getCardIndexAt(mouse.x, mouse.y);
            if (index >= 0) chooseUpgrade(index);
        }
        return;
    }

    if (state === "workshop") {
        const index = getWorkshopCardAt(mouse.x, mouse.y);
        if (index >= 0) buyWorkshop(WORKSHOP[index]);
        else if (isInRect(mouse.x, mouse.y, getWorkshopBackRect())) state = "menu";
        return;
    }

    // Duraklatma menüsündeysek tıklama buton seçmek içindir
    if (state === "paused") {
        const index = getPauseButtonAt(mouse.x, mouse.y);
        if (index >= 0) PAUSE_BUTTONS[index].action();
        return;
    }

    // Menüde bayrağa tıklandıysa dili değiştir, oyunu başlatma
    if (state === "menu") {
        const flag = getFlagAt(mouse.x, mouse.y);
        if (flag >= 0) {
            setLanguage(FLAG_LANGS[flag]);
            return;
        }

        if (isInRect(mouse.x, mouse.y, getWorkshopButtonRect())) {
            state = "workshop";
            return;
        }

        const arrow = getDangerArrowAt(mouse.x, mouse.y);
        if (arrow !== 0) {
            setDanger(danger + arrow);
            return;
        }
        if (isInRect(mouse.x, mouse.y, getDangerPanelRect())) return;
    }

    if (state === "gameover") {
        const button = getGameOverButtonAt(mouse.x, mouse.y);
        if (button === 0) startGame();
        else if (button === 1) state = "menu";
        return;
    }

    mouse.down = true;
    if (state === "menu") startGame(); // menüdeyken tıklayınca oyun başlasın
}

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
        this.health = 100;
        this.maxHealth = 100;
        this.displayHealth = 100;  // can barındaki "hayalet" kısım: hasardan sonra yavaşça erir
        this.ghostDelay = 0;       // hayalet barın erimeye başlamadan önce beklediği süre

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
        this.powerTimers = { rapid: 0, triple: 0, freeze: 0 };

        // CAN YENİLENMESİ (Regeneration yükseltmesiyle açılır): saniyede kaç can dolar
        this.regenRate = 0;   // 0 = kapalı

        // KALKAN: süreli değil, bir sonraki hasarı engelleyip kırılır
        this.hasShield = false;

        // --- Yeni yükseltmeler (0 = alınmadı) ---
        this.bladeCount = 0;      // Orbiting Blades: etrafında dönen bıçak sayısı
        this.bladeAngle = 0;
        this.critChance = 0;      // Critical Hit: 2 kat hasar ihtimali (0.1 = %10)
        this.explosionLevel = 0;  // Explosive Rounds
        this.armor = 0;           // Armor: hasar azaltma (0.1 = %10)
        this.lifesteal = 0;       // Lifesteal: öldürme başına can
        this.frostLevel = 0;      // Frost Aura
        this.luck = 1;            // Lucky: güçlendirme düşme çarpanı

        this.railgun = false;
        this.iceBlades = false;
        this.detonation = false;

        // DASH (Space): atılma
        this.dashLevel = 0;
        this.dashCooldown = 0;    // bir sonraki atılmaya kalan süre
        this.dashTime = 0;        // şu an atılıyorsa kalan süre
        this.dashDirX = 0;
        this.dashDirY = 0;
        this.afterimages = [];    // atılırken arkada kalan silik görüntüler
    }

    // Space'e basınca atıl: hareket yönüne, hareket etmiyorsan nişan yönüne
    tryDash() {
        if (this.dashLevel === 0 || this.dashCooldown > 0 || this.dashTime > 0) return;

        const move = getMoveInput();
        let dx = move.x;
        let dy = move.y;
        if (dx === 0 && dy === 0) {
            dx = Math.cos(this.angle);
            dy = Math.sin(this.angle);
        }
        const length = Math.hypot(dx, dy);
        this.dashDirX = dx / length;
        this.dashDirY = dy / length;

        this.dashTime = DASH_DURATION;
        this.dashCooldown = DASH_COOLDOWNS[this.dashLevel];
        spawnParticles(this.x, this.y, "#9ff6ff", 10);
        playSound("dash");
    }

    update(dt) {
        const move = getMoveInput();
        const dx = move.x;
        const dy = move.y;

        this.dashCooldown = Math.max(0, this.dashCooldown - dt);

        if (this.dashTime > 0) {
            // Atılırken: çok hızlı, sabit yönde ve arkada silik görüntüler bırakarak
            this.dashTime -= dt;
            this.x += this.dashDirX * DASH_SPEED * dt;
            this.y += this.dashDirY * DASH_SPEED * dt;
            this.afterimages.push({ x: this.x, y: this.y, angle: this.angle, life: 0.25 });
        } else {
            this.x += dx * this.speed * dt;
            this.y += dy * this.speed * dt;
        }

        for (const a of this.afterimages) a.life -= dt;
        this.afterimages = this.afterimages.filter((a) => a.life > 0);

        // Orbiting Blades dönüşü (seviye arttıkça daha hızlı)
        this.bladeAngle += dt * (3 + this.bladeCount * 0.5);

        clampToWorld(this); // çitin içinde kal

        // Fare ekranda, oyuncu dünyada: farenin dünyadaki yerini bulmak için kamerayı ekle
        let hasTarget = true;
        if (touchMode) {
            const target = findAimTarget(this);
            hasTarget = target !== null;
            if (target) this.angle = Math.atan2(target.y - this.y, target.x - this.x);
            else if (dx !== 0 || dy !== 0) this.angle = Math.atan2(dy, dx);
        } else {
            this.angle = Math.atan2(mouse.y + camera.y - this.y, mouse.x + camera.x - this.x);
        }

        this.time += dt;
        this.invincibleTimer = Math.max(0, this.invincibleTimer - dt);

        // Can yenilenmesi: bar yavaş yavaş dolar
        if (this.regenRate > 0) {
            this.health = Math.min(this.maxHealth, this.health + this.regenRate * dt);
        }

        // Hayalet bar: hasardan sonra kısa bir süre bekler, sonra gerçek cana doğru erir
        if (this.displayHealth > this.health) {
            this.ghostDelay -= dt;
            if (this.ghostDelay <= 0) {
                this.displayHealth = Math.max(this.health, this.displayHealth - 60 * dt);
            }
        } else {
            this.displayHealth = this.health;
        }

        // Güçlendirme sürelerini azalt
        for (const key in this.powerTimers) {
            this.powerTimers[key] = Math.max(0, this.powerTimers[key] - dt);
        }

        // OTOMATİK ATEŞ: hızlı ateş aktifse bekleme süresi 2.5 kat kısalır
        const currentFireRate = this.powerTimers.rapid > 0 ? this.fireRate * 0.4 : this.fireRate;

        this.fireTimer -= dt;
        const wantsFire = touchMode ? hasTarget : mouse.down || autofire;
        if (wantsFire && this.fireTimer <= 0) {
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
            // Critical Hit: her mermi şansına göre 2 kat hasarlı olabilir
            const crit = Math.random() < this.critChance;
            const base = getPlayerDamage();
            const damage = crit ? base * 2 : base;
            const bullet = new Bullet(bx, by, angle, this.bulletSpeed, damage, this.pierce);
            bullet.crit = crit;
            bullet.rail = this.railgun;
            bullets.push(bullet);
        }

        playSound("shoot");
    }

    draw() {
        // Atılma sırasında arkada kalan silik beyaz görüntüler
        if (isReady(sprites.player)) {
            const w = sprites.player.naturalWidth * SPRITE_SCALE;
            const h = sprites.player.naturalHeight * SPRITE_SCALE;
            for (const a of this.afterimages) {
                ctx.globalAlpha = a.life * 1.6;
                ctx.save();
                ctx.translate(a.x, a.y);
                ctx.rotate(a.angle);
                ctx.drawImage(getFlashSprite(sprites.player), -w / 2, -h / 2, w, h);
                ctx.restore();
            }
            ctx.globalAlpha = 1;
        }

        // Dokunulmazken yanıp sönsün
        if (this.invincibleTimer > 0 && Math.floor(this.time * 15) % 2 === 0) {
            ctx.globalAlpha = 0.35;
        }

        drawShadow(this.x, this.y + this.radius * 0.8, this.radius * 0.85, this.radius * 0.32);

        // Canı tam değilse ayaklarının altında küçük bir can barı
        if (this.health < this.maxHealth) {
            const bw = 36;
            const bx = this.x - bw / 2;
            const by = this.y + this.radius + 8;
            ctx.fillStyle = "#0f1d2c";
            ctx.fillRect(bx - 1, by - 1, bw + 2, 6);
            ctx.fillStyle = "#3b1d1d";
            ctx.fillRect(bx, by, bw, 4);
            ctx.fillStyle = "#e53935";
            ctx.fillRect(bx, by, bw * Math.max(0, this.health / this.maxHealth), 4);
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

        if (!isInsideWalls(this.x, this.y)) {
            // Çite çarptı: küçük tahta kıymıkları çıkarıp yok olsun
            this.dead = true;
            spawnParticles(this.x, this.y, "#c4935a", 3); // tahta kıymıkları
        } else if (!isNearView(this.x, this.y, 100)) {
            // Ekrandan çok uzaklaştı
            this.dead = true;
        }
    }

    draw() {
        if (isReady(sprites.bullet)) {
            const sprite = this.rail && isReady(sprites.bullet_rail) ? sprites.bullet_rail : sprites.bullet;
            drawSprite(sprite, this.x, this.y, this.angle);
        } else {
            drawCircle(this.x, this.y, this.radius, "#ffd54f");
        }
    }
}


// =====================================================
//  DÜŞMAN MERMİSİ (boss atıyor)
// =====================================================
class EnemyBullet {
    constructor(x, y, angle, speed, damage = ENEMY_BULLET_DAMAGE) {
        this.x = x;
        this.y = y;
        this.damage = damage;
        this.radius = 6;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.dead = false;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        if (!isInsideWalls(this.x, this.y)) {
            this.dead = true;
            spawnParticles(this.x, this.y, "#ff80ab", 3);
        } else if (!isNearView(this.x, this.y, 300)) {
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
// hopSpeed / hopHeight: yürürken ne kadar hızlı ve ne kadar yükseğe zıplasın
// damage: oyuncuya çarpınca kaç can götürür (oyuncunun canı 100)
const ENEMY_TYPES = {
    normal: { radius: 14, speed: 100, health: 1, color: "#ef5350", score: 10, dropChance: 0.08, xp: 1, hopSpeed: 8,  hopHeight: 4, damage: 20 },
    fast:   { radius: 10, speed: 170, health: 1, color: "#ffb74d", score: 15, dropChance: 0.10, xp: 2, hopSpeed: 13, hopHeight: 3, damage: 15 }, // küçük ve hızlı
    tank:   { radius: 22, speed: 60,  health: 4, color: "#ab47bc", score: 30, dropChance: 0.40, xp: 5, hopSpeed: 5,  hopHeight: 3, damage: 30 }, // büyük, yavaş, dayanıklı

    // --- Geç oyun düşmanları ---
    // behavior: "ranged" = uzakta durup ateş eder, "charge" = hedef alıp hücum eder (yoksa düz kovalar)
    spitter: { radius: 14, speed: 90, health: 2, color: "#fbc02d", score: 25, dropChance: 0.12, xp: 3, hopSpeed: 6, hopHeight: 3, damage: 15, behavior: "ranged" },
    charger: { radius: 16, speed: 85, health: 5, color: "#b71c1c", score: 35, dropChance: 0.15, xp: 4, hopSpeed: 7, hopHeight: 3, damage: 35, behavior: "charge" },

    splitter:  { radius: 14, speed: 80,  health: 2,   color: "#f06292", score: 20, dropChance: 0.08, xp: 2, hopSpeed: 6,  hopHeight: 4, damage: 15, splitInto: 2 },
    splitling: { radius: 8,  speed: 135, health: 0.6, color: "#f8bbd0", score: 5,  dropChance: 0.02, xp: 1, hopSpeed: 14, hopHeight: 2, damage: 8 },
};

const SPLITTER_START = 90;
const SPLITTER_WEIGHT_START = 5;
const SPLITTER_WEIGHT_MAX = 10;

const ICE_BLADE_SLOW = 0.6;
const ICE_BLADE_TIME = 1.5;
const DETONATION_RADIUS = 48;
const DETONATION_POWER = 0.5;
const EVOLUTION_COLOR = "#d1a3ff";

// Yeni düşmanların ayarları
const SPITTER_START = 300;        // 5:00'ten sonra gelmeye başlar
const SPITTER_RANGE = 260;        // oyuncuya bu mesafede durmaya çalışır
const SPITTER_FIRE_RATE = 2.4;    // kaç saniyede bir tükürür
const SPITTER_BULLET_SPEED = 230;
const SPITTER_DAMAGE = 15;

const CHARGER_START = 420;        // 7:00'den sonra gelmeye başlar
const CHARGER_TRIGGER = 260;      // bu kadar yaklaşınca hücuma hazırlanır
const CHARGER_WINDUP = 0.65;      // hücumdan önce titreyip hedef gösterme süresi
const CHARGER_SPEED = 560;        // hücum hızı
const CHARGER_TIME = 0.55;        // hücum süresi
const CHARGER_REST = 0.9;         // hücumdan sonra dinlenme

const ELITE_START = 480;          // 8:00'den sonra elite düşmanlar gelebilir
const ELITE_CHANCE_START = 0.05;  // başta %5
const ELITE_CHANCE_PER_MIN = 0.01; // her dakika +%1
const ELITE_CHANCE_MAX = 0.25;

// Düşman hasarı her dakika %5 artar (çarpma, mermi, tükürük, boss)
const DAMAGE_RAMP_PER_MIN = 0.05;

function getDamageScale() {
    return (1 + DAMAGE_RAMP_PER_MIN * (gameTime / 60)) * getDangerDamage();
}

function getEliteChance() {
    const start = getEliteStart();
    if (gameTime < start) return 0;
    const chance = ELITE_CHANCE_START + DANGER_ELITE_CHANCE * danger + ELITE_CHANCE_PER_MIN * (gameTime - start) / 60;
    return Math.min(ELITE_CHANCE_MAX, chance);
}

// Düşmanı elite yap: daha büyük, 3 kat can, 1.5 kat hasar, 3 kat ödül
function makeElite(enemy) {
    enemy.elite = true;
    enemy.health *= 3;
    enemy.maxHealth = enemy.health;
    enemy.damage = Math.round(enemy.damage * 1.5);
    enemy.xp *= 3;
    enemy.score *= 3;
    enemy.dropChance *= 2;
    enemy.radius *= 1.3;
    enemy.scale = 1.3;
    if (enemy.splitInto) enemy.splitInto += 1;
}

function getChill(enemy, dt) {
    enemy.chillTimer = Math.max(0, (enemy.chillTimer || 0) - dt);
    return enemy.chillTimer > 0 ? ICE_BLADE_SLOW : 0;
}

const BOSS_CONTACT_DAMAGE = 30;  // boss'a çarpınca
const ENEMY_BULLET_DAMAGE = 20;  // boss mermisi değince

class Enemy {
    constructor(x, y, typeName) {
        const type = ENEMY_TYPES[typeName];

        // Oyun ilerledikçe düşmanlar güçlensin ama daha çok XP de versin
        const scale = getEnemyScale();

        this.x = x;
        this.y = y;
        this.radius = type.radius;
        this.speed = type.speed;
        this.health = Math.max(1, Math.round(type.health * scale * getDangerHealth()));
        this.maxHealth = this.health;
        this.color = type.color;
        this.score = type.score;
        this.dropChance = type.dropChance;
        this.xp = Math.max(1, Math.round(type.xp * getXpScale()));
        this.damage = type.damage;
        this.sprite = sprites["enemy_" + typeName]; // örn. sprites.enemy_tank
        this.behavior = type.behavior || "chase";
        this.splitInto = type.splitInto || 0;
        this.chillTimer = 0;
        this.elite = false;
        this.scale = 1;
        this.isBoss = false;

        // Spitter: tükürme zamanlayıcısı ve hangi yöne yan yan kayacağı
        this.shootTimer = 1 + Math.random() * SPITTER_FIRE_RATE;
        this.strafeDir = Math.random() < 0.5 ? -1 : 1;

        // Charger: "chase" → "windup" → "charging" → "rest" → "chase"
        this.chargeState = "chase";
        this.chargeTimer = 0;
        this.chargeDirX = 0;
        this.chargeDirY = 0;
        this.dead = false;

        this.hitTimer = 0; // vurulunca kısa süre beyaz yanıp sönsün

        // Zıplama animasyonu (her düşman farklı anda zıplasın)
        this.hopSpeed = type.hopSpeed;
        this.hopHeight = type.hopHeight;
        this.time = Math.random() * 10;
    }

    update(dt) {
        if (player.powerTimers.freeze > 0) {
            this.frozen = true;
            this.hitTimer -= dt;
            this.bladeHitTimer = Math.max(0, (this.bladeHitTimer || 0) - dt);
            clampToWorld(this);
            return;
        }

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        // Frost Aura içindeyse yavaşlar
        const slow = Math.max(getFrostSlow(this, distance), getChill(this, dt));
        this.frozen = slow > 0;
        const speed = this.speed * (1 - slow);

        if (this.behavior === "ranged") this.updateSpitter(dt, dx, dy, distance, speed);
        else if (this.behavior === "charge") this.updateCharger(dt, dx, dy, distance, speed, slow);
        else this.moveToward(dx, dy, distance, speed, dt);

        this.hitTimer -= dt;
        this.bladeHitTimer = Math.max(0, (this.bladeHitTimer || 0) - dt);
        this.time += dt * (1 - slow);
        clampToWorld(this);
    }

    // Oyuncuya doğru (speed eksiyse ondan uzağa) yürü
    moveToward(dx, dy, distance, speed, dt) {
        if (distance > 0) {
            this.x += (dx / distance) * speed * dt;
            this.y += (dy / distance) * speed * dt;
        }
    }

    // SPITTER: belli bir mesafede durur, yan yan kayar ve uzaktan tükürür
    updateSpitter(dt, dx, dy, distance, speed) {
        if (distance > SPITTER_RANGE + 40) {
            this.moveToward(dx, dy, distance, speed, dt);          // yaklaş
        } else if (distance < SPITTER_RANGE - 60) {
            this.moveToward(dx, dy, distance, -speed, dt);         // çok yakın: geri çekil
        } else if (distance > 0) {
            this.x += (-dy / distance) * speed * 0.4 * this.strafeDir * dt; // yan yan kay
            this.y += (dx / distance) * speed * 0.4 * this.strafeDir * dt;
        }

        this.shootTimer -= dt;
        if (this.shootTimer <= 0 && distance < SPITTER_RANGE + 160) {
            this.shootTimer = SPITTER_FIRE_RATE * (0.85 + Math.random() * 0.3);
            const angle = Math.atan2(dy, dx);
            const damage = SPITTER_DAMAGE * (this.elite ? 1.5 : 1);
            enemyBullets.push(new EnemyBullet(this.x, this.y, angle, SPITTER_BULLET_SPEED, damage));
            if (this.elite) {
                // Elite spitter iki yana da tükürür
                enemyBullets.push(new EnemyBullet(this.x, this.y, angle - 0.25, SPITTER_BULLET_SPEED, damage));
                enemyBullets.push(new EnemyBullet(this.x, this.y, angle + 0.25, SPITTER_BULLET_SPEED, damage));
            }
            playSound("spit");
        }
    }

    // CHARGER: yaklaşınca durur, titreyip hedef gösterir, sonra o yöne çok hızlı hücum eder
    updateCharger(dt, dx, dy, distance, speed, slow) {
        if (this.chargeState === "windup") {
            this.chargeTimer -= dt;
            if (this.chargeTimer <= 0) {
                this.chargeState = "charging";
                this.chargeTimer = CHARGER_TIME;
                playSound("charge");
            }
        } else if (this.chargeState === "charging") {
            this.x += this.chargeDirX * CHARGER_SPEED * (1 - slow) * dt;
            this.y += this.chargeDirY * CHARGER_SPEED * (1 - slow) * dt;
            if (Math.random() < 0.5) spawnParticles(this.x, this.y + this.radius * 0.8, "#a1887f", 1); // toz
            this.chargeTimer -= dt;
            if (this.chargeTimer <= 0) {
                this.chargeState = "rest";
                this.chargeTimer = CHARGER_REST;
            }
        } else if (this.chargeState === "rest") {
            this.chargeTimer -= dt;
            if (this.chargeTimer <= 0) this.chargeState = "chase";
        } else {
            this.moveToward(dx, dy, distance, speed, dt);
            if (distance < CHARGER_TRIGGER && distance > 0) {
                this.chargeState = "windup";
                this.chargeTimer = CHARGER_WINDUP;
                this.chargeDirX = dx / distance;  // hücum yönü şimdiden kilitlenir
                this.chargeDirY = dy / distance;
            }
        }
    }

    // Hasar al. Öldüyse true döndürür.
    takeHit(damage, crit = false) {
        this.health -= damage;
        this.hitTimer = 0.08;
        spawnDamageNumber(this, damage, crit);
        return this.health <= 0;
    }

    draw() {
        // Charger hücuma hazırlanırken gideceği yolu kırmızı çizgiyle gösterir
        if (this.chargeState === "windup") {
            const length = CHARGER_SPEED * CHARGER_TIME;
            const pulse = 0.25 + Math.abs(Math.sin(this.chargeTimer * 18)) * 0.35;
            ctx.strokeStyle = `rgba(255, 60, 60, ${pulse})`;
            ctx.lineWidth = this.radius * 1.4;
            ctx.lineCap = "round";
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + this.chargeDirX * length, this.y + this.chargeDirY * length);
            ctx.stroke();
            ctx.lineCap = "butt";
        }

        const hop = drawEnemyBody(this);

        // Birden fazla canı olan düşmanların üstünde can barı
        if (this.maxHealth > 1) {
            const barWidth = this.radius * 2;
            const barX = this.x - this.radius;
            const barY = this.y - hop - this.radius - 10;

            ctx.fillStyle = "#333";
            ctx.fillRect(barX, barY, barWidth, 4);
            ctx.fillStyle = "#66bb6a";
            ctx.fillRect(barX, barY, barWidth * Math.max(0, this.health / this.maxHealth), 4);
        }
    }
}


// Düşmanın o anki zıplama yüksekliği (piksel)
function getHop(enemy) {
    return Math.round(Math.abs(Math.sin(enemy.time * enemy.hopSpeed)) * enemy.hopHeight);
}

// Gölge yerde kalır; düşman havadayken biraz küçülür
function drawEnemyShadow(enemy) {
    const shrink = 1 - getHop(enemy) * 0.03;
    drawShadow(enemy.x, enemy.y + enemy.radius * 0.85, enemy.radius * 0.9 * shrink, enemy.radius * 0.35 * shrink);
}

// Düşman ve boss için ortak çizim: konturlu sprite zıplar
function drawEnemyBody(enemy) {
    const hop = getHop(enemy);

    // Elite: altında yanıp sönen altın ışıltı
    if (enemy.elite) {
        ctx.globalCompositeOperation = "lighter";
        ctx.fillStyle = `rgba(255, 200, 60, ${0.18 + Math.sin(enemy.time * 6) * 0.08})`;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y - hop, enemy.radius * 1.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = "source-over";
    }

    // Charger hücuma hazırlanırken titrer
    const shake = enemy.chargeState === "windup" ? (Math.random() - 0.5) * 4 : 0;

    if (isReady(enemy.sprite)) {
        const outlined = getOutlinedSprite(enemy.sprite, enemy.elite ? "#ffd54f" : "#0b0b0f");
        // Vurulduysa beyaz kopyasını, yavaşlamışsa buzlu kopyasını, değilse normal halini çiz
        let img = outlined;
        if (enemy.hitTimer > 0) img = getFlashSprite(outlined);
        else if (enemy.frozen) img = getFrozenSprite(outlined);
        drawSprite(img, Math.round(enemy.x + shake), Math.round(enemy.y) - hop, 0, enemy.scale || 1);
    } else {
        drawCircle(enemy.x, enemy.y - hop, enemy.radius, enemy.hitTimer > 0 ? "#ffffff" : enemy.color);
    }

    return hop;
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
        // Can hem boss sırasıyla hem oyun süresiyle artar (geç oyunda saniyeler içinde erimesin)
        this.maxHealth = Math.round((60 + (number - 1) * 50) * Math.pow(getEnemyScale(), 0.75) * getDangerHealth());
        this.health = this.maxHealth;
        this.color = "#c62828";
        this.score = 500 * number;
        this.dropChance = 1;               // güçlendirme düşürmesi garanti
        this.xp = 25 + number * 10;
        this.sprite = sprites.boss;
        this.isBoss = true;
        this.damage = BOSS_CONTACT_DAMAGE;
        this.dead = false;

        this.hitTimer = 0;
        this.hopSpeed = 3;      // boss ağır ağır zıplar
        this.hopHeight = 4;
        this.time = 0;
        this.attackTimer = 2;   // ilk saldırıdan önce 2 saniye bekle
        this.attackCount = 0;   // saldırı tipleri sırayla değişsin diye

        // Sarmal saldırı (3. boss'tan itibaren)
        this.spiralTime = 0;
        this.spiralAngle = 0;
        this.spiralEmit = 0;

        // Hangi saldırıları biliyor: sonraki boss'lar daha fazlasını
        this.patterns = ["ring", "aimed"];
        if (number >= 3) this.patterns.push("spiral");
        if (number >= 5) this.patterns.push("summon");
    }

    update(dt) {
        // Yavaşça oyuncuya doğru gel
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        // Frost Aura boss'u yarı etkiyle yavaşlatır
        const freeze = player.powerTimers.freeze > 0 ? 1 : 0;
        const slow = Math.max(getFrostSlow(this, distance), getChill(this, dt), freeze) * 0.5;
        this.frozen = slow > 0;

        if (distance > 0) {
            this.x += (dx / distance) * this.speed * (1 - slow) * dt;
            this.y += (dy / distance) * this.speed * (1 - slow) * dt;
        }

        this.hitTimer -= dt;
        this.bladeHitTimer = Math.max(0, (this.bladeHitTimer || 0) - dt);
        this.time += dt;
        clampToWorld(this);

        // Sarmal saldırı sürüyorsa dönerek mermi saç
        if (this.spiralTime > 0) {
            this.spiralTime -= dt;
            this.spiralEmit -= dt;
            while (this.spiralEmit <= 0) {
                this.spiralEmit += 0.07;
                for (let k = 0; k < 3; k++) {
                    const angle = this.spiralAngle + (Math.PI * 2 * k) / 3;
                    enemyBullets.push(new EnemyBullet(this.x, this.y, angle, 180));
                }
                this.spiralAngle += 0.32;
            }
        }

        this.attackTimer -= dt;
        if (this.attackTimer <= 0) {
            this.attack();
        }
    }

    attack() {
        const toPlayer = Math.atan2(player.y - this.y, player.x - this.x);
        const pattern = this.patterns[this.attackCount % this.patterns.length];
        let wait = Math.max(1.1, 1.8 - this.number * 0.12); // sonraki boss'lar daha sık saldırır

        if (pattern === "spiral") {
            // SALDIRI 3: Dönen üç kollu mermi sarmalı
            this.spiralTime = 1.8;
            this.spiralEmit = 0;
            this.spiralAngle = Math.random() * Math.PI * 2;
            wait = 2.4;
        } else if (pattern === "summon") {
            // SALDIRI 4: Etrafına minyon çağırır
            const count = 3 + Math.floor(this.number / 3);
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 * i) / count;
                const minion = new Enemy(this.x + Math.cos(angle) * 70, this.y + Math.sin(angle) * 70, Math.random() < 0.5 ? "normal" : "fast");
                if (Math.random() < getEliteChance()) makeElite(minion);
                clampToWorld(minion);
                enemies.push(minion);
                spawnParticles(minion.x, minion.y, "#ce93d8", 10);
            }
            playSound("summon");
        } else if (pattern === "ring") {
            // SALDIRI 1: Her yöne mermi halkası
            const count = 12 + this.number * 2;
            const offset = Math.random() * Math.PI; // her halka biraz farklı açıda
            for (let i = 0; i < count; i++) {
                const angle = offset + (Math.PI * 2 * i) / count;
                enemyBullets.push(new EnemyBullet(this.x, this.y, angle, 170));
            }
        } else if (pattern === "aimed") {
            // SALDIRI 2: Oyuncuya nişanlı yelpaze atış
            const count = 3 + this.number;
            const spread = 0.18;
            const startAngle = toPlayer - (spread * (count - 1)) / 2;
            for (let i = 0; i < count; i++) {
                enemyBullets.push(new EnemyBullet(this.x, this.y, startAngle + spread * i, 260));
            }
        }

        this.attackCount++;
        this.attackTimer = wait;
        if (pattern !== "summon") playSound("bossShoot");
    }

    takeHit(damage, crit = false) {
        this.health -= damage;
        this.hitTimer = 0.06;
        spawnDamageNumber(this, damage, crit);
        return this.health <= 0;
    }

    draw() {
        drawEnemyBody(this);
        // Boss'un can barı ekranın üstünde, drawHUD içinde çiziliyor
    }
}


// =====================================================
//  XP KRİSTALLERİ
// =====================================================
// Kristalin etrafındaki yumuşak ışık: bir kez çizilip saklanır, her karede sadece kopyalanır
const glowCache = {};

function getGlow(radius) {
    if (!glowCache[radius]) {
        const c = document.createElement("canvas");
        c.width = radius * 2;
        c.height = radius * 2;
        const g = c.getContext("2d");
        const gradient = g.createRadialGradient(radius, radius, 0, radius, radius, radius);
        gradient.addColorStop(0, "rgba(150, 245, 255, 0.85)");
        gradient.addColorStop(0.35, "rgba(77, 208, 225, 0.35)");
        gradient.addColorStop(1, "rgba(77, 208, 225, 0)");
        g.fillStyle = gradient;
        g.fillRect(0, 0, c.width, c.height);
        glowCache[radius] = c;
    }
    return glowCache[radius];
}

class XpGem {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.big = value >= 5;              // değerli kristaller daha büyük
        this.radius = this.big ? 8 : 6;
        this.time = Math.random() * 10;     // hepsi aynı anda yanıp sönmesin
        this.dead = false;

        // Doğunca hafifçe etrafa saçılsın
        const angle = Math.random() * Math.PI * 2;
        const speed = 40 + Math.random() * 80;
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
    }

    update(dt) {
        this.time += dt;

        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const distance = Math.hypot(dx, dy);

        if (this.magnetized && distance > 0) {
            const pull = Math.max(MAGNET_PULL, 500 * (1 - distance / player.magnetRange) + 150);
            this.vx = (dx / distance) * pull;
            this.vy = (dy / distance) * pull;
        } else if (distance < player.magnetRange) {
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
        clampToWorld(this);
    }

    draw() {
        const bob = Math.round(Math.sin(this.time * 3) * 2);   // hafifçe süzülsün
        const pulse = 0.7 + Math.sin(this.time * 4) * 0.3;     // ışık nefes alır gibi

        // 1) Yumuşak ışık ("lighter" = renkleri toplayarak parlatır)
        const glow = getGlow(this.big ? 30 : 20);
        ctx.globalCompositeOperation = "lighter";
        ctx.globalAlpha = pulse * (this.big ? 0.9 : 0.65);
        ctx.drawImage(glow, this.x - glow.width / 2, this.y + bob - glow.height / 2);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = "source-over";

        // 2) Kristalin kendisi
        const sprite = this.big ? sprites.xp_gem_big : sprites.xp_gem;
        if (isReady(sprite)) {
            drawSprite(sprite, Math.round(this.x), Math.round(this.y) + bob);
        } else {
            drawCircle(this.x, this.y + bob, this.radius, "#4dd0e1");
        }

        // 3) Ara sıra sağ üstünde parlayan küçük bir yıldız
        const sparkle = (this.time * 0.7) % 1;
        if (sparkle < 0.12) {
            const sx = Math.round(this.x) + (this.big ? 8 : 6);
            const sy = Math.round(this.y) + bob - (this.big ? 10 : 8);
            const arm = sparkle < 0.08 ? 4 : 2; // önce büyür, sonra küçülür
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(sx - 1, sy - arm, 2, arm * 2);
            ctx.fillRect(sx - arm, sy - 1, arm * 2, 2);
        }
    }
}

class GoldCoin extends XpGem {
    constructor(x, y, value) {
        super(x, y, value);
        this.radius = 7;
    }

    draw() {
        const bob = Math.round(Math.sin(this.time * 3) * 2);
        drawShadow(this.x, this.y + 7, 7, 2.5);

        if (isReady(sprites.gold)) {
            drawSprite(sprites.gold, Math.round(this.x), Math.round(this.y) + bob);
        } else {
            drawCircle(this.x, this.y + bob, this.radius, UI.gold);
        }

        if ((this.time * 0.5) % 1 < 0.1) {
            const sx = Math.round(this.x) - 6;
            const sy = Math.round(this.y) + bob - 5;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(sx - 1, sy - 3, 2, 6);
            ctx.fillRect(sx - 3, sy - 1, 6, 2);
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
// --- Yeni yükseltmelerin ayarları ---
const BLADE_RADIUS = 64;          // bıçakların oyuncuya uzaklığı
const BLADE_HIT_COOLDOWN = 0.35;  // bir bıçak aynı düşmana en sık bu aralıkla vurur
const DASH_SPEED = 1100;          // atılma hızı
const DASH_DURATION = 0.15;       // atılma süresi (≈165 piksel)
const DASH_COOLDOWNS = [0, 3, 2.2, 1.5];          // seviyeye göre bekleme süresi
const FROST_RADIUS = [0, 95, 120, 145];           // seviyeye göre aura yarıçapı
const FROST_SLOW = [0, 0.25, 0.35, 0.45];         // seviyeye göre yavaşlatma
const EXPLOSION_RADIUS = [0, 55, 70, 85];         // seviyeye göre patlama yarıçapı
const EXPLOSION_POWER = [0, 0.6, 0.8, 1.0];       // patlama hasarı = mermi hasarı × bu

// Düşman Frost Aura'nın içinde mi? İçindeyse ne kadar yavaşlıyor (0 = hiç)
function getFrostSlow(enemy, distance) {
    const lvl = player.frostLevel;
    if (lvl === 0) return 0;
    return distance < FROST_RADIUS[lvl] + enemy.radius ? FROST_SLOW[lvl] : 0;
}

// Not: ekranda görünen isim ve açıklamalar UPGRADE_TEXT'ten (iki dilde) geliyor; buradakiler kodu okumayı kolaylaştırmak için.
// Yeni bir yükseltme eklemek için listeye bir satır ekle (ve UPGRADE_TEXT'e iki dilde metnini yaz):
// max: en fazla kaç kez alınabilir, apply: oyuncuya ne yapar
const UPGRADES = [
    { id: "damage",      name: "Power Shot",      desc: "+1 bullet damage",               max: 5, apply: (p) => { p.damage += 1; } },
    { id: "firerate",    name: "Quick Trigger",   desc: "Shoot 15% faster",               max: 5, apply: (p) => { p.fireRate *= 0.85; } },
    { id: "multishot",   name: "Multishot",       desc: "+1 bullet per shot",             max: 3, apply: (p) => { p.extraShots += 1; } },
    { id: "pierce",      name: "Piercing Rounds", desc: "Bullets pass through +1 enemy",  max: 3, apply: (p) => { p.pierce += 1; } },
    { id: "speed",       name: "Swift Boots",     desc: "Move 10% faster",                max: 5, apply: (p) => { p.speed *= 1.1; } },
    { id: "bulletspeed", name: "Velocity",        desc: "Bullets fly 20% faster",         max: 3, apply: (p) => { p.bulletSpeed *= 1.2; } },
    { id: "vitality",    name: "Vitality",        desc: "+20 max health and heal 20",     max: 5, apply: (p) => { p.maxHealth += 20; p.health = Math.min(p.maxHealth, p.health + 20); } },
    { id: "magnet",      name: "Magnet",          desc: "Collect XP from farther away",   max: 3, apply: (p) => { p.magnetRange *= 1.5; } },
    { id: "regen",       name: "Regeneration",    desc: "Regenerate health over time",    max: 3, apply: (p) => { p.regenRate += p.regenRate === 0 ? 0.8 : 0.6; } }, // saniyede 0.8 → 1.4 → 2 can
    { id: "blades",      name: "Orbiting Blades", desc: "+1 spinning blade circles around you",       max: 3, apply: (p) => { p.bladeCount += 1; } },
    { id: "crit",        name: "Critical Hit",    desc: "+10% chance to deal double damage",          max: 3, apply: (p) => { p.critChance += 0.1; } },
    { id: "explosive",   name: "Explosive Rounds", desc: "Enemies explode on death and hurt others",  max: 3, apply: (p) => { p.explosionLevel += 1; } },
    { id: "armor",       name: "Armor",           desc: "Take 10% less damage",                       max: 3, apply: (p) => { p.armor += 0.1; } },
    { id: "dash",        name: "Dash",            desc: "SPACE to dash, invincible while dashing",    max: 3, apply: (p) => { p.dashLevel += 1; } },
    { id: "lifesteal",   name: "Lifesteal",       desc: "Heal +0.5 health for every kill",            max: 3, apply: (p) => { p.lifesteal += 0.5; } },
    { id: "frost",       name: "Frost Aura",      desc: "Slow down enemies near you",                 max: 3, apply: (p) => { p.frostLevel += 1; } },
    { id: "lucky",       name: "Lucky",           desc: "Power-ups drop more often",                  max: 3, apply: (p) => { p.luck += 0.4; } },

    { id: "railgun",     name: "Railgun",         desc: "Bullets pierce every enemy, +25% damage",    max: 1, evolution: true, requires: ["multishot", "pierce"],  apply: (p) => { p.railgun = true; p.pierce += 99; p.damage *= 1.25; } },
    { id: "frostblades", name: "Frost Blades",    desc: "+1 blade, blades freeze what they cut",      max: 1, evolution: true, requires: ["blades", "frost"],      apply: (p) => { p.iceBlades = true; p.bladeCount += 1; } },
    { id: "detonation",  name: "Detonation",      desc: "+10% crit chance, critical hits explode",    max: 1, evolution: true, requires: ["explosive", "crit"],    apply: (p) => { p.detonation = true; p.critChance += 0.1; } },
];

function getUpgrade(id) {
    return UPGRADES.find((u) => u.id === id);
}

function isUnlocked(upgrade) {
    if (!upgrade.requires) return true;
    return upgrade.requires.every((id) => (upgradeLevels[id] || 0) >= getUpgrade(id).max);
}

// Bir sonraki seviye için gereken XP: her seviyede biraz daha fazla
// İlk seviyeler hızlı gelir, ilerledikçe gereken XP daha hızlı büyür
function xpNeededFor(lvl) {
    const n = lvl - 1;
    return 5 + n * 8 + Math.floor(n * n * 0.25);
}

function addXp(amount) {
    xp += amount * getXpMultiplier();
    while (xp >= xpToNext) {
        xp -= xpToNext;
        level++;
        xpToNext = xpNeededFor(level);
        pendingLevelUps++; // aynı anda birden fazla seviye atlanabilir
    }
}

// Saldırı gücünü artıran yükseltmeler (her seviyede en az biri teklif edilir)
const OFFENSE_UPGRADES = ["damage", "firerate", "multishot", "pierce", "crit", "blades", "explosive", "railgun", "frostblades", "detonation"];

// Rastgele 3 yükseltme seç (sonuna kadar alınmış olanlar hariç)
function rollUpgradeChoices() {
    const available = UPGRADES.filter((u) => (upgradeLevels[u.id] || 0) < u.max && isUnlocked(u));

    // Listeyi karıştır (Fisher-Yates)
    for (let i = available.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [available[i], available[j]] = [available[j], available[i]];
    }

    const choices = available.slice(0, 3 + workshopLevel("wide"));

    const evolution = available.find((u) => u.evolution);
    if (evolution && !choices.includes(evolution)) {
        choices[Math.floor(Math.random() * choices.length)] = evolution;
    }

    // En az bir kart mutlaka saldırı yükseltmesi olsun, yoksa hasar geride kalır
    const hasOffense = choices.some((u) => OFFENSE_UPGRADES.includes(u.id));
    if (!hasOffense) {
        const offense = available.filter((u) => OFFENSE_UPGRADES.includes(u.id));
        if (offense.length > 0) {
            choices[Math.floor(Math.random() * choices.length)] = offense[Math.floor(Math.random() * offense.length)];
        }
    }

    return choices;
}

function openLevelUp() {
    upgradeChoices = rollUpgradeChoices();

    // Her şey sonuna kadar alındıysa ödül olarak can ve puan ver
    if (upgradeChoices.length === 0) {
        pendingLevelUps--;
        player.health = Math.min(player.maxHealth, player.health + 20);
        score += 100;
        return;
    }

    state = "levelup";
    mouse.down = false;
    playSound("levelup");
}

function rerollChoices() {
    if (rerolls <= 0) return;
    rerolls--;
    upgradeChoices = rollUpgradeChoices();
    playSound("dash");
}

function hasRerollButton() {
    return workshopLevel("reroll") > 0;
}

function getRerollRect() {
    const w = 210;
    return { x: (canvas.width - w) / 2, y: 446, w, h: 34 };
}

function chooseUpgrade(index) {
    const upgrade = upgradeChoices[index];
    if (!upgrade) return;

    upgrade.apply(player);
    upgradeLevels[upgrade.id] = (upgradeLevels[upgrade.id] || 0) + 1;
    pendingLevelUps--;

    texts.push(new FloatingText(player.x, player.y - 30, upper(upgradeName(upgrade)), "#4dd0e1"));
    spawnParticles(player.x, player.y, "#4dd0e1", 20);
    playSound("powerup");

    state = "playing";
    mouse.down = false;

    // Hâlâ bekleyen seviye varsa hemen bir sonraki seçimi aç
    if (pendingLevelUps > 0) openLevelUp();
}

// Seviye atlama kartlarının ekrandaki konumu
const CARD_WIDTH = 232;
const CARD_HEIGHT = 214;
const CARD_GAP = 28;
const CARD_WIDTH_WIDE = 206;
const CARD_GAP_WIDE = 18;

function getCardRect(index, count) {
    const width = count > 3 ? CARD_WIDTH_WIDE : CARD_WIDTH;
    const gap = count > 3 ? CARD_GAP_WIDE : CARD_GAP;
    const totalWidth = count * width + (count - 1) * gap;
    const startX = (canvas.width - totalWidth) / 2;
    return {
        x: startX + index * (width + gap),
        y: canvas.height / 2 - CARD_HEIGHT / 2 + 40,
        w: width,
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
        ctx.font = font(16, true);
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.lineWidth = 4;
        ctx.strokeStyle = UI.shadow;   // okunması için koyu kontur
        const text = breakLigatures(this.text);
        ctx.strokeText(text, this.x, this.y);
        ctx.fillStyle = this.color;
        ctx.fillText(text, this.x, this.y);
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
    }
}


const DAMAGE_NUMBER_LIMIT = 80;

class DamageNumber {
    constructor(x, y, value, crit) {
        this.x = x + (Math.random() - 0.5) * 16;
        this.y = y;
        this.text = String(Math.max(1, Math.round(value))) + (crit ? "!" : "");
        this.crit = crit;
        this.life = crit ? 0.8 : 0.6;
        this.maxLife = this.life;
        this.vy = crit ? -90 : -70;
        this.dead = false;
    }

    update(dt) {
        this.y += this.vy * dt;
        this.vy += 140 * dt;
        this.life -= dt;
        if (this.life <= 0) this.dead = true;
    }

    draw() {
        const t = 1 - this.life / this.maxLife;
        const pop = t < 0.15 ? 1 + (0.15 - t) * 4 : 1;
        const size = Math.round((this.crit ? 18 : 12) * pop);

        ctx.globalAlpha = Math.min(1, (this.life / this.maxLife) * 2.5);
        ctx.font = font(size, true);
        ctx.textAlign = "center";
        ctx.lineJoin = "round";
        ctx.lineWidth = this.crit ? 4 : 3;
        ctx.strokeStyle = UI.shadow;
        ctx.strokeText(this.text, Math.round(this.x), Math.round(this.y));
        ctx.fillStyle = this.crit ? "#ff7043" : "#ffffff";
        ctx.fillText(this.text, Math.round(this.x), Math.round(this.y));
        ctx.textAlign = "left";
        ctx.globalAlpha = 1;
    }
}

function spawnDamageNumber(enemy, value, crit) {
    if (damageNumbers.length >= DAMAGE_NUMBER_LIMIT) damageNumbers.shift();
    damageNumbers.push(new DamageNumber(enemy.x, enemy.y - enemy.radius - 4, value, crit));
}


// =====================================================
//  GÜÇLENDİRMELER
// =====================================================
// Yeni bir güçlendirme eklemek için: buraya bir satır ekle,
// sonra applyPowerUp içinde ne yapacağını yaz
const POWERUP_TYPES = {
    heal:   { color: "#66bb6a", label: "+", name: "+25 HEALTH",  weight: 3 },
    rapid:  { color: "#ffd54f", label: "R", name: "RAPID FIRE",  weight: 2 },
    triple: { color: "#4fc3f7", label: "3", name: "TRIPLE SHOT", weight: 2 },
    shield: { color: "#ce93d8", label: "S", name: "SHIELD",      weight: 2 },
    magnet: { color: "#ef5350", label: "M", name: "MAGNET",      weight: 1.5 },
    freeze: { color: "#b3e5fc", label: "F", name: "FREEZE",      weight: 1.2 },
    bomb:   { color: "#ff8a65", label: "B", name: "BOMB",        weight: 0.8 },
};

// Süreli güçlendirmeler kaç saniye sürsün (kalkan süreli değil, tek vuruşluk)
const POWERUP_DURATION = { rapid: 6, triple: 8, freeze: 4 };

const BOMB_BOSS_DAMAGE = 0.08;
const BOMB_FLASH_TIME = 0.35;
const MAGNET_PULL = 750;

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
        ctx.font = font(14, true);
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(info.label, this.x, this.y + bob + 1);
        ctx.textAlign = "left";
        ctx.textBaseline = "alphabetic";
    }
}

// Ölen düşman şansına göre güçlendirme düşürsün
function maybeDropPowerUp(enemy) {
    if (Math.random() < enemy.dropChance * player.luck) {
        powerUps.push(new PowerUp(enemy.x, enemy.y, choosePowerUpType()));
    }
}

function choosePowerUpType() {
    let total = 0;
    for (const type in POWERUP_TYPES) total += POWERUP_TYPES[type].weight;

    let roll = Math.random() * total;
    for (const type in POWERUP_TYPES) {
        roll -= POWERUP_TYPES[type].weight;
        if (roll < 0) return type;
    }
    return "heal";
}

function detonateBomb() {
    const onScreen = enemies.filter((e) => !e.dead && isNearView(e.x, e.y, 20));
    for (const enemy of onScreen) {
        if (enemy.dead) continue;
        if (enemy.isBoss) {
            if (enemy.takeHit(enemy.maxHealth * BOMB_BOSS_DAMAGE)) killEnemy(enemy);
        } else {
            killEnemy(enemy);
        }
    }
    for (const bullet of enemyBullets) {
        if (isNearView(bullet.x, bullet.y, 20)) bullet.dead = true;
    }
    bombFlash = BOMB_FLASH_TIME;
    bombOrigin = { x: player.x, y: player.y };
    shakeScreen(16, 0.45);
    playSound("bomb");
}

function magnetizeGems() {
    for (const gem of xpGems) gem.magnetized = true;
    for (const coin of golds) coin.magnetized = true;
}

function applyPowerUp(type) {
    const info = POWERUP_TYPES[type];

    if (type === "heal") {
        player.health = Math.min(player.maxHealth, player.health + 25);
    } else if (type === "shield") {
        player.hasShield = true; // zaten varsa üst üste binmez
    } else if (type === "magnet") {
        magnetizeGems();
    } else if (type === "bomb") {
        detonateBomb();
    } else {
        player.powerTimers[type] = POWERUP_DURATION[type];
    }

    texts.push(new FloatingText(player.x, player.y - 30, powerupName(type), info.color));
    spawnParticles(player.x, player.y, info.color, 15);
    playSound("powerup");
}


const CHEST_OPEN_TIME = 1.2;
const CHEST_HEAL_SCORE = 500;
const CHEST_REVEAL_TIME = 3.5;

class Chest {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.radius = 16;
        this.time = 0;
        this.opened = false;
        this.openTimer = 0;
        this.dead = false;
    }

    update(dt) {
        this.time += dt;
        if (this.opened) {
            this.openTimer -= dt;
            if (this.openTimer <= 0) this.dead = true;
        } else if (Math.random() < dt * 5) {
            spawnParticles(this.x + (Math.random() - 0.5) * 24, this.y - 8, "#ffd54f", 1);
        }
    }

    draw() {
        ctx.globalAlpha = this.opened ? Math.min(1, this.openTimer / 0.4) : 1;
        drawShadow(this.x, this.y + 13, 16, 5);

        if (!this.opened) {
            ctx.globalCompositeOperation = "lighter";
            ctx.fillStyle = `rgba(255, 200, 60, ${0.16 + Math.sin(this.time * 4) * 0.08})`;
            ctx.beginPath();
            ctx.arc(this.x, this.y, 26, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";
        }

        const sprite = this.opened ? sprites.chest_open : sprites.chest_closed;
        if (isReady(sprite)) {
            drawSprite(sprite, Math.round(this.x), Math.round(this.y));
        } else {
            ctx.fillStyle = "#a0703c";
            ctx.fillRect(this.x - 14, this.y - 10, 28, 20);
        }
        ctx.globalAlpha = 1;
    }
}

function openChest(chest) {
    chest.opened = true;
    chest.openTimer = CHEST_OPEN_TIME;

    const choices = rollUpgradeChoices();
    const upgrade = choices.find((u) => u.evolution) || choices[0];

    if (upgrade) {
        upgrade.apply(player);
        upgradeLevels[upgrade.id] = (upgradeLevels[upgrade.id] || 0) + 1;
    } else {
        player.health = player.maxHealth;
        score += CHEST_HEAL_SCORE;
    }
    chestReveal = { upgrade, level: upgrade ? upgradeLevels[upgrade.id] : 0, timer: CHEST_REVEAL_TIME };

    spawnParticles(chest.x, chest.y, "#ffd54f", 30);
    spawnParticles(chest.x, chest.y, "#fff3a0", 15);
    shakeScreen(4, 0.15);
    playSound("chest");
}

function splitEnemy(enemy) {
    const speedScale = Math.min(BALANCE.speedMaxMultiplier, 1 + gameTime * BALANCE.speedRampPerSecond);
    const offset = Math.random() * Math.PI * 2;

    for (let i = 0; i < enemy.splitInto; i++) {
        const angle = offset + (Math.PI * 2 * i) / enemy.splitInto;
        const piece = new Enemy(enemy.x + Math.cos(angle) * 14, enemy.y + Math.sin(angle) * 14, "splitling");
        piece.speed *= speedScale;
        clampToWorld(piece);
        enemies.push(piece);
    }

    spawnParticles(enemy.x, enemy.y, "#f8bbd0", 8);
    playSound("split");
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
    dash: () => playTone("sine", 250, 900, 0.14, 0.1),
    smallBoom: () => playNoise(0.18, 0.18),
    bladeHit: () => playTone("triangle", 900, 500, 0.05, 0.05),
    crit: () => playTone("square", 1200, 700, 0.07, 0.05),
    spit: () => playTone("triangle", 650, 280, 0.1, 0.06),
    charge: () => playTone("sawtooth", 110, 260, 0.25, 0.08),
    summon: () => {
        playTone("sine", 200, 700, 0.4, 0.1);
        playTone("sine", 300, 900, 0.4, 0.06, 0.1);
    },
    split: () => playTone("sine", 420, 820, 0.09, 0.06),
    chest: () => {
        playTone("square", 784, 784, 0.08, 0.07, 0);
        playTone("square", 988, 988, 0.08, 0.07, 0.07);
        playTone("square", 1175, 1175, 0.08, 0.07, 0.14);
        playTone("square", 1568, 1568, 0.3, 0.07, 0.21);
        playTone("triangle", 2400, 3200, 0.3, 0.04, 0.21);
    },
    bomb: () => {
        playNoise(0.9, 0.5);
        playTone("sawtooth", 160, 35, 0.8, 0.18);
    },
    gold: () => {
        playTone("square", 1568, 1568, 0.04, 0.035);
        playTone("square", 2093, 2093, 0.08, 0.035, 0.04);
    },
    deny: () => playTone("square", 180, 120, 0.15, 0.06),
};

// Aynı anda çok sık çalan sesler (vuruş, patlama, XP) birbirini bastırmasın diye kısa bir sınır
const SOUND_LIMIT = { hit: 0.04, explode: 0.05, smallBoom: 0.06, xp: 0.03, bladeHit: 0.06, spit: 0.08, charge: 0.1, split: 0.06, gold: 0.05 };
const lastSoundTime = {};

function playSound(name) {
    if (muted || !audioCtx) return;
    const now = audioCtx.currentTime;
    if (SOUND_LIMIT[name] && now - (lastSoundTime[name] || -1) < SOUND_LIMIT[name]) return;
    lastSoundTime[name] = now;
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

let player = new Player(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
updateCamera();
let bullets = [];
let enemyBullets = [];
let enemies = [];
let particles = [];
let powerUps = [];
let xpGems = [];
let texts = [];
let chests = [];
let damageNumbers = [];
let chestReveal = null;
let bombFlash = 0;
let bombOrigin = { x: 0, y: 0 };

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

// Explosive Rounds patlamaları: { x, y, radius, damage, life, done }
let explosions = [];

const DANGER_MAX = 10;
const DANGER_UNLOCK_TIME = 600;
const DANGER_HEALTH = 0.12;
const DANGER_DAMAGE = 0.08;
const DANGER_SPAWN = 0.025;
const DANGER_BOSS_FASTER = 1.5;
const DANGER_ELITE_EARLY = 30;
const DANGER_ELITE_MIN_START = 180;
const DANGER_ELITE_CHANCE = 0.01;

let dangerUnlocked = loadDangerUnlocked();
let danger = loadDanger();
let newDangerUnlocked = false;

function loadDangerUnlocked() {
    try {
        const value = Math.floor(Number(localStorage.getItem("incursioDangerUnlocked")) || 0);
        return Math.max(0, Math.min(DANGER_MAX, value));
    } catch {
        return 0;
    }
}

function loadDanger() {
    try {
        const value = Math.floor(Number(localStorage.getItem("incursioDanger")) || 0);
        return Math.max(0, Math.min(dangerUnlocked, value));
    } catch {
        return 0;
    }
}

function setDanger(value) {
    danger = Math.max(0, Math.min(dangerUnlocked, value));
    highScore = loadHighScore();
    try {
        localStorage.setItem("incursioDanger", danger);
    } catch {}
}

function unlockNextDanger() {
    dangerUnlocked++;
    newDangerUnlocked = true;
    try {
        localStorage.setItem("incursioDangerUnlocked", dangerUnlocked);
    } catch {}
    texts.push(new FloatingText(player.x, player.y - 50, T("dangerUnlocked", dangerUnlocked), UI.red));
    playSound("levelup");
}

function getDangerHealth() {
    return 1 + DANGER_HEALTH * danger;
}

function getDangerDamage() {
    return 1 + DANGER_DAMAGE * danger;
}

function getBossInterval() {
    return BOSS_INTERVAL - DANGER_BOSS_FASTER * danger;
}

function getEliteStart() {
    return Math.max(DANGER_ELITE_MIN_START, ELITE_START - DANGER_ELITE_EARLY * danger);
}

function getDangerColor(level) {
    if (level === 0) return UI.textDim;
    const t = level / DANGER_MAX;
    return `rgb(255, ${Math.round(213 - 154 * t)}, ${Math.round(79 - 20 * t)})`;
}

const WORKSHOP = [
    { id: "vitality",  max: 5, cost: 40,  growth: 1.6 },
    { id: "swift",     max: 5, cost: 40,  growth: 1.6 },
    { id: "wisdom",    max: 5, cost: 50,  growth: 1.6 },
    { id: "greed",     max: 5, cost: 60,  growth: 1.6 },
    { id: "reroll",    max: 3, cost: 80,  growth: 2 },
    { id: "wide",      max: 1, cost: 300, growth: 1 },
    { id: "headstart", max: 1, cost: 400, growth: 1 },
];

const WORKSHOP_HEALTH = 4;
const WORKSHOP_SPEED = 0.012;
const WORKSHOP_XP = 0.02;
const WORKSHOP_GOLD = 0.05;
const DANGER_GOLD = 0.25;

const GOLD_DROP_CHANCE = 0.03;
const GOLD_ELITE = 2;
const GOLD_BOSS_BASE = 8;
const GOLD_BOSS_PER = 4;

let gold = loadGold();
let workshopLevels = loadWorkshop();
let golds = [];
let runGold = 0;
let rerolls = 0;

function loadGold() {
    try {
        return Math.max(0, Number(localStorage.getItem("incursioGold")) || 0);
    } catch {
        return 0;
    }
}

function saveGold() {
    try {
        localStorage.setItem("incursioGold", gold);
    } catch {}
}

function loadWorkshop() {
    try {
        const data = JSON.parse(localStorage.getItem("incursioWorkshop") || "{}");
        return data && typeof data === "object" ? data : {};
    } catch {
        return {};
    }
}

function saveWorkshop() {
    try {
        localStorage.setItem("incursioWorkshop", JSON.stringify(workshopLevels));
    } catch {}
}

function getWorkshopItem(id) {
    return WORKSHOP.find((item) => item.id === id);
}

function workshopLevel(id) {
    return Math.max(0, Math.min(getWorkshopItem(id).max, Math.floor(Number(workshopLevels[id]) || 0)));
}

function workshopCost(item) {
    return Math.round(item.cost * Math.pow(item.growth, workshopLevel(item.id)));
}

function buyWorkshop(item) {
    const lv = workshopLevel(item.id);
    if (lv >= item.max) return;
    const cost = workshopCost(item);
    if (gold < cost) {
        playSound("deny");
        return;
    }
    gold -= cost;
    workshopLevels[item.id] = lv + 1;
    saveGold();
    saveWorkshop();
    playSound("powerup");
}

function getGoldMultiplier() {
    return (1 + DANGER_GOLD * danger) * (1 + WORKSHOP_GOLD * workshopLevel("greed"));
}

function getXpMultiplier() {
    return 1 + WORKSHOP_XP * workshopLevel("wisdom");
}

function applyWorkshop() {
    player.maxHealth += WORKSHOP_HEALTH * workshopLevel("vitality");
    player.health = player.maxHealth;
    player.displayHealth = player.maxHealth;
    player.speed *= 1 + WORKSHOP_SPEED * workshopLevel("swift");

    rerolls = workshopLevel("reroll");

    if (workshopLevel("headstart") > 0) {
        const upgrade = rollUpgradeChoices()[0];
        if (upgrade) {
            upgrade.apply(player);
            upgradeLevels[upgrade.id] = 1;
            chestReveal = { title: "headstartTitle", upgrade, level: 1, timer: CHEST_REVEAL_TIME };
        }
    }
}

function formatGold(value) {
    return String(Math.floor(value));
}

function dropGold(enemy) {
    let amount = 0;
    if (enemy.isBoss) amount = GOLD_BOSS_BASE + GOLD_BOSS_PER * enemy.number;
    else if (enemy.elite) amount = GOLD_ELITE;
    else if (Math.random() < GOLD_DROP_CHANCE) amount = 1;

    while (amount > 0) {
        const value = Math.min(amount, enemy.isBoss ? 3 : 1);
        golds.push(new GoldCoin(enemy.x, enemy.y, value));
        amount -= value;
    }
}

function collectGold(coin) {
    const amount = coin.value * getGoldMultiplier();
    runGold += amount;
    gold += amount;
    saveGold();
    spawnParticles(coin.x, coin.y, "#ffd54f", 4);
    playSound("gold");
}

let highScore = loadHighScore();
let newRecord = false;

function highScoreKey() {
    return danger === 0 ? "shooterHighScore" : "shooterHighScore_" + danger;
}

// EN YÜKSEK SKOR: tarayıcının hafızasında (localStorage) saklanır,
// sayfayı kapatıp açsan bile kaybolmaz
function loadHighScore() {
    try {
        return Number(localStorage.getItem(highScoreKey())) || 0;
    } catch {
        return 0;
    }
}

function saveHighScore() {
    try {
        localStorage.setItem(highScoreKey(), highScore);
    } catch {
        // gizli sekme vb. durumlarda kaydedemezsek oyun yine çalışsın
    }
}

function startGame() {
    player = new Player(WORLD_WIDTH / 2, WORLD_HEIGHT / 2);
    updateCamera();
    explosions = [];
    bullets = [];
    enemyBullets = [];
    enemies = [];
    particles = [];
    powerUps = [];
    xpGems = [];
    texts = [];
    chests = [];
    damageNumbers = [];
    chestReveal = null;
    bombFlash = 0;
    score = 0;
    gameTime = 0;
    spawnTimer = 0;
    spawnInterval = 1.5;
    shakeTime = 0;
    damageFlash = 0;
    newRecord = false;
    newDangerUnlocked = false;

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

    golds = [];
    runGold = 0;
    joystick = null;
    applyWorkshop();

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
    joystick = null;
}

function resumeGame() {
    state = "playing";
    mouse.down = false;
}

// Menüdeki butonlar: yazı ve tıklayınca ne yapacağı
const PAUSE_BUTTONS = [
    { label: "resume",   action: () => resumeGame() },   // yazılar STRINGS'ten (iki dilde)
    { label: "restart",  action: () => startGame() },
    { label: "mainMenu", action: () => { state = "menu"; } },
    { label: () => T("soundButton", muted ? T("off") : T("on")), action: () => toggleMute() },
];

const BUTTON_WIDTH = 260;
const BUTTON_HEIGHT = 46;
const BUTTON_GAP = 14;

function getPauseButtonRect(index) {
    return {
        x: (canvas.width - BUTTON_WIDTH) / 2,
        y: 160 + index * (BUTTON_HEIGHT + BUTTON_GAP),
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

    // F her ekranda otomatik ateşi açıp kapatsın
    if (key === "f") {
        toggleAutofire();
        return;
    }

    if (state === "menu" && (key === "enter" || key === " ")) {
        startGame();
    } else if (state === "menu" && (key === "arrowleft" || key === "a")) {
        setDanger(danger - 1);
    } else if (state === "menu" && (key === "arrowright" || key === "d")) {
        setDanger(danger + 1);
    } else if (state === "menu" && key === "w") {
        state = "workshop";
    } else if (state === "workshop") {
        if (key === "escape" || key === "w") state = "menu";
    } else if (state === "playing") {
        if (key === "escape" || key === "p") pauseGame();
        if (key === " ") player.tryDash();
    } else if (state === "paused") {
        if (key === "escape" || key === "p") resumeGame();
        if (key === "r") startGame();
        if (key === "q") state = "menu";
    } else if (state === "levelup") {
        if (key >= "1" && key <= "4" && key.length === 1) {
            chooseUpgrade(Number(key) - 1);
        }
        if (key === "r") rerollChoices();
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
    const t = gameTime;

    // Her tipin "ağırlığı": büyük olan daha sık çıkar, 0 olan hiç çıkmaz
    const splitter = t > SPLITTER_START ? Math.min(SPLITTER_WEIGHT_MAX, SPLITTER_WEIGHT_START + (t - SPLITTER_START) / 40) : 0;
    const weights = {
        normal: 55 - splitter,
        splitter,
        fast: t > 15 ? 30 : 0,
        tank: t > 30 ? 15 : 0,
        spitter: t > SPITTER_START ? Math.min(18, 8 + (t - SPITTER_START) / 30) : 0,
        charger: t > CHARGER_START ? Math.min(14, 6 + (t - CHARGER_START) / 40) : 0,
    };

    let total = 0;
    for (const type in weights) total += weights[type];

    let roll = Math.random() * total;
    for (const type in weights) {
        roll -= weights[type];
        if (roll < 0) return type;
    }
    return "normal";
}

// Kameranın görüş alanının hemen dışında, ama çitin içinde rastgele bir nokta
function randomSpawnPosition(margin) {
    const left = camera.x - margin;
    const right = camera.x + canvas.width + margin;
    const top = camera.y - margin;
    const bottom = camera.y + canvas.height + margin;

    const minX = WALL + 30;
    const maxX = WORLD_WIDTH - WALL - 30;
    const minY = WALL + 30;
    const maxY = WORLD_HEIGHT - WALL - 30;

    const between = (a, b) => a + Math.random() * (b - a);

    // Sadece duvarın dışında kalmayan kenarlar seçilebilir
    const options = [];
    if (top >= minY) options.push(() => ({ x: between(Math.max(minX, left), Math.min(maxX, right)), y: top }));
    if (bottom <= maxY) options.push(() => ({ x: between(Math.max(minX, left), Math.min(maxX, right)), y: bottom }));
    if (left >= minX) options.push(() => ({ x: left, y: between(Math.max(minY, top), Math.min(maxY, bottom)) }));
    if (right <= maxX) options.push(() => ({ x: right, y: between(Math.max(minY, top), Math.min(maxY, bottom)) }));

    if (options.length === 0) {
        return { x: between(minX, maxX), y: between(minY, maxY) };
    }
    return options[Math.floor(Math.random() * options.length)]();
}

// =====================================================
//  ZORLUK DENGESİ
// =====================================================
// Oyunun zorluğunu değiştirmek istersen buradaki sayılarla oyna.
const BALANCE = {
    spawnStart: 1.4,       // başta kaç saniyede bir düşman doğar
    spawnMin: 0.25,        // en sık hali (yaklaşık 5. dakikada ulaşılır)
    spawnRampTime: 60,     // doğma hızının ne kadar sürede iki katına çıktığı (saniye)
    speedMaxMultiplier: 1.5,   // düşmanlar en fazla bu kadar hızlanır
    speedRampPerSecond: 0.0035,
    healthRampTime: 175,   // düşman canı artış hızı: başta yavaş, sonra hızlanarak artar
    xpRampTime: 400,       // düşmanların verdiği XP bu kadar saniyede bir kat daha artar
    groupStartTime: 300,   // bu saniyeden sonra düşmanlar gruplar halinde doğmaya başlar
    groupGrowTime: 150,    // her bu kadar saniyede grup 1 düşman büyür
    levelDamageBonus: 0.03, // her seviye atlamada pasif +%3 hasar
    maxEnemies: 120,       // ekranda aynı anda en fazla düşman
};

// Oyuncunun asıl hasarı: Power Shot'tan gelen hasar × seviye bonusu
// (her seviye +%3: 20. seviyede +%57, 40. seviyede +%117)
function getPlayerDamage() {
    return player.damage * getLevelDamageMultiplier();
}

function getLevelDamageMultiplier() {
    return 1 + BALANCE.levelDamageBonus * (level - 1);
}

// Şu anki düşman canı çarpanı: başta yavaş, sonra hızlanarak artar
// (2.5 dk: ~2x, 5 dk: ~3.6x, 9 dk: ~7x)
function getEnemyScale() {
    return 1 + Math.pow(gameTime / BALANCE.healthRampTime, 1.4);
}

// Düşmanların verdiği XP çarpanı (candan daha yavaş artar)
function getXpScale() {
    return 1 + gameTime / BALANCE.xpRampTime;
}

// Her doğuşta kaç düşman gelsin: 5. dakikadan sonra gruplar kademeli büyür
// (örn. 1.4 → %60 ihtimalle 1, %40 ihtimalle 2 düşman; bir anda iki katına sıçramaz)
function getSpawnGroupSize() {
    const extra = Math.max(0, gameTime - BALANCE.groupStartTime) / BALANCE.groupGrowTime;
    const whole = Math.floor(extra);
    return 1 + whole + (Math.random() < extra - whole ? 1 : 0);
}

function getSpawnInterval() {
    const interval = Math.max(BALANCE.spawnMin, BALANCE.spawnStart / (1 + gameTime / BALANCE.spawnRampTime));
    return interval * (1 - DANGER_SPAWN * danger);
}

function spawnEnemy() {
    // Çok kalabalıksa yenisini doğurma (sonsuz birikmeyi önler)
    if (enemies.length >= BALANCE.maxEnemies) return;

    const pos = randomSpawnPosition(40);
    const enemy = new Enemy(pos.x, pos.y, chooseEnemyType());
    // Zamanla tüm düşmanlar hızlansın, ama en fazla 1.5 katına kadar
    // (böylece hız yükseltmesi alan oyuncu hâlâ kaçabilir)
    enemy.speed *= Math.min(BALANCE.speedMaxMultiplier, 1 + gameTime * BALANCE.speedRampPerSecond);

    // 8:00'den sonra bazı düşmanlar elite olarak gelir
    if (Math.random() < getEliteChance()) makeElite(enemy);

    enemies.push(enemy);
}

function spawnBoss() {
    bossCount++;
    // Ekranın hemen dışından gelsin
    const pos = randomSpawnPosition(70);
    boss = new Boss(pos.x, pos.y, bossCount);
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
    dropGold(enemy);
    maybeDropPowerUp(enemy);

    // Lifesteal: her öldürmede biraz can
    if (player.lifesteal > 0) {
        player.health = Math.min(player.maxHealth, player.health + player.lifesteal);
    }

    // Explosive Rounds: ölen düşman patlar (patlamada ölen düşmanlar da patlar: zincirleme)
    if (player.explosionLevel > 0) {
        const lvl = player.explosionLevel;
        explosions.push({
            x: enemy.x,
            y: enemy.y,
            radius: EXPLOSION_RADIUS[lvl] + (enemy.isBoss ? 40 : 0),
            damage: Math.max(1, Math.round(getPlayerDamage() * EXPLOSION_POWER[lvl] * 10) / 10),
            life: 0.3,
            done: false,
        });
    }

    if (enemy.isBoss) {
        // Boss ölümü: büyük patlama, sarsıntı ve ekstra güçlendirme
        spawnParticles(enemy.x, enemy.y, "#c62828", 60);
        spawnParticles(enemy.x, enemy.y, "#ffd54f", 30);
        shakeScreen(20, 0.8);
        maybeDropPowerUp(enemy);
        const chest = new Chest(enemy.x, enemy.y);
        clampToWorld(chest);
        chests.push(chest);
        texts.push(new FloatingText(enemy.x, enemy.y - 50, T("bossDefeated", enemy.score), "#ffd54f"));
        playSound("bossDeath");
        boss = null;
        bossTimer = 0;
        bossWarned = false;
    } else {
        // Büyük düşman = büyük patlama
        spawnParticles(enemy.x, enemy.y, enemy.color, 10 + enemy.radius);
        playSound("explode");
        if (enemy.splitInto > 0) splitEnemy(enemy);
    }
}

// Oyuncu hasar alır. Dokunulmazsa hiçbir şey olmaz, false döner.
function damagePlayer(amount) {
    if (player.invincibleTimer > 0 || player.dashTime > 0) return false; // atılırken dokunulmaz

    // Hasar zamanla artar (dakikada %5), Armor ise azaltır (en az 1)
    amount = Math.max(1, Math.round(amount * getDamageScale() * (1 - player.armor)));

    // Kalkan varsa hasarı o yer ve kırılır
    if (player.hasShield) {
        player.hasShield = false;
        player.invincibleTimer = 1; // kırıldıktan sonra da kısa bir koruma
        spawnParticles(player.x, player.y, "#ce93d8", 25);
        texts.push(new FloatingText(player.x, player.y - 30, T("shieldBroken"), "#ce93d8"));
        shakeScreen(5, 0.15);
        playSound("shieldBreak");
        return true;
    }

    player.health = Math.max(0, player.health - amount);
    player.invincibleTimer = 1; // 1 saniye dokunulmazlık
    player.ghostDelay = 0.4;    // hayalet bar biraz beklesin, ne kadar can gittiği görünsün
    texts.push(new FloatingText(player.x, player.y - 30, "-" + amount, "#ff6b6b"));

    shakeScreen(10, 0.3);
    damageFlash = 0.25;

    if (player.health <= 0) {
        spawnParticles(player.x, player.y, "#4a86c5", 40);
        shakeScreen(18, 0.5);
        playSound("gameover");
        endGame();
    } else {
        playSound("hurt");
    }

    return true;
}


// Orbiting Blades: bıçakların şu anki konumları
function getBladePositions() {
    const positions = [];
    for (let i = 0; i < player.bladeCount; i++) {
        const angle = player.bladeAngle + (Math.PI * 2 * i) / player.bladeCount;
        positions.push({
            x: player.x + Math.cos(angle) * BLADE_RADIUS,
            y: player.y + Math.sin(angle) * BLADE_RADIUS,
        });
    }
    return positions;
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

    for (const number of damageNumbers) number.update(dt);
    damageNumbers = damageNumbers.filter((number) => !number.dead);

    bombFlash = Math.max(0, bombFlash - dt);

    if (state === "playing" && touchMode && isPortrait()) pauseGame();

    // Oyun oynanmıyorsa (menü, seviye atlama, oyun bitti) geri kalanı dursun
    if (state !== "playing") return;

    if (chestReveal) {
        chestReveal.timer -= dt;
        if (chestReveal.timer <= 0) chestReveal = null;
    }

    player.update(dt);
    updateCamera();

    gameTime += dt;
    spawnInterval = getSpawnInterval();

    if (gameTime >= DANGER_UNLOCK_TIME && danger === dangerUnlocked && dangerUnlocked < DANGER_MAX) {
        unlockNextDanger();
    }

    // --- Düşman doğurma (boss varken daha yavaş) ---
    spawnTimer += boss ? dt * 0.4 : dt;
    if (spawnTimer >= spawnInterval) {
        spawnTimer = 0;
        const groupSize = getSpawnGroupSize();
        for (let i = 0; i < groupSize; i++) spawnEnemy();
    }

    // --- Boss zamanlayıcısı (boss sahnedeyken durur) ---
    if (!boss) {
        bossTimer += dt;

        // Gelmeden 3 saniye önce uyar
        if (bossTimer >= getBossInterval() - 3 && !bossWarned) {
            bossWarned = true;
            bossWarning = 3;
            playSound("bossWarning");
        }
        if (bossTimer >= getBossInterval()) {
            spawnBoss();
        }
    }
    bossWarning = Math.max(0, bossWarning - dt);

    // --- Hareketler ---
    for (const bullet of bullets) bullet.update(dt);
    for (const bullet of enemyBullets) bullet.update(dt);
    for (const enemy of enemies) enemy.update(dt);
    for (const gem of xpGems) gem.update(dt);
    for (const coin of golds) coin.update(dt);

    // --- Mermi - düşman çarpışması ---
    for (const bullet of bullets) {
        for (const enemy of enemies) {
            if (bullet.dead || enemy.dead) continue;
            if (bullet.hitEnemies.has(enemy)) continue; // bu düşmana zaten vurdu
            if (!isColliding(bullet, enemy)) continue;

            bullet.hitEnemies.add(enemy);
            spawnParticles(bullet.x, bullet.y, "#ffd54f", 4); // küçük kıvılcım

            if (bullet.crit) {
                spawnParticles(bullet.x, bullet.y, "#ff5722", 6);
                playSound("crit");

                if (player.detonation) {
                    explosions.push({
                        x: bullet.x,
                        y: bullet.y,
                        radius: DETONATION_RADIUS,
                        damage: Math.max(1, Math.round(bullet.damage * DETONATION_POWER * 10) / 10),
                        life: 0.3,
                        done: false,
                    });
                }
            }

            if (enemy.takeHit(bullet.damage, bullet.crit)) {
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

    // --- Orbiting Blades: dönen bıçaklar değdiği düşmana vurur ---
    for (const pos of getBladePositions()) {
        for (const enemy of enemies) {
            if (enemy.dead || enemy.bladeHitTimer > 0) continue;
            if (Math.hypot(enemy.x - pos.x, enemy.y - pos.y) > enemy.radius + 12) continue;

            enemy.bladeHitTimer = BLADE_HIT_COOLDOWN;
            if (player.iceBlades) enemy.chillTimer = ICE_BLADE_TIME;
            spawnParticles(pos.x, pos.y, "#e0f7ff", 4);
            if (enemy.takeHit(getPlayerDamage() + 1)) {
                killEnemy(enemy);
            } else {
                playSound("bladeHit");
            }
        }
    }

    // --- Explosive Rounds: bekleyen patlamaların hasarını ver ---
    for (const ex of explosions) {
        ex.life -= dt;
        if (ex.done) continue;
        ex.done = true;
        spawnParticles(ex.x, ex.y, "#ff9800", 14);
        spawnParticles(ex.x, ex.y, "#ffd54f", 8);
        playSound("smallBoom");

        for (const enemy of enemies) {
            if (enemy.dead) continue;
            if (Math.hypot(enemy.x - ex.x, enemy.y - ex.y) > ex.radius + enemy.radius) continue;
            if (enemy.takeHit(ex.damage)) killEnemy(enemy); // bu da patlarsa zincirleme olur
        }
    }
    explosions = explosions.filter((ex) => ex.life > 0);

    // --- Düşman - oyuncu çarpışması ---
    for (const enemy of enemies) {
        if (enemy.dead || !isColliding(player, enemy)) continue;

        // Hasar aldıysak (ya da kalkan kırıldıysa) normal düşman da patlasın (boss patlamaz)
        if (damagePlayer(enemy.damage) && !enemy.isBoss) {
            enemy.dead = true;
            spawnParticles(enemy.x, enemy.y, enemy.color, 15);
        }

        if (state !== "playing") return; // öldüysek dur
    }

    // --- Düşman mermisi - oyuncu çarpışması ---
    for (const bullet of enemyBullets) {
        if (bullet.dead || !isColliding(player, bullet)) continue;

        if (damagePlayer(bullet.damage)) {
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

    for (const chest of chests) {
        chest.update(dt);
        if (!chest.opened && isColliding(player, chest)) openChest(chest);
    }
    chests = chests.filter((chest) => !chest.dead);

    // --- XP kristallerini topla ---
    for (const gem of xpGems) {
        if (!gem.dead && isColliding(player, gem)) {
            gem.dead = true;
            addXp(gem.value);
            spawnParticles(gem.x, gem.y, "#9ff6ff", gem.big ? 8 : 3);
            playSound("xp");
        }
    }

    for (const coin of golds) {
        if (!coin.dead && isColliding(player, coin)) {
            coin.dead = true;
            collectGold(coin);
        }
    }
    golds = golds.filter((coin) => !coin.dead);

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
    ctx.fillStyle = "#1b1f24";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Pixel art büyütülünce bulanıklaşmasın, keskin kalsın
    ctx.imageSmoothingEnabled = false;

    // --- Oyun dünyası (sarsıntıdan etkilenir) ---
    ctx.save();

    if (shakeTime > 0) {
        const offsetX = (Math.random() * 2 - 1) * shakeStrength;
        const offsetY = (Math.random() * 2 - 1) * shakeStrength;
        ctx.translate(offsetX, offsetY);
    }

    // Kamerayı uygula: bundan sonra her şey dünya koordinatlarında çiziliyor
    ctx.translate(-camera.x, -camera.y);

    drawGround();
    drawFrostAura();

    for (const particle of particles) particle.draw();
    for (const chest of chests) chest.draw();
    for (const gem of xpGems) gem.draw();
    for (const coin of golds) coin.draw();
    for (const powerUp of powerUps) powerUp.draw();
    for (const bullet of bullets) bullet.draw();
    // Önce bütün gölgeler, sonra düşmanlar: aşağıdaki (bize yakın olan) önde görünsün
    for (const enemy of enemies) drawEnemyShadow(enemy);
    const sortedEnemies = [...enemies].sort((a, b) => a.y - b.y);
    for (const enemy of sortedEnemies) enemy.draw();
    for (const bullet of enemyBullets) bullet.draw();
    if (state !== "gameover") player.draw();
    if (state !== "gameover") drawBlades();
    drawExplosions();
    drawBombWave();
    for (const number of damageNumbers) number.draw();
    for (const text of texts) text.draw();

    ctx.restore();

    if (player.powerTimers.freeze > 0 && state !== "gameover") {
        const fade = Math.min(1, player.powerTimers.freeze / 0.5);
        ctx.fillStyle = `rgba(150, 215, 255, ${0.14 * fade})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    if (bombFlash > 0) {
        ctx.fillStyle = `rgba(255, 244, 224, ${(bombFlash / BOMB_FLASH_TIME) * 0.6})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

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
    } else if (state === "workshop") {
        drawWorkshop();
    } else {
        drawGameOver();
    }

    if (touchMode && isPortrait()) drawRotateHint();

}

// =====================================================
//  YÜKSELTME EFEKTLERİNİN ÇİZİMİ
// =====================================================
// Frost Aura: oyuncunun etrafında soluk buz mavisi alan ve dönen kesikli halka
function drawFrostAura() {
    if (player.frostLevel === 0 || state === "gameover") return;
    const r = FROST_RADIUS[player.frostLevel];

    ctx.fillStyle = "rgba(150, 220, 255, 0.10)";
    ctx.beginPath();
    ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "rgba(200, 240, 255, 0.45)";
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -player.time * 20;
    ctx.beginPath();
    ctx.arc(player.x, player.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
}

// Orbiting Blades: kendi etrafında da dönen shuriken'ler
function drawBlades() {
    for (const pos of getBladePositions()) {
        if (isReady(sprites.blade)) {
            drawSprite(player.iceBlades ? getFrozenSprite(sprites.blade) : sprites.blade, pos.x, pos.y, player.time * 14);
        } else {
            drawCircle(pos.x, pos.y, 8, "#cfd8dc");
        }
    }
}

function drawBombWave() {
    if (bombFlash <= 0) return;
    const t = 1 - bombFlash / BOMB_FLASH_TIME;
    ctx.globalAlpha = 1 - t;
    ctx.strokeStyle = "#ffd54f";
    ctx.lineWidth = 10 * (1 - t) + 2;
    ctx.beginPath();
    ctx.arc(bombOrigin.x, bombOrigin.y, 40 + t * canvas.width * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
}

// Explosive Rounds: büyüyüp sönen turuncu halka
function drawExplosions() {
    for (const ex of explosions) {
        const t = 1 - ex.life / 0.3; // 0 → 1
        ctx.globalAlpha = Math.max(0, 1 - t);
        ctx.fillStyle = "rgba(255, 152, 0, 0.35)";
        ctx.beginPath();
        ctx.arc(ex.x, ex.y, ex.radius * (0.4 + t * 0.6), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#ffd54f";
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.globalAlpha = 1;
    }
}


// =====================================================
//  DİL (TÜRKÇE / İNGİLİZCE)
// =====================================================
// Oyundaki bütün yazılar burada. Yeni bir yazı eklerken iki dile de ekle.
// {0}, {1} gibi yerler T() çağrısında verilen değerlerle doldurulur.
const STRINGS = {
    en: {
        best: "BEST {0}",
        soundOff: "SOUND OFF (M)",
        autofire: "AUTOFIRE {0} (F)",
        on: "ON",
        off: "OFF",
        dashReady: "DASH  SPACE",
        dash: "DASH",
        lv: "LV",
        boss: "BOSS {0}",
        warning: "WARNING",
        bossIncoming: "BOSS INCOMING",
        levelUp: "LEVEL UP!",
        chooseUpgrade: "Choose an upgrade  •  click or press {0}",
        new: "NEW!",
        paused: "PAUSED",
        resume: "Resume   (Esc)",
        restart: "Restart   (R)",
        mainMenu: "Main menu   (Q)",
        pauseLevel: "Level {0}  (+{1}% damage)",
        pauseSettings: "Sound {0} (M)   •   Autofire {1} (F)",
        noUpgrades: "No upgrades yet",
        subtitle: "Survive the invasion",
        start: "Click or press Enter to start",
        controls: "WASD move  •  Mouse aim  •  Esc pause  •  M sound  •  F autofire",
        highScore: "HIGH SCORE  {0}",
        gameOver: "GAME OVER",
        score: "Score",
        survived: "Survived",
        level: "Level",
        bossesDefeated: "Bosses defeated",
        newHighScore: "NEW HIGH SCORE!",
        bestScore: "Best: {0}",
        playAgain: "Play again (R)",
        toMenu: "Menu (Esc)",
        soundButton: "Sound: {0}   (M)",
        startTouch: "Tap to start",
        controlsTouch: "Left side: move  •  Aim and fire are automatic  •  Pause: top right",
        chooseUpgradeTouch: "Choose an upgrade",
        rotate: "Turn your phone sideways",
        bossDefeated: "BOSS DEFEATED! +{0}",
        shieldBroken: "SHIELD BROKEN",
        powerup_heal: "+25 HEALTH",
        powerup_rapid: "RAPID FIRE",
        powerup_triple: "TRIPLE SHOT",
        powerup_shield: "SHIELD",
        evolution: "EVOLUTION",
        chestFull: "FULL HEALTH +{0}",
        chestTitle: "CHEST REWARD",
        danger: "DANGER {0}",
        dangerLabel: "Danger",
        dangerNormal: "Normal difficulty",
        dangerInfo: "HP +{0}%  •  Damage +{1}%  •  Gold ×{2}",
        workshop: "WORKSHOP (W)",
        workshopTitle: "WORKSHOP",
        workshopHint: "Click a card to buy  •  Gold is kept between runs  •  Esc back",
        workshopNow: "Now: {0}",
        maxed: "MAX",
        back: "Back   (Esc)",
        goldEarned: "Gold earned",
        goldTotal: "total {0}",
        headstartTitle: "HEAD START",
        reroll: "Reroll (R)  ×{0}",
        dangerLocked: "Survive {0} on this level to unlock the next",
        dangerMaxed: "Highest danger level!",
        dangerUnlocked: "DANGER {0} UNLOCKED!",
        powerup_magnet: "MAGNET",
        powerup_freeze: "FREEZE",
        powerup_bomb: "BOMB",
    },
    tr: {
        best: "REKOR {0}",
        soundOff: "SES KAPALI (M)",
        autofire: "OTOMATİK ATEŞ {0} (F)",
        on: "AÇIK",
        off: "KAPALI",
        dashReady: "ATIL  SPACE",
        dash: "ATIL",
        lv: "SV",
        boss: "BOSS {0}",
        warning: "DİKKAT",
        bossIncoming: "BOSS GELİYOR",
        levelUp: "SEVİYE ATLADIN!",
        chooseUpgrade: "Bir yükseltme seç  •  tıkla ya da {0}'e bas",
        new: "YENİ!",
        paused: "DURAKLATILDI",
        resume: "Devam et   (Esc)",
        restart: "Yeniden başla   (R)",
        mainMenu: "Ana menü   (Q)",
        pauseLevel: "Seviye {0}  (+%{1} hasar)",
        pauseSettings: "Ses {0} (M)   •   Otomatik ateş {1} (F)",
        noUpgrades: "Henüz yükseltme yok",
        subtitle: "İstilaya karşı hayatta kal",
        start: "Başlamak için tıkla ya da Enter'a bas",
        controls: "WASD hareket  •  Fare nişan  •  Esc duraklat  •  M ses  •  F otomatik ateş",
        highScore: "EN YÜKSEK SKOR  {0}",
        gameOver: "OYUN BİTTİ",
        score: "Skor",
        survived: "Hayatta kalma",
        level: "Seviye",
        bossesDefeated: "Yenilen boss",
        newHighScore: "YENİ REKOR!",
        bestScore: "Rekor: {0}",
        playAgain: "Tekrar oyna (R)",
        toMenu: "Menü (Esc)",
        soundButton: "Ses: {0}   (M)",
        startTouch: "Başlamak için dokun",
        controlsTouch: "Sol taraf: hareket  •  Nişan ve ateş otomatik  •  Duraklatma: sağ üst",
        chooseUpgradeTouch: "Bir yükseltme seç",
        rotate: "Telefonu yan çevir",
        bossDefeated: "BOSS YENİLDİ! +{0}",
        shieldBroken: "KALKAN KIRILDI",
        powerup_heal: "+25 CAN",
        powerup_rapid: "HIZLI ATEŞ",
        powerup_triple: "ÜÇLÜ ATIŞ",
        powerup_shield: "KALKAN",
        evolution: "EVRİM",
        chestFull: "TAM CAN +{0}",
        chestTitle: "SANDIKTAN ÇIKTI",
        danger: "TEHLİKE {0}",
        dangerLabel: "Tehlike",
        dangerNormal: "Normal zorluk",
        dangerInfo: "Can +%{0}  •  Hasar +%{1}  •  Altın ×{2}",
        workshop: "ATÖLYE (W)",
        workshopTitle: "ATÖLYE",
        workshopHint: "Satın almak için karta tıkla  •  Altın oyunlar arası birikir  •  Esc geri",
        workshopNow: "Şu an: {0}",
        maxed: "MAKS",
        back: "Geri   (Esc)",
        goldEarned: "Kazanılan altın",
        goldTotal: "toplam {0}",
        headstartTitle: "ERKEN BAŞLANGIÇ",
        reroll: "Yenile (R)  ×{0}",
        dangerLocked: "Sonrakini açmak için bu seviyede {0} hayatta kal",
        dangerMaxed: "En yüksek tehlike seviyesi!",
        dangerUnlocked: "TEHLİKE {0} AÇILDI!",
        powerup_magnet: "MIKNATIS",
        powerup_freeze: "DONDURMA",
        powerup_bomb: "BOMBA",
    },
};

// Yükseltmelerin iki dildeki adı ve açıklaması: [isim, açıklama]
const UPGRADE_TEXT = {
    en: {
        damage: ["Power Shot", "+1 bullet damage"],
        firerate: ["Quick Trigger", "Shoot 15% faster"],
        multishot: ["Multishot", "+1 bullet per shot"],
        pierce: ["Piercing Rounds", "Bullets pass through +1 enemy"],
        speed: ["Swift Boots", "Move 10% faster"],
        bulletspeed: ["Velocity", "Bullets fly 20% faster"],
        vitality: ["Vitality", "+20 max health and heal 20"],
        magnet: ["Magnet", "Collect XP from farther away"],
        regen: ["Regeneration", "Regenerate health over time"],
        blades: ["Orbiting Blades", "+1 spinning blade circles around you"],
        crit: ["Critical Hit", "+10% chance to deal double damage"],
        explosive: ["Explosive Rounds", "Enemies explode on death and hurt others"],
        armor: ["Armor", "Take 10% less damage"],
        dash: ["Dash", "SPACE to dash, invincible while dashing"],
        lifesteal: ["Lifesteal", "Heal +0.5 health for every kill"],
        frost: ["Frost Aura", "Slow down enemies near you"],
        lucky: ["Lucky", "Power-ups drop more often"],
        railgun: ["Railgun", "Bullets pierce every enemy, +25% damage"],
        frostblades: ["Frost Blades", "+1 blade, blades freeze what they cut"],
        detonation: ["Detonation", "+10% crit chance, critical hits explode"],
    },
    tr: {
        damage: ["Güçlü Atış", "+1 mermi hasarı"],
        firerate: ["Hızlı Tetik", "%15 daha hızlı ateş"],
        multishot: ["Çoklu Atış", "Her atışta +1 mermi"],
        pierce: ["Delici Mermi", "Mermiler +1 düşmanın içinden geçer"],
        speed: ["Çevik Botlar", "%10 daha hızlı hareket"],
        bulletspeed: ["Mermi Hızı", "Mermiler %20 daha hızlı uçar"],
        vitality: ["Dayanıklılık", "+20 maksimum can ve 20 can"],
        magnet: ["Mıknatıs", "XP'yi daha uzaktan topla"],
        regen: ["Yenilenme", "Zamanla can yenile"],
        blades: ["Dönen Bıçaklar", "Etrafında dönen +1 bıçak"],
        crit: ["Kritik Vuruş", "+%10 ihtimalle 2 kat hasar"],
        explosive: ["Patlayıcı Mermi", "Ölen düşmanlar patlayıp etrafa hasar verir"],
        armor: ["Zırh", "%10 daha az hasar al"],
        dash: ["Atılma", "SPACE ile atıl, atılırken hasar almazsın"],
        lifesteal: ["Can Çalma", "Her öldürmede +0.5 can"],
        frost: ["Buz Aurası", "Yakınındaki düşmanları yavaşlat"],
        lucky: ["Şans", "Güçlendirmeler daha sık düşer"],
        railgun: ["Ray Tüfeği", "Mermiler bütün düşmanları deler, +%25 hasar"],
        frostblades: ["Buz Bıçakları", "+1 bıçak, bıçaklar kestiğini dondurur"],
        detonation: ["İnfilak", "+%10 kritik şansı, kritik vuruşlar patlar"],
    },
};

const WORKSHOP_TEXT = {
    en: {
        vitality: ["Sturdy Build", "+4 max health per level"],
        swift: ["Light Step", "+1.2% move speed per level"],
        wisdom: ["Wisdom", "+2% XP per level"],
        greed: ["Greed", "+5% gold per level"],
        reroll: ["Second Thoughts", "+1 card reroll each run"],
        wide: ["Wide Choice", "Level-ups offer 4 cards instead of 3"],
        headstart: ["Head Start", "Start every run with a random upgrade"],
    },
    tr: {
        vitality: ["Sağlam Yapı", "Seviye başına +4 maksimum can"],
        swift: ["Hafif Adım", "Seviye başına +%1.2 hareket hızı"],
        wisdom: ["Bilgelik", "Seviye başına +%2 XP"],
        greed: ["Açgözlülük", "Seviye başına +%5 altın"],
        reroll: ["İkinci Şans", "Her oyunda +1 kart yenileme hakkı"],
        wide: ["Geniş Seçim", "Seviye atlayınca 3 yerine 4 kart çıkar"],
        headstart: ["Erken Başlangıç", "Her oyuna rastgele bir yükseltmeyle başla"],
    },
};

// Seçili dil: daha önce seçildiyse o, yoksa tarayıcının dili
let language = loadLanguage();

function loadLanguage() {
    try {
        const saved = localStorage.getItem("incursioLanguage");
        if (saved === "en" || saved === "tr") return saved;
    } catch {}
    const browser = typeof navigator !== "undefined" ? navigator.language || "" : "";
    return browser.toLowerCase().startsWith("tr") ? "tr" : "en";
}

function setLanguage(lang) {
    language = lang;
    try {
        localStorage.setItem("incursioLanguage", lang);
    } catch {}
}

// Çeviri: T("best", 120) → "BEST 120" ya da "REKOR 120"
function T(key, ...args) {
    let text = STRINGS[language][key] ?? STRINGS.en[key] ?? key;
    args.forEach((value, i) => {
        text = text.replace("{" + i + "}", value);
    });
    return text;
}

function upgradeName(upgrade) {
    return UPGRADE_TEXT[language][upgrade.id][0];
}

function upgradeDesc(upgrade) {
    return UPGRADE_TEXT[language][upgrade.id][1];
}

function powerupName(type) {
    return T("powerup_" + type);
}

// Türkçede "i" büyük harfe "İ" olur, İngilizcede "I"
function upper(text) {
    return text.toLocaleUpperCase(language === "tr" ? "tr-TR" : "en-US");
}


// =====================================================
//  OTOMATİK ATEŞ
// =====================================================
// Açıkken fareye basmadan nişan yönüne kendiliğinden ateş edilir (F ile aç/kapat)
let autofire = loadAutofire();

function loadAutofire() {
    try {
        const saved = localStorage.getItem("incursioAutofire");
        if (saved !== null) return saved === "1";
    } catch {}
    return true; // varsayılan: açık
}

function toggleAutofire() {
    autofire = !autofire;
    try {
        localStorage.setItem("incursioAutofire", autofire ? "1" : "0");
    } catch {}
}


// =====================================================
//  BAYRAKLAR (ana menüde dil seçimi)
// =====================================================
// Bayraklar küçük bir canvas'a çizilip büyütülüyor: pixel art görünümü
const FLAG_W = 30;
const FLAG_H = 20;
const flagCache = {};

function getFlag(lang) {
    if (flagCache[lang]) return flagCache[lang];

    const c = document.createElement("canvas");
    c.width = FLAG_W;
    c.height = FLAG_H;
    const g = c.getContext("2d");

    if (lang === "tr") {
        // Türk bayrağı: kırmızı zemin, beyaz ay ve yıldız
        g.fillStyle = "#e30a17";
        g.fillRect(0, 0, FLAG_W, FLAG_H);
        g.fillStyle = "#ffffff";
        g.beginPath();
        g.arc(11, 10, 6, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#e30a17";
        g.beginPath();
        g.arc(12.6, 10, 4.8, 0, Math.PI * 2);
        g.fill();
        g.fillStyle = "#ffffff";
        g.beginPath();
        for (let i = 0; i < 10; i++) {
            const r = i % 2 === 0 ? 3 : 1.25;
            const a = -Math.PI / 2 + (Math.PI * i) / 5 + Math.PI / 2; // bir ucu sola baksın
            const px = 18.5 + Math.cos(a) * r;
            const py = 10 + Math.sin(a) * r;
            if (i === 0) g.moveTo(px, py);
            else g.lineTo(px, py);
        }
        g.closePath();
        g.fill();
    } else {
        // Birleşik Krallık bayrağı (sadeleştirilmiş)
        g.fillStyle = "#012169";
        g.fillRect(0, 0, FLAG_W, FLAG_H);
        g.strokeStyle = "#ffffff";
        g.lineWidth = 4;
        g.beginPath();
        g.moveTo(0, 0); g.lineTo(FLAG_W, FLAG_H);
        g.moveTo(FLAG_W, 0); g.lineTo(0, FLAG_H);
        g.stroke();
        g.strokeStyle = "#c8102e";
        g.lineWidth = 1.5;
        g.stroke();
        g.fillStyle = "#ffffff";
        g.fillRect(0, 7, FLAG_W, 6);
        g.fillRect(12, 0, 6, FLAG_H);
        g.fillStyle = "#c8102e";
        g.fillRect(0, 8, FLAG_W, 4);
        g.fillRect(13, 0, 4, FLAG_H);
    }

    flagCache[lang] = c;
    return c;
}

// Menüdeki bayrak butonlarının yeri (sağ üst)
const FLAG_LANGS = ["tr", "en"];

function getFlagRect(index) {
    const w = FLAG_W * 2;
    const h = FLAG_H * 2;
    const gap = 16;
    const total = FLAG_LANGS.length * w + (FLAG_LANGS.length - 1) * gap;
    return { x: canvas.width - 24 - total + index * (w + gap), y: 24, w, h };
}

function getFlagAt(x, y) {
    for (let i = 0; i < FLAG_LANGS.length; i++) {
        const r = getFlagRect(i);
        if (x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4) return i;
    }
    return -1;
}

function drawFlags() {
    const hovered = getFlagAt(mouse.x, mouse.y);
    FLAG_LANGS.forEach((lang, i) => {
        const r = getFlagRect(i);
        const selected = lang === language;
        if (selected) {
            ctx.fillStyle = UI.gold;
            ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
        }
        drawPanel(r.x, r.y, r.w, r.h);
        ctx.globalAlpha = selected || i === hovered ? 1 : 0.55; // seçili olmayan soluk
        ctx.drawImage(getFlag(lang), r.x, r.y, r.w, r.h);
        ctx.globalAlpha = 1;
    });
}


// =====================================================
//  ARAYÜZ (UI) STİLİ
// =====================================================
// Pixel art yazı tipi (index.html'de Google Fonts'tan yükleniyor), yüklenemezse yedek yazı tipi
const FONT = '"Pixelify Sans", "Courier New", monospace';

function font(size, bold = false) {
    return (bold ? "bold " : "") + size + "px " + FONT;
}

// Yazı tipini erkenden yüklemeye başla (canvas kendiliğinden yüklemeyebilir)
try {
    document.fonts.load(font(16));
    document.fonts.load(font(16, true));
} catch {}

// Arayüz renkleri: oyundaki ahşap çitle aynı tonlar
const UI = {
    line: "#2a1a0c",       // en dış koyu çizgi
    wood: "#8a5a2b",       // çerçeve tahtası
    woodLight: "#c4935a",  // çerçevenin ışık alan kenarı
    woodDark: "#5a3a1c",   // çerçevenin gölgeli kenarı
    inner: "rgba(24, 16, 8, 0.86)", // panelin içi
    text: "#fff4e0",
    textDim: "#d9c3a0",
    shadow: "#1a0f06",
    gold: "#ffd54f",
    red: "#ff6b6b",
    cyan: "#4dd0e1",
};

// Ahşap çerçeveli panel: dışta koyu çizgi, kabartmalı tahta kenar, içte koyu yarı saydam alan
function drawPanel(x, y, w, h, fill = UI.inner) {
    x = Math.round(x);
    y = Math.round(y);

    ctx.fillStyle = UI.line;
    ctx.fillRect(x - 5, y - 5, w + 10, h + 10);
    ctx.fillStyle = UI.wood;
    ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
    ctx.fillStyle = UI.woodLight;                 // üst ve sol kenar ışık alır
    ctx.fillRect(x - 3, y - 3, w + 6, 1);
    ctx.fillRect(x - 3, y - 3, 1, h + 6);
    ctx.fillStyle = UI.woodDark;                  // alt ve sağ kenar gölgede
    ctx.fillRect(x - 3, y + h + 2, w + 6, 1);
    ctx.fillRect(x + w + 2, y - 3, 1, h + 6);
    ctx.fillStyle = UI.line;                      // iç kenar çizgisi
    ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);

    // Köşelerde küçük çiviler
    ctx.fillStyle = "#e8c890";
    ctx.fillRect(x - 3, y - 3, 2, 2);
    ctx.fillRect(x + w + 1, y - 3, 2, 2);
    ctx.fillRect(x - 3, y + h + 1, 2, 2);
    ctx.fillRect(x + w + 1, y + h + 1, 2, 2);
}

function breakLigatures(text) {
    return String(text).replace(/f(?=[fiılt])/g, "f‌");
}

// Gölgeli yazı (y = yazının dikey ortası)
function drawText(text, x, y, size, color, align = "left", bold = false) {
    text = breakLigatures(text);
    ctx.font = font(size, bold);
    ctx.textAlign = align;
    ctx.textBaseline = "middle";
    const off = Math.max(1, Math.floor(size / 12));
    ctx.fillStyle = UI.shadow;
    ctx.fillText(text, x + off, y + off);
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
}

function drawCenteredText(text, y, size, color, bold = false) {
    drawText(text, canvas.width / 2, y, size, color, "center", bold);
}

// Uzun yazıyı kelime kelime bölüp satırlara sığdır (ortalı)
function drawWrappedText(text, centerX, y, maxWidth, lineHeight, size, color) {
    ctx.font = font(size);
    const words = text.split(" ");
    const lines = [];
    let line = "";

    for (const word of words) {
        const test = line ? line + " " + word : word;
        if (ctx.measureText(test).width > maxWidth && line) {
            lines.push(line);
            line = word;
        } else {
            line = test;
        }
    }
    lines.push(line);

    lines.forEach((l, i) => drawText(l, centerX, y + i * lineHeight, size, color, "center"));
}

// Küçük pixel ikonlar: her karakter bir piksel, rakamlar renk paletindeki rengi seçer
const ICONS = {
    heart: {
        map: ["0110110", "1211111", "1111111", "0111110", "0011100", "0001000"],
        colors: { 1: "#e53935", 2: "#ff8a80" },
    },
    coin: {
        map: ["0011100", "0122210", "1223221", "1223221", "1222221", "0122210", "0011100"],
        colors: { 1: "#a8740f", 2: "#ffd54f", 3: "#fff3a0" },
    },
    hourglass: {
        map: ["1111111", "0122210", "0012100", "0001000", "0012100", "0122210", "1111111"],
        colors: { 1: "#c4935a", 2: "#ffe7a0" },
    },
    crown: {
        map: ["1001001", "1101011", "1111111", "1212121", "1111111"],
        colors: { 1: "#ffd54f", 2: "#e53935" },
    },
    star: {
        map: ["0001000", "0011100", "1111111", "0111110", "0110110", "1100011"],
        colors: { 1: "#4dd0e1" },
    },
    skull: {
        map: ["0111110", "1111111", "1221221", "1111111", "0112110", "0111110", "0101010"],
        colors: { 1: "#efe6d8", 2: "#2a1a0c" },
    },
    lock: {
        map: ["0011100", "0100010", "0100010", "1111111", "1112111", "1112111", "1111111"],
        colors: { 1: "#8a7a64", 2: "#2a1a0c" },
    },
    ingot: {
        map: ["0111110", "1333331", "1111111", "1222221", "1222221", "1111111"],
        colors: { 1: "#a8740f", 2: "#ffd54f", 3: "#fff3a0" },
    },
};

function drawIcon(icon, x, y, scale = 2) {
    const map = icon.map;
    // Önce koyu gölge, sonra ikonun kendisi
    for (const pass of [0, 1]) {
        for (let row = 0; row < map.length; row++) {
            for (let col = 0; col < map[row].length; col++) {
                const c = map[row][col];
                if (c === "0") continue;
                ctx.fillStyle = pass === 0 ? UI.shadow : icon.colors[c];
                const off = pass === 0 ? scale : 0;
                ctx.fillRect(x + col * scale + off, y + row * scale + off, scale, scale);
            }
        }
    }
}

// Saniyeyi "2:05" biçimine çevir
function formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ":" + String(s).padStart(2, "0");
}

// Pixel art çubuk: koyu zemin, dolu kısım, üstte parlak şerit
function drawBar(x, y, w, h, ratio, color, lightColor, darkColor) {
    ctx.fillStyle = "#1a120a";
    ctx.fillRect(x, y, w, h);
    const fw = Math.round(w * Math.max(0, Math.min(1, ratio)));
    ctx.fillStyle = color;
    ctx.fillRect(x, y, fw, h);
    ctx.fillStyle = lightColor;
    ctx.fillRect(x, y, fw, Math.max(2, Math.floor(h / 3)));
    if (darkColor) {
        ctx.fillStyle = darkColor;
        ctx.fillRect(x, y + h - 2, fw, 2);
    }
}


// =====================================================
//  HUD (OYUN SIRASINDA EKRANDAKİ BİLGİLER)
// =====================================================
function drawHUD() {
    // --- Sol üst: can, skor ve süre ---
    drawPanel(16, 16, 262, 88);
    drawIcon(ICONS.heart, 24, 25, 2);
    drawHealthBar(46, 23, 224, 16);

    drawIcon(ICONS.coin, 24, 52, 2);
    drawText(String(score), 46, 59, 18, UI.gold, "left", true);
    drawIcon(ICONS.hourglass, 176, 52, 2);
    drawText(formatTime(gameTime), 198, 59, 18, UI.text, "left", true);

    drawIcon(ICONS.ingot, 24, 78, 2);
    drawText(formatGold(runGold), 46, 84, 16, UI.gold, "left", true);
    drawText(T("goldTotal", formatGold(gold)), 270, 84, 12, UI.textDim, "right");

    // --- Aktif güçlendirmeler: küçük paneller, altlarında kalan süre çubuğu ---
    let y = 118;
    for (const type in player.powerTimers) {
        const timeLeft = player.powerTimers[type];
        if (timeLeft <= 0) continue;
        drawPowerChip(y, type, powerupName(type), timeLeft / POWERUP_DURATION[type]);
        y += 36;
    }
    if (player.hasShield) {
        drawPowerChip(y, "shield", powerupName("shield"), 1);
    }

    // --- Sağ üst: mini harita ve rekor ---
    drawMinimap();

    // --- Dash göstergesi (seviye rozetinin üstünde) ---
    if (player.dashLevel > 0 && !touchMode) {
        const dy = canvas.height - 86;
        const ready = player.dashCooldown <= 0;
        drawPanel(16, dy, 112, 20);
        drawText(ready ? T("dashReady") : T("dash"), 22, dy + 8, 12, ready ? UI.cyan : UI.textDim, "left", true);
        const ratio = 1 - player.dashCooldown / DASH_COOLDOWNS[player.dashLevel];
        ctx.fillStyle = "#1a120a";
        ctx.fillRect(16, dy + 16, 112, 4);
        ctx.fillStyle = ready ? UI.cyan : "#1f6f7a";
        ctx.fillRect(16, dy + 16, Math.round(112 * ratio), 4);
    }

    // --- Alt: seviye rozeti ve XP barı ---
    const by = canvas.height - 50;
    drawPanel(16, by, 42, 34);
    drawText(T("lv"), 37, by + 9, 10, UI.textDim, "center", true);
    drawText(String(level), 37, by + 23, 18, UI.cyan, "center", true);

    const xpX = 72;
    const xpW = canvas.width - xpX - 16;
    drawPanel(xpX, canvas.height - 30, xpW, 10);
    drawBar(xpX, canvas.height - 30, xpW, 10, xp / xpToNext, "#26c6da", "#9ff6ff");

    // --- Boss barı (üstte ortada) ---
    if (boss) {
        const bw = 340;
        const bx = Math.round((canvas.width - bw) / 2);
        drawPanel(bx, 16, bw, 34);
        drawIcon(ICONS.crown, bx + 8, 21, 2);
        drawText(T("boss", boss.number), bx + 28, 26, 13, UI.red, "left", true);
        drawText(Math.ceil(boss.health) + " / " + boss.maxHealth, bx + bw - 8, 26, 12, UI.textDim, "right");
        drawBar(bx + 8, 36, bw - 16, 8, boss.health / boss.maxHealth, "#c62828", "#ef5350", "#7f0000");
    }

    drawChestReveal();
    if (touchMode) drawTouchControls();

    // --- Boss uyarısı (yanıp söner) ---
    if (bossWarning > 0 && Math.floor(bossWarning * 4) % 2 === 0) {
        drawCenteredText(T("warning"), canvas.height / 2 - 140, 44, UI.red, true);
        drawCenteredText(T("bossIncoming"), canvas.height / 2 - 104, 22, UI.gold, true);
    }
}

function drawCircleOutline(x, y, radius, fill, stroke, lineWidth) {
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) {
        ctx.fillStyle = fill;
        ctx.fill();
    }
    if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = lineWidth;
        ctx.stroke();
    }
}

function drawTouchControls() {
    const baseX = joystick ? joystick.baseX : 130;
    const baseY = joystick ? joystick.baseY : canvas.height - 150;
    const knobX = joystick ? joystick.x : baseX;
    const knobY = joystick ? joystick.y : baseY;

    ctx.globalAlpha = joystick ? 0.7 : 0.3;
    drawCircleOutline(baseX, baseY, JOYSTICK_RADIUS, "rgba(24, 16, 8, 0.45)", UI.woodLight, 3);
    drawCircleOutline(knobX, knobY, 24, UI.wood, UI.line, 3);
    ctx.globalAlpha = 1;

    if (player.dashLevel > 0) {
        const { x, y, r } = DASH_BUTTON;
        const ready = player.dashCooldown <= 0;
        const ratio = 1 - player.dashCooldown / DASH_COOLDOWNS[player.dashLevel];
        drawCircleOutline(x, y, r, ready ? "rgba(31, 111, 122, 0.75)" : "rgba(24, 16, 8, 0.6)", UI.line, 4);
        ctx.strokeStyle = ready ? UI.cyan : "#1f6f7a";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(x, y, r - 4, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
        ctx.stroke();
        drawText(T("dash"), x, y, 14, ready ? UI.text : UI.textDim, "center", true);
    }

    const p = getTouchPauseRect();
    drawPanel(p.x, p.y, p.w, p.h);
    ctx.fillStyle = UI.text;
    ctx.fillRect(p.x + 13, p.y + 11, 5, 18);
    ctx.fillRect(p.x + 22, p.y + 11, 5, 18);
}

function drawRotateHint() {
    dimScreen(0.92);
    const cx = canvas.width / 2;
    const cy = canvas.height / 2 - 30;
    drawPanel(cx - 90, cy - 40, 44, 80, UI.woodDark);
    drawArrow(cx, cy, 1, UI.gold);
    drawPanel(cx + 30, cy - 22, 80, 44, UI.woodDark);
    drawCenteredText(T("rotate"), cy + 90, 28, UI.text, true);
}

function drawChestReveal() {
    if (!chestReveal) return;

    const shown = CHEST_REVEAL_TIME - chestReveal.timer;
    const upgrade = chestReveal.upgrade;
    const color = upgrade && upgrade.evolution ? EVOLUTION_COLOR : UI.gold;
    const w = 400;
    const h = 84;
    const x = Math.round((canvas.width - w) / 2);
    const y = Math.round(78 - Math.max(0, 1 - shown / 0.25) * 24);

    const alpha = Math.max(0, Math.min(1, shown / 0.25, chestReveal.timer / 0.5));
    const glow = shown < 1.2 ? 0.75 + Math.sin(shown * 8) * 0.25 : 1;

    ctx.globalAlpha = alpha * glow;
    ctx.fillStyle = color;
    ctx.fillRect(x - 8, y - 8, w + 16, h + 16);
    ctx.globalAlpha = alpha;

    drawPanel(x, y, w, h, upgrade && upgrade.evolution ? "rgba(44, 24, 56, 0.97)" : "rgba(30, 20, 10, 0.97)");

    if (chestReveal.title) {
        drawIcon(ICONS.star, x + 20, y + (h - 36) / 2, 5);
    } else if (isReady(sprites.chest_open)) {
        ctx.drawImage(sprites.chest_open, x + 14, y + (h - 42) / 2, 48, 42);
    }

    const tx = x + 78;
    drawText(T(chestReveal.title || "chestTitle"), tx, y + 16, 12, color, "left", true);

    if (upgrade) {
        const tag = upgrade.evolution ? T("evolution") : T("lv") + " " + chestReveal.level + "/" + upgrade.max;
        drawText(tag, x + w - 12, y + 16, 12, color, "right", true);
        drawText(upgradeName(upgrade), tx, y + 40, 22, UI.text, "left", true);
        drawText(upgradeDesc(upgrade), tx, y + 64, 13, UI.textDim);
    } else {
        drawText(T("chestFull", CHEST_HEAL_SCORE), tx, y + 46, 22, UI.text, "left", true);
    }

    ctx.globalAlpha = 1;
}

// Güçlendirme göstergesi: ikon, isim ve kalan süre çubuğu
function drawPowerChip(y, type, name, ratio) {
    const w = 168;
    drawPanel(16, y, w, 22);
    const sprite = sprites["powerup_" + type];
    if (isReady(sprite)) {
        ctx.drawImage(sprite, 20, y + 2, 14, 14);
    }
    drawText(name, 40, y + 9, 12, UI.text, "left", true);
    ctx.fillStyle = "#1a120a";
    ctx.fillRect(16, y + 18, w, 4);
    ctx.fillStyle = POWERUP_TYPES[type].color;
    ctx.fillRect(16, y + 18, Math.round(w * ratio), 4);
}

// Can barı: hayalet kısım, düşük canda nabız, ortada sayı
function drawHealthBar(x, y, w, h) {
    const ratio = Math.max(0, player.health / player.maxHealth);
    const ghostRatio = Math.max(0, player.displayHealth / player.maxHealth);
    const low = ratio < 0.3;

    ctx.fillStyle = UI.line;
    ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
    ctx.fillStyle = "#3b1d1d";
    ctx.fillRect(x, y, w, h);

    // Hayalet kısım: az önce kaybedilen can (açık renk, yavaşça erir)
    ctx.fillStyle = "#ffd0a0";
    ctx.fillRect(x, y, Math.round(w * ghostRatio), h);

    // Asıl can: canı azken nabız gibi yanıp söner
    ctx.globalAlpha = low ? 0.6 + Math.sin(gameTime * 10) * 0.4 : 1;
    drawBar(x, y, w, h, ratio, low ? "#ff3b3b" : "#e53935", low ? "#ff8a80" : "#ef5350", "#b71c1c");
    ctx.globalAlpha = 1;

    // Can yenilenmesi varsa barın içinde sağda küçük yeşil artı
    if (player.regenRate > 0 && player.health < player.maxHealth) {
        ctx.fillStyle = "#66bb6a";
        ctx.fillRect(x + w - 12, y + 6, 8, 4);
        ctx.fillRect(x + w - 10, y + 4, 4, 8);
    }

    drawText(Math.ceil(player.health) + " / " + player.maxHealth, x + w / 2, y + h / 2, 12, UI.text, "center", true);
}

// Sağ üstteki mini harita (ahşap çerçeveli, opak)
function drawMinimap() {
    const w = 168;
    const h = Math.round(w * WORLD_HEIGHT / WORLD_WIDTH);
    const x = canvas.width - w - 16;
    const y = 16;
    const scale = w / WORLD_WIDTH; // dünya pikseli → mini harita pikseli

    drawPanel(x, y, w, h, "#24401f");

    // Orman şeridi (koyu) ve çit
    ctx.fillStyle = "#1a3416";
    ctx.fillRect(x, y, w, Math.round(WALL * scale));
    ctx.fillRect(x, y + h - Math.round(WALL * scale), w, Math.round(WALL * scale));
    ctx.fillRect(x, y, Math.round(WALL * scale), h);
    ctx.fillRect(x + w - Math.round(WALL * scale), y, Math.round(WALL * scale), h);
    ctx.strokeStyle = "#c4935a";
    ctx.lineWidth = 1;
    ctx.strokeRect(x + WALL * scale, y + WALL * scale, (WORLD_WIDTH - WALL * 2) * scale, (WORLD_HEIGHT - WALL * 2) * scale);

    // Kameranın gördüğü alan
    ctx.strokeStyle = "rgba(255, 244, 224, 0.55)";
    ctx.strokeRect(x + camera.x * scale, y + camera.y * scale, canvas.width * scale, canvas.height * scale);

    // Güçlendirmeler
    for (const powerUp of powerUps) {
        ctx.fillStyle = POWERUP_TYPES[powerUp.type].color;
        ctx.fillRect(x + powerUp.x * scale - 1.5, y + powerUp.y * scale - 1.5, 3, 3);
    }

    for (const chest of chests) {
        if (chest.opened) continue;
        ctx.fillStyle = UI.line;
        ctx.fillRect(x + chest.x * scale - 3, y + chest.y * scale - 3, 6, 6);
        ctx.fillStyle = UI.gold;
        ctx.fillRect(x + chest.x * scale - 2, y + chest.y * scale - 2, 4, 4);
    }

    // Düşmanlar
    for (const enemy of enemies) {
        if (enemy.isBoss) continue;
        ctx.fillStyle = enemy.elite ? UI.gold : "#ff5252";
        const size = enemy.elite ? 3 : 2;
        ctx.fillRect(x + enemy.x * scale - size / 2, y + enemy.y * scale - size / 2, size, size);
    }
    if (boss) {
        ctx.fillStyle = UI.gold;
        ctx.fillRect(x + boss.x * scale - 4, y + boss.y * scale - 4, 8, 8);
        ctx.fillStyle = "#c62828";
        ctx.fillRect(x + boss.x * scale - 3, y + boss.y * scale - 3, 6, 6);
    }

    // Oyuncu
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(x + player.x * scale - 3, y + player.y * scale - 3, 6, 6);
    ctx.fillStyle = "#4fc3f7";
    ctx.fillRect(x + player.x * scale - 2, y + player.y * scale - 2, 4, 4);

    // Mini haritanın altında rekor ve ses durumu
    let ty = y + h + 18;
    drawText(T("best", highScore), x + w, ty, 14, UI.textDim, "right", true);
    if (danger > 0) {
        ty += 18;
        drawText(T("danger", danger), x + w, ty, 12, getDangerColor(danger), "right", true);
    }
    if (!touchMode) {
        ty += 18;
        drawText(T("autofire", autofire ? T("on") : T("off")), x + w, ty, 12, autofire ? UI.cyan : UI.textDim, "right");
    }
    if (muted) {
        drawText(T("soundOff"), x + w, ty + 16, 12, UI.textDim, "right");
    }
}


// =====================================================
//  MENÜLER VE EKRANLAR
// =====================================================
// Ahşap buton
function drawButton(r, label, hovered) {
    if (hovered) {
        // Fare üstündeyse altın renkli parlama
        ctx.fillStyle = UI.gold;
        ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
    }
    drawPanel(r.x, r.y, r.w, r.h, hovered ? "#6b4420" : UI.inner);
    drawText(label, r.x + r.w / 2, r.y + r.h / 2, 18, hovered ? UI.gold : UI.text, "center", true);
}

function dimScreen(alpha) {
    ctx.fillStyle = `rgba(12, 8, 4, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawLevelUp() {
    dimScreen(0.7);

    drawCenteredText(T("levelUp"), 86, 42, UI.gold, true);
    const keyList = upgradeChoices.map((_, i) => i + 1).join(", ");
    drawCenteredText(touchMode ? T("chooseUpgradeTouch") : T("chooseUpgrade", keyList), 122, 15, UI.textDim);

    drawRerollButton();

    const hovered = getCardIndexAt(mouse.x, mouse.y);

    upgradeChoices.forEach((upgrade, i) => {
        const r = getCardRect(i, upgradeChoices.length);
        const cx = r.x + r.w / 2;
        const currentLevel = upgradeLevels[upgrade.id] || 0;
        const isHovered = i === hovered;
        const evolution = upgrade.evolution;

        if (isHovered) {
            ctx.fillStyle = UI.gold;
            ctx.fillRect(r.x - 9, r.y - 9, r.w + 18, r.h + 18);
        } else if (evolution) {
            ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 200) * 0.3;
            ctx.fillStyle = EVOLUTION_COLOR;
            ctx.fillRect(r.x - 9, r.y - 9, r.w + 18, r.h + 18);
            ctx.globalAlpha = 1;
        }
        const cardFill = isHovered ? "rgba(70, 44, 20, 0.96)" : evolution ? "rgba(44, 24, 56, 0.96)" : "rgba(30, 20, 10, 0.94)";
        drawPanel(r.x, r.y, r.w, r.h, cardFill);

        // Tuş numarası rozeti
        drawPanel(r.x + 10, r.y + 10, 22, 20, UI.woodDark);
        drawText(String(i + 1), r.x + 21, r.y + 20, 14, UI.text, "center", true);

        // Yeni yükseltme etiketi
        if (evolution) {
            drawText(T("evolution"), r.x + r.w - 12, r.y + 20, 13, EVOLUTION_COLOR, "right", true);
        } else if (currentLevel === 0) {
            drawText(T("new"), r.x + r.w - 12, r.y + 20, 13, UI.gold, "right", true);
        }

        // İsim, ayırıcı çizgi ve açıklama
        drawText(upgradeName(upgrade), cx, r.y + 62, 20, UI.text, "center", true);
        ctx.fillStyle = UI.woodDark;
        ctx.fillRect(r.x + 24, r.y + 82, r.w - 48, 2);
        ctx.fillStyle = UI.woodLight;
        ctx.fillRect(r.x + 24, r.y + 82, r.w - 48, 1);
        drawWrappedText(upgradeDesc(upgrade), cx, r.y + 108, r.w - 36, 20, 15, UI.textDim);

        if (evolution) {
            const recipe = upgrade.requires.map((id) => upgradeName(getUpgrade(id))).join(" + ");
            drawText(recipe, cx, r.y + r.h - 24, 12, EVOLUTION_COLOR, "center", true);
            return;
        }

        // Seviye kutucukları: dolu = alınmış, yanıp sönen = bu seçimle gelecek
        const pip = 12;
        const gap = 5;
        const total = upgrade.max * pip + (upgrade.max - 1) * gap;
        let px = cx - total / 2;
        const py = r.y + r.h - 30;
        for (let p = 0; p < upgrade.max; p++) {
            ctx.fillStyle = UI.line;
            ctx.fillRect(px - 1, py - 1, pip + 2, pip + 2);
            if (p < currentLevel) ctx.fillStyle = UI.gold;
            else if (p === currentLevel) ctx.fillStyle = Math.floor(gameTime * 4 + performance.now() / 250) % 2 ? UI.cyan : "#1f6f7a";
            else ctx.fillStyle = "#1a120a";
            ctx.fillRect(px, py, pip, pip);
            px += pip + gap;
        }
    });
}

function drawRerollButton() {
    if (!hasRerollButton()) return;
    const r = getRerollRect();
    const enabled = rerolls > 0;
    const hovered = enabled && isInRect(mouse.x, mouse.y, r);

    if (hovered) {
        ctx.fillStyle = UI.gold;
        ctx.fillRect(r.x - 6, r.y - 6, r.w + 12, r.h + 12);
    }
    drawPanel(r.x, r.y, r.w, r.h, hovered ? "#6b4420" : UI.inner);
    drawText(T("reroll", rerolls), r.x + r.w / 2, r.y + r.h / 2, 14, enabled ? UI.text : "#5a4a38", "center", true);
}

function drawPause() {
    dimScreen(0.65);

    const pw = 440;
    const ph = 440;
    const px = (canvas.width - pw) / 2;
    const py = 60;
    drawPanel(px, py, pw, ph);
    drawCenteredText(T("paused"), py + 44, 34, UI.text, true);
    if (danger > 0) drawCenteredText(T("danger", danger), py + 76, 14, getDangerColor(danger), true);

    // Butonlar
    const hovered = getPauseButtonAt(mouse.x, mouse.y);
    PAUSE_BUTTONS.forEach((button, i) => {
        const label = typeof button.label === "function" ? button.label() : T(button.label);
        drawButton(getPauseButtonRect(i), label, i === hovered);
    });

    // Bilgiler: seviye, ses ve alınan yükseltmeler
    const owned = UPGRADES
        .filter((u) => upgradeLevels[u.id])
        .map((u) => (u.evolution ? upgradeName(u) : upgradeName(u) + " " + upgradeLevels[u.id]));

    const lastButton = getPauseButtonRect(PAUSE_BUTTONS.length - 1);
    const infoY = lastButton.y + lastButton.h + 28;
    const onOff = (value) => (value ? T("on") : T("off"));
    drawCenteredText(T("pauseLevel", level, Math.round((getLevelDamageMultiplier() - 1) * 100)), infoY, 14, UI.textDim);
    drawCenteredText(T("pauseSettings", onOff(!muted), onOff(autofire)), infoY + 18, 13, UI.textDim);
    drawWrappedText(owned.length ? owned.join(", ") : T("noUpgrades"), canvas.width / 2, infoY + 40, pw - 36, 16, 12, UI.cyan);
}

// Oyunun adı: gölgeli ve kalın konturlu, iki tonlu
function drawLogo(y) {
    const text = "INCURSIO";
    ctx.font = font(84, true);
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    ctx.lineJoin = "round";

    // Gölge
    ctx.fillStyle = UI.shadow;
    ctx.fillText(text, canvas.width / 2 + 6, y + 6);

    // Kalın koyu kontur
    ctx.strokeStyle = "#0f1d2c";
    ctx.lineWidth = 12;
    ctx.strokeText(text, canvas.width / 2, y);

    // Yazının kendisi: üst yarısı açık, alt yarısı koyu mavi
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y - 80, canvas.width, 50);
    ctx.clip();
    ctx.fillStyle = "#8cc3f0";
    ctx.fillText(text, canvas.width / 2, y);
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.rect(0, y - 30, canvas.width, 40);
    ctx.clip();
    ctx.fillStyle = "#4a86c5";
    ctx.fillText(text, canvas.width / 2, y);
    ctx.restore();

    ctx.textAlign = "left";
}

function isInRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
}

function getDangerPanelRect() {
    const w = 420;
    return { x: (canvas.width - w) / 2, y: canvas.height / 2 + 140, w, h: 50 };
}

function getDangerArrowRect(dir) {
    const p = getDangerPanelRect();
    const w = 34;
    return { x: dir < 0 ? p.x + 8 : p.x + p.w - 8 - w, y: p.y + 8, w, h: p.h - 16 };
}

function getDangerArrowAt(x, y) {
    if (isInRect(x, y, getDangerArrowRect(-1))) return -1;
    if (isInRect(x, y, getDangerArrowRect(1))) return 1;
    return 0;
}

function drawArrow(cx, cy, dir, color) {
    ctx.fillStyle = color;
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(Math.round(cx + dir * (i * 2 - 4) - 1), Math.round(cy - (4 - i) * 2 - 1), 2, (4 - i) * 4 + 2);
    }
}

function drawDangerSelector() {
    const p = getDangerPanelRect();
    const hovered = getDangerArrowAt(mouse.x, mouse.y);
    const atTop = danger >= dangerUnlocked;

    drawPanel(p.x, p.y, p.w, p.h);

    for (const dir of [-1, 1]) {
        const r = getDangerArrowRect(dir);
        const enabled = dir < 0 ? danger > 0 : !atTop;
        const lit = enabled && hovered === dir;
        drawPanel(r.x, r.y, r.w, r.h, lit ? "#6b4420" : UI.woodDark);
        if (dir > 0 && atTop && danger < DANGER_MAX) {
            drawIcon(ICONS.lock, r.x + r.w / 2 - 7, r.y + r.h / 2 - 7, 2);
        } else {
            drawArrow(r.x + r.w / 2, r.y + r.h / 2, dir, lit ? UI.gold : enabled ? UI.text : "#5a4a38");
        }
    }

    const title = T("danger", danger);
    ctx.font = font(18, true);
    const tx = canvas.width / 2 - ctx.measureText(title).width / 2 + 11;
    drawIcon(ICONS.skull, tx - 24, p.y + 8, 2);
    drawText(title, tx, p.y + 16, 18, danger === 0 ? UI.text : getDangerColor(danger), "left", true);

    let info = danger === 0 ? T("dangerNormal") : T("dangerInfo", Math.round(DANGER_HEALTH * danger * 100), Math.round(DANGER_DAMAGE * danger * 100), 1 + DANGER_GOLD * danger);
    let infoColor = UI.textDim;
    if (hovered === 1 && atTop) {
        info = danger >= DANGER_MAX ? T("dangerMaxed") : T("dangerLocked", formatTime(DANGER_UNLOCK_TIME));
        infoColor = danger >= DANGER_MAX ? UI.gold : UI.red;
    }
    drawText(info, canvas.width / 2, p.y + 36, 12, infoColor, "center");
}

function getWorkshopButtonRect() {
    return { x: 24, y: 24, w: 170, h: 40 };
}

function drawWorkshopButton() {
    const r = getWorkshopButtonRect();
    const hovered = isInRect(mouse.x, mouse.y, r);
    if (hovered) {
        ctx.fillStyle = UI.gold;
        ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
    }
    drawPanel(r.x, r.y, r.w, r.h, hovered ? "#6b4420" : UI.inner);
    drawText(T("workshop"), r.x + 10, r.y + 12, 15, hovered ? UI.gold : UI.text, "left", true);
    drawIcon(ICONS.ingot, r.x + 10, r.y + 23, 2);
    drawText(formatGold(gold), r.x + 30, r.y + 29, 13, UI.gold, "left", true);
}

const WORKSHOP_CARD_W = 200;
const WORKSHOP_CARD_H = 158;
const WORKSHOP_GAP = 20;
const WORKSHOP_PER_ROW = 4;

function getWorkshopCardRect(index) {
    const row = Math.floor(index / WORKSHOP_PER_ROW);
    const col = index % WORKSHOP_PER_ROW;
    const count = Math.min(WORKSHOP_PER_ROW, WORKSHOP.length - row * WORKSHOP_PER_ROW);
    const total = count * WORKSHOP_CARD_W + (count - 1) * WORKSHOP_GAP;
    return {
        x: (canvas.width - total) / 2 + col * (WORKSHOP_CARD_W + WORKSHOP_GAP),
        y: 110 + row * (WORKSHOP_CARD_H + 24),
        w: WORKSHOP_CARD_W,
        h: WORKSHOP_CARD_H,
    };
}

function getWorkshopCardAt(x, y) {
    for (let i = 0; i < WORKSHOP.length; i++) {
        if (isInRect(x, y, getWorkshopCardRect(i))) return i;
    }
    return -1;
}

function getWorkshopBackRect() {
    return { x: (canvas.width - 200) / 2, y: 478, w: 200, h: 38 };
}

function formatPercent(value) {
    const rounded = Math.round(value * 10) / 10;
    return language === "tr" ? "+%" + rounded : "+" + rounded + "%";
}

function workshopEffect(item, lv) {
    if (item.id === "vitality") return "+" + WORKSHOP_HEALTH * lv;
    if (item.id === "swift") return formatPercent(WORKSHOP_SPEED * lv * 100);
    if (item.id === "wisdom") return formatPercent(WORKSHOP_XP * lv * 100);
    if (item.id === "greed") return formatPercent(WORKSHOP_GOLD * lv * 100);
    if (item.max === 1) return lv > 0 ? T("on") : T("off");
    return "×" + lv;
}

function drawWorkshop() {
    dimScreen(0.75);

    drawCenteredText(T("workshopTitle"), 46, 38, UI.gold, true);
    drawCenteredText(T("workshopHint"), 82, 14, UI.textDim);

    const gw = 140;
    const gx = canvas.width - gw - 24;
    drawPanel(gx, 24, gw, 34);
    drawIcon(ICONS.ingot, gx + 10, 35, 2);
    drawText(formatGold(gold), gx + gw - 10, 41, 18, UI.gold, "right", true);

    const hovered = getWorkshopCardAt(mouse.x, mouse.y);

    WORKSHOP.forEach((item, i) => {
        const r = getWorkshopCardRect(i);
        const cx = r.x + r.w / 2;
        const lv = workshopLevel(item.id);
        const maxed = lv >= item.max;
        const cost = workshopCost(item);
        const affordable = !maxed && gold >= cost;
        const isHovered = i === hovered;
        const [name, desc] = WORKSHOP_TEXT[language][item.id];

        if (isHovered && !maxed) {
            ctx.fillStyle = affordable ? UI.gold : "#5a3a1c";
            ctx.fillRect(r.x - 8, r.y - 8, r.w + 16, r.h + 16);
        }
        drawPanel(r.x, r.y, r.w, r.h, isHovered && affordable ? "rgba(70, 44, 20, 0.96)" : "rgba(30, 20, 10, 0.94)");

        drawText(name, cx, r.y + 20, 17, UI.text, "center", true);
        ctx.fillStyle = UI.woodDark;
        ctx.fillRect(r.x + 20, r.y + 36, r.w - 40, 2);
        ctx.fillStyle = UI.woodLight;
        ctx.fillRect(r.x + 20, r.y + 36, r.w - 40, 1);
        drawWrappedText(desc, cx, r.y + 54, r.w - 24, 16, 13, UI.textDim);
        drawText(T("workshopNow", workshopEffect(item, lv)), cx, r.y + 96, 12, UI.cyan, "center", true);

        const pip = 10;
        const gap = 4;
        let px = cx - (item.max * pip + (item.max - 1) * gap) / 2;
        for (let p = 0; p < item.max; p++) {
            ctx.fillStyle = UI.line;
            ctx.fillRect(px - 1, r.y + 111, pip + 2, pip + 2);
            ctx.fillStyle = p < lv ? UI.gold : "#1a120a";
            ctx.fillRect(px, r.y + 112, pip, pip);
            px += pip + gap;
        }

        if (maxed) {
            drawText(T("maxed"), cx, r.y + r.h - 16, 15, UI.gold, "center", true);
        } else {
            const text = String(cost);
            ctx.font = font(15, true);
            const left = cx - (ctx.measureText(text).width + 20) / 2;
            drawIcon(ICONS.ingot, left, r.y + r.h - 22, 2);
            drawText(text, left + 20, r.y + r.h - 16, 15, affordable ? UI.gold : UI.red, "left", true);
        }
    });

    drawButton(getWorkshopBackRect(), T("back"), isInRect(mouse.x, mouse.y, getWorkshopBackRect()));
}

function drawMenu() {
    dimScreen(0.5);

    const cy = canvas.height / 2;
    drawLogo(cy - 50);
    drawCenteredText(T("subtitle"), cy - 18, 20, UI.woodLight, true);

    // "Başlamak için tıkla" yazısı yavaşça yanıp söner
    ctx.globalAlpha = 0.6 + Math.sin(performance.now() / 300) * 0.4;
    drawCenteredText(touchMode ? T("startTouch") : T("start"), cy + 34, 24, UI.text, true);
    ctx.globalAlpha = 1;

    // Kontroller paneli ve otomatik ateş durumu
    const cw = 680;
    drawPanel((canvas.width - cw) / 2, cy + 72, cw, 30);
    drawCenteredText(touchMode ? T("controlsTouch") : T("controls"), cy + 87, 14, UI.textDim);
    if (!touchMode) {
        drawCenteredText(T("autofire", autofire ? T("on") : T("off")), cy + 122, 14, autofire ? UI.cyan : UI.textDim, true);
    }

    // Rekor: yazının genişliğine göre ortala, taç ikonu solunda
    const scoreText = T("highScore", highScore);
    ctx.font = font(18, true);
    const sw = ctx.measureText(scoreText).width;
    const sx = canvas.width / 2 - sw / 2 + 12;
    drawIcon(ICONS.crown, sx - 24, cy + 211, 2);
    drawText(scoreText, sx, cy + 216, 18, UI.gold, "left", true);

    drawDangerSelector();
    drawWorkshopButton();

    // Dil seçimi: sağ üstte bayraklar
    drawFlags();
}

function getGameOverLayout() {
    const pw = 420;
    const ph = 350 + (newDangerUnlocked ? 30 : 0);
    return { pw, ph, px: (canvas.width - pw) / 2, py: (canvas.height - ph) / 2 };
}

function getGameOverButtonRect(index) {
    const { px, py, pw, ph } = getGameOverLayout();
    const w = 170;
    const gap = 20;
    const left = px + (pw - (w * 2 + gap)) / 2;
    return { x: left + index * (w + gap), y: py + ph - 54, w, h: 38 };
}

function getGameOverButtonAt(x, y) {
    for (let i = 0; i < 2; i++) {
        if (isInRect(x, y, getGameOverButtonRect(i))) return i;
    }
    return -1;
}

function drawGameOver() {
    dimScreen(0.65);

    const { px, py, pw, ph } = getGameOverLayout();
    drawPanel(px, py, pw, ph);

    drawCenteredText(T("gameOver"), py + 42, 40, UI.red, true);

    // İstatistik satırları: ikon + etiket + değer
    const rows = [
        [ICONS.coin, T("score"), String(score), UI.gold],
        [ICONS.hourglass, T("survived"), formatTime(gameTime), UI.text],
        [ICONS.star, T("level"), String(level), UI.cyan],
        [ICONS.crown, T("bossesDefeated"), String(Math.max(0, bossCount - (boss ? 1 : 0))), UI.text],
        [ICONS.skull, T("dangerLabel"), String(danger), danger === 0 ? UI.text : getDangerColor(danger)],
        [ICONS.ingot, T("goldEarned"), "+" + formatGold(runGold), UI.gold],
    ];
    rows.forEach(([icon, label, value, color], i) => {
        const ry = py + 84 + i * 26;
        drawIcon(icon, px + 40, ry - 7, 2);
        drawText(label, px + 66, ry, 16, UI.textDim);
        drawText(value, px + pw - 40, ry, 18, color, "right", true);
    });

    // Rekor
    if (newRecord) {
        ctx.globalAlpha = 0.65 + Math.sin(performance.now() / 200) * 0.35;
        drawCenteredText(T("newHighScore"), py + 252, 22, UI.gold, true);
        ctx.globalAlpha = 1;
    } else {
        drawCenteredText(T("bestScore", highScore), py + 252, 16, UI.textDim);
    }

    if (newDangerUnlocked) {
        drawCenteredText(T("dangerUnlocked", dangerUnlocked), py + 282, 20, UI.red, true);
    }

    const hovered = getGameOverButtonAt(mouse.x, mouse.y);
    drawButton(getGameOverButtonRect(0), T("playAgain"), hovered === 0);
    drawButton(getGameOverButtonRect(1), T("toMenu"), hovered === 1);
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