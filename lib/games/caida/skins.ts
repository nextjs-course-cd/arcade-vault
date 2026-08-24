// Paletas de "CAÍDA" (Tetris portado). Cada rol corresponde a un literal de
// color detectado en lib/games/caida/engine.ts:
// - pieceColors: color de cada una de las 8 piezas (índice 1..8 de COLORS).
// - blockHighlight: brillo superior que dibuja drawBlock() sobre cada bloque.
// - gridLine: líneas de la cuadrícula del tablero.
// - panelLabel: texto "NEXT" del panel lateral.
// - hudText: texto SCORE/LINES/LEVEL del HUD interno del canvas.
// - background: fondo del canvas.
// - glowBlur: intensidad del resplandor CRT en los bloques (0 = sin glow).
import type { ArcadeSkinId } from "@/lib/games/skins";

export interface CaidaPalette {
  pieceColors: string[]; // índice 0 sin usar, 1..8 = tipos de pieza (I,O,T,S,Z,J,L,N)
  blockHighlight: string;
  gridLine: string;
  panelLabel: string;
  hudText: string;
  background: string;
  glowBlur: number;
}

export const CAIDA_SKINS: Record<ArcadeSkinId, CaidaPalette> = {
  // Réplica exacta de los literales originales del motor.
  clasico: {
    pieceColors: [
      "",
      "#4dd0e1", // I - cyan
      "#ffd54f", // O - amarillo
      "#ba68c8", // T - violeta
      "#81c784", // S - verde
      "#e57373", // Z - rojo
      "#90caf9", // J - celeste
      "#ffb74d", // L - naranja
      "#9e9e9e", // N - tuerca (gris metálico)
    ],
    blockHighlight: "rgba(255,255,255,0.12)",
    gridLine: "rgba(255,255,255,0.08)",
    panelLabel: "rgba(255,255,255,0.6)",
    hudText: "#fff",
    background: "#000",
    glowBlur: 0,
  },
  // Paleta neón del sitio (--cyan/--magenta/--yellow/--green) con glow CRT.
  neon: {
    pieceColors: [
      "",
      "#00f5ff", // I - cyan
      "#f5ff00", // O - amarillo neón
      "#ff006e", // T - magenta
      "#00ff88", // S - verde neón
      "#ff2e6b", // Z - rojo-magenta
      "#00c8ff", // J - celeste neón
      "#ffa600", // L - naranja neón
      "#b388ff", // N - violeta neón
    ],
    blockHighlight: "rgba(255,255,255,0.25)",
    gridLine: "rgba(0,245,255,0.15)",
    panelLabel: "#00f5ff",
    hudText: "#e6e9ff",
    background: "#0a0a0f",
    glowBlur: 10,
  },
  // Monocromo fósforo ámbar: un solo matiz variando intensidad/opacidad.
  retro: {
    pieceColors: [
      "",
      "rgba(255,176,0,1)",
      "rgba(255,176,0,0.85)",
      "rgba(255,176,0,0.7)",
      "rgba(255,176,0,0.55)",
      "rgba(255,176,0,0.9)",
      "rgba(255,176,0,0.65)",
      "rgba(255,176,0,0.75)",
      "rgba(255,176,0,0.5)",
    ],
    blockHighlight: "rgba(255,176,0,0.15)",
    gridLine: "rgba(255,176,0,0.12)",
    panelLabel: "rgba(255,176,0,0.7)",
    hudText: "#ffb000",
    background: "#12100a",
    glowBlur: 0,
  },
};
