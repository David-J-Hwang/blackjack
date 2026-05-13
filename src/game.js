import { createDeck, drawCard, shuffleDeck } from './deck.js';
import { calculateHandValue, isBlackjack, isBust, isSoft17 } from './hand.js';

const STARTING_MONEY = 1000;
const MIN_DECK_SIZE = 15;

export class BlackjackGame {
  constructor() {
    this.mode = 'easy';
    this.money = STARTING_MONEY;
    this.deck = this.createFreshDeck();
    this.playerHand = [];
    this.dealerHand = [];
    this.currentBet = 0;
    this.playerActions = 0;
    this.dealerRevealed = false;
    this.phase = 'betting';
    this.message = '베팅 금액을 선택해 라운드를 시작하세요.';
  }

  createFreshDeck() {
    return shuffleDeck(createDeck());
  }

  setMode(mode) {
    if (!['easy', 'hard'].includes(mode) || this.phase === 'player-turn') {
      return;
    }

    this.mode = mode;
  }

  resetGame() {
    this.mode = 'easy';
    this.money = STARTING_MONEY;
    this.deck = this.createFreshDeck();
    this.playerHand = [];
    this.dealerHand = [];
    this.currentBet = 0;
    this.playerActions = 0;
    this.dealerRevealed = false;
    this.phase = 'betting';
    this.message = '새 게임입니다. 베팅 금액을 선택하세요.';
  }

  startRound(bet) {
    if (this.phase === 'player-turn') {
      return;
    }

    if (bet > this.money) {
      this.message = '소지금보다 큰 금액은 베팅할 수 없습니다.';
      return;
    }

    if (this.deck.length < MIN_DECK_SIZE) {
      this.deck = this.createFreshDeck();
    }

    this.money -= bet;
    this.currentBet = bet;
    this.playerHand = [];
    this.dealerHand = [];
    this.playerActions = 0;
    this.dealerRevealed = false;
    this.phase = 'player-turn';

    this.playerHand.push(drawCard(this.deck));
    this.dealerHand.push(drawCard(this.deck));
    this.playerHand.push(drawCard(this.deck));
    this.dealerHand.push(drawCard(this.deck));

    this.message = 'Hit, Stand, Double Down, Surrender 중 하나를 선택하세요.';
    this.resolveOpeningBlackjack();
  }

  resolveOpeningBlackjack() {
    const playerBlackjack = isBlackjack(this.playerHand);
    const dealerBlackjack = isBlackjack(this.dealerHand);

    if (!playerBlackjack && !dealerBlackjack) {
      return;
    }

    this.dealerRevealed = true;

    if (playerBlackjack && dealerBlackjack) {
      this.finishRound(this.currentBet, '둘 다 Blackjack입니다. Push로 베팅금을 돌려받았습니다.');
      return;
    }

    if (playerBlackjack) {
      this.finishRound(this.currentBet * 2.5, 'Blackjack! 베팅금의 2.5배를 받았습니다.');
      return;
    }

    this.finishRound(0, '딜러가 Blackjack입니다. 라운드에서 패배했습니다.');
  }

  hit() {
    if (this.phase !== 'player-turn') {
      return;
    }

    this.playerHand.push(drawCard(this.deck));
    this.playerActions += 1;

    if (isBust(this.playerHand)) {
      this.dealerRevealed = true;
      this.finishRound(0, 'Bust! 21을 넘어서 패배했습니다.');
      return;
    }

    if (calculateHandValue(this.playerHand).total === 21) {
      this.stand();
      return;
    }

    this.message = '카드를 더 받을지, 여기서 멈출지 선택하세요.';
  }

  stand() {
    if (this.phase !== 'player-turn') {
      return;
    }

    this.playerActions += 1;
    this.dealerRevealed = true;
    this.playDealerTurn();
    this.settleRound();
  }

  doubleDown() {
    if (!this.canDoubleDown()) {
      this.message = 'Double Down을 할 수 없는 상태입니다.';
      return;
    }

    this.money -= this.currentBet;
    this.currentBet *= 2;
    this.playerHand.push(drawCard(this.deck));
    this.playerActions += 1;
    this.dealerRevealed = true;

    if (isBust(this.playerHand)) {
      this.finishRound(0, 'Double Down 후 Bust! 라운드에서 패배했습니다.');
      return;
    }

    this.playDealerTurn();
    this.settleRound();
  }

  surrender() {
    if (!this.canSurrender()) {
      this.message = 'Surrender는 첫 의사결정에서만 가능합니다.';
      return;
    }

    this.dealerRevealed = true;
    this.playerActions += 1;
    this.finishRound(this.currentBet * 0.5, 'Surrender를 선택해 베팅금의 절반을 돌려받았습니다.');
  }

  playDealerTurn() {
    while (this.shouldDealerHit()) {
      this.dealerHand.push(drawCard(this.deck));
    }
  }

  shouldDealerHit() {
    const dealerValue = calculateHandValue(this.dealerHand);

    if (dealerValue.total < 17) {
      return true;
    }

    return this.mode === 'hard' && isSoft17(this.dealerHand);
  }

  settleRound() {
    const playerValue = calculateHandValue(this.playerHand);
    const dealerValue = calculateHandValue(this.dealerHand);

    if (dealerValue.bust) {
      this.finishRound(this.currentBet * 2, '딜러가 Bust했습니다. 승리!');
      return;
    }

    if (playerValue.total > dealerValue.total) {
      this.finishRound(this.currentBet * 2, `승리! ${playerValue.total} 대 ${dealerValue.total}입니다.`);
      return;
    }

    if (playerValue.total < dealerValue.total) {
      this.finishRound(0, `패배했습니다. ${playerValue.total} 대 ${dealerValue.total}입니다.`);
      return;
    }

    this.finishRound(this.currentBet, `Push입니다. ${playerValue.total} 대 ${dealerValue.total}입니다.`);
  }

  finishRound(payout, message) {
    this.money += payout;
    this.phase = 'round-over';
    this.message = message;
  }

  canDoubleDown() {
    return this.phase === 'player-turn' && this.playerActions === 0 && this.money >= this.currentBet;
  }

  canSurrender() {
    return this.phase === 'player-turn' && this.playerActions === 0 && this.playerHand.length === 2;
  }

  getState() {
    const playerValue = calculateHandValue(this.playerHand);
    const dealerValue = calculateHandValue(this.dealerHand);
    const visibleDealerHand = this.dealerRevealed ? this.dealerHand : this.dealerHand.slice(0, 1);
    const visibleDealerValue = calculateHandValue(visibleDealerHand);

    return {
      mode: this.mode,
      money: this.money,
      deckCount: this.deck.length,
      currentBet: this.currentBet,
      playerHand: this.playerHand,
      dealerHand: this.dealerHand,
      dealerRevealed: this.dealerRevealed,
      phase: this.phase,
      message: this.message,
      playerValue,
      dealerValue,
      visibleDealerValue,
      availableActions: {
        hit: this.phase === 'player-turn',
        stand: this.phase === 'player-turn',
        doubleDown: this.canDoubleDown(),
        surrender: this.canSurrender(),
      },
    };
  }
}
