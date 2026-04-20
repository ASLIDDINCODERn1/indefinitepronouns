(function () {
  const SETTINGS_KEY = "minitest.settings";
  const USER_KEY = "minitest.username";
  const LEADERBOARD_KEY = "minitest.leaderboard";

  const username = localStorage.getItem(USER_KEY);
  if (!username) {
    window.location.href = "index.html";
    return;
  }

  const questions = [
    { type: "mcq", level: "Easy", q: "_____ is waiting outside for you.", options: ["Someone", "Anything", "Nowhere", "Few"], answer: "Someone" },
    { type: "mcq", level: "Easy", q: "I looked everywhere, but I found _____.", options: ["nothing", "something", "everyone", "someone"], answer: "nothing" },
    { type: "mcq", level: "Easy", q: "Does _____ know the answer?", options: ["anyone", "none", "no one place", "few"], answer: "anyone" },
    { type: "text", level: "Easy", q: "Complete: 'There is _____ in the fridge.'", answer: "nothing" },
    { type: "mcq", level: "Easy", q: "_____ in my class likes grammar games.", options: ["Everyone", "Anything", "Somewhere", "Neither"], answer: "Everyone" },
    { type: "mcq", level: "Easy", q: "I need _____ to write with.", options: ["something", "anyone", "nothing", "nowhere"], answer: "something" },
    { type: "mcq", level: "Easy", q: "We went _____ quiet to study.", options: ["somewhere", "someone", "everyone", "nothing"], answer: "somewhere" },
    { type: "text", level: "Easy", q: "Complete: '_____ called you while you were out.'", answer: "someone" },
    { type: "mcq", level: "Easy", q: "There isn't _____ wrong with the file.", options: ["anything", "someone", "everywhere", "none"], answer: "anything" },
    { type: "mcq", level: "Easy", q: "_____ wants to be late for an exam.", options: ["Nobody", "Anybody", "Somebody", "Everything"], answer: "Nobody" },

    { type: "mcq", level: "Medium", q: "You can sit _____ you like.", options: ["anywhere", "someone", "everything", "nobody"], answer: "anywhere" },
    { type: "mcq", level: "Medium", q: "_____ of these two answers is correct.", options: ["Neither", "Anybody", "Somewhere", "Everything"], answer: "Neither" },
    { type: "text", level: "Medium", q: "Complete: 'I have read _____ about this topic.'", answer: "everything" },
    { type: "mcq", level: "Medium", q: "_____ in the meeting understood the new rule.", options: ["Everyone", "Nowhere", "Anything", "No one place"], answer: "Everyone" },
    { type: "mcq", level: "Medium", q: "I didn't invite _____ to my house yesterday.", options: ["anyone", "someone", "everyone", "everywhere"], answer: "anyone" },
    { type: "mcq", level: "Medium", q: "We heard _____ knocking at the door.", options: ["someone", "nothing", "nowhere", "either"], answer: "someone" },
    { type: "text", level: "Medium", q: "Complete: 'There is _____ we can do now.'", answer: "nothing" },
    { type: "mcq", level: "Medium", q: "She looked for her keys _____.", options: ["everywhere", "everyone", "anything", "none"], answer: "everywhere" },
    { type: "mcq", level: "Medium", q: "Would you like _____ to drink?", options: ["something", "anywhere", "nobody", "none"], answer: "something" },
    { type: "mcq", level: "Medium", q: "I don't trust _____ in that story.", options: ["anyone", "someone", "somewhere", "everything"], answer: "anyone" },

    { type: "mcq", level: "Medium+", q: "Choose the sentence with correct pronoun: ", options: ["Everybody have arrived.", "Everybody has arrived.", "Everybody are arrived.", "Everybody is arriving yesterday."], answer: "Everybody has arrived." },
    { type: "text", level: "Medium+", q: "Fill in: '_____ of the students knew the answer, so the teacher explained again.'", answer: "None" },
    { type: "mcq", level: "Medium+", q: "Is there _____ in this room who can help me?", options: ["anyone", "someone", "everyone", "noone"], answer: "anyone" },
    { type: "mcq", level: "Medium+", q: "_____ was left on the table, so I ate it.", options: ["Something", "Anything", "Nothing", "Nobody"], answer: "Something" },
    { type: "mcq", level: "Medium+", q: "I can't see _____ because of the fog.", options: ["anything", "something", "everyone", "nowhere"], answer: "anything" },
    { type: "text", level: "Medium+", q: "Complete: '_____ in the team is responsible for quality.'", answer: "Everyone" },
    { type: "mcq", level: "Medium+", q: "If _____ calls, tell them I will return at 5.", options: ["anyone", "nobody", "nowhere", "everything"], answer: "anyone" },
    { type: "mcq", level: "Medium+", q: "The teacher gave _____ enough time to finish.", options: ["everyone", "anything", "none", "somewhere"], answer: "everyone" },
    { type: "text", level: "Medium+", q: "Fill in: 'There was _____ left in the bottle.'", answer: "nothing" },
    { type: "mcq", level: "Medium+", q: "I need to go _____ quiet after work.", options: ["somewhere", "someone", "everyone", "anything"], answer: "somewhere" },

    { type: "mcq", level: "Hard", q: "_____ of the two proposals seems practical; both have major flaws.", options: ["Neither", "Either", "Someone", "Everything"], answer: "Neither" },
    { type: "mcq", level: "Hard", q: "Hardly _____ knew about the policy change before today.", options: ["anyone", "someone", "everyone", "everything"], answer: "anyone" },
    { type: "text", level: "Hard", q: "Fill in: 'I can discuss this with _____ who has legal experience.'", answer: "anyone" },
    { type: "mcq", level: "Hard", q: "_____ who submitted late must attach an explanation.", options: ["Anyone", "Something", "Nothing", "Nowhere"], answer: "Anyone" },
    { type: "mcq", level: "Hard", q: "The speaker addressed _____ in the audience respectfully.", options: ["everyone", "everything", "anything", "somewhere"], answer: "everyone" },
    { type: "text", level: "Hard", q: "Complete: 'I checked both folders, but _____ was missing.'", answer: "nothing" },
    { type: "mcq", level: "Hard", q: "_____ had anticipated such a rapid market shift.", options: ["Nobody", "Somebody", "Anybody", "Everywhere"], answer: "Nobody" },
    { type: "mcq", level: "Hard", q: "She can turn _____ into a learning opportunity.", options: ["anything", "anyone", "somewhere", "nobody"], answer: "anything" },
    { type: "text", level: "Hard", q: "Fill in: 'The auditor interviewed _____ involved in the process.'", answer: "everyone" },
    { type: "mcq", level: "Hard", q: "At this stage, _____ but a full rewrite will solve the issue.", options: ["nothing", "anything", "something", "everyone"], answer: "nothing" },

    { type: "mcq", level: "Advanced", q: "Select the best option: '_____ who wishes to appeal must submit evidence within 7 days.'", options: ["Anyone", "Someone", "No one", "Anything"], answer: "Anyone" },
    { type: "text", level: "Advanced", q: "Fill in one word: '_____ in this clause implies automatic renewal.'", answer: "Nothing" },
    { type: "mcq", level: "Advanced", q: "The board interviewed both finalists, but chose _____.", options: ["neither", "anyone", "someone", "everybody"], answer: "neither" },
    { type: "mcq", level: "Advanced", q: "Choose correct sentence:", options: ["No one don't agree.", "No one agrees.", "No one agree.", "No one agreeing."], answer: "No one agrees." },
    { type: "text", level: "Advanced", q: "Complete: '_____ was authorized to share confidential files externally.'", answer: "Nobody" },
    { type: "mcq", level: "Advanced", q: "The mediator listened to _____ before drafting the compromise.", options: ["everyone", "everything", "everywhere", "anywhere"], answer: "everyone" },
    { type: "mcq", level: "Advanced", q: "Under these constraints, _____ can guarantee zero risk.", options: ["nobody", "anybody", "somebody", "everyone"], answer: "nobody" },
    { type: "text", level: "Advanced", q: "Fill in: 'If _____ raises an objection, the vote will be postponed.'", answer: "anyone" },
    { type: "mcq", level: "Advanced", q: "I searched the archive _____, yet the original memo was absent.", options: ["everywhere", "everyone", "everything", "something"], answer: "everywhere" },
    { type: "text", level: "Advanced", q: "Final challenge: 'In legal English, _____ may be interpreted as implied consent only in specific contexts.'", answer: "silence" }
  ];

  const settings = loadSettings();
  const durationMinutes = Number(settings.quizDuration) || 50;

  const prestartCard = document.getElementById("prestartCard");
  const quizCard = document.getElementById("quizCard");
  const resultCard = document.getElementById("resultCard");
  const questionPreview = document.getElementById("questionPreview");
  const durationBadge = document.getElementById("durationBadge");
  const startBtn = document.getElementById("startBtn");
  const progressEl = document.getElementById("progress");
  const timerEl = document.getElementById("timer");
  const questionTrack = document.getElementById("questionTrack");
  const questionTextEl = document.getElementById("questionText");
  const questionDifficultyEl = document.getElementById("questionDifficulty");
  const optionsListEl = document.getElementById("optionsList");
  const textAnswerWrap = document.getElementById("textAnswerWrap");
  const textAnswerInput = document.getElementById("textAnswerInput");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");
  const scoreText = document.getElementById("scoreText");
  const resultMeta = document.getElementById("resultMeta");

  const state = {
    started: false,
    index: 0,
    answers: new Array(questions.length).fill(null),
    remainingSeconds: durationMinutes * 60,
    timerId: null,
    startedAt: 0,
  };

  renderPreview();
  renderTrack();
  if (durationBadge) durationBadge.textContent = `Time: ${durationMinutes} min`;
  renderTimer();

  startBtn.addEventListener("click", startTest);
  prevBtn.addEventListener("click", () => {
    saveTextInputAnswer();
    state.index = Math.max(0, state.index - 1);
    renderQuestion();
  });
  nextBtn.addEventListener("click", () => {
    saveTextInputAnswer();
    if (state.index < questions.length - 1) {
      state.index += 1;
      renderQuestion();
      return;
    }
    finishQuiz();
  });

  function loadSettings() {
    try {
      return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function formatTime(totalSeconds) {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  function renderPreview() {
    if (!questionPreview) return;
    questionPreview.innerHTML = "";
    questions.forEach((item, i) => {
      const row = document.createElement("p");
      row.className = "preview-item";
      row.textContent = `${i + 1}. (${item.level}) ${item.q}`;
      questionPreview.appendChild(row);
    });
  }

  function startTest() {
    if (state.started) return;
    state.started = true;
    state.startedAt = Date.now();
    prestartCard.classList.add("hidden");
    quizCard.classList.remove("hidden");
    renderQuestion();
    state.timerId = setInterval(() => {
      state.remainingSeconds -= 1;
      renderTimer();
      if (state.remainingSeconds <= 0) {
        finishQuiz();
      }
    }, 1000);
  }

  function renderTimer() {
    timerEl.textContent = formatTime(Math.max(0, state.remainingSeconds));
  }

  function renderQuestion() {
    const current = questions[state.index];
    progressEl.textContent = `Question ${state.index + 1} / ${questions.length}`;
    questionTextEl.textContent = current.q;
    questionDifficultyEl.textContent = `Difficulty: ${current.level}`;

    optionsListEl.innerHTML = "";
    textAnswerWrap.classList.add("hidden");
    textAnswerInput.value = "";

    if (current.type === "mcq") {
      current.options.forEach((opt) => {
        const li = document.createElement("li");
        li.textContent = opt;
        if (state.answers[state.index] === opt) li.classList.add("selected");
        li.addEventListener("click", () => {
          state.answers[state.index] = opt;
          renderQuestion();
        });
        optionsListEl.appendChild(li);
      });
    } else {
      textAnswerWrap.classList.remove("hidden");
      textAnswerInput.value = state.answers[state.index] || "";
      textAnswerInput.focus();
    }

    prevBtn.disabled = state.index === 0;
    nextBtn.textContent = state.index === questions.length - 1 ? "Finish" : "Next";
    renderTrack();
  }

  function renderTrack() {
    if (!questionTrack) return;
    questionTrack.innerHTML = "";
    for (let i = 0; i < questions.length; i += 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "q-dot";
      if (i === state.index) btn.classList.add("current");
      if (state.answers[i]) btn.classList.add("answered");
      btn.textContent = String(i + 1);
      btn.addEventListener("click", () => {
        if (!state.started) return;
        saveTextInputAnswer();
        state.index = i;
        renderQuestion();
      });
      questionTrack.appendChild(btn);
    }
  }

  function saveTextInputAnswer() {
    const current = questions[state.index];
    if (current.type !== "text") return;
    const value = textAnswerInput.value.trim();
    state.answers[state.index] = value || null;
  }

  function finishQuiz() {
    if (!state.started) return;
    state.started = false;
    if (state.timerId) clearInterval(state.timerId);
    saveTextInputAnswer();

    const usedSeconds = durationMinutes * 60 - Math.max(0, state.remainingSeconds);
    let score = 0;

    questions.forEach((item, idx) => {
      const userAnswer = state.answers[idx];
      if (!userAnswer) return;
      const normalizedUser = String(userAnswer).trim().toLowerCase();
      const normalizedAnswer = String(item.answer).trim().toLowerCase();
      if (normalizedUser === normalizedAnswer) score += 1;
    });

    quizCard.classList.add("hidden");
    resultCard.classList.remove("hidden");
    scoreText.textContent = `${score} / ${questions.length}`;
    resultMeta.textContent = `User: ${username} | Time used: ${formatTime(usedSeconds)} | Timer setting: ${durationMinutes} min`;

    saveLeaderboard({
      username,
      score,
      total: questions.length,
      elapsedSeconds: usedSeconds,
      elapsedLabel: formatTime(usedSeconds),
      finishedAt: new Date().toLocaleString(),
    });
  }

  function saveLeaderboard(entry) {
    let data = [];
    try {
      data = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || "[]");
    } catch {
      data = [];
    }
    data.push(entry);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(data));
  }
})();
