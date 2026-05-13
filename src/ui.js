const elements = {
  money: document.querySelector('#money'),
  currentBet: document.querySelector('#current-bet'),
  deckCount: document.querySelector('#deck-count'),
  dealerHand: document.querySelector('#dealer-hand'),
  playerHand: document.querySelector('#player-hand'),
  dealerScore: document.querySelector('#dealer-score'),
  playerScore: document.querySelector('#player-score'),
  message: document.querySelector('#message'),
  betButtons: [...document.querySelectorAll('.bet-button')],
  modeButtons: [...document.querySelectorAll('.mode-button')],
  hitButton: document.querySelector('#hit-button'),
  standButton: document.querySelector('#stand-button'),
  doubleButton: document.querySelector('#double-button'),
  surrenderButton: document.querySelector('#surrender-button'),
  resetButton: document.querySelector('#reset-button'),
};

export function bindEvents(handlers) {
  elements.betButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handlers.onStartRound(Number(button.dataset.bet));
    });
  });

  elements.modeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handlers.onModeChange(button.dataset.mode);
    });
  });

  elements.hitButton.addEventListener('click', handlers.onHit);
  elements.standButton.addEventListener('click', handlers.onStand);
  elements.doubleButton.addEventListener('click', handlers.onDoubleDown);
  elements.surrenderButton.addEventListener('click', handlers.onSurrender);
  elements.resetButton.addEventListener('click', handlers.onReset);
}

export function renderGame(state) {
  elements.money.textContent = formatMoney(state.money);
  elements.currentBet.textContent = formatMoney(state.currentBet);
  elements.deckCount.textContent = String(state.deckCount);
  elements.message.textContent = state.message;

  elements.playerScore.textContent = formatScore(state.playerValue);
  elements.dealerScore.textContent = state.dealerRevealed
    ? formatScore(state.dealerValue)
    : formatScore(state.visibleDealerValue, true);

  renderHand(elements.playerHand, state.playerHand);
  renderHand(elements.dealerHand, state.dealerHand, !state.dealerRevealed);
  renderControls(state);
}

function renderHand(container, hand, hideSecondCard = false) {
  container.replaceChildren();

  hand.forEach((card, index) => {
    const cardElement = document.createElement('div');
    const hidden = hideSecondCard && index === 1;
    cardElement.className = hidden ? 'card card-back' : `card ${card.color}`;

    if (hidden) {
      cardElement.setAttribute('aria-label', '숨겨진 카드');
      cardElement.textContent = '?';
    } else {
      cardElement.setAttribute('aria-label', `${card.rank} ${card.suit}`);
      cardElement.innerHTML = `
        <span class="card-rank">${card.rank}</span>
        <span class="card-suit">${card.suitLabel}</span>
      `;
    }

    container.append(cardElement);
  });
}

function renderControls(state) {
  const roundInProgress = state.phase === 'player-turn';

  elements.betButtons.forEach((button) => {
    const bet = Number(button.dataset.bet);
    button.disabled = roundInProgress || state.money < bet;
  });

  elements.modeButtons.forEach((button) => {
    const selected = button.dataset.mode === state.mode;
    button.classList.toggle('is-active', selected);
    button.disabled = roundInProgress;
    button.setAttribute('aria-pressed', String(selected));
  });

  elements.hitButton.disabled = !state.availableActions.hit;
  elements.standButton.disabled = !state.availableActions.stand;
  elements.doubleButton.disabled = !state.availableActions.doubleDown;
  elements.surrenderButton.disabled = !state.availableActions.surrender;
  elements.resetButton.disabled = false;
}

function formatScore(value, visibleOnly = false) {
  if (value.total === 0) {
    return visibleOnly ? '?' : '0';
  }

  const suffix = value.soft ? ' soft' : '';
  return visibleOnly ? `${value.total}+` : `${value.total}${suffix}`;
}

function formatMoney(amount) {
  return `$${amount}`;
}
