"use client";

import { useEffect, useRef } from "react";
import {
  createRanariaGame,
  type RanariaGameHandle,
  type RanariaState,
} from "@/lib/games/ranaria/engine";
import type { ArcadeGameProps } from "@/lib/games/types";

export type RanariaGameProps = ArcadeGameProps;

const INTERNAL_WIDTH = 800;
const INTERNAL_HEIGHT = 600;

export default function RanariaGame({
  paused,
  onScoreChange,
  onLivesChange,
  onLevelChange,
  onGameOver,
}: RanariaGameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const handleRef = useRef<RanariaGameHandle | null>(null);
  const callbacksRef = useRef({ onScoreChange, onLivesChange, onLevelChange, onGameOver });
  const lastStatusRef = useRef<RanariaState["status"]>("playing");

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

    const handle = createRanariaGame(canvas, {
      onStateChange(state) {
        callbacksRef.current.onScoreChange(state.score);
        callbacksRef.current.onLivesChange(state.lives);
        callbacksRef.current.onLevelChange(state.level);
        if (state.status === "gameover" && lastStatusRef.current !== "gameover") {
          callbacksRef.current.onGameOver();
        }
        lastStatusRef.current = state.status;
      },
    });

    handleRef.current = handle;
    handle.start();

    return () => {
      handle.stop();
      handleRef.current = null;
    };
     
  }, []);

  useEffect(() => {
    const handle = handleRef.current;
    if (!handle) return;
    if (paused) handle.pause();
    else handle.resume();
  }, [paused]);

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
