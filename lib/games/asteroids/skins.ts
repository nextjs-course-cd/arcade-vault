// Paletas de "ASTEROIDS" (motor portado). Cada rol corresponde a un literal
// de color detectado en lib/games/asteroids/engine.ts:
// - background: fondo del canvas.
// - shipStroke: trazo de la nave (Ship.draw) y del icono de vida (drawLifeIcon).
// - asteroidStroke: trazo de los polígonos de asteroide (Asteroid.draw).
// - bulletColor: relleno de las balas (Bullet.draw).
// - thrustColor: llama del propulsor cuando la nave acelera.
// - particleColor: componentes RGB (sin alpha) de las chispas de explosión;
//   el motor arma `rgba(${particleColor},${alpha})` con el alpha por partícula.
// - powerupColor: contorno/relleno del power-up de disparo triple y su texto
//   "3x" en el HUD.
// - hudText: texto SCORE/NIVEL del HUD interno del canvas.
// - glowBlur: intensidad del resplandor CRT en los trazos principales
//   (0 = sin glow).
import type { ArcadeSkinId } from "@/lib/games/skins";

export interface AsteroidsPalette {
  background: string;
  shipStroke: string;
  asteroidStroke: string;
  bulletColor: string;
  thrustColor: string;
  particleColor: string;
  powerupColor: string;
  hudText: string;
  glowBlur: number;
}

export const ASTEROIDS_SKINS: Record<ArcadeSkinId, AsteroidsPalette> = {
  // Réplica exacta de los literales originales del motor.
  clasico: {
    background: "#000",
    shipStroke: "#fff",
    asteroidStroke: "#fff",
    bulletColor: "#fff",
    thrustColor: "rgba(255, 130, 0, 0.85)",
    particleColor: "255,255,255",
    powerupColor: "#0ff",
    hudText: "#fff",
    glowBlur: 0,
  },
  // Paleta neón del sitio (--cyan/--magenta/--yellow/--green) con glow CRT.
  neon: {
    background: "#0a0a0f",
    shipStroke: "#00f5ff",
    asteroidStroke: "#ff006e",
    bulletColor: "#f5ff00",
    thrustColor: "rgba(255, 166, 0, 0.9)",
    particleColor: "0,245,255",
    powerupColor: "#00ff88",
    hudText: "#e6e9ff",
    glowBlur: 10,
  },
  // Monocromo fósforo ámbar: un solo matiz variando intensidad/opacidad.
  retro: {
    background: "#12100a",
    shipStroke: "#ffb000",
    asteroidStroke: "rgba(255,176,0,0.8)",
    bulletColor: "#ffb000",
    thrustColor: "rgba(255,176,0,0.6)",
    particleColor: "255,176,0",
    powerupColor: "rgba(255,176,0,0.9)",
    hudText: "#ffb000",
    glowBlur: 0,
  },
};
