// Contrato genérico entre un motor de juego (canvas + closure) y React.
// Generalizado a partir de lib/games/asteroids/engine.ts (spec 05) para que
// cada nuevo juego portado reutilice las mismas interfaces en vez de
// redefinir su propia versión de "score/lives/level/status".

export interface ArcadeGameState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface ArcadeGameCallbacks {
  onStateChange(state: ArcadeGameState): void;
}

export interface ArcadeGameHandle {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

export interface ArcadeGameProps {
  paused: boolean;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: () => void;
}
