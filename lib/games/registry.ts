// Registro de juegos con motor real jugable (id de catálogo -> componente
// canvas). components/GamePlayer.tsx consulta getGameComponent(id) en vez de
// ramificar con `if (game.id === "...")`; portar un juego nuevo con el skill
// port-game solo agrega una línea aquí.

import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ArcadeGameProps } from "@/lib/games/types";

const registry: Record<string, ComponentType<ArcadeGameProps>> = {
  asteroids: dynamic(() => import("@/components/games/AsteroidGame"), { ssr: false }),
  caida: dynamic(() => import("@/components/games/CaidaGame"), { ssr: false }),
};

export function getGameComponent(id: string): ComponentType<ArcadeGameProps> | null {
  return registry[id] ?? null;
}
