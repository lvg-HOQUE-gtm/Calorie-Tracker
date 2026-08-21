# Sky Strike

A vertical-scrolling plane shooter you can play in the browser. No build step.

## How to run

Open `index.html` in a modern browser.

If the page does not load scripts from a `file://` URL, serve the folder:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Move | Arrow keys or WASD | Virtual stick (bottom left) |
| Fire | Space (hold to auto-fire) | FIRE button (bottom right) |
| Start / restart | Start button, Space, or Enter | Start / Play again |

## Gameplay

- You have **3 lives**. Hitting an enemy ship or bullet costs a life and grants brief invulnerability.
- Waves get denser: grunts, weaving fighters, and heavier tanks.
- Destroy enemies for score. Survive as many waves as you can.
