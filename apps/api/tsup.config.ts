import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/server.ts'],
  format: ['esm'],
  target: 'node22',
  platform: 'node',
  clean: true,
  sourcemap: true,
  // Bundle workspace packages (they ship TS source); keep npm deps external.
  noExternal: [/^@pavana\//],
});
