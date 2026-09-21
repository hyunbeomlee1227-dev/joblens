import { createServer } from "node:http";

import next from "next";

export default async function globalSetup() {
  const hostname = "127.0.0.1";
  const port = 3000;
  const app = next({ dev: false, hostname, port });
  const handle = app.getRequestHandler();

  await app.prepare();

  const server = createServer((request, response) => handle(request, response));

  await new Promise<void>((resolve) => server.listen(port, hostname, resolve));

  return async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await app.close();
  };
}
