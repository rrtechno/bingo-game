/* ============================================================
   Party Bingo — app.js
   Everything runs client-side. State is saved to localStorage
   so a refresh mid-party doesn't lose the game.
   ============================================================ */

const STORAGE_KEY = 'partyBingoState_v1';

const state = {
  games: [],           // loaded from games/manifest.json
  selectedGame: null,  // the game object currently being configured/played
  session: null        // active game session (see createSession)
};

/* ---------- DOM helpers ---------- */
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => Array.from(document.querySelectorAll(sel));

function showScreen(id) {
  $$('.screen').forEach((s) => s.classList.remove('active'));
  $(`#${id}`).classList.add('active');
  window.scrollTo(0, 0);
}

/* ============================================================
   Loading games
   ============================================================ */
async function loadGames() {
  const list = $('#gameList');
  try {
    const manifestRes = await fetch('games/manifest.json');
    const manifest = await manifestRes.json();
    const games = await Promise.all(
      manifest.games.map((file) => fetch(`games/${file}`).then((r) => r.json()))
    );
    state.games = games;
    renderGameList();
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load games. If you're opening this file directly on the tablet, host it through GitHub Pages (or any local web server) so the game files can load.<br><br><span class="muted">${err.message}</span></div>`;
  }
}

function renderGameList() {
  const list = $('#gameList');
  if (!state.games.length) {
    list.innerHTML = `<div class="empty-state">No games found in the games folder yet.</div>`;
    return;
  }
  list.innerHTML = '';
  state.games.forEach((game) => {
    const card = document.createElement('div');
    card.className = 'game-card';
    card.innerHTML = `
      <h3>${escapeHtml(game.title)}</h3>
      <p>${escapeHtml(game.description || '')}</p>
      <p class="muted">${game.items.length} possible items</p>
      <button class="btn btn-primary btn-block" data-select-game="${game.id}">Choose this game</button>
    `;
    list.appendChild(card);
  });
  $$('[data-select-game]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const game = state.games.find((g) => g.id === btn.dataset.selectGame);
      openSetup(game);
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* ============================================================
   Setup screen
   ============================================================ */
function openSetup(game) {
  state.selectedGame = game;
  $('#setupTitle').textContent = game.title;
  $('#setupDescription').textContent = game.description || '';
  $('#cardCount').value = 20;
  $('#timerSeconds').value = 12;
  setupPatternPills();
  setupGridPills();
  setupCallModePills();
  updatePoolWarning();
  showScreen('screen-setup');
}

function setupGridPills() {
  $$('#gridOptions .option-pill').forEach((pill) => {
    pill.classList.toggle('checked', pill.querySelector('input').checked);
    pill.querySelector('input').addEventListener('change', () => {
      $$('#gridOptions .option-pill').forEach((p) => p.classList.remove('checked'));
      pill.classList.add('checked');
      updatePoolWarning();
    });
  });
}

function setupPatternPills() {
  $$('#patternOptions .option-pill').forEach((pill) => {
    pill.classList.toggle('checked', pill.querySelector('input').checked);
    pill.querySelector('input').addEventListener('change', () => {
      $$('#patternOptions .option-pill').forEach((p) => p.classList.remove('checked'));
      pill.classList.add('checked');
    });
  });
}

function setupCallModePills() {
  $$('#callModeOptions .option-pill').forEach((pill) => {
    pill.classList.toggle('checked', pill.querySelector('input').checked);
    pill.querySelector('input').addEventListener('change', () => {
      $$('#callModeOptions .option-pill').forEach((p) => p.classList.remove('checked'));
      pill.classList.add('checked');
      $('#timerRow').style.display = getCallMode() === 'auto' ? 'flex' : 'none';
    });
  });
  $('#timerRow').style.display = getCallMode() === 'auto' ? 'flex' : 'none';
}

function getGridSize() {
  return parseInt($('input[name="gridSize"]:checked').value, 10);
}
function getPattern() {
  return $('input[name="pattern"]:checked').value;
}
function getCallMode() {
  return $('input[name="callMode"]:checked').value;
}

function cellsNeeded(gridSize) {
  const total = gridSize * gridSize;
  return gridSize === 5 ? total - 1 : total; // 5x5 reserves a FREE center
}

function updatePoolWarning() {
  const game = state.selectedGame;
  if (!game) return;
  const need = cellsNeeded(getGridSize());
  const warn = $('#poolWarning');
  if (game.items.length < need) {
    warn.style.display = 'block';
    warn.textContent = `This game only has ${game.items.length} items, but a ${getGridSize()}x${getGridSize()} card needs ${need} unique items per card. Pick the smaller grid, or add more items to this game's JSON file.`;
  } else {
    warn.style.display = 'none';
  }
}

/* ============================================================
   Card generation
   ============================================================ */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function generateCards(items, gridSize, count) {
  const need = cellsNeeded(gridSize);
  const cards = [];
  const seenArrangements = new Set();

  for (let n = 1; n <= count; n++) {
    let cells;
    let key;
    let attempts = 0;
    do {
      const picked = shuffle(items).slice(0, need);
      cells = picked;
      key = picked.join('|');
      attempts++;
    } while (seenArrangements.has(key) && attempts < 6);
    seenArrangements.add(key);

    // Build the full grid, inserting FREE at center for 5x5
    const grid = [];
    let cellIdx = 0;
    const total = gridSize * gridSize;
    const centerIdx = gridSize === 5 ? Math.floor(total / 2) : -1;
    for (let i = 0; i < total; i++) {
      if (i === centerIdx) {
        grid.push({ text: 'FREE', free: true });
      } else {
        grid.push({ text: cells[cellIdx], free: false });
        cellIdx++;
      }
    }
    cards.push({ number: n, grid });
  }
  return cards;
}

function unionOfUsedItems(cards) {
  const set = new Set();
  cards.forEach((card) => {
    card.grid.forEach((cell) => {
      if (!cell.free) set.add(cell.text);
    });
  });
  return Array.from(set);
}

/* ============================================================
   Session lifecycle
   ============================================================ */
function createSession() {
  const game = state.selectedGame;
  const gridSize = getGridSize();
  const pattern = getPattern();
  const callMode = getCallMode();
  const timerSeconds = parseInt($('#timerSeconds').value, 10) || 12;
  const count = Math.max(1, Math.min(200, parseInt($('#cardCount').value, 10) || 20));

  const cards = generateCards(game.items, gridSize, count);
  const callPool = shuffle(unionOfUsedItems(cards));

  state.session = {
    gameId: game.id,
    gameTitle: game.title,
    gridSize,
    pattern,
    callMode,
    timerSeconds,
    cards,
    callPool,
    calledItems: [],
    autoRunning: false,
    createdAt: Date.now()
  };
  saveSession();
}

function saveSession() {
  if (state.session) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.session));
  }
}

function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      state.session = JSON.parse(raw);
      return true;
    }
  } catch (e) { /* ignore corrupt state */ }
  return false;
}

function clearSession() {
  state.session = null;
  localStorage.removeItem(STORAGE_KEY);
}

/* ============================================================
   Print screen
   ============================================================ */
function renderPrintScreen() {
  const { cards, gridSize, gameTitle } = state.session;
  const grid = $('#printGrid');
  grid.style.setProperty('--cols', gridSize);
  grid.innerHTML = cards.map((card) => renderCardHtml(card, gridSize, gameTitle, [])).join('');
  showScreen('screen-print');
}

function renderCardHtml(card, gridSize, gameTitle, calledItems) {
  const cells = card.grid.map((cell) => {
    const marked = !cell.free && calledItems.includes(cell.text);
    const cls = ['bingo-cell', cell.free ? 'free' : '', marked ? 'marked' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}">${escapeHtml(cell.text)}</div>`;
  }).join('');
  return `
    <div class="bingo-card">
      <div class="card-header">
        <span class="card-title">${escapeHtml(gameTitle)}</span>
        <span class="card-number">Card #${card.number}</span>
      </div>
      <div class="bingo-grid" style="grid-template-columns: repeat(${gridSize}, 1fr);">
        ${cells}
      </div>
    </div>
  `;
}

/* ============================================================
   Play screen — calling
   ============================================================ */
let autoTimerHandle = null;
let autoCountdown = 0;

function enterPlayScreen() {
  clearInterval(autoTimerHandle);
  autoTimerHandle = null;
  renderCalledHistory();
  renderCurrentCall();
  updateCallModeUI();
  showScreen('screen-play');
}

function remainingCalls() {
  return state.session.callPool.filter((i) => !state.session.calledItems.includes(i));
}

function callNext() {
  const remaining = remainingCalls();
  if (!remaining.length) {
    $('#currentCall').textContent = "That's every item — game's done!";
    stopAutoCall();
    return;
  }
  const next = remaining[Math.floor(Math.random() * remaining.length)];
  state.session.calledItems.push(next);
  saveSession();
  renderCurrentCall();
  renderCalledHistory();
}

function renderCurrentCall() {
  const called = state.session.calledItems;
  const current = called[called.length - 1];
  $('#currentCall').textContent = current || 'Tap "Call next item" to begin';
  $('#callCount').textContent = `${called.length} called · ${remainingCalls().length} left`;
}

function renderCalledHistory() {
  const wrap = $('#calledHistory');
  const called = state.session.calledItems.slice().reverse();
  wrap.innerHTML = called.map((item) => `<span class="chip">${escapeHtml(item)}</span>`).join('') ||
    `<span class="muted">No items called yet</span>`;
}

function updateCallModeUI() {
  const isAuto = state.session.callMode === 'auto';
  $('#manualCallBtn').style.display = isAuto ? 'none' : 'inline-flex';
  $('#autoCallToggle').style.display = isAuto ? 'inline-flex' : 'none';
  $('#timerDisplay').style.display = isAuto ? 'block' : 'none';
  if (isAuto) startAutoCall(); else stopAutoCall();
}

function startAutoCall() {
  stopAutoCall();
  state.session.autoRunning = true;
  autoCountdown = state.session.timerSeconds;
  $('#autoCallToggle').textContent = '⏸ Pause auto-call';
  updateTimerDisplay();
  autoTimerHandle = setInterval(() => {
    autoCountdown--;
    updateTimerDisplay();
    if (autoCountdown <= 0) {
      callNext();
      autoCountdown = state.session.timerSeconds;
    }
  }, 1000);
}

function stopAutoCall() {
  clearInterval(autoTimerHandle);
  autoTimerHandle = null;
  state.session.autoRunning = false;
  $('#autoCallToggle').textContent = '▶ Resume auto-call';
}

function updateTimerDisplay() {
  $('#timerDisplay').textContent = `Next call in ${autoCountdown}s`;
}

/* ============================================================
   Verify a card
   ============================================================ */
function checkPatternWin(card, calledItems, pattern, gridSize) {
  const marks = card.grid.map((cell) => cell.free || calledItems.includes(cell.text));

  if (pattern === 'blackout') {
    return { won: marks.every(Boolean), line: marks.every(Boolean) ? 'all' : null };
  }

  // line: any row, column, or diagonal
  const at = (r, c) => marks[r * gridSize + c];
  for (let r = 0; r < gridSize; r++) {
    if ([...Array(gridSize)].every((_, c) => at(r, c))) return { won: true, line: `row-${r}` };
  }
  for (let c = 0; c < gridSize; c++) {
    if ([...Array(gridSize)].every((_, r) => at(r, c))) return { won: true, line: `col-${c}` };
  }
  if ([...Array(gridSize)].every((_, i) => at(i, i))) return { won: true, line: 'diag-1' };
  if ([...Array(gridSize)].every((_, i) => at(i, gridSize - 1 - i))) return { won: true, line: 'diag-2' };

  return { won: false, line: null };
}

function verifyCardNumber() {
  const num = parseInt($('#verifyInput').value, 10);
  const resultBox = $('#verifyResult');
  const preview = $('#verifyCardPreview');
  const card = state.session.cards.find((c) => c.number === num);

  if (!card) {
    resultBox.className = 'result-banner lose';
    resultBox.textContent = `No card #${num} in this game.`;
    resultBox.style.display = 'block';
    preview.innerHTML = '';
    return;
  }

  const { won } = checkPatternWin(card, state.session.calledItems, state.session.pattern, state.session.gridSize);
  resultBox.style.display = 'block';
  resultBox.className = `result-banner ${won ? 'win' : 'lose'}`;
  resultBox.textContent = won
    ? `🎉 BINGO confirmed on card #${num}!`
    : `Not yet — card #${num} doesn't have a ${state.session.pattern === 'blackout' ? 'full card' : 'line'} yet.`;

  preview.innerHTML = renderCardHtml(card, state.session.gridSize, state.session.gameTitle, state.session.calledItems);
}

/* ============================================================
   Music player (local files chosen from the tablet)
   ============================================================ */
const music = {
  tracks: [],
  index: 0,
  audio: null
};

function initMusicInput() {
  const input = $('#musicFileInput');
  input.addEventListener('change', (e) => {
    const files = Array.from(e.target.files).filter((f) => f.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|flac)$/i.test(f.name));
    files.sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    music.tracks = files.map((f) => ({ name: f.name, url: URL.createObjectURL(f) }));
    music.index = 0;
    $('#musicCount').textContent = `${music.tracks.length} track${music.tracks.length === 1 ? '' : 's'} loaded`;
    if (music.tracks.length) playTrack(0);
  });

  music.audio = $('#audioPlayer');
  music.audio.addEventListener('ended', () => {
    const loop = $('#loopPlaylist').checked;
    if (music.index < music.tracks.length - 1) {
      playTrack(music.index + 1);
    } else if (loop && music.tracks.length) {
      playTrack(0);
    }
  });
}

function playTrack(i) {
  if (!music.tracks[i]) return;
  music.index = i;
  music.audio.src = music.tracks[i].url;
  music.audio.play().catch(() => {});
  $('#nowPlaying').textContent = `♪ ${music.tracks[i].name}`;
}

function musicPlayPause() {
  if (!music.audio.src) return;
  if (music.audio.paused) music.audio.play(); else music.audio.pause();
}

function musicNext() {
  if (!music.tracks.length) return;
  playTrack((music.index + 1) % music.tracks.length);
}

function musicPrev() {
  if (!music.tracks.length) return;
  playTrack((music.index - 1 + music.tracks.length) % music.tracks.length);
}

/* ============================================================
   Wire up static UI events
   ============================================================ */
function init() {
  loadGames();
  initMusicInput();

  $('#navHome').addEventListener('click', () => showScreen('screen-home'));
  $('#navRules').addEventListener('click', () => showScreen('screen-rules'));
  $('#backFromRules').addEventListener('click', () => showScreen('screen-home'));
  $('#backFromSetup').addEventListener('click', () => showScreen('screen-home'));

  $('#cardCount').addEventListener('input', updatePoolWarning);

  $('#generateCardsBtn').addEventListener('click', () => {
    createSession();
    renderPrintScreen();
  });

  $('#backToSetupFromPrint').addEventListener('click', () => showScreen('screen-setup'));
  $('#printBtn').addEventListener('click', () => window.print());
  $('#startGameBtn').addEventListener('click', enterPlayScreen);

  $('#manualCallBtn').addEventListener('click', callNext);
  $('#autoCallToggle').addEventListener('click', () => {
    if (state.session.autoRunning) stopAutoCall(); else startAutoCall();
  });

  $('#verifyBtn').addEventListener('click', verifyCardNumber);
  $('#verifyInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') verifyCardNumber();
  });

  $('#endGameBtn').addEventListener('click', () => {
    if (confirm('End this game? Card numbers and the call history will be cleared.')) {
      clearSession();
      stopAutoCall();
      showScreen('screen-home');
    }
  });

  $('#musicPlayPause').addEventListener('click', musicPlayPause);
  $('#musicNext').addEventListener('click', musicNext);
  $('#musicPrev').addEventListener('click', musicPrev);
  $('#chooseMusicBtn').addEventListener('click', () => $('#musicFileInput').click());

  // Resume an in-progress game if one was saved
  if (loadSession()) {
    $('#resumeBanner').style.display = 'flex';
    $('#resumeBtn').addEventListener('click', enterPlayScreen);
    $('#discardResumeBtn').addEventListener('click', () => {
      clearSession();
      $('#resumeBanner').style.display = 'none';
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
