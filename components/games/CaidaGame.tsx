"use client";

import { useEffect, useRef } from "react";
import { createCaidaGame } from "@/lib/games/caida/engine";
import type { ArcadeGameProps, ArcadeGameHandle, ArcadeGameState } from "@/lib/games/types";

const INTERNAL_WIDTH = 800;
const INTERNAL_HEIGHT = 600;

export default function CaidaGame({
  paused,
  skin,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: ArcadeGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<ArcadeGameHandle | null>(null);
  const callbacksRef = useRef({ onScoreChange, onLivesChange, onLevelChange, onGameOver });
  const lastStatusRef = useRef<ArcadeGameState["status"]>("playing");

  useEffect(() => {
    callbacksRef.current = { onScoreChange, onLivesChange, onLevelChange, onGameOver };
  }, [onScoreChange, onLivesChange, onLevelChange, onGameOver]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = INTERNAL_WIDTH * dpr;
    canvas.height = INTERNAL_HEIGHT * dpr;
    const ctx = canvas.getContext("2d");
    ctx?.scale(dpr, dpr);

    lastStatusRef.current = "playing";

    const handle = createCaidaGame(
      canvas,
      {
        onStateChange(state) {
          callbacksRef.current.onScoreChange(state.score);
          callbacksRef.current.onLivesChange(state.lives);
          callbacksRef.current.onLevelChange(state.level);
          if (state.status === "gameover" && lastStatusRef.current !== "gameover") {
            callbacksRef.current.onGameOver();
          }
          lastStatusRef.current = state.status;
        },
      },
      { skin }
    );

    handleRef.current = handle;
    handle.start();

    return () => {
      handle.stop();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    if (paused) handle.pause();
    else handle.resume();
  }, [paused]);

  useEffect(() => {
    handleRef.current?.setSkin?.(skin);
  }, [skin]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
      }}
    />
  );
}
