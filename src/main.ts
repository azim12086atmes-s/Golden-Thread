import './ui/styles.css';
import { Game } from './Game';

const host = document.getElementById('app')!;
try {
  const game = new Game(host);
  if (import.meta.env.DEV) import('./dev').then((m) => m.installDev(game));
} catch (err) {
  host.innerHTML = `<div class="fatal"><h1>The Golden Thread</h1><p>This browser could not start the game (WebGL is required).</p><pre>${String(err)}</pre></div>`;
  throw err;
}
