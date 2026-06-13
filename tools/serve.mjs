// Shared: start a vite dev server, return { url, stop }.
import { createServer } from 'vite';

export async function serve() {
  const server = await createServer({
    configFile: 'vite.config.ts',
    server: { port: 5199, strictPort: false },
    logLevel: 'silent',
  });
  await server.listen();
  const address = server.httpServer.address();
  const url = `http://localhost:${address.port}`;
  return {
    url,
    stop: () => server.close(),
  };
}

export async function launchBrowser() {
  const { chromium } = await import('playwright');
  return chromium.launch({
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
}
