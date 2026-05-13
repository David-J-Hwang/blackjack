const SUITS = [
  { name: 'spades', label: 'S', color: 'black' },
  { name: 'hearts', label: 'H', color: 'red' },
  { name: 'diamonds', label: 'D', color: 'red' },
  { name: 'clubs', label: 'C', color: 'black' },
];

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

export function createDeck() {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      rank,
      suit: suit.name,
      suitLabel: suit.label,
      color: suit.color,
    })),
  );
}

export function shuffleDeck(deck) {
  const shuffled = [...deck];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

export function drawCard(deck) {
  if (deck.length === 0) {
    throw new Error('Cannot draw from an empty deck.');
  }

  return deck.pop();
}
