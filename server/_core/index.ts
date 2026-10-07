import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { resolve } from "node:path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { publicPlatformScript } from "./publicConfig";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { resolveSessionUser } from "../accountAuth";
import { checkDatabaseAdmin } from "../adminAccess";
import { serveStatic, setupVite } from "./vite";

async function startServer() {
  const app = express();
  const server = createServer(app);
  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.get("/api/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/api/platform/config.js", (_req, res) => {
    res.set("Cache-Control", "no-store").type("application/javascript").send(publicPlatformScript());
  });
  if (process.env.NODE_ENV !== "production") {
    const uploadDir = resolve(process.env.LOCAL_UPLOAD_DIR || ".local-storage");
    app.use("/local-storage", express.static(uploadDir, { dotfiles: "deny", index: false, fallthrough: false }));
  }
  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  app.use("/admin", async (req, res, next) => {
    try {
      const user = await resolveSessionUser(req);
      if (await checkDatabaseAdmin(user) === "allowed") return next();
    } catch {
      // Fail closed: a session or database error must not reach the admin HTML.
    }
    return res.redirect(302, "/");
  });
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number(process.env.PORT || "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("Invalid PORT");
  server.on("error", error => { console.error("Server failed:", error.message); process.exit(1); });
  server.listen(port, "0.0.0.0", () => console.log(`Server listening on port ${port}`));
}

startServer().catch(error => { console.error(error); process.exit(1); });
