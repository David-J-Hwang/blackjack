const elements = {
  money: document.querySelector('#money'),
  currentBet: document.querySelector('#current-bet'),
  dealerHand: document.querySelector('#dealer-hand'),
  playerHands: document.querySelector('#player-hands'),
  moneyEffects: document.querySelector('#money-effects'),
  dealerScore: document.querySelector('#dealer-score'),
  playerScore: document.querySelector('#player-score'),
  message: document.querySelector('#message'),
  betActions: document.querySelector('#bet-actions'),
  playerActions: document.querySelector('#player-actions'),
  betButtons: [...document.querySelectorAll('.bet-button')],
  hitButton: document.querySelector('#hit-button'),
  standButton: document.querySelector('#stand-button'),
  doubleButton: document.querySelector('#double-button'),
  surrenderButton: document.querySelector('#surrender-button'),
  splitButton: document.querySelector('#split-button'),
};

let lastMoneyEffectId = 0;
const seenCardKeys = new Set();

export function bindEvents(handlers) {
  elements.betButtons.forEach((button) => {
    button.addEventListener('click', () => {
      handlers.onStartRound(Number(button.dataset.bet));
    });
  });

  elements.hitButton.addEventListener('click', handlers.onHit);
  elements.standButton.addEventListener('click', handlers.onStand);
  elements.doubleButton.addEventListener('click', handlers.onDoubleDown);
  elements.surrenderButton.addEventListener('click', handlers.onSurrender);
  elements.splitButton.addEventListener('click', handlers.onSplit);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      handlers.onReset();
    }
  });
}

export function renderGame(state) {
  elements.money.textContent = formatMoney(state.money);
  elements.currentBet.textContent = formatMoney(state.currentBet);
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

  renderPlayerHands(state);
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

function renderPlayerHands(state) {
  const split = state.playerHands.length > 1;

  elements.playerHands.classList.toggle('is-split', split);
  elements.playerHands.replaceChildren();

  state.playerHands.forEach((hand) => {
    const handElement = document.createElement('section');
    const cardsElement = document.createElement('div');

    handElement.className = 'player-hand-panel';
    handElement.classList.toggle('is-active', split && hand.active);
    handElement.classList.toggle('is-winner', hand.outcome === 'win');
    handElement.classList.toggle('is-loser', hand.outcome === 'lose' || hand.value.bust);
    handElement.classList.toggle('is-push', hand.outcome === 'push');

    if (split) {
      const headingElement = document.createElement('div');
      const titleElement = document.createElement('span');
      const scoreElement = document.createElement('span');

      headingElement.className = 'split-hand-heading';
      titleElement.className = 'split-hand-title';
      titleElement.textContent = `${hand.label} ${formatMoney(hand.bet)}`;
      scoreElement.className = 'split-hand-score';
      scoreElement.textContent = formatScore(hand.value);
      applyScoreStatus(scoreElement, hand.outcome, hand.value.bust);

      headingElement.append(titleElement, scoreElement);
      handElement.append(headingElement);
    }

    cardsElement.className = 'cards';
    cardsElement.setAttribute('aria-label', `${hand.label} 카드`);
    renderHand(cardsElement, hand.cards);

    handElement.append(cardsElement);
    elements.playerHands.append(handElement);
  });
}

function renderHand(container, hand, hideSecondCard = false) {
  container.dataset.cardCount = String(hand.length);
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

  elements.betActions.hidden = !canBet;
  elements.playerActions.hidden = !playerTurn;
  elements.betButtons.forEach((button) => {
    const bet = Number(button.dataset.bet);
    button.disabled = !canBet || state.money < bet;
  });

  elements.hitButton.disabled = !state.availableActions.hit;
  elements.standButton.disabled = !state.availableActions.stand;
  elements.doubleButton.disabled = !state.availableActions.doubleDown;
  elements.surrenderButton.disabled = !state.availableActions.surrender;
  elements.splitButton.disabled = !state.availableActions.split;
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
