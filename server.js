const http = require("http");
const fs = require("fs");
const path = require("path");

function loadEnv() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    process.env[key] = trimmed.slice(eq + 1).trim();
  }
}

loadEnv();
const { GoogleGenAI } = require("@google/genai");
const { getAllMessages, addMessage, clearMessages } = require("./db");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const FALLBACK_MODEL = "gemini-2.5-flash-lite";
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  `You are a senior QA Automation expert. Answer at a high level: test strategy, automation frameworks, CI/CD, quality gates, tooling trade-offs, and best practices.
Keep answers clear, practical, and structured. Prefer concepts over long code blocks unless the user asks for examples.
When relevant, reference Playwright, Cypress, Selenium, API testing, and test reporting. Help users think like a QA automation lead.`;

async function generateReply(ai, contents) {
  const models = [MODEL, FALLBACK_MODEL].filter((model, index, list) => list.indexOf(model) === index);
  let lastError;

  for (const model of models) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
        config: { systemInstruction: SYSTEM_PROMPT },
      });
      return response.text || "Sorry, I could not generate a response.";
    } catch (error) {
      lastError = error;
      const details = error.message || "";
      const retryable =
        details.includes("429") ||
        details.includes("quota") ||
        details.includes("503") ||
        details.includes("UNAVAILABLE") ||
        details.includes("high demand");
      if (!retryable) throw error;
    }
  }

  throw lastError;
}

function formatGeminiError(error) {
  const details = error.message || "Gemini API request failed";
  if (details.includes("401") || details.includes("UNAUTHENTICATED")) {
    return "Invalid GEMINI_API_KEY. Check gemini-chatbot/.env — the key must be copied exactly with no extra characters.";
  }
  if (details.includes("429") || details.includes("quota")) {
    return "Gemini free-tier quota exceeded for this model. Wait a few minutes, try again, or switch GEMINI_MODEL to gemini-2.5-flash-lite in .env.";
  }
  if (details.includes("503") || details.includes("UNAVAILABLE") || details.includes("high demand")) {
    return "Gemini is busy right now. Wait a few seconds and try again.";
  }
  return details;
}

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon",
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 1_000_000) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function sendJson(res, status, payload) {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(payload));
}

function serveStatic(req, res) {
  const filePath = path.join(PUBLIC_DIR, req.url === "/" ? "index.html" : req.url);
  const resolved = path.resolve(filePath);

  if (!resolved.startsWith(PUBLIC_DIR)) {
    sendJson(res, 403, { error: "Forbidden" });
    return;
  }

  fs.readFile(resolved, (err, data) => {
    if (err) {
      sendJson(res, 404, { error: "Not found" });
      return;
    }
    const ext = path.extname(resolved);
    res.writeHead(200, { "Content-Type": MIME_TYPES[ext] || "application/octet-stream" });
    res.end(data);
  });
}

async function handleChat(req, res) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    sendJson(res, 500, { error: "GEMINI_API_KEY is not set. Copy .env.example to .env and add your key." });
    return;
  }

  let body;
  try {
    body = JSON.parse(await readBody(req));
  } catch {
    sendJson(res, 400, { error: "Invalid JSON body" });
    return;
  }

  const message = (body.message || "").trim();
  if (!message) {
    sendJson(res, 400, { error: "Message is required" });
    return;
  }

  addMessage("user", message);

  const history = getAllMessages();
  const contents = history.map((entry) => ({
    role: entry.role === "assistant" ? "model" : "user",
    parts: [{ text: entry.content }],
  }));

  try {
    const ai = new GoogleGenAI({ apiKey });
    const reply = await generateReply(ai, contents);
    addMessage("assistant", reply);

    sendJson(res, 200, {
      reply,
      messages: getAllMessages(),
    });
  } catch (error) {
    sendJson(res, 502, { error: formatGeminiError(error) });
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  try {
    if (req.method === "GET" && url.pathname === "/api/history") {
      sendJson(res, 200, { messages: getAllMessages() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/chat") {
      await handleChat(req, res);
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/history") {
      clearMessages();
      sendJson(res, 200, { messages: [] });
      return;
    }

    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }

    sendJson(res, 405, { error: "Method not allowed" });
  } catch (error) {
    sendJson(res, 500, { error: error.message || "Internal server error" });
  }
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Set PORT=3001 in gemini-chatbot/.env and try again.`);
    process.exit(1);
  }
  throw error;
});

server.listen(PORT, () => {
  const key = process.env.GEMINI_API_KEY || "";
  if (!key || key === "your_api_key_here") {
    console.warn("Warning: GEMINI_API_KEY is not set in gemini-chatbot/.env");
  } else if (key.endsWith(key.split("-").pop()) && (key.match(/-/g) || []).length > 2) {
    console.warn("Warning: API key may be corrupted (duplicate suffix detected).");
  }
  console.log(`Gemini chatbot running at http://localhost:${PORT}`);
  console.log(`Model: ${MODEL}`);
  console.log("Persona: QA Automation (high level)");
});
