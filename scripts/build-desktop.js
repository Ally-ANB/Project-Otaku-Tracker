const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

const apiDir = path.join(__dirname, '..', 'src', 'app', 'api');
const hiddenApiDir = path.join(__dirname, '..', 'src', 'app', '_api');
const nextCacheDir = path.join(__dirname, '..', '.next');

try {
  // 1. Oculta a pasta API
  if (fs.existsSync(apiDir)) {
    console.log('[Tauri Build] Ocultando pasta API...');
    fs.renameSync(apiDir, hiddenApiDir);
  }

  // 2. EXTERMÍNIO DE CACHE: Deleta a pasta .next para evitar erros do TypeScript
  if (fs.existsSync(nextCacheDir)) {
    console.log('[Tauri Build] Limpando cache do Next.js...');
    fs.rmSync(nextCacheDir, { recursive: true, force: true });
  }

  // 3. Roda o build limpo
  console.log('[Tauri Build] Compilando frontend...');
  execSync('npx cross-env BUILD_TARGET=desktop next build', { stdio: 'inherit' });

} catch (error) {
  console.error('[Tauri Build] Erro crítico no build:', error);
  process.exit(1);
} finally {
  // 4. Restaura a pasta API
  if (fs.existsSync(hiddenApiDir)) {
    console.log('[Tauri Build] Restaurando pasta API...');
    fs.renameSync(hiddenApiDir, apiDir);
  }
}
