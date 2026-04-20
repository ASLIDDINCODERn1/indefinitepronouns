(function () {
  const STORAGE_KEY = "minitest.leaderboard";
  const CHANNEL_NAME = "minitest.leaderboard.channel";
  const MAX_DB_RECORDS = 300;
  const MAX_VISIBLE_RECORDS = 50;
  const POLL_INTERVAL_MS = 2500;
  const RECONNECT_MS = 4000;
  const baseFromConfig = String(window.MINITEST_REALTIME_BASE || "").trim();
  const serverBase = baseFromConfig.replace(/\/+$/, "");

  const state = {
    records: [],
    status: {
      mode: "local",
      connected: false,
    },
    subscribers: new Set(),
    reconnectTimer: null,
    pollTimer: null,
    channel:
      typeof window.BroadcastChannel === "function"
        ? new window.BroadcastChannel(CHANNEL_NAME)
        : null,
  };

  function getEndpoint(pathname) {
    return `${serverBase}${pathname}`;
  }

  function canUseServer() {
    if (serverBase) return true;
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  function setStatus(mode, connected) {
    state.status.mode = mode;
    state.status.connected = connected;
  }

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

  function normalizeUsername(value) {
    const normalized = String(value || "").replace(/\s+/g, " ").trim().slice(0, 24);
    return normalized || "Unknown";
  }

  function normalizeRecord(record) {
    if (!record || typeof record !== "object") return null;
    const elapsedSeconds = normalizeNumber(record.elapsedSeconds, 0);
    const finishedAtMs =
      normalizeNumber(record.finishedAtMs, NaN) ||
      normalizeNumber(Date.parse(record.finishedAt), 0);
    const score = Math.max(0, normalizeNumber(record.score, 0));
    const total = Math.max(1, normalizeNumber(record.total, 50));

    return {
      id:
        (record.id && String(record.id)) ||
        `entry-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      username: normalizeUsername(record.username),
      score,
      total,
      elapsedSeconds,
      elapsedLabel:
        record.elapsedLabel && String(record.elapsedLabel).trim()
          ? String(record.elapsedLabel).trim()
          : formatTime(elapsedSeconds),
      finishedAt:
        record.finishedAt && String(record.finishedAt).trim()
          ? String(record.finishedAt).trim()
          : new Date(finishedAtMs || Date.now()).toLocaleString(),
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

  function safeParseLocal() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function readLocalRecords() {
    return safeParseLocal().map(normalizeRecord).filter(Boolean);
  }

  function writeLocalRecords(records, publish = true) {
    const trimmed = records.slice(-MAX_DB_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    if (publish && state.channel) {
      state.channel.postMessage({ type: "leaderboard:update" });
    }
  }

  function notifySubscribers() {
    const sorted = sortRecords(state.records).slice(0, MAX_VISIBLE_RECORDS);
    state.subscribers.forEach((subscriber) => {
      subscriber(sorted, { ...state.status });
    });
  }

  function applySnapshot(rawRecords, publish = false) {
    const normalized = (Array.isArray(rawRecords) ? rawRecords : [])
      .map(normalizeRecord)
      .filter(Boolean);
    state.records = normalized;
    writeLocalRecords(normalized, publish);
    notifySubscribers();
  }

  function stopPolling() {
    if (!state.pollTimer) return;
    window.clearInterval(state.pollTimer);
    state.pollTimer = null;
  }

  function scheduleReconnect() {
    if (state.reconnectTimer || !canUseServer()) return;
    state.reconnectTimer = window.setTimeout(() => {
      state.reconnectTimer = null;
      bootstrapServer();
    }, RECONNECT_MS);
  }

  async function fetchServerSnapshot() {
    const response = await fetch(getEndpoint(`/api/leaderboard?limit=${MAX_DB_RECORDS}`), {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    });
    if (!response.ok) throw new Error("Failed to fetch leaderboard");
    const payload = await response.json();
    return payload && Array.isArray(payload.records) ? payload.records : [];
  }

  function startPolling() {
    if (state.pollTimer || !canUseServer()) return;
    state.pollTimer = window.setInterval(async () => {
      try {
        const snapshot = await fetchServerSnapshot();
        setStatus("server", true);
        applySnapshot(snapshot, false);
      } catch {
        setStatus("local", false);
        notifySubscribers();
        stopPolling();
        scheduleReconnect();
      }
    }, POLL_INTERVAL_MS);
  }

  async function bootstrapServer() {
    if (!canUseServer()) {
      setStatus("local", false);
      state.records = readLocalRecords();
      notifySubscribers();
      return;
    }

    try {
      const snapshot = await fetchServerSnapshot();
      setStatus("server", true);
      applySnapshot(snapshot, false);
      startPolling();
    } catch {
      setStatus("local", false);
      state.records = readLocalRecords();
      notifySubscribers();
      stopPolling();
      scheduleReconnect();
    }
  }

  function saveLocalEntry(entry) {
    const normalized = normalizeRecord(entry);
    if (!normalized) return;
    const current = readLocalRecords();
    current.push(normalized);
    applySnapshot(current, true);
  }

  async function saveServerEntry(entry) {
    const response = await fetch(getEndpoint("/api/leaderboard"), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error("Failed to save leaderboard entry");
    const payload = await response.json();
    const records = payload && Array.isArray(payload.records) ? payload.records : [];
    setStatus("server", true);
    applySnapshot(records, false);
    return true;
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") return () => {};
    state.subscribers.add(subscriber);
    subscriber(sortRecords(state.records).slice(0, MAX_VISIBLE_RECORDS), { ...state.status });
    return () => {
      state.subscribers.delete(subscriber);
    };
  }

  function saveEntry(entry) {
    const normalized = normalizeRecord(entry);
    if (!normalized) return Promise.resolve(false);

    if (canUseServer()) {
      return saveServerEntry(normalized).catch(() => {
        saveLocalEntry(normalized);
        return false;
      });
    }

    saveLocalEntry(normalized);
    return Promise.resolve(false);
  }

  state.records = readLocalRecords();

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    state.records = readLocalRecords();
    notifySubscribers();
  });

  if (state.channel) {
    state.channel.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "leaderboard:update") return;
      state.records = readLocalRecords();
      notifySubscribers();
    });
  }

  window.addEventListener(
    "beforeunload",
    () => {
      stopPolling();
      if (state.reconnectTimer) window.clearTimeout(state.reconnectTimer);
      if (state.channel) state.channel.close();
    },
    { once: true },
  );

  notifySubscribers();
  bootstrapServer();

  window.MiniTestLeaderboard = {
    subscribe,
    saveEntry,
    sortRecords,
    getSnapshot: () => sortRecords(state.records).slice(0, MAX_VISIBLE_RECORDS),
    getStatus: () => ({ ...state.status }),
  };
})();
