const { getDefaultConfig } = require("expo/metro-config");
const http = require("http");

const config = getDefaultConfig(__dirname);

config.server = {
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      if (req.url.startsWith("/api/")) {
        const options = {
          hostname: "localhost",
          port: 3001,
          path: req.url,
          method: req.method,
          headers: { ...req.headers, host: "localhost:3001" },
        };
        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, {
            ...proxyRes.headers,
            "access-control-allow-origin": "*",
          });
          proxyRes.pipe(res, { end: true });
        });
        proxyReq.on("error", () => {
          res.writeHead(502, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Backend unavailable" }));
        });
        req.pipe(proxyReq, { end: true });
      } else {
        middleware(req, res, next);
      }
    };
  },
};

module.exports = config;
