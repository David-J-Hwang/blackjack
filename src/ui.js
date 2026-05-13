const elements = {
  money: document.querySelector('#money'),
  currentBet: document.querySelector('#current-bet'),
  deckCount: document.querySelector('#deck-count'),
  dealerHand: document.querySelector('#dealer-hand'),
  playerHand: document.querySelector('#player-hand'),
  moneyEffects: document.querySelector('#money-effects'),
  dealerScore: document.querySelector('#dealer-score'),
  playerScore: document.querySelector('#player-score'),
  message: document.querySelector('#message'),
  betActions: document.querySelector('#bet-actions'),
  playerActions: document.querySelector('#player-actions'),
  betButtons: [...document.querySelectorAll('.bet-button')],
  modeButtons: [...document.querySelectorAll('.mode-button')],
  hitButton: document.querySelector('#hit-button'),
  standButton: document.querySelector('#stand-button'),
  doubleButton: document.querySelector('#double-button'),
  surrenderButton: document.querySelector('#surrender-button'),
};

let lastMoneyEffectId = 0;
const seenCardKeys = new Set();

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

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      handlers.onReset();
    }
  });
}

export function renderGame(state) {
  elements.money.textContent = formatMoney(state.money);
  elements.currentBet.textContent = formatMoney(state.currentBet);
  elements.deckCount.textContent = String(state.deckCount);
  elements.message.textContent = state.message;
  renderMoneyEffects(state.moneyEffects);

  elements.playerScore.textContent = formatScore(state.playerValue);
  elements.dealerScore.textContent = state.dealerRevealed
    ? formatScore(state.dealerValue)
    : formatScore(state.visibleDealerValue, true);
  applyScoreStatus(elements.playerScore, state.scoreOutcome.player, state.playerValue.bust);
  applyScoreStatus(
    elements.dealerScore,
    state.dealerRevealed ? state.scoreOutcome.dealer : null,
    state.dealerRevealed && state.dealerValue.bust,
  );

  renderHand(elements.playerHand, state.playerHand);
  renderHand(elements.dealerHand, state.dealerHand, !state.dealerRevealed);
  renderControls(state);
}

function renderMoneyEffects(effects) {
  const newEffects = effects.filter((effect) => effect.id > lastMoneyEffectId);

  newEffects.forEach((effect, index) => {
    const effectElement = document.createElement('span');
    const positive = effect.amount > 0;

    effectElement.className = `money-change ${positive ? 'is-positive' : 'is-negative'}`;
    effectElement.textContent = formatSignedMoney(effect.amount);
    effectElement.style.setProperty('--float-offset', `${index * 18}px`);
    effectElement.addEventListener('animationend', () => {
      effectElement.remove();
    });

    elements.moneyEffects.append(effectElement);
  });

  if (newEffects.length > 0) {
    lastMoneyEffectId = Math.max(...newEffects.map((effect) => effect.id));
  }
}

function applyScoreStatus(element, outcome, bust) {
  element.classList.toggle('is-winner', outcome === 'win');
  element.classList.toggle('is-loser', outcome === 'lose' || bust);
  element.classList.toggle('is-push', outcome === 'push');
}

function renderHand(container, hand, hideSecondCard = false) {
  container.replaceChildren();

  hand.forEach((card, index) => {
    const cardElement = document.createElement('div');
    const hidden = hideSecondCard && index === 1;
    const cardKey = getCardKey(card, hidden);
    const backKey = getCardKey(card, true);
    const newCard = !seenCardKeys.has(cardKey);
    const revealingHiddenCard = !hidden && seenCardKeys.has(backKey);

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

    if (newCard) {
      const delay = card.dealOrder <= 3 ? card.dealOrder * 100 : 0;
      cardElement.classList.add(revealingHiddenCard ? 'is-flipping-in' : 'is-new');
      cardElement.style.setProperty('--deal-delay', `${delay}ms`);
    }

    seenCardKeys.add(cardKey);
    container.append(cardElement);
  });
}

function getCardKey(card, hidden) {
  const id = card.id ?? `${card.suit}-${card.rank}`;
  return `${id}:${hidden ? 'back' : 'front'}`;
}

function renderControls(state) {
  const canBet = ['betting', 'round-over'].includes(state.phase);
  const playerTurn = state.phase === 'player-turn';
  const dealerTurn = state.phase === 'dealer-turn';
  const gameOver = state.phase === 'game-over';

  elements.betActions.hidden = !canBet;
  elements.playerActions.hidden = !playerTurn;
  elements.betButtons.forEach((button) => {
    const bet = Number(button.dataset.bet);
    button.disabled = !canBet || state.money < bet;
  });

  elements.modeButtons.forEach((button) => {
    const selected = button.dataset.mode === state.mode;
    button.classList.toggle('is-active', selected);
    button.disabled = playerTurn || dealerTurn || gameOver;
    button.setAttribute('aria-pressed', String(selected));
  });

  elements.hitButton.disabled = !state.availableActions.hit;
  elements.standButton.disabled = !state.availableActions.stand;
  elements.doubleButton.disabled = !state.availableActions.doubleDown;
  elements.surrenderButton.disabled = !state.availableActions.surrender;
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

function formatSignedMoney(amount) {
  const sign = amount > 0 ? '+' : '-';
  return `${sign}$${Math.abs(amount)}`;
}
