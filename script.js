(() => {
  'use strict';

  /* ---------- fallback word bank (used if words.json can't be fetched,
     e.g. when the page is opened directly from disk without a server) ---------- */
  const FALLBACK_WORDS = [
    { id: 1, word: "Pizza", hint: "Italian" },
    { id: 2, word: "Beach", hint: "Vacation spot" },
    { id: 3, word: "Doctor", hint: "Hospital" },
    { id: 4, word: "Guitar", hint: "Musical instrument" },
    { id: 5, word: "Elephant", hint: "Large mammal" },
    { id: 6, word: "Wedding", hint: "Celebration" },
    { id: 7, word: "Astronaut", hint: "Space" },
    { id: 8, word: "Library", hint: "Quiet place" },
    { id: 9, word: "Volcano", hint: "Natural disaster" },
    { id: 10, word: "Chef", hint: "Kitchen" }
  ];

  const USED_IDS_KEY = 'undercover_used_word_ids';

  /* ---------- state ---------- */
  const state = {
    wordBank: [],
    playerCount: 5,
    players: [],
    currentIndex: 0,
    imposterIndex: -1,
    currentWord: null,
    animating: false
  };

  /* ---------- element refs ---------- */
  const screens = {
    setup: document.getElementById('screen-setup'),
    names: document.getElementById('screen-names'),
    reveal: document.getElementById('screen-reveal'),
    discuss: document.getElementById('screen-discuss')
  };

  const countValue = document.getElementById('count-value');
  const countMinus = document.getElementById('count-minus');
  const countPlus = document.getElementById('count-plus');
  const btnToNames = document.getElementById('btn-to-names');

  const rosterForm = document.getElementById('roster-form');
  const btnToGame = document.getElementById('btn-to-game');
  const btnBackSetup = document.getElementById('btn-back-setup');

  const passName = document.getElementById('pass-name');
  const dossier = document.getElementById('dossier');
  const dossierTab = document.getElementById('dossier-tab');
  const revealKicker = document.getElementById('reveal-kicker');
  const revealWord = document.getElementById('reveal-word');
  const revealHint = document.getElementById('reveal-hint');
  const btnNextPlayer = document.getElementById('btn-next-player');

  const btnNewRound = document.getElementById('btn-new-round');
  const btnNewGame = document.getElementById('btn-new-game');

  /* ---------- screen switching ---------- */
  function showScreen(name) {
    Object.values(screens).forEach(s => s.classList.remove('active'));
    screens[name].classList.add('active');
  }

  /* ---------- load words ---------- */
  async function loadWords() {
    try {
      const res = await fetch('words.json');
      if (!res.ok) throw new Error('bad response');
      const data = await res.json();
      state.wordBank = Array.isArray(data) && data.length ? data : FALLBACK_WORDS;
    } catch (e) {
      state.wordBank = FALLBACK_WORDS;
    }
  }

  /* ---------- word selection (no repeats until the bank is exhausted) ---------- */
  function getUsedIds() {
    try {
      return JSON.parse(localStorage.getItem(USED_IDS_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveUsedIds(ids) {
    try { localStorage.setItem(USED_IDS_KEY, JSON.stringify(ids)); } catch (e) { /* ignore */ }
  }

  function pickWord() {
    let used = getUsedIds();
    let available = state.wordBank.filter(w => !used.includes(w.id));
    if (available.length === 0) {
      used = [];
      available = state.wordBank.slice();
    }
    const chosen = available[Math.floor(Math.random() * available.length)];
    used.push(chosen.id);
    saveUsedIds(used);
    return chosen;
  }

  /* ---------- setup screen: player count stepper ---------- */
  countMinus.addEventListener('click', () => {
    state.playerCount = Math.max(3, state.playerCount - 1);
    countValue.textContent = state.playerCount;
  });

  countPlus.addEventListener('click', () => {
    state.playerCount = Math.min(12, state.playerCount + 1);
    countValue.textContent = state.playerCount;
  });

  btnToNames.addEventListener('click', () => {
    buildRoster();
    showScreen('names');
  });

  /* ---------- names screen ---------- */
  function buildRoster() {
    rosterForm.innerHTML = '';
    for (let i = 0; i < state.playerCount; i++) {
      const row = document.createElement('div');
      row.className = 'roster-row';

      const num = document.createElement('span');
      num.className = 'roster-num';
      num.textContent = String(i + 1).padStart(2, '0');

      const input = document.createElement('input');
      input.type = 'text';
      input.placeholder = `Agent ${i + 1}`;
      input.maxLength = 18;
      input.autocomplete = 'off';

      row.appendChild(num);
      row.appendChild(input);
      rosterForm.appendChild(row);
    }
  }

  btnBackSetup.addEventListener('click', () => showScreen('setup'));

  btnToGame.addEventListener('click', () => {
    const inputs = rosterForm.querySelectorAll('input');
    state.players = Array.from(inputs).map((inp, i) => {
      const val = inp.value.trim();
      return val || `Agent ${i + 1}`;
    });
    startGame();
  });

  /* ---------- game start ---------- */
  function startGame() {
    state.currentWord = pickWord();
    state.imposterIndex = Math.floor(Math.random() * state.players.length);
    state.currentIndex = 0;
    renderReveal();
    showScreen('reveal');
  }

  /* ---------- reveal screen ---------- */
  function renderReveal() {
    const i = state.currentIndex;
    passName.textContent = state.players[i];
    dossierTab.textContent = String(i + 1).padStart(2, '0');

    dossier.classList.remove('is-flipped', 'is-stamping');
    btnNextPlayer.hidden = true;
    state.animating = false;

    if (i === state.imposterIndex) {
      revealKicker.textContent = "YOU ARE THE IMPOSTER";
      revealWord.textContent = "???";
      revealHint.textContent = `Hint: ${state.currentWord.hint}`;
    } else {
      revealKicker.textContent = "THE WORD IS";
      revealWord.textContent = state.currentWord.word;
      revealHint.textContent = '';
    }
  }

  dossier.addEventListener('click', () => {
    if (state.animating || dossier.classList.contains('is-flipped')) return;
    state.animating = true;
    dossier.classList.add('is-stamping');

    setTimeout(() => {
      dossier.classList.remove('is-stamping');
      dossier.classList.add('is-flipped');
    }, 480);

    setTimeout(() => {
      btnNextPlayer.hidden = false;
      state.animating = false;
    }, 480 + 700);
  });

  const FLIP_MS = 700; // must match the .dossier transform transition in style.css

  btnNextPlayer.addEventListener('click', () => {
    if (state.animating) return;
    state.animating = true;
    btnNextPlayer.hidden = true;

    // Close the card first. Do NOT touch reveal-word/reveal-hint content yet —
    // the back face is still visible during part of this rotation, and swapping
    // the text now would flash the next player's answer before it turns away.
    dossier.classList.remove('is-flipped');

    setTimeout(() => {
      state.currentIndex += 1;
      if (state.currentIndex >= state.players.length) {
        showScreen('discuss');
      } else {
        renderReveal(); // safe now: card is fully closed, back face isn't visible
      }
    }, FLIP_MS);
  });

  /* ---------- discussion screen ---------- */
  btnNewRound.addEventListener('click', () => {
    startGame();
  });

  btnNewGame.addEventListener('click', () => {
    state.players = [];
    showScreen('setup');
  });

  /* ---------- init ---------- */
  loadWords();
})();