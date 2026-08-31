"use client";

import { useState } from "react";
import Image from "next/image";

const MIN_ID = 1;
const MAX_ID = 1010;

function spriteUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export default function ContadorPokemonPage() {
  const [count, setCount] = useState(MIN_ID);

  const increment = () => setCount((c) => (c >= MAX_ID ? MIN_ID : c + 1));
  const decrement = () => setCount((c) => (c <= MIN_ID ? MAX_ID : c - 1));
  const reset = () => setCount(MIN_ID);

  return (
    <div
      className="fade-in"
      style={{ maxWidth: 480, margin: "0 auto", padding: "48px 16px", textAlign: "center" }}
    >
      <div className="kicker pixel neon-yellow">▸ CONTADOR POKÉMON</div>
      <h1 className="pixel neon-cyan" style={{ fontSize: 20, margin: "12px 0 24px" }}>
        #{String(count).padStart(4, "0")}
      </h1>

      <div
        className="crt"
        style={{
          width: 260,
          height: 260,
          margin: "0 auto 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--panel, #111)",
          border: "2px solid var(--line)",
        }}
      >
        <Image
          key={count}
          src={spriteUrl(count)}
          alt={`Pokémon #${count}`}
          width={220}
          height={220}
          unoptimized
        />
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
        <button className="btn ghost" onClick={decrement}>
          ◀ ANTERIOR
        </button>
        <button className="btn xl press" onClick={increment}>
          ▶ SIGUIENTE
        </button>
        <button className="btn ghost" onClick={reset}>
          ↺ REINICIAR
        </button>
      </div>
    </div>
  );
}
