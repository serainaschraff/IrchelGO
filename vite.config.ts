import {
  createReadStream,
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { extname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, type Plugin, type ViteDevServer } from 'vite';
import react from '@vitejs/plugin-react';

const eightWallRuntimeDir = resolve(
  fileURLToPath(new URL('./node_modules/@8thwall/engine-binary/dist/', import.meta.url)),
);
const eightWallPublicPath = '/xr-runtime';

function getEightWallRuntimeFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = join(directory, entry.name);
    return entry.isDirectory() ? getEightWallRuntimeFiles(entryPath) : [entryPath];
  });
}

function eightWallRuntimePlugin(): Plugin {
  return {
    name: '8th-wall-runtime',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(eightWallPublicPath, (request, response, next) => {
        const requestPath = decodeURIComponent(request.url?.split('?')[0] ?? '/')
          .replace(/^\/+/, '');
        const filePath = resolve(eightWallRuntimeDir, requestPath);
        if (
          !filePath.startsWith(`${eightWallRuntimeDir}${sep}`) ||
          !existsSync(filePath) ||
          !statSync(filePath).isFile()
        ) {
          next();
          return;
        }
        const contentType =
          extname(filePath) === '.js'
            ? 'text/javascript'
            : extname(filePath) === '.svg'
              ? 'image/svg+xml'
              : extname(filePath) === '.glb'
                ? 'model/gltf-binary'
                : 'application/octet-stream';
        response.setHeader('Content-Type', contentType);
        createReadStream(filePath).pipe(response);
      });
    },
    generateBundle() {
      for (const filePath of getEightWallRuntimeFiles(eightWallRuntimeDir)) {
        const runtimeRelativePath = relative(eightWallRuntimeDir, filePath).replace(/\\/g, '/');
        if (
          runtimeRelativePath === 'xr-face.js' ||
          runtimeRelativePath.startsWith('resources/face-') ||
          runtimeRelativePath.startsWith('resources/dom-tablet-') ||
          runtimeRelativePath === 'resources/powered-by.svg'
        ) {
          continue;
        }
        this.emitFile({
          type: 'asset',
          fileName: `xr-runtime/${runtimeRelativePath.replace(/\\/g, '/')}`,
          source: readFileSync(filePath),
        });
      }
    },
  };
}

export default defineConfig({
  base: process.env.GITHUB_ACTIONS === 'true' ? '/IrchelGO/' : '/',
  plugins: [react(), eightWallRuntimePlugin()],
  resolve: {
    dedupe: ['three']
  },
  server: {
    host: true,
    strictPort: true,
    allowedHosts: ['.loca.lt']
  }
});