import { BlackjackGame } from './game.js';
import { bindEvents, renderGame } from './ui.js';

const game = new BlackjackGame();
const DEALER_REVEAL_DELAY = 560;
const DEALER_DRAW_DELAY = 760;
const DEALER_RESULT_DELAY = 520;
const DEALER_FAST_RESULT_DELAY = 320;
let dealerTurnRunning = false;

function update() {
  renderGame(game.getState());
}

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

async function runDealerTurn() {
  if (dealerTurnRunning || game.getState().phase !== 'dealer-turn') {
    return;
  }

  dealerTurnRunning = true;
  update();
  await delay(DEALER_REVEAL_DELAY);
  let dealerDrewCard = false;

  while (game.getState().phase === 'dealer-turn' && game.shouldDealerHit()) {
    game.dealerHit();
    dealerDrewCard = true;
    update();
    await delay(DEALER_DRAW_DELAY);
  }

  if (game.getState().phase === 'dealer-turn') {
    await delay(dealerDrewCard ? DEALER_RESULT_DELAY : DEALER_FAST_RESULT_DELAY);
    game.completeDealerTurn();
    update();
  }

  dealerTurnRunning = false;
}

async function updateAfterPlayerAction() {
  if (game.getState().phase === 'dealer-turn') {
    await runDealerTurn();
    return;
  }

  update();
}

bindEvents({
  onStartRound(bet) {
    game.startRound(bet);
    update();
  },
  async onHit() {
    game.hit();
    await updateAfterPlayerAction();
  },
  async onStand() {
    game.stand();
    await updateAfterPlayerAction();
  },
  async onDoubleDown() {
    game.doubleDown();
    await updateAfterPlayerAction();
  },
  onSplit() {
    game.split();
    update();
  },
  onSurrender() {
    game.surrender();
    update();
  },
  onReset() {
    game.resetGame();
    update();
  },
});

update();
