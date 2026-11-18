const board = document.getElementById('game-board');
const movesEl = document.getElementById('moves-count');
const timeEl = document.getElementById('time-count');
const pairsEl = document.getElementById('pairs-count');
const restartBtn = document.getElementById('restart-btn');
const playAgainBtn = document.getElementById('play-again-btn');
const winModal = document.getElementById('win-modal');
const finalStatsEl = document.getElementById('final-stats');

// Pantalla de bienvenida
const welcomeScreen = document.getElementById('welcome-screen');
const startAppBtn = document.getElementById('start-app-btn');

// Controles del Dorso
const colorPicker = document.getElementById('color-picker');
const swatches = document.querySelectorAll('.swatch');
const teamLogoBtn = document.getElementById('team-logo-btn');
const textureSelect = document.getElementById('texture-select');
const backFileInput = document.getElementById('back-file-input');
const clearBackBtn = document.getElementById('clear-back-btn');

// Controles de GalerÃ­a para los Pares
const pairsFileInput = document.getElementById('pairs-file-input');
const singleSlotInput = document.getElementById('single-slot-input');
const gallerySlotsEl = document.getElementById('gallery-slots');
const pairsStatus = document.getElementById('pairs-status');
const clearPairsBtn = document.getElementById('clear-pairs-btn');

const defaultEmojis = ['ð', 'â¡', 'ð®', 'ð¥', 'ð', 'ð§', 'ð¸', 'ð'];
// Arreglo de 8 espacios para las fotos de galerÃ­a (null = usa emoji)
let customPairImages = Array(8).fill(null);
let selectedSlotIndex = 0;

let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let lockBoard = false;
let timerInterval = null;
let secondsElapsed = 0;
let gameStarted = false;

startAppBtn.addEventListener('click', () => {
  welcomeScreen.classList.add('hidden');
});

// FunciÃ³n que optimiza cualquier foto de la galerÃ­a para que no se trabe el giro 3D
function processGalleryFile(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxSize = 320;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxSize) {
          height *= maxSize / width;
          width = maxSize;
        } else if (height > maxSize) {
          width *= maxSize / height;
          height = maxSize;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(e.target.result);
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// 1. Cambiar color sÃ³lido del dorso
function setCardColor(color) {
  document.body.classList.remove('has-team-logo');
  document.documentElement.style.setProperty('--card-color', color);
  colorPicker.value = color;
  updateFrontSymbols('?');
}

swatches.forEach((swatch) => {
  swatch.addEventListener('click', () => {
    swatches.forEach((s) => s.classList.remove('active'));
    swatch.classList.add('active');
    setCardColor(swatch.dataset.color);
  });
});

colorPicker.addEventListener('input', (e) => {
  swatches.forEach((s) => s.classList.remove('active'));
  setCardColor(e.target.value);
});

// 2. Modo Logo del Equipo en el dorso
teamLogoBtn.addEventListener('click', () => {
  document.body.classList.remove('has-custom-img');
  document.body.classList.add('has-team-logo');
  updateFrontSymbols('â¡');
});

function updateFrontSymbols(symbol) {
  document.querySelectorAll('.front-symbol').forEach((el) => {
    el.textContent = symbol;
  });
}

// 3. Texturas del dorso
textureSelect.addEventListener('change', (e) => {
  document.body.dataset.texture = e.target.value;
  if (e.target.value === 'wood') setCardColor('#8b5a2b');
});

// 4. Subir foto de GalerÃ­a para el Dorso
backFileInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const dataUrl = await processGalleryFile(file);
  document.body.classList.remove('has-team-logo');
  document.documentElement.style.setProperty('--card-bg-image', `url("${dataUrl}")`);
  document.body.classList.add('has-custom-img');
});

clearBackBtn.addEventListener('click', () => {
  document.body.classList.remove('has-custom-img', 'has-team-logo');
  document.documentElement.style.setProperty('--card-bg-image', 'none');
  backFileInput.value = '';
  updateFrontSymbols('?');
});

// 5. Renderizar las 8 casillas de galerÃ­a para los pares
function renderGallerySlots() {
  gallerySlotsEl.innerHTML = '';
  let count = 0;

  customPairImages.forEach((imgSrc, index) => {
    const slot = document.createElement('div');
    slot.classList.add('slot-item');
    slot.title = `Toca para elegir la foto del par ${index + 1}`;

    if (imgSrc) {
      count++;
      slot.classList.add('filled');
      slot.innerHTML = `<img src="${imgSrc}" alt="Par ${index + 1}">`;
    } else {
      slot.innerHTML = `<span>+</span>`;
    }

    // Al tocar una casilla, abre la galerÃ­a para ese par en especÃ­fico
    slot.addEventListener('click', () => {
      selectedSlotIndex = index;
      singleSlotInput.value = '';
      singleSlotInput.click();
    });

    gallerySlotsEl.appendChild(slot);
  });

  pairsStatus.textContent = `${count}/8 fotos`;
}

// Subir foto individual al tocar cualquiera de las 8 casillas
singleSlotInput.addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const dataUrl = await processGalleryFile(file);
  customPairImages[selectedSlotIndex] = dataUrl;
  renderGallerySlots();
  initGame();
});

// Subir varias fotos de golpe con el botÃ³n verde "ð¼ï¸ Subir de GalerÃ­a"
pairsFileInput.addEventListener('change', async (e) => {
  const files = Array.from(e.target.files).slice(0, 8);
  if (!files.length) return;

  for (const file of files) {
    const dataUrl = await processGalleryFile(file);
    const emptyIndex = customPairImages.indexOf(null);
    if (emptyIndex !== -1) {
      customPairImages[emptyIndex] = dataUrl;
    } else {
      customPairImages.shift();
      customPairImages.push(dataUrl);
    }
  }

  pairsFileInput.value = '';
  renderGallerySlots();
  initGame();
});

// Limpiar las fotos de los pares para volver a los emojis
clearPairsBtn.addEventListener('click', () => {
  customPairImages = Array(8).fill(null);
  pairsFileInput.value = '';
  singleSlotInput.value = '';
  renderGallerySlots();
  initGame();
});

// --- LÃGICA DEL JUEGO ---
function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function formatTime(totalSeconds) {
  const mins = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
  const secs = String(totalSeconds % 60).padStart(2, '0');
  return `${mins}:${secs}`;
}

function startTimer() {
  timerInterval = setInterval(() => {
    secondsElapsed++;
    timeEl.textContent = formatTime(secondsElapsed);
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerInterval = null;
}

function getActivePairs() {
  return customPairImages.map((imgSrc, i) => {
    if (imgSrc) {
      return { id: `pair-${i}`, type: 'image', content: imgSrc };
    }
    return { id: `pair-${i}`, type: 'emoji', content: defaultEmojis[i] };
  });
}

function initGame() {
  stopTimer();
  board.innerHTML = '';
  flippedCards = [];
  matchedPairs = 0;
  moves = 0;
  secondsElapsed = 0;
  lockBoard = false;
  gameStarted = false;

  const activePairs = getActivePairs();
  const isLogoActive = document.body.classList.contains('has-team-logo');

  movesEl.textContent = '0';
  timeEl.textContent = '00:00';
  pairsEl.textContent = `0 / ${activePairs.length}`;
  winModal.classList.add('hidden');

  cards = shuffle([...activePairs, ...activePairs]);

  cards.forEach((item, index) => {
    const card = document.createElement('div');
    card.classList.add('card');
    card.dataset.pairId = item.id;
    const cardNum = index + 1;

    const backContent = item.type === 'image'
      ? `<img src="${item.content}" class="pair-img" alt="Carta ${cardNum}">`
      : item.content;

    card.innerHTML = `
      <div class="card-face card-front">
        <div class="card-front-inner">
          <span class="card-number">${cardNum}</span>
          <span class="front-symbol">${isLogoActive ? 'â¡' : '?'}</span>
          <span class="team-back-label">Maker Dev</span>
        </div>
      </div>
      <div class="card-face card-back">
        <div class="card-back-inner">
          ${backContent}
        </div>
      </div>
    `;

    card.addEventListener('click', () => flipCard(card));
    board.appendChild(card);
  });
}

function flipCard(card) {
  if (lockBoard) return;
  if (card.classList.contains('flipped') || card.classList.contains('matched')) return;

  if (!gameStarted) {
    gameStarted = true;
    startTimer();
  }

  card.classList.add('flipped');
  flippedCards.push(card);

  if (flippedCards.length === 2) {
    moves++;
    movesEl.textContent = moves;
    checkForMatch();
  }
}

function checkForMatch() {
  const [card1, card2] = flippedCards;
  const isMatch = card1.dataset.pairId === card2.dataset.pairId;

  if (isMatch) {
    card1.classList.add('matched');
    card2.classList.add('matched');
    flippedCards = [];
    matchedPairs++;
    pairsEl.textContent = `${matchedPairs} / 8`;

    if (matchedPairs === 8) {
      endGame();
    }
  } else {
    lockBoard = true;
    setTimeout(() => {
      card1.classList.remove('flipped');
      card2.classList.remove('flipped');
      flippedCards = [];
      lockBoard = false;
    }, 850);
  }
}

function endGame() {
  stopTimer();
  setTimeout(() => {
    finalStatsEl.textContent = `Completaste el tablero en ${moves} movimientos y un tiempo de ${formatTime(secondsElapsed)}.`;
    winModal.classList.remove('hidden');
  }, 500);
}

restartBtn.addEventListener('click', initGame);
playAgainBtn.addEventListener('click', initGame);

renderGallerySlots();
initGame();
