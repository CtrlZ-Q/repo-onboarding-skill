#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();

const SENSITIVE_EXACT = new Set([
  '.env',
  '.env.local',
  '.env.production',
  '.env.development',
  'credentials.json',
  'id_rsa',
  'id_ed25519',
]);

const GENERATED_DIRS = [
  'generated',
  'src/generated',
  'app/generated',
  'dist',
  'build',
  '.next',
  '.nuxt',
  'coverage',
  'node_modules',
  'vendor',
  'target',
  '__generated__',
  'graphql/generated',
];

const CONFIG_FILES = [
  'package.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'package-lock.json',
  'bun.lockb',
  'bun.lock',
  'tsconfig.json',
  'jsconfig.json',
  'vite.config.ts',
  'vite.config.js',
  'next.config.js',
  'next.config.mjs',
  'next.config.ts',
  'nuxt.config.ts',
  'nuxt.config.js',
  'svelte.config.js',
  'pyproject.toml',
  'requirements.txt',
  'uv.lock',
  'poetry.lock',
  'Pipfile',
  'Pipfile.lock',
  'pytest.ini',
  'tox.ini',
  'Cargo.toml',
  'Cargo.lock',
  'go.mod',
  'go.sum',
  'pom.xml',
  'build.gradle',
  'build.gradle.kts',
  'Makefile',
  'Dockerfile',
  'docker-compose.yml',
  'docker-compose.yaml',
  'CLAUDE.md',
  'README.md',
  'README.zh-CN.md',
];

const ENTRY_CANDIDATES = [
  'src/main.tsx',
  'src/main.ts',
  'src/main.jsx',
  'src/main.js',
  'src/index.tsx',
  'src/index.ts',
  'src/index.jsx',
  'src/index.js',
  'app/page.tsx',
  'pages/index.tsx',
  'app/main.py',
  'main.py',
  'manage.py',
  'server.js',
  'server.ts',
  'src/server.ts',
  'src/server.js',
  'cmd/main.go',
  'src/main.rs',
];

const TEST_CONFIGS = [
  'vitest.config.ts',
  'vitest.config.js',
  'jest.config.ts',
  'jest.config.js',
  'playwright.config.ts',
  'playwright.config.js',
  'cypress.config.ts',
  'cypress.config.js',
  'pytest.ini',
  'conftest.py',
  'tox.ini',
];

function rel(file) {
  return file.split(path.sep).join('/');
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

function isDir(relativePath) {
  try {
    return fs.statSync(path.join(root, relativePath)).isDirectory();
  } catch {
    return false;
  }
}

function safeRead(relativePath, limit = 120_000) {
  const base = path.basename(relativePath);
  const lower = base.toLowerCase();
  if (SENSITIVE_EXACT.has(base) || lower.endsWith('.pem') || lower.endsWith('.key') || lower.startsWith('secrets.')) {
    return null;
  }

  const fullPath = path.join(root, relativePath);
  try {
    const stat = fs.statSync(fullPath);
    if (!stat.isFile() || stat.size > limit) return null;
    return fs.readFileSync(fullPath, 'utf8');
  } catch {
    return null;
  }
}

function readJson(relativePath) {
  const text = safeRead(relativePath);
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function listRootEntries() {
  try {
    return fs.readdirSync(root, { withFileTypes: true })
      .filter((entry) => !entry.name.startsWith('.git'))
      .map((entry) => ({
        name: entry.name,
        type: entry.isDirectory() ? 'dir' : 'file',
      }))
      .sort((a, b) => {
        if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  } catch {
    return [];
  }
}

function detectPackageManagers() {
  const managers = [];
  const add = (name, file) => {
    if (exists(file)) managers.push({ name, file });
  };

  add('pnpm', 'pnpm-lock.yaml');
  add('yarn', 'yarn.lock');
  add('npm', 'package-lock.json');
  add('bun', 'bun.lockb');
  add('bun', 'bun.lock');
  add('uv', 'uv.lock');
  add('poetry', 'poetry.lock');
  add('pipenv', 'Pipfile.lock');
  if (exists('Cargo.toml')) add('cargo', 'Cargo.toml');
  if (exists('go.mod')) add('go', 'go.mod');
  if (exists('pom.xml')) add('maven', 'pom.xml');
  if (exists('build.gradle')) add('gradle', 'build.gradle');
  if (exists('build.gradle.kts')) add('gradle', 'build.gradle.kts');

  return managers;
}

function dependencyNames(packageJson) {
  if (!packageJson) return new Set();
  return new Set([
    ...Object.keys(packageJson.dependencies || {}),
    ...Object.keys(packageJson.devDependencies || {}),
    ...Object.keys(packageJson.peerDependencies || {}),
  ]);
}

function detectJsStack(packageJson) {
  const deps = dependencyNames(packageJson);
  const stack = [];
  const addDep = (dep, label) => {
    if (deps.has(dep)) stack.push({ label, evidence: `package.json dependency: ${dep}` });
  };

  addDep('react', 'React');
  addDep('vue', 'Vue');
  addDep('next', 'Next.js');
  addDep('nuxt', 'Nuxt');
  addDep('@sveltejs/kit', 'SvelteKit');
  addDep('vite', 'Vite');
  addDep('express', 'Express');
  addDep('@nestjs/core', 'NestJS');
  addDep('typescript', 'TypeScript');
  addDep('vitest', 'Vitest');
  addDep('jest', 'Jest');
  addDep('@playwright/test', 'Playwright');
  addDep('cypress', 'Cypress');

  if (exists('vite.config.ts') || exists('vite.config.js')) {
    stack.push({ label: 'Vite', evidence: 'vite.config.*' });
  }
  if (exists('next.config.js') || exists('next.config.mjs') || exists('next.config.ts')) {
    stack.push({ label: 'Next.js', evidence: 'next.config.*' });
  }
  if (exists('nuxt.config.ts') || exists('nuxt.config.js')) {
    stack.push({ label: 'Nuxt', evidence: 'nuxt.config.*' });
  }

  return dedupeStack(stack);
}

function detectPythonStack() {
  const texts = [
    ['pyproject.toml', safeRead('pyproject.toml')],
    ['requirements.txt', safeRead('requirements.txt')],
  ].filter(([, text]) => text);

  const stack = [];
  for (const [file, text] of texts) {
    const lower = text.toLowerCase();
    const add = (needle, label) => {
      if (lower.includes(needle)) stack.push({ label, evidence: `${file}: ${needle}` });
    };
    add('fastapi', 'FastAPI');
    add('django', 'Django');
    add('flask', 'Flask');
    add('pytest', 'pytest');
    add('ruff', 'Ruff');
    add('mypy', 'mypy');
    add('uvicorn', 'Uvicorn');
  }

  if (exists('manage.py')) stack.push({ label: 'Django', evidence: 'manage.py' });
  if (exists('pytest.ini') || exists('conftest.py')) stack.push({ label: 'pytest', evidence: 'pytest config' });

  return dedupeStack(stack);
}

function detectRustStack() {
  const cargo = safeRead('Cargo.toml');
  if (!cargo) return [];
  const lower = cargo.toLowerCase();
  const stack = [{ label: 'Rust', evidence: 'Cargo.toml' }];
  for (const [needle, label] of [
    ['axum', 'Axum'],
    ['actix-web', 'Actix Web'],
    ['rocket', 'Rocket'],
    ['tokio', 'Tokio'],
    ['tauri', 'Tauri'],
  ]) {
    if (lower.includes(needle)) stack.push({ label, evidence: `Cargo.toml: ${needle}` });
  }
  return dedupeStack(stack);
}

function detectGoStack() {
  const mod = safeRead('go.mod');
  if (!mod) return [];
  const lower = mod.toLowerCase();
  const stack = [{ label: 'Go', evidence: 'go.mod' }];
  for (const [needle, label] of [
    ['gin-gonic/gin', 'Gin'],
    ['labstack/echo', 'Echo'],
    ['gofiber/fiber', 'Fiber'],
    ['grpc', 'gRPC'],
  ]) {
    if (lower.includes(needle)) stack.push({ label, evidence: `go.mod: ${needle}` });
  }
  return dedupeStack(stack);
}

function detectJavaStack() {
  const pom = safeRead('pom.xml') || '';
  const gradle = safeRead('build.gradle') || safeRead('build.gradle.kts') || '';
  const text = `${pom}\n${gradle}`.toLowerCase();
  if (!text.trim()) return [];
  const stack = [{ label: 'Java/JVM', evidence: exists('pom.xml') ? 'pom.xml' : 'build.gradle*' }];
  if (text.includes('spring-boot')) stack.push({ label: 'Spring Boot', evidence: 'spring-boot dependency/plugin' });
  if (text.includes('junit')) stack.push({ label: 'JUnit', evidence: 'junit dependency' });
  return dedupeStack(stack);
}

function dedupeStack(items) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const key = item.label.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      result.push(item);
    }
  }
  return result;
}

function detectStack() {
  const packageJson = readJson('package.json');
  const stack = [];

  if (packageJson) {
    stack.push({ label: 'JavaScript/TypeScript', evidence: 'package.json' });
    stack.push(...detectJsStack(packageJson));
  }
  if (exists('pyproject.toml') || exists('requirements.txt')) {
    stack.push({ label: 'Python', evidence: exists('pyproject.toml') ? 'pyproject.toml' : 'requirements.txt' });
    stack.push(...detectPythonStack());
  }
  stack.push(...detectRustStack());
  stack.push(...detectGoStack());
  stack.push(...detectJavaStack());

  return dedupeStack(stack);
}

function getPackageScripts(packageJson) {
  if (!packageJson?.scripts) return [];
  return Object.entries(packageJson.scripts).map(([name, command]) => ({ name, command, source: 'package.json' }));
}

function getMakeTargets() {
  const makefile = safeRead('Makefile');
  if (!makefile) return [];
  const targets = [];
  for (const line of makefile.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_.-]+):(?:\s|$)/);
    if (match && !match[1].startsWith('.')) {
      targets.push(match[1]);
    }
  }
  return [...new Set(targets)].slice(0, 30);
}

function candidateCommands(packageManagers, packageJson) {
  const primaryJs = packageManagers.find((m) => ['pnpm', 'yarn', 'npm', 'bun'].includes(m.name))?.name;
  const scripts = packageJson?.scripts || {};
  const commands = [];

  const jsRun = (script) => {
    if (!primaryJs) return null;
    if (primaryJs === 'npm') return `npm run ${script}`;
    if (primaryJs === 'yarn') return `yarn ${script}`;
    if (primaryJs === 'bun') return `bun run ${script}`;
    return `pnpm ${script}`;
  };

  for (const [kind, names] of [
    ['install', []],
    ['dev', ['dev', 'start']],
    ['test', ['test', 'test:unit']],
    ['build', ['build']],
    ['lint', ['lint']],
    ['typecheck', ['typecheck', 'type-check', 'tsc']],
  ]) {
    if (kind === 'install' && primaryJs) {
      commands.push({ kind, command: `${primaryJs} install`, source: `${packageManagers.find((m) => m.name === primaryJs)?.file}` });
      continue;
    }
    const found = names.find((name) => scripts[name]);
    if (found) commands.push({ kind, command: jsRun(found), source: `package.json#scripts.${found}` });
  }

  if (exists('pyproject.toml') || exists('requirements.txt')) {
    if (packageManagers.some((m) => m.name === 'uv')) {
      commands.push({ kind: 'install', command: 'uv sync', source: 'uv.lock / pyproject.toml' });
      commands.push({ kind: 'test', command: 'uv run pytest', source: 'pytest convention' });
    } else if (packageManagers.some((m) => m.name === 'poetry')) {
      commands.push({ kind: 'install', command: 'poetry install', source: 'poetry.lock / pyproject.toml' });
      commands.push({ kind: 'test', command: 'poetry run pytest', source: 'pytest convention' });
    } else if (exists('requirements.txt')) {
      commands.push({ kind: 'install', command: 'pip install -r requirements.txt', source: 'requirements.txt' });
      if (exists('pytest.ini') || exists('conftest.py')) {
        commands.push({ kind: 'test', command: 'pytest', source: 'pytest config' });
      }
    }
  }

  if (exists('Cargo.toml')) {
    commands.push({ kind: 'build', command: 'cargo build', source: 'Cargo.toml convention' });
    commands.push({ kind: 'test', command: 'cargo test', source: 'Cargo.toml convention' });
  }

  if (exists('go.mod')) {
    commands.push({ kind: 'test', command: 'go test ./...', source: 'go.mod convention' });
    commands.push({ kind: 'build', command: 'go build ./...', source: 'go.mod convention' });
  }

  if (exists('pom.xml')) {
    commands.push({ kind: 'test', command: 'mvn test', source: 'pom.xml convention' });
    commands.push({ kind: 'build', command: 'mvn package', source: 'pom.xml convention' });
  }

  if (exists('build.gradle') || exists('build.gradle.kts')) {
    commands.push({ kind: 'test', command: './gradlew test', source: 'Gradle convention' });
    commands.push({ kind: 'build', command: './gradlew build', source: 'Gradle convention' });
  }

  return commands;
}

function findExisting(paths) {
  return paths.filter((p) => exists(p));
}

function findCoreDirs() {
  const candidates = [
    'src',
    'app',
    'pages',
    'components',
    'lib',
    'server',
    'client',
    'api',
    'services',
    'hooks',
    'stores',
    'tests',
    'test',
    '__tests__',
    'docs',
    'scripts',
    'config',
    'cmd',
    'internal',
    'pkg',
    'migrations',
  ];
  return candidates.filter((p) => isDir(p));
}

function findGitHubWorkflows() {
  const dir = path.join(root, '.github', 'workflows');
  try {
    return fs.readdirSync(dir).filter((name) => name.endsWith('.yml') || name.endsWith('.yaml')).map((name) => `.github/workflows/${name}`);
  } catch {
    return [];
  }
}

function detectRisks(packageManagers) {
  const risks = [];
  const managerNames = new Set(packageManagers.map((m) => m.name));
  const jsManagers = [...managerNames].filter((name) => ['pnpm', 'yarn', 'npm', 'bun'].includes(name));
  const pyManagers = [...managerNames].filter((name) => ['uv', 'poetry', 'pipenv'].includes(name));

  if (jsManagers.length > 1) {
    risks.push(`检测到多个 JS lockfile / 包管理器：${packageManagers.filter((m) => ['pnpm', 'yarn', 'npm', 'bun'].includes(m.name)).map((m) => `${m.name}(${m.file})`).join(', ')}。需要人工确认优先使用哪个。`);
  }
  if (pyManagers.length > 1) {
    risks.push(`检测到多个 Python 依赖管理信号：${packageManagers.filter((m) => ['uv', 'poetry', 'pipenv'].includes(m.name)).map((m) => `${m.name}(${m.file})`).join(', ')}。需要人工确认。`);
  }

  for (const dir of GENERATED_DIRS) {
    if (exists(dir)) risks.push(`存在可能不应手改的目录：${dir}`);
  }

  for (const file of ['.env', '.env.local', '.env.production', 'credentials.json']) {
    if (exists(file)) risks.push(`存在敏感配置文件：${file}。不要读取或打印内容。`);
  }

  return risks;
}

function section(title) {
  return `\n## ${title}\n`;
}

function bullet(items, empty = '未检测到。') {
  if (!items.length) return `${empty}\n`;
  return items.map((item) => `- ${item}`).join('\n') + '\n';
}

function table(headers, rows) {
  if (!rows.length) return '未检测到。\n';
  const head = `| ${headers.join(' | ')} |`;
  const sep = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.map((cell) => String(cell).replace(/\n/g, '<br>')).join(' | ')} |`);
  return [head, sep, ...body].join('\n') + '\n';
}

function main() {
  const rootEntries = listRootEntries();
  const packageJson = readJson('package.json');
  const packageManagers = detectPackageManagers();
  const stack = detectStack();
  const scripts = getPackageScripts(packageJson);
  const makeTargets = getMakeTargets();
  const configFiles = findExisting(CONFIG_FILES);
  const entryFiles = findExisting(ENTRY_CANDIDATES);
  const testConfigs = findExisting(TEST_CONFIGS);
  const coreDirs = findCoreDirs();
  const workflows = findGitHubWorkflows();
  const commands = candidateCommands(packageManagers, packageJson);
  const risks = detectRisks(packageManagers);

  let out = '';
  out += '# repo-onboarding 初步扫描结果\n';
  out += `\n项目路径：\`${rel(root)}\`\n`;
  out += '\n> 这是自动扫描结果。请结合 README、CLAUDE.md、核心配置和入口文件生成最终 onboarding 报告；不要把推断当成事实。\n';

  out += section('根目录概览');
  out += bullet(rootEntries.slice(0, 80).map((entry) => `\`${entry.name}${entry.type === 'dir' ? '/' : ''}\``));
  if (rootEntries.length > 80) out += `\n还有 ${rootEntries.length - 80} 个根目录条目未展示。\n`;

  out += section('检测到的配置文件');
  out += bullet(configFiles.map((file) => `\`${file}\``));

  out += section('技术栈信号');
  out += table(['识别结果', '依据'], stack.map((item) => [item.label, item.evidence]));

  out += section('包管理器信号');
  out += table(['工具', '依据'], packageManagers.map((item) => [item.name, `\`${item.file}\``]));

  out += section('package.json scripts');
  out += table(['script', 'command'], scripts.map((item) => [`\`${item.name}\``, `\`${item.command}\``]));

  out += section('Makefile targets');
  out += bullet(makeTargets.map((target) => `\`${target}\``));

  out += section('候选常用命令');
  out += table(['用途', '命令', '来源'], commands.map((item) => [item.kind, `\`${item.command}\``, item.source]));

  out += section('核心目录候选');
  out += bullet(coreDirs.map((dir) => `\`${dir}/\``));

  out += section('入口文件候选');
  out += bullet(entryFiles.map((file) => `\`${file}\``));

  out += section('测试配置候选');
  out += bullet(testConfigs.map((file) => `\`${file}\``));

  out += section('CI workflow');
  out += bullet(workflows.map((file) => `\`${file}\``));

  out += section('风险与注意事项');
  out += bullet(risks);

  out += section('建议下一步');
  out += '1. 阅读 `README.md`、`CLAUDE.md` 和上面列出的核心配置。\n';
  out += '2. 如果存在多个 lockfile，先确认包管理器。\n';
  out += '3. 阅读入口文件和核心目录，补充架构 / 数据流说明。\n';
  out += '4. 使用 `templates/project-onboarding-template.md` 结构生成最终报告。\n';

  process.stdout.write(out);
}

main();
