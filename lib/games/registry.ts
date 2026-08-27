// Registro de juegos con motor real jugable (id de catálogo -> componente
// canvas). components/GamePlayer.tsx consulta getGameComponent(id) en vez de
// ramificar con `if (game.id === "...")`; portar un juego nuevo con el skill
// port-game solo agrega una línea aquí.

import dynamic from "next/dynamic";
import { memo, type ComponentType } from "react";
import type { ArcadeGameProps } from "@/lib/games/types";

// memo() evita que GamePlayer.tsx re-invoque el componente de canvas en cada
// render del contenedor (ej. abrir el modal de fin de juego, tocar el
// selector de skin) cuando sus props visibles (paused/skin/callbacks) no
// cambiaron.
const registry: Record<string, ComponentType<ArcadeGameProps>> = {
  asteroids: memo(dynamic(() => import("@/components/games/AsteroidGame"), { ssr: false })),
  caida: memo(dynamic(() => import("@/components/games/CaidaGame"), { ssr: false })),
  "bloque-buster": memo(
    dynamic(() => import("@/components/games/BloqueBusterGame"), { ssr: false })
  ),
  ranaria: memo(dynamic(() => import("@/components/games/RanariaGame"), { ssr: false })),
};

export function getGameComponent(id: string): ComponentType<ArcadeGameProps> | null {
  return registry[id] ?? null;
}
