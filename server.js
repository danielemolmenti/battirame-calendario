const crypto = require("crypto");
const fs = require("fs");
const http = require("http");
const path = require("path");

const PORT = Number(process.env.PORT || 3000);
const ADMIN_PASSWORD = process.env.BATTIRAME_ADMIN_PASSWORD || "12345";
const SESSION_SECRET = process.env.BATTIRAME_SESSION_SECRET || crypto.randomBytes(32).toString("hex");
const DATA_FILE = path.join(__dirname, "data.json");
const PUBLIC_DIR = __dirname;

const spaces = [
  { id: "fuoco", name: "Sala Fuoco", meta: "80 mq · corpo libero" },
  { id: "aria", name: "Sala Aria", meta: "40 mq · yoga e pratiche dolci" },
  { id: "lago", name: "Lago", meta: "attività outdoor e acqua" },
  { id: "parco", name: "Parco", meta: "passeggiate, corsa, nordic walking" },
];

const sessions = new Map();

function initialData() {
  const today = new Date();
  const monday = startOfWeek(today);
  const date = (offset) => toISODate(addDays(monday, offset));
  return {
    activities: [
      { id: "mobility", name: "Mobilità e corpo libero", color: "#c75d37" },
      { id: "yoga", name: "Yoga dolce", color: "#6f7fbf" },
      { id: "nordic", name: "Nordic walking", color: "#0f7c65" },
      { id: "respiro", name: "Respiro al lago", color: "#4a88a8" },
    ],
    technicians: [
      { id: "anna", name: "Anna Rossi" },
      { id: "marco", name: "Marco Bianchi" },
      { id: "elena", name: "Elena Verdi" },
    ],
    slots: [
      makeSlot(date(0), "fuoco", "09:00", "10:30", "mobility", "marco", "Circuito funzionale leggero"),
      makeSlot(date(1), "aria", "18:00", "19:15", "yoga", "anna", "Sessione adatta a tutti"),
      makeSlot(date(2), "parco", "08:00", "09:30", "nordic", "elena", "Ritrovo ingresso parco"),
      makeSlot(date(4), "lago", "07:30", "08:30", "respiro", "anna", "Pratica respiratoria sul pontile"),
      makeSlot(date(5), "fuoco", "11:00", "12:00", "mobility", "marco", ""),
    ],
  };
}

function makeSlot(date, spaceId, start, end, activityId, technicianId, notes = "") {
  return { id: crypto.randomUUID(), date, spaceId, start, end, activityId, technicianId, notes };
}

function startOfWeek(date) {
  const copy = new Date(date);
  const day = copy.getDay() || 7;
  copy.setHours(0, 0, 0, 0);
  copy.setDate(copy.getDate() - day + 1);
  return copy;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toISODate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    writeData(initialData());
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(sanitizeData(data), null, 2));
}

function sanitizeData(data) {
  return {
    activities: Array.isArray(data.activities) ? data.activities.map(cleanActivity) : [],
    technicians: Array.isArray(data.technicians) ? data.technicians.map(cleanTechnician) : [],
    slots: Array.isArray(data.slots) ? data.slots.map(cleanSlot) : [],
  };
}

function cleanActivity(item) {
  return {
    id: text(item.id),
    name: text(item.name),
    color: /^#[0-9a-fA-F]{6}$/.test(item.color) ? item.color : "#0f7c65",
  };
}

function cleanTechnician(item) {
  return { id: text(item.id), name: text(item.name) };
}

function cleanSlot(item) {
  return {
    id: text(item.id) || crypto.randomUUID(),
    date: text(item.date),
    spaceId: spaces.some((space) => space.id === item.spaceId) ? item.spaceId : "fuoco",
    start: text(item.start),
    end: text(item.end),
    activityId: text(item.activityId),
    technicianId: text(item.technicianId),
    notes: text(item.notes),
  };
}

function text(value) {
  return String(value || "").slice(0, 200);
}

function parseCookies(req) {
  return Object.fromEntries(
    String(req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim().split("="))
      .filter((part) => part[0])
  );
}

function getSession(req) {
  const token = parseCookies(req).battirame_session;
  if (!token) return null;
  const session = sessions.get(token);
  if (!session || session.expires < Date.now()) {
    sessions.delete(token);
    return null;
  }
  return session;
}

function requireSession(req, res) {
  if (getSession(req)) return true;
  json(res, 401, { error: "Accesso richiesto." });
  return false;
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const textBody = Buffer.concat(chunks).toString("utf8");
  return textBody ? JSON.parse(textBody) : {};
}

function json(res, status, payload, headers = {}) {
  res.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

function serveFile(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const requested = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requested));
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }
  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": contentType(filePath) });
    res.end(content);
  });
}

function contentType(filePath) {
  const ext = path.extname(filePath);
  return {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
  }[ext] || "application/octet-stream";
}

function timingSafePassword(password) {
  const given = Buffer.from(String(password || ""));
  const expected = Buffer.from(ADMIN_PASSWORD);
  return given.length === expected.length && crypto.timingSafeEqual(given, expected);
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === "GET" && url.pathname === "/api/public-data") {
      json(res, 200, readData());
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/session") {
      json(res, 200, { authenticated: Boolean(getSession(req)) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/backup") {
      if (!requireSession(req, res)) return;
      json(res, 200, {
        createdAt: new Date().toISOString(),
        data: readData(),
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/login") {
      const body = await readBody(req);
      if (!timingSafePassword(body.password)) {
        json(res, 401, { error: "Password non corretta." });
        return;
      }
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, { expires: Date.now() + 1000 * 60 * 60 * 8 });
      json(res, 200, { ok: true }, {
        "Set-Cookie": `battirame_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/logout") {
      const token = parseCookies(req).battirame_session;
      if (token) sessions.delete(token);
      json(res, 200, { ok: true }, {
        "Set-Cookie": "battirame_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
      });
      return;
    }

    if (req.method === "PUT" && url.pathname === "/api/admin-data") {
      if (!requireSession(req, res)) return;
      const body = await readBody(req);
      writeData(body);
      json(res, 200, readData());
      return;
    }

    serveFile(req, res);
  } catch (error) {
    json(res, 500, { error: "Errore del server." });
  }
});

server.listen(PORT, () => {
  console.log(`Battirame online su http://localhost:${PORT}`);
  if (ADMIN_PASSWORD === "12345") {
    console.log("Password backoffice predefinita: 12345. Cambiala prima di pubblicare il sito.");
  }
});
