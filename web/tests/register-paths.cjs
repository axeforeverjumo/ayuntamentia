const Module = require('module');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const srcRoot = path.join(projectRoot, 'src');
const originalResolveFilename = Module._resolveFilename;

Module._resolveFilename = function patchedResolve(request, parent, isMain, options) {
  if (request.startsWith('@/')) {
    const relativePath = request.slice(2);
    const candidates = [
      path.join(srcRoot, relativePath),
      path.join(srcRoot, `${relativePath}.js`),
      path.join(srcRoot, `${relativePath}.cjs`),
      path.join(srcRoot, `${relativePath}.mjs`),
      path.join(srcRoot, `${relativePath}.ts`),
      path.join(srcRoot, `${relativePath}.tsx`),
      path.join(srcRoot, relativePath, 'index.js'),
      path.join(srcRoot, relativePath, 'index.ts'),
      path.join(srcRoot, relativePath, 'index.tsx'),
    ];

    for (const candidate of candidates) {
      try {
        return originalResolveFilename.call(this, candidate, parent, isMain, options);
      } catch {}
    }
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};
