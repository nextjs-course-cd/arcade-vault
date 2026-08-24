"use client";

import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";
import { getTouchControls, type TouchButton } from "@/lib/games/touchControls";

function dispatchKey(type: "keydown" | "keyup", code: string) {
  // key === code: los motores existentes leen indistintamente e.code
  // (asteroids, caida) o e.key (bloque-buster), y para las teclas que
  // mapeamos (ArrowLeft/Right/Up/Down, Space) ambos valores coinciden
  // salvo Space, que ningún motor lee por e.key.
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code }));
}

function GamepadButton({
  code,
  ariaLabel,
  className,
  children,
}: {
  code?: string;
  ariaLabel: string;
  className: string;
  children: ReactNode;
}) {
  if (!code) {
    return (
      <button type="button" className={className} disabled aria-hidden="true">
        {children}
      </button>
    );
  }

  const press = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatchKey("keydown", code);
  };
  const release = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    dispatchKey("keyup", code);
  };

  return (
    <button
      type="button"
      className={className}
      aria-label={ariaLabel}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {children}
    </button>
  );
}

const ARROW_PATHS = {
  up: "M12 4 L20 16 L4 16 Z",
  right: "M8 4 L20 12 L8 20 Z",
  down: "M4 8 L20 8 L12 20 Z",
  left: "M16 4 L16 20 L4 12 Z",
};

function DpadArrow({ d }: { d: string }) {
  return (
    <svg className="dp-arrow" viewBox="0 0 24 24">
      <path d={d} fill="currentColor" />
    </svg>
  );
}

function ActionButton({
  button,
  fallbackLabel,
  variant,
}: {
  button?: TouchButton;
  fallbackLabel: string;
  variant: "a" | "b";
}) {
  return (
    <GamepadButton
      code={button?.code}
      ariaLabel={button?.label ?? fallbackLabel}
      className={`ab ${variant}`}
    >
      <span className="ab-ring" />
      <span className="ab-letter">{button?.label ?? fallbackLabel}</span>
    </GamepadButton>
  );
}

export function TouchControls({ gameId }: { gameId: string }) {
  const map = getTouchControls(gameId);
  if (!map) return null;

  return (
    <div className="gp" role="group" aria-label="Gamepad">
      <div className="gp-body">
        <div className="gp-col gp-col-left">
          <div className="gp-dpad" aria-label="D-pad">
            <GamepadButton code={map.up} ariaLabel="Arriba" className="dp dp-up">
              <DpadArrow d={ARROW_PATHS.up} />
            </GamepadButton>
            <GamepadButton code={map.right} ariaLabel="Derecha" className="dp dp-right">
              <DpadArrow d={ARROW_PATHS.right} />
            </GamepadButton>
            <GamepadButton code={map.down} ariaLabel="Abajo" className="dp dp-down">
              <DpadArrow d={ARROW_PATHS.down} />
            </GamepadButton>
            <GamepadButton code={map.left} ariaLabel="Izquierda" className="dp dp-left">
              <DpadArrow d={ARROW_PATHS.left} />
            </GamepadButton>
            <div className="dp-hub" aria-hidden="true">
              <span className="dp-hub-gem" />
            </div>
          </div>
        </div>
        <div className="gp-col gp-col-right">
          <div className="gp-actions">
            <ActionButton button={map.buttonB} fallbackLabel="B" variant="b" />
            <ActionButton button={map.buttonA} fallbackLabel="A" variant="a" />
          </div>
        </div>
      </div>
    </div>
  );
}
