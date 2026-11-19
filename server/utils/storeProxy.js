/*
 * Sends store pages to the Next.js server (the customer website).
 *
 * On a live server this Express app is the front door: it answers /api,
 * /uploads and /admin itself and passes every other request (/, /shop,
 * /product/rice ...) to Next.js running privately on the same machine.
 * Because visitors connect to Express directly, the rate limiters see each
 * visitor's real IP address.
 */
const http = require("http");

// Headers that belong to one connection only and must not be copied.
const HOP_BY_HOP = ["connection", "keep-alive", "proxy-connection", "transfer-encoding", "upgrade", "te", "trailer"];

function createStoreProxy(nextUrl) {
  const target = new URL(nextUrl);

  return function storeProxy(req, res) {
    const headers = { ...req.headers };
    for (const name of HOP_BY_HOP) delete headers[name];
    const forwardedFor = req.headers["x-forwarded-for"];
    headers["x-forwarded-for"] = forwardedFor ? `${forwardedFor}, ${req.socket.remoteAddress}` : req.socket.remoteAddress;
    headers["x-forwarded-proto"] = req.protocol;
    headers["x-forwarded-host"] = req.get("host");

    const upstream = http.request(
      { hostname: target.hostname, port: target.port, method: req.method, path: req.originalUrl, headers },
      (upstreamRes) => {
        // Next.js sends its own security rules for its pages; the API's strict
        // Content-Security-Policy would block Next.js's own page scripts.
        res.removeHeader("Content-Security-Policy");
        const responseHeaders = { ...upstreamRes.headers };
        for (const name of HOP_BY_HOP) delete responseHeaders[name];
        res.writeHead(upstreamRes.statusCode || 502, responseHeaders);
        upstreamRes.pipe(res);
      }
    );

    upstream.on("error", () => {
      if (res.headersSent) return res.end();
      res.status(502).type("text/plain").send("The store is starting. Please refresh in a moment.");
    });
    req.pipe(upstream);
  };
}

module.exports = { createStoreProxy };
