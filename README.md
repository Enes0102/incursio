# Browser Shooter Game

A fast-paced top-down shooter that runs right in your browser. Built from scratch with vanilla JavaScript and the HTML5 Canvas API — no game engine, no libraries, no build step.

**[▶ Play it here](https://enes0102.github.io/browser-shooter-game/)**

Survive as long as you can against endless waves of enemies that get faster, tougher and more numerous over time. Grab power-ups, chase the high score, and see how long you last.

<!-- Add a screenshot or GIF of the game here -->

## Controls

| Key | Action |
| --- | --- |
| `W` `A` `S` `D` | Move |
| Mouse | Aim |
| Left click (hold) | Shoot |
| `Enter` / `Space` / Click | Start game |
| `R` | Restart after game over |
| `Esc` | Back to menu |
| `M` | Mute / unmute sound |

## Features

- **Smooth movement and aiming** with frame-rate independent physics (delta time)
- **Automatic fire** with a fire-rate limit, so holding the button is as fair as clicking
- **Three enemy types** with different size, speed and health
- **Four power-ups** dropped by defeated enemies
- **Dynamic difficulty** — enemies spawn faster and move quicker the longer you survive
- **Juicy effects**: particle explosions, screen shake, damage flash and floating text
- **Procedural sound effects** generated in real time with the Web Audio API (no audio files)
- **Persistent high score** saved in the browser with `localStorage`
- **Game states**: start menu, gameplay and game over screens

### Enemies

| Enemy | Description |
| --- | --- |
| 🔴 Normal | The standard enemy. Appears from the start. |
| 🟠 Fast | Small and quick. Appears after 15 seconds. |
| 🟣 Tank | Big, slow and takes 4 hits. Appears after 30 seconds and drops power-ups more often. |

### Power-ups

| Power-up | Effect |
| --- | --- |
| 🟢 `+` Heal | Restores 1 health (up to 5) |
| 🟡 `R` Rapid Fire | Shoots 2.5× faster for 6 seconds |
| 🔵 `3` Triple Shot | Fires three bullets at once for 8 seconds |
| 🟣 `S` Shield | Enemies are destroyed on contact for 6 seconds |

## Running Locally

No installation needed. Clone the repository and open `index.html` in any modern browser:

```bash
git clone https://github.com/Enes0102/browser-shooter-game.git
cd browser-shooter-game
```

For automatic reloading while editing, you can use the **Live Server** extension in VS Code.

## Project Structure

```
browser-shooter-game/
├── index.html   # Page and canvas element
├── style.css    # Page layout and styling
└── game.js      # All game logic: input, entities, effects, sound and rendering
```

## Built With

- JavaScript (ES6+)
- HTML5 Canvas API
- Web Audio API
- CSS

## Author

**Enescan Güleryüz** — [@Enes0102](https://github.com/Enes0102)
