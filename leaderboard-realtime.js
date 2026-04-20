(function () {
  const STORAGE_KEY = "minitest.leaderboard";
  const CHANNEL_NAME = "minitest.leaderboard.channel";
  const MAX_RECORDS = 300;
  const MAX_VISIBLE = 50;
  const POLL_MS = 2500;
  const RECONNECT_MS = 5000;

  const baseFromConfig = String(window.MINITEST_REALTIME_BASE || "").trim();
  const apiBase = baseFromConfig.replace(/\/+$/, "");

  const state = {
    records: [],
    subscribers: new Set(),
    status: {
      mode: "local",
      connected: true,
      global: false,
    },
    pollingTimer: null,
    reconnectTimer: null,
    channel:
      typeof window.BroadcastChannel === "function"
        ? new window.BroadcastChannel(CHANNEL_NAME)
        : null,
  };

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

  function canUseApi() {
    if (apiBase) return true;
    return window.location.protocol === "http:" || window.location.protocol === "https:";
  }

  function endpoint(pathname) {
    return `${apiBase}${pathname}`;
  }

  function setStatus(mode, connected, global) {
    state.status.mode = mode;
    state.status.connected = connected;
    state.status.global = Boolean(global);
  }

  function readLocalRecords() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (!Array.isArray(parsed)) return [];
      return parsed.map(normalizeRecord).filter(Boolean);
    } catch {
      return [];
    }
  }

  function writeLocalRecords(records, publish = true) {
    const trimmed = records.slice(-MAX_RECORDS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    if (publish && state.channel) {
      state.channel.postMessage({ type: "leaderboard:update" });
    }
  }

  function notifySubscribers() {
    const sorted = sortRecords(state.records).slice(0, MAX_VISIBLE);
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

  async function requestSnapshot() {
    const response = await fetch(endpoint(`/api/leaderboard?limit=${MAX_RECORDS}`), {
      method: "GET",
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Failed to get leaderboard");
    const payload = await response.json();
    return {
      records: Array.isArray(payload.records) ? payload.records : [],
      global: Boolean(payload.global),
    };
  }

  function stopPolling() {
    if (!state.pollingTimer) return;
    window.clearInterval(state.pollingTimer);
    state.pollingTimer = null;
  }

  function scheduleReconnect() {
    if (state.reconnectTimer || !canUseApi()) return;
    state.reconnectTimer = window.setTimeout(() => {
      state.reconnectTimer = null;
      bootstrapApi();
    }, RECONNECT_MS);
  }

  function startPolling() {
    if (state.pollingTimer || !canUseApi()) return;
    state.pollingTimer = window.setInterval(async () => {
      try {
        const snapshot = await requestSnapshot();
        setStatus(snapshot.global ? "global" : "local", true, snapshot.global);
        applySnapshot(snapshot.records, false);
      } catch {
        stopPolling();
        setStatus("local", false, false);
        notifySubscribers();
        scheduleReconnect();
      }
    }, POLL_MS);
  }

  async function bootstrapApi() {
    if (!canUseApi()) {
      setStatus("local", true, false);
      state.records = readLocalRecords();
      notifySubscribers();
      return;
    }

    try {
      const snapshot = await requestSnapshot();
      setStatus(snapshot.global ? "global" : "local", true, snapshot.global);
      applySnapshot(snapshot.records, false);
      startPolling();
    } catch {
      stopPolling();
      setStatus("local", false, false);
      state.records = readLocalRecords();
      notifySubscribers();
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
    const response = await fetch(endpoint("/api/leaderboard"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(entry),
    });
    if (!response.ok) throw new Error("Failed to save leaderboard entry");
    const payload = await response.json();
    const records = Array.isArray(payload.records) ? payload.records : [];
    const isGlobal = Boolean(payload.global);
    setStatus(isGlobal ? "global" : "local", true, isGlobal);
    applySnapshot(records, false);
    return true;
  }

  function subscribe(subscriber) {
    if (typeof subscriber !== "function") return () => {};
    state.subscribers.add(subscriber);
    subscriber(sortRecords(state.records).slice(0, MAX_VISIBLE), { ...state.status });
    return () => {
      state.subscribers.delete(subscriber);
    };
  }

  function saveEntry(entry) {
    const normalized = normalizeRecord(entry);
    if (!normalized) return Promise.resolve(false);

    if (canUseApi()) {
      return saveServerEntry(normalized).catch(() => {
        saveLocalEntry(normalized);
        return false;
      });
    }

    saveLocalEntry(normalized);
    return Promise.resolve(false);
  }

  state.records = readLocalRecords();
  notifySubscribers();

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

  bootstrapApi();

  window.MiniTestLeaderboard = {
    subscribe,
    saveEntry,
    sortRecords,
    getSnapshot: () => sortRecords(state.records).slice(0, MAX_VISIBLE),
    getStatus: () => ({ ...state.status }),
  };
})();
