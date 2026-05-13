const SUITS = [
  { name: 'spades', label: '♠', color: 'black' },
  { name: 'hearts', label: '♥', color: 'red' },
  { name: 'diamonds', label: '♦', color: 'red' },
  { name: 'clubs', label: '♣', color: 'black' },
];

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

let deckSerial = 0;

export function createDeck() {
  deckSerial += 1;
  const deckId = deckSerial;

  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => ({
      id: `${deckId}-${suit.name}-${rank}`,
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
