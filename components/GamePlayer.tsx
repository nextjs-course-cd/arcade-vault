"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GameWithStats } from "@/lib/games";
import { useAuth } from "@/lib/auth";
import { saveScore } from "@/lib/actions/scores";
import { getGameComponent } from "@/lib/games/registry";
import {
  type ArcadeSkinId,
  SKIN_IDS,
  SKIN_LABELS,
  readStoredSkin,
  writeStoredSkin,
} from "@/lib/games/skins";
import { TouchControls } from "@/components/TouchControls";

export function GamePlayer({ game }: { game: GameWithStats }) {
  const router = useRouter();
  const { user } = useAuth();

  const GameComponent = getGameComponent(game.id);
  const isReal = Boolean(GameComponent);

  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [engineLevel, setEngineLevel] = useState(1);
  const [paused, setPaused] = useState(false);
  const [over, setOver] = useState(false);
  const [name, setName] = useState(() => (user ? user.name : "INVITADO"));
  const [saved, setSaved] = useState(false);
  const [instanceKey, setInstanceKey] = useState(0);
  // Lazy initializer (mismo patrón que AuthProvider en lib/auth.tsx): lee
  // localStorage una sola vez al montar, sin useEffect que dispare un
  // set-state síncrono extra.
  const [skin, setSkin] = useState<ArcadeSkinId>(() => readStoredSkin());
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  const level = isReal ? engineLevel : Math.floor(score / 2500) + 1;

  useEffect(() => {
    setIsTouchDevice(window.matchMedia("(pointer: coarse)").matches);
  }, []);

  useEffect(() => {
    if (over || paused || isReal) return;
    const t = setInterval(() => setScore((s) => s + Math.floor(10 + Math.random() * 90)), 220);
    return () => clearInterval(t);
  }, [over, paused, isReal]);

  const endGame = () => setOver(true);
  const restart = () => {
    setScore(0);
    setLives(3);
    setEngineLevel(1);
    setPaused(false);
    setOver(false);
    setSaved(false);
    setInstanceKey((k) => k + 1);
  };

  return (
    <div className="av-player fade-in">
      <div className="player-hud">
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
          <div className="hud-stat">
            <div className="l">Jugador</div>
            <div className="v" style={{ color: "var(--ink)" }}>
              {name}
            </div>
          </div>
          <div className="hud-stat">
            <div className="l">Puntuación</div>
            <div className="v">{score.toLocaleString("es-ES")}</div>
          </div>
          <div className="hud-stat lives">
            <div className="l">Vidas</div>
            <div className="v">{"♥ ".repeat(lives).trim() || "—"}</div>
          </div>
          <div className="hud-stat level">
            <div className="l">Nivel</div>
            <div className="v">{String(level).padStart(2, "0")}</div>
          </div>
          <div className="hud-stat skin">
            <div className="l">Skin</div>
            <select
              className="hud-select"
              value={skin}
              onChange={(e) => {
                const next = e.target.value as ArcadeSkinId;
                setSkin(next);
                writeStoredSkin(next);
              }}
            >
              {SKIN_IDS.map((id) => (
                <option key={id} value={id}>
                  {SKIN_LABELS[id]}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="hud-actions">
          <button className="btn yellow" onClick={() => setPaused((p) => !p)}>
            {paused ? "REANUDAR" : "PAUSA"}
          </button>
          <button className="btn magenta" onClick={endGame}>
            FIN
          </button>
          <button className="btn ghost" onClick={() => router.push(`/juego/${game.id}`)}>
            SALIR
          </button>
        </div>
      </div>

      <div className="crt">
        <div className="crt-screen">
          {GameComponent ? (
            <GameComponent
              key={instanceKey}
              paused={paused || over}
              skin={skin}
              onScoreChange={setScore}
              onLivesChange={setLives}
              onLevelChange={setEngineLevel}
              onGameOver={() => setOver(true)}
            />
          ) : (
            <div className="game-arena">
              <div className="grid-floor"></div>
              <div className="enemy e1"></div>
              <div className="enemy e2"></div>
              <div className="enemy e3"></div>
              <div className="player-ship"></div>
            </div>
          )}
          {paused && (
            <div className="crt-content" style={{ background: "rgba(0,0,0,0.6)", zIndex: 5 }}>
              <div>
                <div className="pixel neon-yellow" style={{ fontSize: 22 }}>
                  EN PAUSA
                </div>
                <div
                  className="mono"
                  style={{
                    fontSize: 11,
                    color: "var(--ink-dim)",
                    marginTop: 10,
                    letterSpacing: "0.16em",
                  }}
                >
                  PULSA REANUDAR PARA CONTINUAR
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="crt-bottom">
          <span className="led">SEÑAL OK</span>
          <span>{game.title} · CRT-83 · 60 HZ</span>
          <span>CARGA · 1MB</span>
        </div>
      </div>

      {isReal && isTouchDevice && <TouchControls gameId={game.id} />}

      {over && (
        <div className="modal-bd">
          <div className="modal">
            <h2>FIN DEL JUEGO</h2>
            <div className="final-label">PUNTUACIÓN FINAL</div>
            <div className="final">{score.toLocaleString("es-ES")}</div>
            {!saved ? (
              <div className="input-row">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase().slice(0, 10))}
                  placeholder="TUS INICIALES"
                />
                <button
                  className="btn yellow"
                  onClick={async () => {
                    await saveScore(game.id, name, score);
                    setSaved(true);
                  }}
                >
                  GUARDAR PUNTUACIÓN
                </button>
              </div>
            ) : (
              <div className="toast-saved">▸ PUNTUACIÓN GUARDADA_</div>
            )}
            <div className="actions">
              <button className="btn" onClick={restart}>
                JUGAR DE NUEVO
              </button>
              <button className="btn magenta" onClick={() => router.push("/juegos")}>
                VOLVER AL VAULT
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
