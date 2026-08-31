"use server";

import { createClient } from "@/lib/supabase/server";

const MAX_SCORE = 999_999_999;
const CONTROL_CHARS = /[\x00-\x1f\x7f]/;

export async function saveScore(gameId: string, name: string, score: number): Promise<void> {
  if (!Number.isInteger(score) || score < 0 || score > MAX_SCORE) {
    throw new Error("Puntuación inválida.");
  }

  const trimmedName = name.trim();
  if (trimmedName.length < 1 || trimmedName.length > 10 || CONTROL_CHARS.test(trimmedName)) {
    throw new Error("Nombre inválido.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("scores").insert({
    game_id: gameId,
    user_id: user?.id ?? null,
    name: trimmedName,
    score,
  });

  if (error) throw error;
}
