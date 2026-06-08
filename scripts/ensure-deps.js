#!/usr/bin/env node

/**
 * Verifica se node_modules existem em cada subpacote.
 * Instala apenas onde estiver faltando para não atrasar o dev start.
 */

const { execSync } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const packages = [
  { name: 'root',     dir: ROOT },
  { name: 'backend',  dir: path.join(ROOT, 'backend') },
  { name: 'frontend', dir: path.join(ROOT, 'frontend') },
];

const colors = {
  cyan:   (s) => `\x1b[36m${s}\x1b[0m`,
  green:  (s) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red:    (s) => `\x1b[31m${s}\x1b[0m`,
  dim:    (s) => `\x1b[2m${s}\x1b[0m`,
};

let anyInstalled = false;

for (const pkg of packages) {
  const nm = path.join(pkg.dir, 'node_modules');

  if (existsSync(nm)) {
    console.log(colors.dim(`  ✓ ${pkg.name}/node_modules já existe`));
    continue;
  }

  console.log(colors.yellow(`\n📦 Instalando dependências do ${pkg.name}...`));
  try {
    execSync('npm install', { cwd: pkg.dir, stdio: 'inherit' });
    console.log(colors.green(`  ✅ ${pkg.name} instalado\n`));
    anyInstalled = true;
  } catch (err) {
    console.error(colors.red(`  ❌ Falha ao instalar ${pkg.name}: ${err.message}`));
    process.exit(1);
  }
}

if (!anyInstalled) {
  console.log(colors.cyan('  Dependências OK — iniciando...\n'));
}
