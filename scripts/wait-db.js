#!/usr/bin/env node

/**
 * Aguarda o PostgreSQL ficar saudável antes de prosseguir.
 * Usa `docker compose ps` para verificar o health check do container.
 */

const { execSync } = require('child_process');

const MAX_ATTEMPTS = 30;
const INTERVAL_MS  = 2000;
const SERVICE      = 'postgres';

const colors = {
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
};

function isHealthy() {
  try {
    const out = execSync(`docker compose ps --format json ${SERVICE} 2>/dev/null`, {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    // docker compose ps --format json pode retornar múltiplas linhas (uma por container)
    const lines = out.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const json = JSON.parse(line);
        if (json.Health === 'healthy') return true;
        if (json.State === 'running' && !json.Health) return true; // sem healthcheck configurado
      } catch {}
    }
    return false;
  } catch {
    return false;
  }
}

async function wait() {
  console.log(colors.cyan(`\n⏳ Aguardando PostgreSQL ficar pronto...`));

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (isHealthy()) {
      console.log(colors.green(`✅ PostgreSQL está pronto! (tentativa ${attempt})\n`));
      process.exit(0);
    }

    process.stdout.write(colors.yellow(`   [${attempt}/${MAX_ATTEMPTS}] Tentando novamente em ${INTERVAL_MS / 1000}s...\r`));
    await new Promise((r) => setTimeout(r, INTERVAL_MS));
  }

  console.error(colors.red(`\n❌ PostgreSQL não ficou pronto após ${MAX_ATTEMPTS} tentativas.`));
  console.error(colors.red(`   Verifique com: docker compose ps && docker compose logs postgres`));
  process.exit(1);
}

wait();
