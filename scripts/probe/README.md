# Browser probe

Drive the running game from a script and take screenshots, for checking visual changes.

    npx vite --port 5191 --strictPort &          # the dev server
    mkdir -p shots
    NODE_PATH=$(npm root -g) CHROME=/path/to/chrome PORT=5191 node scripts/probe/probe.cjs scripts/probe/example.js

The script body runs inside the page after `prelude.js` (which clears the save, starts the game, skips the
opening, and defines `RGN` (regions), `measure()`, `fastGo()`). In the script, `dev` is `window.dev`, `game`
is the Game, and `await shot(name)` writes `shots/<name>.png` (or `$SHOTS/<name>.png`). Return a value to
print it. Use `quiet(secs)` (see example.js) to advance time without rendering — software GL is slow (a
frame can take 10 s). Do not edit source files while a probe runs: Vite's hot reload restarts the page.
