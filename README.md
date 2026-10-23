<div align="center">

# Incursio

**English** | [Türkçe](README.tr.md)

*Latin for "invasion".* A fast-paced top-down shooter that runs right in your browser.<br>
Built from scratch with vanilla JavaScript and the HTML5 Canvas API — no game engine, no libraries, no build step.

### [▶ Play Now](https://enes0102.github.io/incursio/)

![Gameplay](assets/gameplay.gif)

</div>

## About

Survive as long as you can against endless waves of enemies that get faster, tougher and more numerous over time. Collect XP to level up and build your own loadout from stackable upgrades, take down a new boss every minute, and chase the high score.

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Mouse | Aim |
| Left click (hold) | Shoot |
| `1` `2` `3` / Click | Choose an upgrade on level up |
| `Enter` / Click | Start game |
| `R` | Play again after game over |
| `Esc` / `P` | Pause / resume |
| `R` / `Q` (paused) | Restart / quit to menu |
| `Esc` (game over) | Back to menu |
| `M` | Mute / unmute sound |

## Features

- **XP and level-up system** — defeated enemies drop XP gems; every level lets you pick one of three random upgrades
- **Boss fights** every 60 seconds, each boss tougher than the last
- **Large fenced meadow** (about 3×3 screens) surrounded by forest, with a camera that follows the player and a minimap
- **Pixel art world**: grass with natural light and dark patches, wooden fences, trees, flowers, mushrooms, stumps, bushes and rocks
- **Smooth movement and aiming** with frame-rate independent physics (delta time)
- **Automatic fire** with a fire-rate limit, so holding the button is as fair as clicking
- **Three enemy types** with different size, speed and health
- **Four power-ups** dropped by defeated enemies
- **Dynamic difficulty** — enemies spawn faster and move quicker the longer you survive
- **Invincibility frames** after taking damage
- **Pixel art sprites** with hit flashes
- **Game feel effects**: particle explosions, screen shake, damage flash and floating text
- **Procedural sound effects** generated in real time with the Web Audio API — no audio files
- **Persistent high score** saved in the browser with `localStorage`
- **Game states**: start menu, pause menu, level-up and game over screens

### Enemies

| Enemy | Description |
| --- | --- |
| 🔴 Normal | The standard enemy. Appears from the start. |
| 🟠 Fast | Small and quick. Appears after 15 seconds. |
| 🟣 Tank | Big, slow and takes 4 hits. Appears after 30 seconds and drops power-ups more often. |

### Boss

A crowned giant appears every 60 seconds after a warning. It slowly chases you and alternates between two attacks: a ring of bullets in every direction and an aimed spread shot. Each new boss has more health, fires more bullets and attacks more often. Defeating it gives a big score bonus, lots of XP and guaranteed power-ups.

### Upgrades

| Upgrade | Effect | Max |
| --- | --- | --- |
| Power Shot | +1 bullet damage | 5 |
| Quick Trigger | Shoot 15% faster | 5 |
| Multishot | +1 bullet per shot | 3 |
| Piercing Rounds | Bullets pass through +1 enemy | 3 |
| Swift Boots | Move 10% faster | 5 |
| Velocity | Bullets fly 20% faster | 3 |
| Vitality | +1 max health and heal 1 | 5 |
| Magnet | Collect XP from farther away | 3 |

### Power-ups

| Power-up | Effect |
| --- | --- |
| 🟢 `+` Health | Restores 1 health |
| 🟡 `R` Rapid Fire | Shoots 2.5× faster for 6 seconds |
| 🔵 `3` Triple Shot | Fires three bullets at once for 8 seconds |
| 🟣 `S` Shield | Blocks the next hit you take |

## Running Locally

No installation needed. Clone the repository and open `index.html` in any modern browser:

```bash
git clone https://github.com/Enes0102/incursio.git
cd incursio
```

For automatic reloading while editing, you can use the **Live Server** extension in VS Code.

## Project Structure

```
incursio/
├── assets/
│   ├── gameplay.gif   # Gameplay preview
│   └── sprites/       # Pixel art sprites (PNG)
│       └── tiles/     # Grass, fence, tree and decoration tiles
├── index.html         # Page and canvas element
├── style.css          # Page layout and styling
├── game.js            # All game logic: input, entities, effects, sound and rendering
├── README.md          # English documentation
└── README.tr.md       # Turkish documentation
```

## Built With

- JavaScript (ES6+)
- HTML5 Canvas API
- Web Audio API
- CSS

## Author

**Enescan Güleryüz** — [@Enes0102](https://github.com/Enes0102)
