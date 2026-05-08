const totalLevels = 9;
let timerId;
let transitionId;

const state = {
  levelIndex: 0,
  score: 0,
  correct: 0,
  attempts: 0,
  timeLeft: 30,
  solvedCurrent: false,
  puzzles: []
};

const elements = {
  levelValue: document.getElementById("levelValue"),
  scoreValue: document.getElementById("scoreValue"),
  accuracyValue: document.getElementById("accuracyValue"),
  timerValue: document.getElementById("timerValue"),
  progressFill: document.getElementById("progressFill"),
  puzzleCard: document.getElementById("puzzleCard"),
  puzzleType: document.getElementById("puzzleType"),
  puzzlePrompt: document.getElementById("puzzlePrompt"),
  puzzleHint: document.getElementById("puzzleHint"),
  answerForm: document.getElementById("answerForm"),
  answerInput: document.getElementById("answerInput"),
  submitBtn: document.getElementById("submitBtn"),
  nextBtn: document.getElementById("nextBtn"),
  restartBtn: document.getElementById("restartBtn"),
  feedback: document.getElementById("feedback"),
  logList: document.getElementById("logList")
};

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addLog(message) {
  const entry = document.createElement("li");
  entry.textContent = message;
  elements.logList.prepend(entry);
  while (elements.logList.children.length > 12) {
    elements.logList.removeChild(elements.logList.lastElementChild);
  }
}

function buildBinaryPuzzle() {
  if (Math.random() > 0.5) {
    const decimal = rand(5, 30);
    return {
      type: "Binary Conversion",
      prompt: `Convert decimal ${decimal} to binary.`,
      hint: "Example: decimal 6 becomes binary 110",
      answer: decimal.toString(2),
      normalize: (value) => value.replace(/\s+/g, "")
    };
  }

  const decimal = rand(5, 25);
  const binary = decimal.toString(2);
  return {
    type: "Binary Conversion",
    prompt: `Convert binary ${binary} to decimal.`,
    hint: "Use base-2 place values: 1, 2, 4, 8...",
    answer: String(decimal),
    normalize: (value) => value.trim()
  };
}

function buildLogicPuzzle() {
  const gate = Math.random() > 0.5 ? "AND" : "OR";
  const a = rand(0, 1);
  const b = rand(0, 1);
  const answer = gate === "AND" ? (a && b ? "1" : "0") : (a || b ? "1" : "0");

  return {
    type: "Logic Gate",
    prompt: `Evaluate ${gate} gate with inputs A=${a}, B=${b}. Output (0 or 1)?`,
    hint: "AND needs both 1. OR needs at least one 1.",
    answer,
    normalize: (value) => value.trim()
  };
}

function shiftLetter(letter, shift) {
  const code = letter.charCodeAt(0);
  if (code < 97 || code > 122) {
    return letter;
  }
  const offset = ((code - 97 + shift) % 26 + 26) % 26;
  return String.fromCharCode(97 + offset);
}

function encodeWord(word, shift) {
  return word
    .toLowerCase()
    .split("")
    .map((letter) => shiftLetter(letter, shift))
    .join("");
}

function buildPasswordPuzzle() {
  const words = ["kernel", "cipher", "matrix", "vector", "signal", "binary", "socket", "crypto"];
  const word = words[rand(0, words.length - 1)];
  const shift = rand(1, 3);
  const encoded = encodeWord(word, shift);

  return {
    type: "Password Decode",
    prompt: `Decode this password token: ${encoded} (Caesar shift +${shift}).`,
    hint: "Shift each letter backward to decode.",
    answer: word,
    normalize: (value) => value.trim().toLowerCase()
  };
}

function generatePuzzles() {
  const builders = [buildBinaryPuzzle, buildLogicPuzzle, buildPasswordPuzzle];
  return Array.from({ length: totalLevels }, (_, index) => builders[index % builders.length]());
}

function getCurrentPuzzle() {
  return state.puzzles[state.levelIndex];
}

function resetTimer() {
  clearInterval(timerId);
  state.timeLeft = Math.max(12, 34 - state.levelIndex * 2);
  elements.timerValue.textContent = `${state.timeLeft}s`;

  timerId = setInterval(() => {
    state.timeLeft -= 1;
    elements.timerValue.textContent = `${state.timeLeft}s`;

    if (state.timeLeft <= 5) {
      elements.timerValue.style.color = "#ff4f6b";
    } else {
      elements.timerValue.style.color = "#ffc94a";
    }

    if (state.timeLeft <= 0) {
      clearInterval(timerId);
      handleTimeout();
    }
  }, 1000);
}

function renderStats() {
  const level = state.levelIndex + 1;
  const accuracy = state.attempts === 0 ? 0 : Math.round((state.correct / state.attempts) * 100);

  elements.levelValue.textContent = String(level <= totalLevels ? level : totalLevels);
  elements.scoreValue.textContent = String(state.score);
  elements.accuracyValue.textContent = `${accuracy}%`;
  elements.progressFill.style.width = `${Math.min((state.levelIndex / totalLevels) * 100, 100)}%`;
}

function renderPuzzle() {
  const puzzle = getCurrentPuzzle();
  if (!puzzle) {
    endGame();
    return;
  }

  elements.puzzleType.textContent = puzzle.type;
  elements.puzzlePrompt.textContent = puzzle.prompt;
  elements.puzzleHint.textContent = puzzle.hint;
  elements.feedback.textContent = "";
  elements.feedback.className = "feedback";
  elements.answerInput.value = "";
  elements.answerInput.focus();
  elements.submitBtn.disabled = false;
  elements.nextBtn.classList.add("hidden");
  state.solvedCurrent = false;

  renderStats();
  resetTimer();
  addLog(`Level ${state.levelIndex + 1} initialized: ${puzzle.type}`);
}

function transitionAndRenderNext() {
  clearTimeout(transitionId);
  elements.puzzleCard.classList.add("transitioning");
  transitionId = setTimeout(() => {
    elements.puzzleCard.classList.remove("transitioning");
    renderPuzzle();
  }, 280);
}

function markCorrect() {
  clearInterval(timerId);
  state.solvedCurrent = true;
  state.correct += 1;
  const speedBonus = state.timeLeft * 9;
  const basePoints = 120;
  const streakBonus = Math.min(60, Math.max(0, state.correct - (state.attempts - state.correct)) * 8);
  state.score += basePoints + speedBonus + streakBonus;

  elements.feedback.textContent = `Access granted. +${basePoints + speedBonus + streakBonus} points.`;
  elements.feedback.className = "feedback ok";
  elements.submitBtn.disabled = true;
  elements.nextBtn.classList.remove("hidden");
  addLog(`Level ${state.levelIndex + 1} breached with ${state.timeLeft}s remaining.`);
  renderStats();
}

function markIncorrect() {
  state.score = Math.max(0, state.score - 25);
  elements.feedback.textContent = "Access denied. Logic mismatch. Try again.";
  elements.feedback.className = "feedback bad";
  addLog(`Failed attempt on level ${state.levelIndex + 1}. Penalty applied.`);
  renderStats();
}

function handleTimeout() {
  elements.feedback.textContent = "Timer expired. Firewall advanced to next sector.";
  elements.feedback.className = "feedback bad";
  state.score = Math.max(0, state.score - 40);
  state.levelIndex += 1;
  addLog("Time breach detected. Auto-jumping to next level.");
  renderStats();
  setTimeout(() => transitionAndRenderNext(), 500);
}

function endGame() {
  clearInterval(timerId);
  elements.submitBtn.disabled = true;
  elements.nextBtn.classList.add("hidden");
  elements.puzzleType.textContent = "Mission Complete";

  const accuracy = state.attempts === 0 ? 0 : Math.round((state.correct / state.attempts) * 100);
  elements.puzzlePrompt.textContent = `Network compromised. Final score: ${state.score}. Accuracy: ${accuracy}%.`;
  elements.puzzleHint.textContent = "Press Restart Mission to run a fresh puzzle chain.";
  elements.feedback.textContent = "All security levels cleared.";
  elements.feedback.className = "feedback ok";
  elements.timerValue.textContent = "0s";
  elements.progressFill.style.width = "100%";
  addLog("Mission completed successfully.");
}

function checkAnswer(event) {
  event.preventDefault();
  if (state.solvedCurrent) {
    return;
  }

  const puzzle = getCurrentPuzzle();
  if (!puzzle) {
    return;
  }

  const userInput = puzzle.normalize(elements.answerInput.value);
  const expected = puzzle.normalize(puzzle.answer);
  state.attempts += 1;

  if (userInput === expected) {
    markCorrect();
    return;
  }

  markIncorrect();
}

function nextLevel() {
  if (!state.solvedCurrent) {
    return;
  }
  state.levelIndex += 1;
  transitionAndRenderNext();
}

function restartGame() {
  clearInterval(timerId);
  clearTimeout(transitionId);
  elements.puzzleCard.classList.remove("transitioning");
  state.levelIndex = 0;
  state.score = 0;
  state.correct = 0;
  state.attempts = 0;
  state.solvedCurrent = false;
  state.puzzles = generatePuzzles();
  elements.logList.innerHTML = "";
  addLog("Mission restarted. New cipher chain generated.");
  renderPuzzle();
}

elements.answerForm.addEventListener("submit", checkAnswer);
elements.nextBtn.addEventListener("click", nextLevel);
elements.restartBtn.addEventListener("click", restartGame);

state.puzzles = generatePuzzles();
renderPuzzle();
