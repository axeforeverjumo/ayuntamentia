import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve('src');
const EXTENSIONS = new Set(['.ts', '.tsx']);
const IGNORE_DIRS = new Set(['node_modules', '.next']);
const ALLOWED_PREFIXES = [
  '/api/',
  '/_next/',
  '//',
  '/legal',
  '/favicon.ico',
  '/images/',
  '/icons/',
  '/fonts/',
];
const FORBIDDEN_SEGMENTS = [
  'login',
  'dashboard',
  'chat',
  'workspace',
  'buscar',
  'admin',
  'landing',
  'settings',
  'suscripciones',
  'recepcion',
  'municipios',
  'actas',
  'admin',
  'buscar',
  'recepcion',
  'suscripciones',
  'landing',
  'settings',
  'login',
  'dashboard',
  'chat',
  'workspace',
];
const ROUTE_LITERAL_REGEX = /(["'`])\/(?!api\/|_next\/|\/)([^\s"'`}]*)\1/g;

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(fullPath));
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      files.push(fullPath);
    }
  }
  return files;
}

function isAllowedRouteLiteral(route) {
  return ALLOWED_PREFIXES.some((prefix) => route.startsWith(prefix));
}

function hasForbiddenSegment(route) {
  const cleanRoute = route.split('?')[0].split('#')[0];
  const segments = cleanRoute.split('/').filter(Boolean);
  return segments.find((segment) => FORBIDDEN_SEGMENTS.includes(segment));
}

const violations = [];

for (const filePath of walk(ROOT)) {
  const source = fs.readFileSync(filePath, 'utf8');
  const lines = source.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const match of line.matchAll(ROUTE_LITERAL_REGEX)) {
      const route = `/${match[2]}`;
      if (isAllowedRouteLiteral(route)) continue;
      const forbidden = hasForbiddenSegment(route);
      if (!forbidden) continue;
      violations.push({
        file: path.relative(process.cwd(), filePath),
        line: index + 1,
        route,
        forbidden,
      });
    }
  });
}

if (violations.length > 0) {
  console.error('Rutes visibles fora de la convenció catalana detectades:');
  for (const violation of violations) {
    console.error(`- ${violation.file}:${violation.line} → ${violation.route} (segment: ${violation.forbidden})`);
  }
  process.exit(1);
}

console.log('Validació OK: no s\'han detectat rutes visibles fora del català.');
