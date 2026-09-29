import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// قراءة .env بسيطة بدون مكتبات
try {
  for (const line of fs.readFileSync(path.join(__dirname, ".env"), "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const app = express();
app.use(express.json({ limit: "25mb" }));

// وسيط يخفي مفتاح Anthropic عن المتصفح
app.post("/api/scan", async (req, res) => {
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "ANTHROPIC_API_KEY غير موجود في ملف .env" });
  }
  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: process.env.CLAUDE_MODEL || "claude-sonnet-4-6",
        max_tokens: 1500,
        messages: req.body.messages,
      }),
    });
    res.status(r.status).json(await r.json());
  } catch (e) {
    res.status(502).json({ error: String(e) });
  }
});

// تقديم التطبيق بعد البناء
const dist = path.join(__dirname, "dist");
if (fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get("*", (_, res) => res.sendFile(path.join(dist, "index.html")));
}

const port = process.env.PORT || 3001;
app.listen(port, "0.0.0.0", () => console.log("Server on http://localhost:" + port));
