#!/usr/bin/env node
/**
 * « npm run dev » : démarre l'API PHP et Expo ensemble.
 * L'API écoute sur 0.0.0.0 (toutes les adresses du PC) : elle répond quelle que soit l'IP du Wi-Fi,
 * et l'application trouve seule cette IP (src/config/env.ts). Rien à changer en changeant de réseau.
 * Dossier du backend : AXI_BACKEND_DIR, sinon /var/www/html/Axi_ventes_backend-php.
 */
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const backend = process.env.AXI_BACKEND_DIR || '/var/www/html/Axi_ventes_backend-php';
const port = Number(process.env.EXPO_PUBLIC_API_PORT || readEnvPort() || 8000);

function readEnvPort() {
  try {
    return fs.readFileSync(path.join(__dirname, '..', '.env.local'), 'utf8').match(/^EXPO_PUBLIC_API_PORT=(\d+)/m)?.[1];
  } catch {
    return undefined;
  }
}

/** Le port est-il déjà pris (API déjà lancée dans un autre terminal) ? */
function portBusy() {
  return new Promise((resolve) => {
    const socket = net.connect(port, '127.0.0.1');
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('error', () => resolve(false));
  });
}

(async () => {
  let php = null;
  if (await portBusy()) {
    console.log(`› API : déjà lancée sur le port ${port}`);
  } else if (!fs.existsSync(path.join(backend, 'public', 'index.php'))) {
    console.warn(`› API : dossier introuvable (${backend}). Indiquez-le avec AXI_BACKEND_DIR=…`);
  } else {
    php = spawn('php', ['-d', 'upload_max_filesize=32M', '-d', 'post_max_size=40M', '-S', `0.0.0.0:${port}`, '-t', 'public', 'public/index.php'], { cwd: backend, stdio: ['ignore', 'ignore', 'pipe'] });
    // Le serveur PHP écrit chaque requête : on ne montre que les erreurs
    php.stderr.on('data', (chunk) => {
      for (const line of String(chunk).split('\n')) if (/fatal|error|warning|failed/i.test(line)) console.warn(`› API : ${line.trim()}`);
    });
    php.on('error', (e) => console.warn(`› API : impossible de lancer php (${e.message})`));
    console.log(`› API : http://0.0.0.0:${port} (toutes les adresses du PC)`);
  }

  const expo = spawn('npx', ['expo', 'start', ...process.argv.slice(2)], { stdio: 'inherit' });
  const stop = () => {
    php?.kill();
    expo.kill();
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  expo.on('exit', (code) => {
    php?.kill();
    process.exit(code ?? 0);
  });
})();
