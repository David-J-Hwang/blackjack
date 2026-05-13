import { BlackjackGame } from './game.js';
import { bindEvents, renderGame } from './ui.js';

const game = new BlackjackGame();

function update() {
  renderGame(game.getState());
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
  onHit() {
    game.hit();
    update();
  },
  onStand() {
    game.stand();
    update();
  },
  onDoubleDown() {
    game.doubleDown();
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
