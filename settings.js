(function () {
  const KEY = "minitest.settings";
  const USER_KEY = "minitest.username";
  const LEADERBOARD_KEY = "minitest.leaderboard";
  const defaults = {
    theme: "light",
    fontSize: 16,
    fontFamily: "system-ui, sans-serif",
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
    const taskSettingsBtn = document.getElementById("taskSettingsBtn");
    const settingsPanel = document.getElementById("settingsPanel");
    const closeSettings = document.getElementById("closeSettings");
    const fontSize = document.getElementById("fontSize");
    const fontSizeValue = document.getElementById("fontSizeValue");
    const fontFamily = document.getElementById("fontFamily");
    const themeToggle = document.getElementById("themeToggle");
    const themeSwitch = document.getElementById("themeSwitch");
    const taskThemeSwitch = document.getElementById("taskThemeSwitch");
    const quizDuration = document.getElementById("quizDuration");
    const resetBtn = document.getElementById("resetBtn");
    const durationBadge = document.getElementById("durationBadge");

    function syncDurationBadge() {
      if (durationBadge) durationBadge.textContent = `Time: ${state.quizDuration} min`;
    }

    function syncThemeButtons() {
      const isDark = state.theme === "dark";
      if (themeSwitch) themeSwitch.checked = isDark;
      if (taskThemeSwitch) taskThemeSwitch.checked = isDark;
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
    if (taskSettingsBtn && settingsPanel) taskSettingsBtn.addEventListener("click", toggleSettingsPanel);

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
    if (taskThemeSwitch) {
      taskThemeSwitch.addEventListener("change", () => {
        state.theme = taskThemeSwitch.checked ? "dark" : "light";
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
      const name = usernameInput.value.trim();
      if (!name) return;
      localStorage.setItem(USER_KEY, name);
      closeUsernameModal();
    }

    if (usernameModal && !localStorage.getItem(USER_KEY)) {
      openUsernameModal();
    }
    if (saveUsernameBtn) saveUsernameBtn.addEventListener("click", saveUsername);
    if (usernameInput) {
      usernameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") saveUsername();
      });
    }

    const leaderboardList = document.getElementById("leaderboardList");
    if (leaderboardList) {
      let records = [];
      try {
        records = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
      } catch {
        records = [];
      }

      if (!records.length) {
        leaderboardList.innerHTML = `<p class="muted">No attempts yet.</p>`;
      } else {
        records
          .sort((a, b) => b.score - a.score || a.elapsedSeconds - b.elapsedSeconds)
          .slice(0, 20)
          .forEach((item, idx) => {
            const row = document.createElement("article");
            row.className = "leaderboard-item";
            row.innerHTML = `
              <div class="leaderboard-head">
                <strong>#${idx + 1} ${item.username}</strong>
                <span>${item.score}/50</span>
              </div>
              <div class="muted">Time: ${item.elapsedLabel} | ${item.finishedAt}</div>
            `;
            leaderboardList.appendChild(row);
          });
      }
    }
  });
})();
