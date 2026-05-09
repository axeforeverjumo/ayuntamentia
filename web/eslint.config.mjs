import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const catalanRouteRule = {
  plugins: {
    local: {
      rules: {
        'catalan-visible-routes': {
          meta: {
            type: 'problem',
            docs: {
              description: 'Impedeix rutes visibles fora de la convenció catalana',
            },
            schema: [],
          },
          create(context) {
            const forbiddenSegments = new Set([
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
            ]);
            const allowedPrefixes = ['/api/', '/_next/', '//', '/legal', '/favicon.ico', '/images/', '/icons/', '/fonts/'];

            function inspectLiteral(node) {
              if (!node || typeof node.value !== 'string') return;
              const value = node.value;
              if (!value.startsWith('/')) return;
              if (allowedPrefixes.some((prefix) => value.startsWith(prefix))) return;
              const cleanValue = value.split('?')[0].split('#')[0];
              const segments = cleanValue.split('/').filter(Boolean);
              const forbidden = segments.find((segment) => forbiddenSegments.has(segment));
              if (!forbidden) return;
              context.report({
                node,
                message: `Ruta visible fora de la convenció catalana: ${value}`,
              });
            }

            return {
              Literal(node) {
                inspectLiteral(node);
              },
              TemplateElement(node) {
                inspectLiteral(node);
              },
            };
          },
        },
      },
    },
  },
  rules: {
    'local/catalan-visible-routes': 'error',
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  catalanRouteRule,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
