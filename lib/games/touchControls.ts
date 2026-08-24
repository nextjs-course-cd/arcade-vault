// Mapeo de controles táctiles (D-pad + 2 botones) por id de catálogo. Cada
// entrada define qué KeyboardEvent.code despacha components/TouchControls.tsx
// al presionar cada control — reusa los codes que los engines ya escuchan en
// window (keydown/keyup), sin tocar ningún engine.

export interface TouchButton {
  code: string;
  label: string;
}

export interface TouchControlMap {
  up?: string;
  down?: string;
  left?: string;
  right?: string;
  buttonA?: TouchButton;
  buttonB?: TouchButton;
}

const TOUCH_CONTROLS: Record<string, TouchControlMap> = {
  asteroids: {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    buttonA: { code: "Space", label: "A" },
  },
  caida: {
    left: "ArrowLeft",
    right: "ArrowRight",
    up: "ArrowUp",
    down: "ArrowDown",
    buttonA: { code: "Space", label: "A" },
  },
  "bloque-buster": {
    left: "ArrowLeft",
    right: "ArrowRight",
  },
};

export function getTouchControls(gameId: string): TouchControlMap | null {
  return TOUCH_CONTROLS[gameId] ?? null;
}
