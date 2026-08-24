"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { getTouchControls, type TouchButton } from "@/lib/games/touchControls";

function dispatchKey(type: "keydown" | "keyup", code: string) {
  // key === code: los motores existentes leen indistintamente e.code
  // (asteroids, caida) o e.key (bloque-buster), y para las teclas que
  // mapeamos (ArrowLeft/Right/Up/Down, Space) ambos valores coinciden
  // salvo Space, que ningún motor lee por e.key.
  window.dispatchEvent(new KeyboardEvent(type, { code, key: code }));
}

function TouchKey({
  code,
  label,
  className,
}: {
  code?: string;
  label: string;
  className?: string;
}) {
  if (!code) {
    return (
      <button type="button" className={`touch-key ${className ?? ""}`} disabled aria-hidden="true">
        {label}
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
      className={`touch-key ${className ?? ""}`}
      onPointerDown={press}
      onPointerUp={release}
      onPointerLeave={release}
      onPointerCancel={release}
    >
      {label}
    </button>
  );
}

function ActionKey({ button, label }: { button?: TouchButton; label: string }) {
  return <TouchKey code={button?.code} label={button?.label ?? label} className="touch-action" />;
}

export function TouchControls({ gameId }: { gameId: string }) {
  const map = getTouchControls(gameId);
  if (!map) return null;

  return (
    <div className="touch-controls">
      <div className="touch-dpad">
        <TouchKey code={map.up} label="▲" className="touch-up" />
        <TouchKey code={map.left} label="◀" className="touch-left" />
        <TouchKey code={map.right} label="▶" className="touch-right" />
        <TouchKey code={map.down} label="▼" className="touch-down" />
      </div>
      <div className="touch-actions">
        <ActionKey button={map.buttonB} label="B" />
        <ActionKey button={map.buttonA} label="A" />
      </div>
    </div>
  );
}
