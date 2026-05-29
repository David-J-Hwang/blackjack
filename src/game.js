import { createDeck, drawCard, shuffleDeck } from './deck.js';
import { calculateHandValue, getCardValue, isBlackjack, isBust } from './hand.js';

const STARTING_MONEY = 3000;
const MIN_DECK_SIZE = 15;

export class BlackjackGame {
  constructor() {
    this.money = STARTING_MONEY;
    this.deck = this.createFreshDeck();
    this.playerHands = [this.createPlayerHand()];
    this.activeHandIndex = 0;
    this.dealerHand = [];
    this.currentBet = 0;
    this.dealerRevealed = false;
    this.phase = 'betting';
    this.message = '베팅 금액을 선택해 라운드를 시작하세요.';
    this.moneyEffects = [];
    this.moneyEffectId = 0;
    this.dealOrder = 0;
    this.scoreOutcome = { player: null, dealer: null, playerHands: [] };
  }

  createFreshDeck() {
    return shuffleDeck(createDeck());
  }

  createPlayerHand(bet = 0, cards = []) {
    return {
      cards,
      bet,
      actions: 0,
      outcome: null,
      settled: false,
      surrendered: false,
      splitHand: false,
    };
  }

  resetGame() {
    this.money = STARTING_MONEY;
    this.deck = this.createFreshDeck();
    this.playerHands = [this.createPlayerHand()];
    this.activeHandIndex = 0;
    this.dealerHand = [];
    this.currentBet = 0;
    this.dealerRevealed = false;
    this.phase = 'betting';
    this.message = '새 게임입니다. 베팅 금액을 선택하세요.';
    this.moneyEffects = [];
    this.dealOrder = 0;
    this.scoreOutcome = { player: null, dealer: null, playerHands: [] };
  }

  startRound(bet) {
    if (['player-turn', 'dealer-turn'].includes(this.phase)) {
      return;
    }

    if (this.phase === 'game-over') {
      this.message = '게임에서 패배했습니다. Esc를 눌러 새 게임을 시작하세요.';
      return;
    }

    if (bet > this.money) {
      this.message = '소지금보다 큰 금액은 베팅할 수 없습니다.';
      return;
    }

    if (this.deck.length < MIN_DECK_SIZE) {
      this.deck = this.createFreshDeck();
    }

    this.changeMoney(-bet);
    this.currentBet = bet;
    this.playerHands = [this.createPlayerHand(bet)];
    this.activeHandIndex = 0;
    this.dealerHand = [];
    this.dealerRevealed = false;
    this.dealOrder = 0;
    this.scoreOutcome = { player: null, dealer: null, playerHands: [] };
    this.phase = 'player-turn';

    this.dealCard(this.getActiveHand().cards);
    this.dealCard(this.dealerHand);
    this.dealCard(this.getActiveHand().cards);
    this.dealCard(this.dealerHand);

    this.message = isBlackjack(this.getActiveHand().cards)
      ? '블랙잭입니다. Stand로 결과를 확인하세요.'
      : 'Hit, Stand, Double Down, Surrender, Split 중 하나를 선택하세요.';
  }

  hit() {
    if (this.phase !== 'player-turn') {
      return;
    }

    const hand = this.getActiveHand();
    this.dealCard(hand.cards);
    hand.actions += 1;

    if (isBust(hand.cards)) {
      hand.outcome = 'lose';
      this.completeActiveHand('패가 21을 넘었습니다.');
      return;
    }

    if (calculateHandValue(hand.cards).total === 21) {
      this.completeActiveHand('21입니다.');
      return;
    }

    this.message = `${this.getActiveHandLabel()} 카드를 더 받을지, 여기서 멈출지 선택하세요.`;
  }

  stand() {
    if (this.phase !== 'player-turn') {
      return;
    }

    const hand = this.getActiveHand();
    hand.actions += 1;
    this.completeActiveHand(`${this.getActiveHandLabel()} Stand.`);
  }

  doubleDown() {
    if (!this.canDoubleDown()) {
      this.message = 'Double Down을 할 수 없는 상태입니다.';
      return;
    }

    const hand = this.getActiveHand();
    this.changeMoney(-hand.bet);
    this.currentBet += hand.bet;
    hand.bet *= 2;
    this.dealCard(hand.cards);
    hand.actions += 1;

    if (isBust(hand.cards)) {
      hand.outcome = 'lose';
      this.completeActiveHand('Double Down 후 패가 21을 넘었습니다.');
      return;
    }

    this.completeActiveHand('Double Down!');
  }

  surrender() {
    if (!this.canSurrender()) {
      this.message = 'Surrender는 Split 전 첫 의사결정에서만 가능합니다.';
      return;
    }

    const hand = this.getActiveHand();
    hand.surrendered = true;
    hand.outcome = 'lose';
    hand.settled = true;
    hand.actions += 1;
    this.dealerRevealed = true;
    this.finishRound(
      hand.bet * 0.5,
      '폴드',
      {
        player: 'lose',
        dealer: 'win',
        playerHands: ['lose'],
      },
    );
  }

  split() {
    if (!this.canSplit()) {
      this.message = 'Split을 할 수 없는 상태입니다.';
      return;
    }

    const hand = this.getActiveHand();
    const [firstCard, secondCard] = hand.cards;

    this.changeMoney(-hand.bet);
    this.currentBet += hand.bet;

    hand.cards = [firstCard];
    hand.actions = 0;
    hand.outcome = null;
    hand.settled = false;
    hand.splitHand = true;

    const splitHand = this.createPlayerHand(hand.bet, [secondCard]);
    splitHand.splitHand = true;

    this.playerHands = [hand, splitHand];
    this.activeHandIndex = 0;

    this.dealCard(hand.cards);
    this.dealCard(splitHand.cards);

    this.message = 'Split! 첫 번째 손패를 플레이하세요.';
  }

  completeActiveHand(message = '') {
    const hand = this.getActiveHand();
    hand.settled = true;

    if (this.activeHandIndex < this.playerHands.length - 1) {
      this.activeHandIndex += 1;
      this.message = `${message}\n다음 손패를 플레이하세요.`;
      return;
    }

    this.startDealerTurn(message ? `${message}\n딜러의 숨겨진 카드를 공개합니다.` : undefined);
  }

  startDealerTurn(message = '딜러의 숨겨진 카드를 공개합니다.') {
    this.dealerRevealed = true;
    this.phase = 'dealer-turn';
    this.message = message;
  }

  dealerHit() {
    if (this.phase !== 'dealer-turn' || !this.shouldDealerHit()) {
      return false;
    }

    this.dealCard(this.dealerHand);
    const dealerValue = calculateHandValue(this.dealerHand);
    this.message = dealerValue.bust
      ? '딜러가 21을 넘었습니다. 결과를 확인합니다.'
      : '딜러가 카드를 한 장 더 받았습니다.';

    return true;
  }

  completeDealerTurn() {
    if (this.phase !== 'dealer-turn') {
      return;
    }

    this.settleRound();
  }

  shouldDealerHit() {
    const dealerValue = calculateHandValue(this.dealerHand);

    if (isBlackjack(this.dealerHand) || this.hasNaturalBlackjack()) {
      return false;
    }

    if (!this.playerHands.some((hand) => !hand.surrendered && !isBust(hand.cards))) {
      return false;
    }

    if (dealerValue.total < 17) {
      return true;
    }

    return false;
  }

  settleRound() {
    const dealerValue = calculateHandValue(this.dealerHand);
    const dealerBlackjack = isBlackjack(this.dealerHand);
    const results = this.playerHands.map((hand) => this.settleHand(hand, dealerValue, dealerBlackjack));
    const payout = results.reduce((sum, result) => sum + result.payout, 0);
    const counts = this.countResults(results);

    results.forEach((result, index) => {
      this.playerHands[index].outcome = result.outcome;
    });

    this.finishRound(
      payout,
      this.getRoundResultMessage(results, counts),
      {
        player: this.getAggregatePlayerOutcome(counts),
        dealer: this.getAggregateDealerOutcome(counts),
        playerHands: results.map((result) => result.outcome),
      },
    );
  }

  settleHand(hand, dealerValue, dealerBlackjack) {
    const playerValue = calculateHandValue(hand.cards);
    const naturalBlackjack = this.isNaturalBlackjack(hand);

    if (hand.surrendered) {
      return { outcome: 'lose', payout: 0, label: '패배' };
    }

    if (playerValue.bust) {
      return { outcome: 'lose', payout: 0, label: '패배' };
    }

    if (naturalBlackjack && dealerBlackjack) {
      return { outcome: 'push', payout: hand.bet, label: '무승부' };
    }

    if (naturalBlackjack) {
      return { outcome: 'win', payout: hand.bet * 2.5, label: '블랙잭' };
    }

    if (dealerBlackjack) {
      return { outcome: 'lose', payout: 0, label: '패배' };
    }

    if (dealerValue.bust || playerValue.total > dealerValue.total) {
      return { outcome: 'win', payout: hand.bet * 2, label: '승리' };
    }

    if (playerValue.total < dealerValue.total) {
      return { outcome: 'lose', payout: 0, label: '패배' };
    }

    return { outcome: 'push', payout: hand.bet, label: '무승부' };
  }

  countResults(results) {
    return results.reduce(
      (counts, result) => ({
        win: counts.win + (result.outcome === 'win' ? 1 : 0),
        lose: counts.lose + (result.outcome === 'lose' ? 1 : 0),
        push: counts.push + (result.outcome === 'push' ? 1 : 0),
      }),
      { win: 0, lose: 0, push: 0 },
    );
  }

  getRoundResultMessage(results, counts) {
    if (results.length === 1) {
      const [result] = results;

      if (result.label === '블랙잭') {
        return '블랙잭!';
      }

      if (result.outcome === 'win') {
        return '승리!';
      }

      if (result.outcome === 'lose') {
        return '패배...';
      }

      return '무승부';
    }

    const parts = [];

    if (counts.win > 0) {
      parts.push(`승리 ${counts.win}`);
    }

    if (counts.lose > 0) {
      parts.push(`패배 ${counts.lose}`);
    }

    if (counts.push > 0) {
      parts.push(`무승부 ${counts.push}`);
    }

    return parts.join(' / ');
  }

  getAggregatePlayerOutcome(counts) {
    if (counts.win > 0) {
      return 'win';
    }

    if (counts.lose > 0) {
      return 'lose';
    }

    return 'push';
  }

  getAggregateDealerOutcome(counts) {
    if (counts.lose > 0 && counts.win === 0) {
      return 'win';
    }

    if (counts.win > 0 && counts.lose === 0) {
      return 'lose';
    }

    return 'push';
  }

  finishRound(payout, message, scoreOutcome = { player: null, dealer: null, playerHands: [] }) {
    this.changeMoney(payout);
    this.scoreOutcome = scoreOutcome;

    if (this.money <= 0) {
      this.money = 0;
      this.phase = 'game-over';
      this.message = `${message}\n소지금이 $0이 되어 게임에서 패배했습니다. Esc를 눌러 새 게임을 시작하세요.`;
      return;
    }

    this.phase = 'round-over';
    this.message = `${message}\n다음 라운드의 베팅금액을 선택하세요.`;
  }

  changeMoney(amount) {
    if (amount === 0) {
      return;
    }

    this.money += amount;
    this.moneyEffectId += 1;
    this.moneyEffects.push({
      id: this.moneyEffectId,
      amount,
    });

    if (this.moneyEffects.length > 20) {
      this.moneyEffects.shift();
    }
  }

  dealCard(hand) {
    const card = drawCard(this.deck);
    card.dealOrder = this.dealOrder;
    this.dealOrder += 1;
    hand.push(card);
  }

  canDoubleDown() {
    const hand = this.getActiveHand();

    return (
      this.phase === 'player-turn'
      && hand.actions === 0
      && calculateHandValue(hand.cards).total < 21
      && this.money >= hand.bet
    );
  }

  canSurrender() {
    const hand = this.getActiveHand();

    return (
      this.phase === 'player-turn'
      && this.playerHands.length === 1
      && hand.actions === 0
      && hand.cards.length === 2
      && calculateHandValue(hand.cards).total < 21
    );
  }

  canSplit() {
    const hand = this.getActiveHand();

    if (
      this.phase !== 'player-turn'
      || this.playerHands.length !== 1
      || this.activeHandIndex !== 0
      || hand.actions !== 0
      || hand.cards.length !== 2
      || this.money < hand.bet
    ) {
      return false;
    }

    const [firstCard, secondCard] = hand.cards;
    return getCardValue(firstCard) === getCardValue(secondCard);
  }

  getActiveHand() {
    return this.playerHands[this.activeHandIndex] ?? this.playerHands[0];
  }

  getActiveHandLabel() {
    if (this.playerHands.length === 1) {
      return '현재 패';
    }

    return `손패 ${this.activeHandIndex + 1}`;
  }

  hasNaturalBlackjack() {
    return this.playerHands.some((hand) => this.isNaturalBlackjack(hand));
  }

  isNaturalBlackjack(hand) {
    return !hand.splitHand && isBlackjack(hand.cards);
  }

  getState() {
    const activeHand = this.getActiveHand();
    const playerValue = calculateHandValue(activeHand.cards);
    const dealerValue = calculateHandValue(this.dealerHand);
    const visibleDealerHand = this.dealerRevealed ? this.dealerHand : this.dealerHand.slice(0, 1);
    const visibleDealerValue = calculateHandValue(visibleDealerHand);

    return {
      money: this.money,
      currentBet: this.currentBet,
      playerHand: activeHand.cards,
      playerHands: this.playerHands.map((hand, index) => ({
        cards: hand.cards,
        bet: hand.bet,
        value: calculateHandValue(hand.cards),
        active: this.phase === 'player-turn' && index === this.activeHandIndex,
        outcome: this.scoreOutcome.playerHands[index] ?? hand.outcome,
        label: `Hand ${index + 1}`,
      })),
      activeHandIndex: this.activeHandIndex,
      dealerHand: this.dealerHand,
      dealerRevealed: this.dealerRevealed,
      phase: this.phase,
      message: this.message,
      moneyEffects: [...this.moneyEffects],
      scoreOutcome: { ...this.scoreOutcome },
      playerValue,
      dealerValue,
      visibleDealerValue,
      availableActions: {
        hit: this.phase === 'player-turn' && playerValue.total < 21,
        stand: this.phase === 'player-turn',
        doubleDown: this.canDoubleDown(),
        surrender: this.canSurrender(),
        split: this.canSplit(),
      },
    };
  }
}
