(function () {
  const KEY = "minitest.settings";
  const USER_KEY = "minitest.username";
  const defaults = {
    theme: "light",
    fontSize: 16,
    fontFamily: "'Plus Jakarta Sans', 'Segoe UI', sans-serif",
    quizDuration: 50,
  };

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : { ...defaults };
    } catch {
      return { ...defaults };
    }
  }

  function save(s) {
    localStorage.setItem(KEY, JSON.stringify(s));
  }

  function apply(s) {
    document.documentElement.setAttribute("data-theme", s.theme);
    document.documentElement.style.setProperty("--font-size", s.fontSize + "px");
    document.documentElement.style.setProperty("--font-family", s.fontFamily);
    const toggleIcon = document.getElementById("themeToggleIcon");
    if (toggleIcon) toggleIcon.textContent = s.theme === "dark" ? "☀️" : "🌙";
  }

  const state = load();
  apply(state);

  document.addEventListener("DOMContentLoaded", () => {
    const settingsToggle = document.getElementById("settingsToggle");
    const settingsPanel = document.getElementById("settingsPanel");
    const closeSettings = document.getElementById("closeSettings");
    const fontSize = document.getElementById("fontSize");
    const fontSizeValue = document.getElementById("fontSizeValue");
    const fontFamily = document.getElementById("fontFamily");
    const themeToggle = document.getElementById("themeToggle");
    const themeSwitch = document.getElementById("themeSwitch");
    const quizDuration = document.getElementById("quizDuration");
    const resetBtn = document.getElementById("resetBtn");
    const durationBadge = document.getElementById("durationBadge");
    const leaderboardList = document.getElementById("leaderboardList");
    const leaderboardStatus = document.getElementById("leaderboardStatus");

    function syncDurationBadge() {
      if (durationBadge) durationBadge.textContent = `Time: ${state.quizDuration} min`;
    }

    function syncThemeButtons() {
      const isDark = state.theme === "dark";
      if (themeSwitch) themeSwitch.checked = isDark;
    }

    function closePanel() {
      if (!settingsPanel) return;
      settingsPanel.classList.add("hidden");
      settingsPanel.setAttribute("aria-hidden", "true");
    }

    function toggleSettingsPanel() {
      if (!settingsPanel) return;
      const hidden = settingsPanel.classList.contains("hidden");
      settingsPanel.classList.toggle("hidden", !hidden);
      settingsPanel.setAttribute("aria-hidden", hidden ? "false" : "true");
    }

    if (settingsToggle && settingsPanel) settingsToggle.addEventListener("click", toggleSettingsPanel);

    if (closeSettings) closeSettings.addEventListener("click", closePanel);

    if (fontSize) {
      fontSize.value = state.fontSize;
      fontSizeValue.textContent = state.fontSize + "px";
      fontSize.addEventListener("input", () => {
        state.fontSize = parseInt(fontSize.value, 10);
        fontSizeValue.textContent = state.fontSize + "px";
        apply(state);
        save(state);
      });
    }

    if (fontFamily) {
      fontFamily.value = state.fontFamily;
      if (!fontFamily.value) {
        state.fontFamily = defaults.fontFamily;
        fontFamily.value = state.fontFamily;
        apply(state);
        save(state);
      }
      fontFamily.addEventListener("change", () => {
        state.fontFamily = fontFamily.value;
        apply(state);
        save(state);
      });
    }

    if (themeToggle) {
      themeToggle.addEventListener("click", () => {
        state.theme = state.theme === "dark" ? "light" : "dark";
        apply(state);
        syncThemeButtons();
        save(state);
      });
    }
    if (themeSwitch) {
      themeSwitch.addEventListener("change", () => {
        state.theme = themeSwitch.checked ? "dark" : "light";
        apply(state);
        syncThemeButtons();
        save(state);
      });
    }

    if (quizDuration) {
      quizDuration.value = String(state.quizDuration);
      quizDuration.addEventListener("change", () => {
        state.quizDuration = Number(quizDuration.value);
        syncDurationBadge();
        save(state);
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener("click", () => {
        Object.assign(state, defaults);
        apply(state);
        save(state);
        if (fontSize) fontSize.value = state.fontSize;
        if (fontSizeValue) fontSizeValue.textContent = state.fontSize + "px";
        if (fontFamily) fontFamily.value = state.fontFamily;
        if (quizDuration) quizDuration.value = String(state.quizDuration);
        syncThemeButtons();
        syncDurationBadge();
      });
    }

    syncThemeButtons();
    syncDurationBadge();

    const usernameModal = document.getElementById("usernameModal");
    const usernameInput = document.getElementById("usernameInput");
    const saveUsernameBtn = document.getElementById("saveUsernameBtn");

    function normalizeUsername(value) {
      return value.replace(/\s+/g, " ").trim().slice(0, 24);
    }

    function openUsernameModal() {
      if (!usernameModal) return;
      usernameModal.classList.remove("hidden");
      if (usernameInput) usernameInput.focus();
    }

    function closeUsernameModal() {
      if (!usernameModal) return;
      usernameModal.classList.add("hidden");
    }

    function saveUsername() {
      if (!usernameInput) return;
      const name = normalizeUsername(usernameInput.value);
      if (!name) return;
      localStorage.setItem(USER_KEY, name);
      closeUsernameModal();
    }

    if (usernameModal && !localStorage.getItem(USER_KEY)) {
      openUsernameModal();
    }
    if (usernameInput) {
      const savedUsername = localStorage.getItem(USER_KEY);
      if (savedUsername) usernameInput.value = savedUsername;
    }
    if (saveUsernameBtn) saveUsernameBtn.addEventListener("click", saveUsername);
    if (usernameInput) {
      usernameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveUsername();
      });
    }

    if (leaderboardList) {
      const leaderboardApi = window.MiniTestLeaderboard;
      const sortRecords = (records) =>
        [...records].sort(
          (a, b) =>
            Number(b.score || 0) - Number(a.score || 0) ||
            Number(a.elapsedSeconds || Number.MAX_SAFE_INTEGER) -
              Number(b.elapsedSeconds || Number.MAX_SAFE_INTEGER) ||
            Number(b.finishedAtMs || 0) - Number(a.finishedAtMs || 0),
        );

      const setLeaderboardStatus = (meta = {}) => {
        if (!leaderboardStatus) return;
        const isConnected = Boolean(meta.connected);
        const isGlobal = Boolean(meta.global);
        leaderboardStatus.classList.remove("online", "local");
        if (isConnected && isGlobal) {
          leaderboardStatus.textContent = "Realtime: global leaderboard connected";
          leaderboardStatus.classList.add("online");
        } else if (isConnected) {
          leaderboardStatus.textContent = "Realtime: local fallback (set KV for global)";
          leaderboardStatus.classList.add("local");
        } else {
          leaderboardStatus.textContent = "Realtime: offline";
          leaderboardStatus.classList.add("local");
        }
      };

      const renderLeaderboard = (records = []) => {
        const sorted = sortRecords(Array.isArray(records) ? records : []).slice(0, 50);
        leaderboardList.innerHTML = "";
        if (!sorted.length) {
          leaderboardList.innerHTML = `<p class="muted">No attempts yet.</p>`;
          return;
        }

        sorted.forEach((item, idx) => {
          const row = document.createElement("article");
          row.className = "leaderboard-item";

          const head = document.createElement("div");
          head.className = "leaderboard-head";

          const title = document.createElement("strong");
          title.textContent = `#${idx + 1} ${item.username || "Unknown"}`;

          const score = document.createElement("span");
          const total = Number(item.total) || 50;
          score.textContent = `${Number(item.score || 0)}/${total}`;

          const meta = document.createElement("div");
          meta.className = "muted";
          const elapsedLabel = item.elapsedLabel || "--:--";
          const finishedAt = item.finishedAt || "Unknown finish time";
          meta.textContent = `Time: ${elapsedLabel} | ${finishedAt}`;

          head.appendChild(title);
          head.appendChild(score);
          row.appendChild(head);
          row.appendChild(meta);
          leaderboardList.appendChild(row);
        });
      };

      if (leaderboardApi && typeof leaderboardApi.subscribe === "function") {
        leaderboardApi.subscribe((records, meta) => {
          renderLeaderboard(records);
          setLeaderboardStatus(meta);
        });
      } else {
        setLeaderboardStatus({ mode: "local", connected: false });
        renderLeaderboard([]);
      }
    }
  });
})();
