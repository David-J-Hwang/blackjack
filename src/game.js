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
    this.moneyEffects = [];
    this.moneyEffectId = 0;
    this.dealOrder = 0;
    this.scoreOutcome = { player: null, dealer: null };
  }

  createFreshDeck() {
    return shuffleDeck(createDeck());
  }

  setMode(mode) {
    if (!['easy', 'hard'].includes(mode) || ['player-turn', 'dealer-turn'].includes(this.phase)) {
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
    this.moneyEffects = [];
    this.dealOrder = 0;
    this.scoreOutcome = { player: null, dealer: null };
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
    this.playerHand = [];
    this.dealerHand = [];
    this.playerActions = 0;
    this.dealerRevealed = false;
    this.dealOrder = 0;
    this.scoreOutcome = { player: null, dealer: null };
    this.phase = 'player-turn';

    this.dealCard(this.playerHand);
    this.dealCard(this.dealerHand);
    this.dealCard(this.playerHand);
    this.dealCard(this.dealerHand);

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
      this.finishRound(this.currentBet, '무승부', {
        player: 'push',
        dealer: 'push',
      });
      return;
    }

    if (playerBlackjack) {
      this.finishRound(this.currentBet * 2.5, '블랙잭!', {
        player: 'win',
        dealer: 'lose',
      });
      return;
    }

    this.finishRound(0, '패배...', {
      player: 'lose',
      dealer: 'win',
    });
  }

  hit() {
    if (this.phase !== 'player-turn') {
      return;
    }

    this.dealCard(this.playerHand);
    this.playerActions += 1;

    if (isBust(this.playerHand)) {
      this.dealerRevealed = true;
      this.finishRound(0, '패배...', {
        player: 'lose',
        dealer: 'win',
      });
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
    this.startDealerTurn();
  }

  doubleDown() {
    if (!this.canDoubleDown()) {
      this.message = 'Double Down을 할 수 없는 상태입니다.';
      return;
    }

    this.changeMoney(-this.currentBet);
    this.currentBet *= 2;
    this.dealCard(this.playerHand);
    this.playerActions += 1;

    if (isBust(this.playerHand)) {
      this.dealerRevealed = true;
      this.finishRound(0, '패배...', {
        player: 'lose',
        dealer: 'win',
      });
      return;
    }

    this.startDealerTurn('Double Down! 딜러의 숨겨진 카드를 공개합니다.');
  }

  surrender() {
    if (!this.canSurrender()) {
      this.message = 'Surrender는 첫 의사결정에서만 가능합니다.';
      return;
    }

    this.dealerRevealed = true;
    this.playerActions += 1;
    this.finishRound(
      this.currentBet * 0.5,
      '폴드',
      {
        player: 'lose',
        dealer: 'win',
      },
    );
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

    if (dealerValue.total < 17) {
      return true;
    }

    return this.mode === 'hard' && isSoft17(this.dealerHand);
  }

  settleRound() {
    const playerValue = calculateHandValue(this.playerHand);
    const dealerValue = calculateHandValue(this.dealerHand);

    if (dealerValue.bust) {
      this.finishRound(
        this.currentBet * 2,
        '승리!',
        {
          player: 'win',
          dealer: 'lose',
        },
      );
      return;
    }

    if (playerValue.total > dealerValue.total) {
      this.finishRound(
        this.currentBet * 2,
        '승리!',
        {
          player: 'win',
          dealer: 'lose',
        },
      );
      return;
    }

    if (playerValue.total < dealerValue.total) {
      this.finishRound(0, '패배...', {
        player: 'lose',
        dealer: 'win',
      });
      return;
    }

    this.finishRound(this.currentBet, '무승부', {
      player: 'push',
      dealer: 'push',
    });
  }

  finishRound(payout, message, scoreOutcome = { player: null, dealer: null }) {
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
      moneyEffects: [...this.moneyEffects],
      scoreOutcome: { ...this.scoreOutcome },
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
