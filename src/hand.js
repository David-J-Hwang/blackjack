export function getCardValue(card) {
  if (card.rank === 'A') {
    return 11;
  }

  if (['J', 'Q', 'K'].includes(card.rank)) {
    return 10;
  }

  return Number(card.rank);
}

export function calculateHandValue(hand) {
  let total = hand.reduce((sum, card) => sum + getCardValue(card), 0);
  let aces = hand.filter((card) => card.rank === 'A').length;
  let soft = aces > 0;

  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }

  soft = aces > 0;

  return {
    total,
    soft,
    bust: total > 21,
  };
}

export function isBlackjack(hand) {
  return hand.length === 2 && calculateHandValue(hand).total === 21;
}

export function isBust(hand) {
  return calculateHandValue(hand).bust;
}

export function isSoft17(hand) {
  const value = calculateHandValue(hand);
  return value.total === 17 && value.soft;
}
