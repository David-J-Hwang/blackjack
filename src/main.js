import { BlackjackGame } from './game.js';
import { bindEvents, renderGame } from './ui.js';

const game = new BlackjackGame();
const DEALER_REVEAL_DELAY = 700;
const DEALER_DRAW_DELAY = 760;
const DEALER_RESULT_DELAY = 520;
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

  while (game.getState().phase === 'dealer-turn' && game.shouldDealerHit()) {
    game.dealerHit();
    update();
    await delay(DEALER_DRAW_DELAY);
  }

  if (game.getState().phase === 'dealer-turn') {
    await delay(DEALER_RESULT_DELAY);
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
  onModeChange(mode) {
    game.setMode(mode);
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
