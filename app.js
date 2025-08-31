// Firebase v11 (modules from gstatic CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  runTransaction,
  serverTimestamp,
  collection,
  query,
  collectionGroup,
  getDocs,
  orderBy,
  limit,
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// --- Firebase Configuration ---
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCUoT3L0MZmhRVXVXQ8JiqpnEgZ3NtVV0U",
  authDomain: "typemaster-pro-app.firebaseapp.com",
  projectId: "typemaster-pro-app",
  storageBucket: "typemaster-pro-app.firebasestorage.app",
  messagingSenderId: "333406822950",
  appId: "1:333406822950:web:776d7b9c2a9eb682e47ce7",
  measurementId: "G-2Y6DC8GSQ2",
};

let app, auth, db, userId;

try {
  const cfg =
    firebaseConfig.apiKey.includes("YOUR") &&
    typeof window.__firebase_config !== "undefined"
      ? JSON.parse(window.__firebase_config)
      : firebaseConfig;
  app = initializeApp(cfg);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (e) {
  console.error("Firebase initialization failed:", e);
  alert(
    "Could not connect to the game services. Please check your Firebase configuration."
  );
}

// --- Leaderboard Logic ---
async function loadLeaderboard() {
  const display = $("#leaderboard-content");
  if (!db) {
    display.textContent = "Database connection not available.";
    return;
  }

  try {
    // This query requires a composite index in Firestore.
    const q = query(
      collectionGroup(db, "typingGame"),
      orderBy("bestWPM", "desc"),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      display.textContent = "No one has played yet. Be the first!";
    } else {
      const topPlayer = querySnapshot.docs[0].data();
      const topPlayerId = querySnapshot.docs[0].ref.parent.parent.id; // Get the user ID from the path
      display.innerHTML = `
        <span class="font-bold text-cyan-400">Guest-${topPlayerId.substring(
          0,
          6
        )}</span>
        with <span class="text-2xl font-bold">${Math.round(
          topPlayer.bestWPM
        )} WPM</span>
      `;
    }
  } catch (error) {
    console.error("Error loading leaderboard:", error);
    display.textContent = "Could not load leaderboard data.";
    if (error.code === "failed-precondition") {
      display.innerHTML +=
        "<br><small class='text-gray-500'>This feature requires a Firestore index. Check the browser's developer console for a link to create it.</small>";
    }
  }
}

// --- UI Elements ---
const $ = (s) => document.querySelector(s);
const authPage = $("#auth-page");
const gamePage = $("#game-page");
const playBtn = $("#play-btn");
const logoutBtn = $("#logoutBtn");
const usernameDisplay = $("#username");
const quantityLabel = $("#quantityLabel");
const timerLabel = $("#timerLabel");
const themeToggle = $("#themeToggle");
const pauseBtn = $("#pauseBtn");
const pauseBanner = $("#pauseBanner");
const copyBtn = $("#copyBtn");

// Theme
const applyTheme = (theme) => {
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  localStorage.setItem("tm_theme", theme);
};
applyTheme(localStorage.getItem("tm_theme") || "dark");
themeToggle?.addEventListener("click", () => {
  const next = document.documentElement.classList.contains("light")
    ? "dark"
    : "light";
  applyTheme(next);
});

// --- Authentication Logic ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    userId = user.uid;
    usernameDisplay.textContent = `Guest-${userId.substring(0, 6)}`;
    authPage.classList.add("hidden");
    gamePage.classList.remove("hidden");
    loadLeaderboard(); // Load leaderboard when user is logged in
  } else {
    userId = null;
    authPage.classList.remove("hidden");
    gamePage.classList.add("hidden");
  }
});

playBtn?.addEventListener("click", async () => {
  try {
    if (!auth) throw new Error("Authentication service is not available.");
    playBtn.disabled = true;
    playBtn.textContent = "Connecting...";
    await signInAnonymously(auth);
  } catch (error) {
    console.error("Anonymous sign-in failed:", error);
    alert("Failed to connect. Please check your connection and try again.");
  } finally {
    playBtn.disabled = false;
    playBtn.textContent = "Play as Guest";
  }
});

logoutBtn?.addEventListener("click", () => {
  signOut(auth);
});

// --- Typing Game Logic ---
class TypingGame {
  constructor() {
    this.wordSets = {
      common: [
        "the",
        "be",
        "to",
        "of",
        "and",
        "a",
        "in",
        "that",
        "have",
        "I",
        "it",
        "for",
        "not",
        "on",
        "with",
        "he",
        "as",
        "you",
        "do",
        "at",
        "this",
        "but",
        "his",
        "by",
        "from",
        "they",
        "we",
        "say",
        "her",
        "she",
        "or",
        "an",
        "will",
        "my",
        "one",
        "all",
        "would",
        "there",
        "their",
        "what",
        "so",
        "up",
        "out",
        "if",
        "about",
        "who",
        "get",
        "which",
        "go",
        "me",
      ],
      code: [
        "function",
        "const",
        "let",
        "var",
        "return",
        "async",
        "await",
        "Promise",
        "object",
        "array",
        "string",
        "number",
        "boolean",
        "React",
        "Node",
        "Express",
        "MongoDB",
        "import",
        "export",
        "class",
        "extends",
        "constructor",
        "arrow",
        "map",
        "filter",
        "reduce",
        "callback",
        "server",
        "client",
        "route",
        "middleware",
        "hook",
        "state",
        "props",
        "render",
        "component",
        "TypeScript",
      ],
      mixed: [],
    };
    if (!this.wordSets.mixed.length) {
      this.wordSets.mixed = [...this.wordSets.common, ...this.wordSets.code];
    }

    this.dom = {
      wpm: $("#wpm"),
      accuracy: $("#accuracy"),
      timer: $("#timer"),
      streak: $("#streak"),
      best: $("#best"),
      textDisplay: $("#textDisplay"),
      typingInput: $("#typingInput"),
      startBtn: $("#startBtn"),
      resultsModal: $("#resultsModal"),
      finalWPM: $("#finalWPM"),
      finalAccuracy: $("#finalAccuracy"),
      totalKeys: $("#totalKeys"),
      totalWords: $("#totalWords"),
      retryBtn: $("#retryBtn"),
      closeModalBtn: $("#closeModalBtn"),
      quantityLabel,
      timerLabel,
      pauseBtn,
      pauseBanner,
      wordSet: $("#wordSet"),
      copyBtn,
    };

    this.loadBest();
    this.setupEventListeners();
    this.resetGame();
  }

  setupEventListeners() {
    this.dom.startBtn.addEventListener("click", () => this.startGame());
    this.dom.retryBtn.addEventListener("click", () => this.resetGame());
    this.dom.closeModalBtn.addEventListener("click", () => this.hideModal());
    this.dom.typingInput.addEventListener("input", (e) => this.handleInput(e));
    this.dom.pauseBtn.addEventListener("click", () => this.togglePause());
    this.dom.copyBtn.addEventListener("click", () => this.copyResults());
    this.dom.wordSet.addEventListener("change", () => this.resetGame());

    document.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.changeSetting(e.target, "mode", ".mode-btn")
      );
    });
    document.querySelectorAll(".duration-btn").forEach((btn) => {
      btn.addEventListener("click", (e) =>
        this.changeSetting(e.target, "duration", ".duration-btn")
      );
    });

    // REMOVED: Hotkeys were disabled as requested.
    // window.addEventListener("keydown", ...);

    this.dom.textDisplay.addEventListener("click", () =>
      this.dom.typingInput.focus()
    );
  }

  changeSetting(target, settingKey, selector) {
    if (this.gameState.isPlaying) return;
    document
      .querySelectorAll(selector)
      .forEach((b) => b.classList.remove("active", "btn-primary"));
    target.classList.add("active", "btn-primary");

    const value = target.dataset[settingKey] || target.dataset.value;
    this.gameState[settingKey] =
      settingKey === "duration" ? parseInt(value) : value;

    localStorage.setItem(`tm_${settingKey}`, value);

    if (settingKey === "mode") {
      const isTimeMode = value === "time";
      this.dom.quantityLabel.textContent = isTimeMode
        ? "Duration (s)"
        : "Word Count";
      this.dom.timerLabel.textContent = isTimeMode ? "Time" : "Timer";
    }
    this.resetGame();
  }

  resetGame() {
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.isPaused = false;
    this.dom.pauseBanner.classList.add("hidden");
    this.dom.pauseBtn.textContent = "Pause";
    this.dom.pauseBtn.disabled = true;
    this.dom.copyBtn.style.display = "none";

    const activeModeBtn = document.querySelector(".mode-btn.active");
    const activeDurationBtn = document.querySelector(".duration-btn.active");

    this.gameState = {
      isPlaying: false,
      mode:
        (activeModeBtn
          ? activeModeBtn.dataset.mode
          : localStorage.getItem("tm_mode")) || "time",
      duration: activeDurationBtn
        ? parseInt(activeDurationBtn.dataset.value)
        : parseInt(localStorage.getItem("tm_duration") || "30"),
      words: [],
      currentWordIndex: 0,
      startTime: null,
      correctChars: 0,
      incorrectChars: 0,
      totalKeys: 0,
      streak: 0,
      maxStreak: 0,
    };

    const isTimeMode = this.gameState.mode === "time";
    this.dom.quantityLabel.textContent = isTimeMode
      ? "Duration (s)"
      : "Word Count";
    this.dom.timerLabel.textContent = isTimeMode ? "Time" : "Timer";

    this.generateText();
    this.updateDisplay();
    this.dom.typingInput.value = "";
    this.dom.typingInput.disabled = true;
    this.dom.startBtn.style.display = "inline-flex";
    this.hideModal();
  }

  generateText() {
    const selectedSet = this.dom.wordSet.value || "common";
    const wordList = this.wordSets[selectedSet];
    const quantity =
      this.gameState.mode === "words" ? this.gameState.duration : 200;

    const shuffled = [...wordList].sort(() => 0.5 - Math.random());
    this.gameState.words = [];
    for (let i = 0; i < quantity; i++) {
      this.gameState.words.push(shuffled[i % shuffled.length]);
    }

    this.dom.textDisplay.innerHTML = this.gameState.words
      .map(
        (word) =>
          `<span class="word">${word
            .split("")
            .map((char) => `<span class="char">${char}</span>`)
            .join("")}</span>`
      )
      .join(" ");

    const firstChar = this.dom.textDisplay.querySelector(".char");
    if (firstChar) {
      firstChar.classList.add("current");
    }
  }

  updateDisplay() {
    this.dom.wpm.textContent = 0;
    this.dom.accuracy.textContent = "100%";
    this.dom.streak.textContent = 0;
    this.dom.timer.textContent = this.gameState.duration;
  }

  startGame() {
    if (this.gameState.isPlaying) return;
    this.resetGame();
    this.gameState.isPlaying = true;
    this.gameState.startTime = Date.now();
    this.dom.typingInput.disabled = false;
    this.dom.typingInput.focus();
    this.dom.startBtn.style.display = "none";
    this.dom.pauseBtn.disabled = false;

    this.timerInterval = setInterval(() => this.updateTimer(), 1000);
  }

  togglePause() {
    if (!this.gameState.isPlaying) return;
    this.isPaused = !this.isPaused;

    if (this.isPaused) {
      clearInterval(this.timerInterval);
      this.elapsedMsBeforePause = Date.now() - this.gameState.startTime;
      this.dom.typingInput.disabled = true;
      this.dom.pauseBanner.classList.remove("hidden");
      this.dom.pauseBtn.textContent = "Resume";
    } else {
      this.gameState.startTime = Date.now() - this.elapsedMsBeforePause;
      this.dom.typingInput.disabled = false;
      this.dom.typingInput.focus();
      this.dom.pauseBanner.classList.add("hidden");
      this.dom.pauseBtn.textContent = "Pause";
      this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }
  }

  updateTimer() {
    const elapsedMs = Date.now() - this.gameState.startTime;
    const elapsedSeconds = Math.floor(elapsedMs / 1000);

    if (this.gameState.mode === "time") {
      const timeLeft = this.gameState.duration - elapsedSeconds;
      this.dom.timer.textContent = Math.max(0, timeLeft);
      if (timeLeft <= 0) this.endGame();
    } else {
      this.dom.timer.textContent = elapsedSeconds;
    }
  }

  handleInput() {
    if (!this.gameState.isPlaying || this.isPaused) return;
    this.gameState.totalKeys++;

    const typedValue = this.dom.typingInput.value;
    if (typedValue.endsWith(" ")) {
      this.processWord(typedValue.slice(0, -1));
      this.dom.typingInput.value = "";
    } else {
      this.updateCharacterHighlight();
    }
    this.updateLiveStats();
  }

  processWord(typedWord) {
    const currentWord =
      this.gameState.words[this.gameState.currentWordIndex] || "";

    for (let i = 0; i < Math.max(typedWord.length, currentWord.length); i++) {
      if (typedWord[i] === currentWord[i]) {
        this.gameState.correctChars++;
      } else {
        this.gameState.incorrectChars++;
      }
    }
    this.gameState.correctChars++;
    this.gameState.currentWordIndex++;

    if (
      this.gameState.mode === "words" &&
      this.gameState.currentWordIndex >= this.gameState.duration
    ) {
      this.endGame();
      return;
    }
    this.updateCharacterHighlight(true);
  }

  updateCharacterHighlight(isNewWord = false) {
    const allWords = this.dom.textDisplay.querySelectorAll(".word");
    if (this.gameState.currentWordIndex > 0) {
      const prevWord = allWords[this.gameState.currentWordIndex - 1];
      if (prevWord) {
        prevWord
          .querySelectorAll(".char")
          .forEach((c) => c.classList.remove("current"));
      }
    }

    const currentWordEl = allWords[this.gameState.currentWordIndex];
    if (!currentWordEl) return;

    const currentChars = currentWordEl.querySelectorAll(".char");
    const typed = this.dom.typingInput.value;

    currentChars.forEach((charSpan, index) => {
      charSpan.classList.remove("correct", "incorrect", "current");
      if (index < typed.length) {
        charSpan.classList.add(
          charSpan.textContent === typed[index] ? "correct" : "incorrect"
        );
      }
    });

    if (typed.length < currentChars.length) {
      currentChars[typed.length].classList.add("current");
    }
  }

  updateLiveStats() {
    const elapsedMinutes = (Date.now() - this.gameState.startTime) / 60000;
    if (elapsedMinutes <= 0) return;

    const grossWPM = this.gameState.correctChars / 5 / elapsedMinutes;
    this.dom.wpm.textContent = Math.round(Math.max(0, grossWPM));

    const totalChars =
      this.gameState.correctChars + this.gameState.incorrectChars;
    const acc =
      totalChars > 0
        ? Math.round((this.gameState.correctChars / totalChars) * 100)
        : 100;
    this.dom.accuracy.textContent = `${acc}%`;

    const currentWord =
      this.gameState.words[this.gameState.currentWordIndex] || "";
    const typed = this.dom.typingInput.value;
    let streak = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === currentWord[i]) streak++;
      else break;
    }
    this.dom.streak.textContent = streak;
  }

  endGame() {
    if (!this.gameState.isPlaying) return;
    clearInterval(this.timerInterval);
    this.gameState.isPlaying = false;
    this.dom.typingInput.disabled = true;
    this.dom.pauseBtn.disabled = true;
    this.dom.copyBtn.style.display = "inline-flex";

    const elapsedMinutes = (Date.now() - this.gameState.startTime) / 60000;
    const grossWPM = this.gameState.correctChars / 5 / elapsedMinutes;
    const finalWPM = Math.round(Math.max(0, grossWPM));

    const totalTyped =
      this.gameState.correctChars + this.gameState.incorrectChars;
    const finalAccuracy =
      totalTyped > 0
        ? Math.round((this.gameState.correctChars / totalTyped) * 100)
        : 100;

    this.dom.finalWPM.textContent = finalWPM;
    this.dom.finalAccuracy.textContent = `${finalAccuracy}%`;
    this.dom.totalKeys.textContent = this.gameState.totalKeys;
    this.dom.totalWords.textContent = this.gameState.currentWordIndex;
    this.showModal();

    this.saveStats({ wpm: finalWPM, accuracy: finalAccuracy });
    this.updateBest(finalWPM);
  }

  showModal() {
    this.dom.resultsModal.classList.add("show");
  }
  hideModal() {
    this.dom.resultsModal.classList.remove("show");
  }

  copyResults() {
    const text = `TypeMaster Pro Results:\nWPM: ${this.dom.finalWPM.textContent}\nAccuracy: ${this.dom.finalAccuracy.textContent}%\nKeystrokes: ${this.dom.totalKeys.textContent}\nWords: ${this.dom.totalWords.textContent}`;
    navigator.clipboard
      .writeText(text)
      .then(() => {
        alert("Results copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy results: ", err);
      });
  }

  loadBest() {
    this.best = parseInt(localStorage.getItem("tm_best_wpm") || "0");
    $("#best").textContent = String(this.best);
  }
  updateBest(wpm) {
    if (wpm > this.best) {
      this.best = wpm;
      localStorage.setItem("tm_best_wpm", String(wpm));
      $("#best").textContent = String(wpm);
    }
  }

  async saveStats(stats) {
    if (!userId || !db) return;
    const userSummaryRef = doc(db, `users/${userId}/typingGame/summary`);
    const userGamesCol = collection(db, `users/${userId}/games`);
    const gameDocRef = doc(userGamesCol, String(Date.now()));

    try {
      await setDoc(gameDocRef, {
        ...stats,
        mode: this.gameState.mode,
        duration: this.gameState.duration,
        timestamp: serverTimestamp(),
      });

      await runTransaction(db, async (transaction) => {
        const snap = await transaction.get(userSummaryRef);
        if (!snap.exists()) {
          transaction.set(userSummaryRef, {
            totalGames: 1,
            bestWPM: stats.wpm,
            avgWPM: stats.wpm,
            avgAccuracy: stats.accuracy,
          });
        } else {
          const data = snap.data();
          const newTotalGames = (data.totalGames || 0) + 1;
          const newBestWPM = Math.max(data.bestWPM || 0, stats.wpm);
          const newAvgWPM =
            ((data.avgWPM || 0) * (data.totalGames || 0) + stats.wpm) /
            newTotalGames;
          const newAvgAccuracy =
            ((data.avgAccuracy || 0) * (data.totalGames || 0) +
              stats.accuracy) /
            newTotalGames;
          transaction.update(userSummaryRef, {
            totalGames: newTotalGames,
            bestWPM: newBestWPM,
            avgWPM: newAvgWPM,
            avgAccuracy: newAvgAccuracy,
          });
        }
      });
      loadLeaderboard(); // Refresh leaderboard after saving stats
    } catch (e) {
      console.error("Error saving stats: ", e);
    }
  }
}

document.addEventListener("DOMContentLoaded", () => {
  if (auth) {
    new TypingGame();
  }
});
