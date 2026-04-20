
const MAX_DB_RECORDS = 300;
const KEY = "minitest:leaderboard:list";

function normalizeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function formatTime(totalSeconds) {
  const safe = Math.max(0, normalizeNumber(totalSeconds, 0));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function normalizeRecord(record) {
  if (!record || typeof record !== "object") return null;

  const elapsedSeconds = normalizeNumber(record.elapsedSeconds, 0);
  const finishedAtMs =
    normalizeNumber(record.finishedAtMs, NaN) ||
    normalizeNumber(Date.parse(record.finishedAt), 0) ||
    Date.now();

  const username = String(record.username || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 24);

  return {
    id:
      (record.id && String(record.id)) ||
      `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    username: username || "Unknown",
    score: Math.max(0, normalizeNumber(record.score, 0)),
    total: Math.max(1, normalizeNumber(record.total, 50)),
    elapsedSeconds,
    elapsedLabel:
      record.elapsedLabel && String(record.elapsedLabel).trim()
        ? String(record.elapsedLabel).trim()
        : formatTime(elapsedSeconds),
    finishedAt:
      record.finishedAt && String(record.finishedAt).trim()
        ? String(record.finishedAt).trim()
        : new Date(finishedAtMs).toLocaleString(),
    finishedAtMs,
  };
}

function sortRecords(records) {
  return [...records].sort(
    (a, b) =>
      normalizeNumber(b.score, 0) - normalizeNumber(a.score, 0) ||
      normalizeNumber(a.elapsedSeconds, Number.MAX_SAFE_INTEGER) -
        normalizeNumber(b.elapsedSeconds, Number.MAX_SAFE_INTEGER) ||
      normalizeNumber(b.finishedAtMs, 0) - normalizeNumber(a.finishedAtMs, 0),
  );
}

function getMemoryStore() {
  if (!globalThis.__minitestLeaderboardStore) {
    globalThis.__minitestLeaderboardStore = [];
  }
  return globalThis.__minitestLeaderboardStore;
}

function hasKvConfig() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

function kvHeaders() {
  return {
    Authorization: `Bearer ${process.env.KV_REST_API_TOKEN}`,
  };
}

function kvUrl(command, ...segments) {
  const safeSegments = segments.map((value) => encodeURIComponent(String(value)));
  return `${process.env.KV_REST_API_URL}/${command}/${safeSegments.join("/")}`;
}

async function kvGetRange(start, end) {
  const response = await fetch(kvUrl("lrange", KEY, start, end), {
    method: "GET",
    headers: kvHeaders(),
  });
  if (!response.ok) throw new Error("KV lrange failed");
  const payload = await response.json();
  return Array.isArray(payload.result) ? payload.result : [];
}

async function kvPush(entry) {
  const raw = JSON.stringify(entry);

  const pushRes = await fetch(kvUrl("lpush", KEY, raw), {
    method: "POST",
    headers: kvHeaders(),
  });
  if (!pushRes.ok) throw new Error("KV lpush failed");

  const trimRes = await fetch(kvUrl("ltrim", KEY, 0, MAX_DB_RECORDS - 1), {
    method: "POST",
    headers: kvHeaders(),
  });
  if (!trimRes.ok) throw new Error("KV ltrim failed");
}

async function kvReadRecords(limit = MAX_DB_RECORDS) {
  const safeLimit = Math.max(1, Math.min(MAX_DB_RECORDS, normalizeNumber(limit, MAX_DB_RECORDS)));
  const rows = await kvGetRange(0, safeLimit - 1);
  return rows
    .map((item) => {
      try {
        return JSON.parse(String(item));
      } catch {
        return null;
      }
    })
    .map(normalizeRecord)
    .filter(Boolean);
}

function readMemoryRecords(limit = MAX_DB_RECORDS) {
  const safeLimit = Math.max(1, Math.min(MAX_DB_RECORDS, normalizeNumber(limit, MAX_DB_RECORDS)));
  return getMemoryStore().slice(0, safeLimit).map(normalizeRecord).filter(Boolean);
}

function writeMemoryRecord(entry) {
  const store = getMemoryStore();
  store.unshift(entry);
  if (store.length > MAX_DB_RECORDS) {
    store.splice(MAX_DB_RECORDS);
  }
}

function sendJson(res, statusCode, body) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.end(JSON.stringify(body));
}

async function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) return JSON.parse(req.body);

  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  return JSON.parse(raw);
}

module.exports = async function handler(req, res) {
  if (req.method === "OPTIONS") {
    sendJson(res, 204, {});
    return;
  }

  const useGlobalKv = hasKvConfig();

  if (req.method === "GET") {
    try {
      const limit = normalizeNumber(req.query?.limit, MAX_DB_RECORDS);
      const records = useGlobalKv ? await kvReadRecords(limit) : readMemoryRecords(limit);
      sendJson(res, 200, { records: sortRecords(records), global: useGlobalKv });
      return;
    } catch {
      const records = readMemoryRecords(MAX_DB_RECORDS);
      sendJson(res, 200, { records: sortRecords(records), global: false });
      return;
    }
  }

  if (req.method === "POST") {
    try {
      const body = await parseJsonBody(req);
      const entry = normalizeRecord(body);
      if (!entry) {
        sendJson(res, 400, { error: "Invalid leaderboard entry" });
        return;
      }

      if (useGlobalKv) {
        try {
          await kvPush(entry);
          const records = await kvReadRecords(MAX_DB_RECORDS);
          sendJson(res, 201, { ok: true, records: sortRecords(records), global: true });
          return;
        } catch {
          writeMemoryRecord(entry);
          const records = readMemoryRecords(MAX_DB_RECORDS);
          sendJson(res, 201, { ok: true, records: sortRecords(records), global: false });
          return;
        }
      }

      writeMemoryRecord(entry);
      const records = readMemoryRecords(MAX_DB_RECORDS);
      sendJson(res, 201, { ok: true, records: sortRecords(records), global: false });
      return;
    } catch {
      sendJson(res, 400, { error: "Invalid JSON body" });
      return;
    }
  }

  sendJson(res, 405, { error: "Method not allowed" });
};
