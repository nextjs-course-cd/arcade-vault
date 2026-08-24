// Paletas de "BLOQUE BUSTER" (Arkanoid portado). Motor sprite-based: no hay
// literales de color de bloques/pelota/paleta que reemplazar directamente
// (se dibujan con drawImage desde public/games/bloque-buster/spritesheet-breakout.png).
// El tintado se aplica procesando la imagen cruda en un canvas offscreen con
// ctx.filter antes de usarla como fuente de drawImage. Roles detectados:
// - spriteFilter: filtro CSS de canvas aplicado a todo el spritesheet
//   (paddle, pelota, bloques, animación de explosión).
// - background: fondo del canvas (fillRect de fondo en draw()).
// - hudText: color del texto "Score/Nivel" dibujado sobre el canvas.
import type { ArcadeSkinId } from "@/lib/games/skins";

export interface BloqueBusterPalette {
  spriteFilter: string;
  background: string;
  hudText: string;
}

export const BLOQUE_BUSTER_SKINS: Record<ArcadeSkinId, BloqueBusterPalette> = {
  // Réplica exacta del estado actual del motor: sin filtro, fondo negro, texto blanco.
  clasico: {
    spriteFilter: "none",
    background: "#000",
    hudText: "#fff",
  },
  // Paleta neón del sitio con glow CRT vía saturación/hue-rotate sobre el spritesheet.
  neon: {
    spriteFilter: "saturate(1.6) hue-rotate(-15deg) brightness(1.15)",
    background: "#0a0a0f",
    hudText: "#00f5ff",
  },
  // Monocromo fósforo ámbar sobre el spritesheet completo.
  retro: {
    spriteFilter: "grayscale(1) sepia(1) hue-rotate(-15deg) saturate(2.5) brightness(0.8)",
    background: "#12100a",
    hudText: "#ffb000",
  },
};
