import Anthropic from "@anthropic-ai/sdk";
import http from "http";

const client = new Anthropic();

const routes = {
  "/": {
    method: "GET",
    handler: async (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          message: "Bienvenido al servidor HTTP",
          routes: ["/", "/about", "/status", "/ask"],
        })
      );
    },
  },
  "/about": {
    method: "GET",
    handler: async (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          title: "About",
          description: "Mini servidor HTTP con rutas básicas",
          version: "1.0.0",
          author: "Eres Lira",
        })
      );
    },
  },
  "/status": {
    method: "GET",
    handler: async (req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          status: "online",
          timestamp: new Date().toISOString(),
          uptime: process.uptime(),
        })
      );
    },
  },
  "/ask": {
    method: "POST",
    handler: async (req, res) => {
      let body = "";

      req.on("data", (chunk) => {
        body += chunk.toString();
      });

      req.on("end", async () => {
        try {
          const data = JSON.parse(body);
          const question = data.question;

          if (!question) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(
              JSON.stringify({ error: "Question parameter is required" })
            );
            return;
          }

          console.log("Processing question:", question);

          const message = await client.messages.create({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1024,
            messages: [
              {
                role: "user",
                content: question,
              },
            ],
          });

          const answer =
            message.content[0].type === "text" ? message.content[0].text : "";

          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              question: question,
              answer: answer,
              timestamp: new Date().toISOString(),
            })
          );
        } catch (error) {
          console.error("Error processing request:", error);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: "Error processing request",
              details: error instanceof Error ? error.message : String(error),
            })
          );
        }
      });
    },
  },
};

const server = http.createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
  const route = routes[pathname];

  // Enable CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.writeHead(200);
    res.end();
    return;
  }

  if (route && req.method === route.method) {
    await route.handler(req, res);
  } else if (!route) {
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Route not found",
        path: pathname,
        availableRoutes: Object.keys(routes),
      })
    );
  } else {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        error: "Method not allowed",
        method: req.method,
        path: pathname,
      })
    );
  }
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Servidor HTTP ejecutándose en http://localhost:${PORT}`);
  console.log("Rutas disponibles:");
  console.log("  GET  /          - Página de inicio");
  console.log("  GET  /about     - Información del servidor");
  console.log("  GET  /status    - Estado del servidor");
  console.log("  POST /ask       - Hacer preguntas con Claude");
  console.log("\nEjemplo de uso con curl:");
  console.log(
    '  curl -X POST http://localhost:3000/ask -H "Content-Type: application/json" -d \'{"question": "¿Cuál es 2+2?"}\''
  );
});