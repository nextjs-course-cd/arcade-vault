"use client";

import { useState } from "react";
import Image from "next/image";

const MIN_ID = 1;
const MAX_ID = 1010;

function spriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

export default function ContadorPokemonPage() {
  const [count, setCount] = useState(MIN_ID);

  function decrement(): void {
    setCount((current) => (current <= MIN_ID ? MAX_ID : current - 1));
  }

  function increment(): void {
    setCount((current) => (current >= MAX_ID ? MIN_ID : current + 1));
  }

  function reset(): void {
    setCount(MIN_ID);
  }

  return (
    <div className="fade-in mx-auto max-w-120 px-4 py-12 text-center">
      <div className="kicker pixel neon-yellow">▸ CONTADOR POKÉMON</div>
      <h1 className="pixel neon-cyan mt-3 mb-6 text-[20px]">#{String(count).padStart(4, "0")}</h1>

      <div className="crt mx-auto mb-6 flex size-65 items-center justify-center border-2 border-[var(--line)] bg-[var(--panel,#111)]">
        <Image
          key={count}
          src={spriteUrl(count)}
          alt={`Pokémon #${count}`}
          width={220}
          height={220}
          unoptimized
        />
      </div>

      <div className="flex flex-wrap justify-center gap-3">
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
