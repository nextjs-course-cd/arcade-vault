"use server";

import { createClient } from "@/lib/supabase/server";

export async function saveScore(gameId: string, name: string, score: number): Promise<void> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { error } = await supabase.from("scores").insert({
    game_id: gameId,
    user_id: session?.user.id ?? null,
    name,
    score,
  });

  if (error) throw error;
}
