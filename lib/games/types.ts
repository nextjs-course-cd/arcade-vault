// Contrato genérico entre un motor de juego (canvas + closure) y React.
// Generalizado a partir de lib/games/asteroids/engine.ts (spec 05) para que
// cada nuevo juego portado reutilice las mismas interfaces en vez de
// redefinir su propia versión de "score/lives/level/status".

import type { ArcadeSkinId } from "./skins";

export interface ArcadeGameState {
  score: number;
  lives: number;
  level: number;
  status: "playing" | "dead" | "gameover";
}

export interface ArcadeGameCallbacks {
  onStateChange(state: ArcadeGameState): void;
}

// Opciones de arranque de un motor de juego. Por ahora solo la skin inicial;
// opcional para que motores sin skins sigan siendo válidos sin cambios.
export interface ArcadeGameOptions {
  skin?: ArcadeSkinId;
}

export interface ArcadeGameHandle {
  start(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  // Cambio de skin en caliente, sin reiniciar la partida. Opcional: un motor
  // sin skins implementadas sigue siendo un ArcadeGameHandle válido.
  setSkin?(skin: ArcadeSkinId): void;
}

export interface ArcadeGameProps {
  paused: boolean;
  skin: ArcadeSkinId;
  onScoreChange: (score: number) => void;
  onLivesChange: (lives: number) => void;
  onLevelChange: (level: number) => void;
  onGameOver: () => void;
}
