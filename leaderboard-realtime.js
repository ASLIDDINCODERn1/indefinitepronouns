(function () {
  const STORAGE_KEY = "minitest.leaderboard";
  const CHANNEL_NAME = "minitest.leaderboard.channel";
  const MAX_RECORDS = 300;
  const MAX_VISIBLE = 50;

  const state = {
    records: [],
    subscribers: new Set(),
    status: {
      mode: "local",
      connected: true,
    },
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

  function refreshFromLocal(publish = false) {
    state.records = readLocalRecords();
    if (publish) writeLocalRecords(state.records, true);
    notifySubscribers();
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
    const current = readLocalRecords();
    current.push(normalized);
    state.records = current;
    writeLocalRecords(current, true);
    notifySubscribers();
    return Promise.resolve(true);
  }

  state.records = readLocalRecords();
  notifySubscribers();

  window.addEventListener("storage", (event) => {
    if (event.key !== STORAGE_KEY) return;
    refreshFromLocal(false);
  });

  if (state.channel) {
    state.channel.addEventListener("message", (event) => {
      if (!event.data || event.data.type !== "leaderboard:update") return;
      refreshFromLocal(false);
    });
  }

  window.addEventListener(
    "beforeunload",
    () => {
      if (state.channel) state.channel.close();
    },
    { once: true },
  );

  window.MiniTestLeaderboard = {
    subscribe,
    saveEntry,
    sortRecords,
    getSnapshot: () => sortRecords(state.records).slice(0, MAX_VISIBLE),
    getStatus: () => ({ ...state.status }),
  };
})();
