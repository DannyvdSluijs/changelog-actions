import { build } from 'esbuild';

// Each action gets its own self-contained bundle next to its action.yml.
// Output is CommonJS (.cjs) because package.json declares "type": "module".
const actions = ['update', 'release'];

await Promise.all(
  actions.map((action) =>
    build({
      entryPoints: [`src/${action}/main.ts`],
      outfile: `${action}/dist/index.cjs`,
      bundle: true,
      platform: 'node',
      target: 'node24',
      format: 'cjs',
      legalComments: 'none',
    }),
  ),
);
