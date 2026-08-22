import { createClient } from "@/lib/supabase/server";

export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";
export type GameColor = "cyan" | "magenta" | "green" | "yellow";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;
  color: GameColor;
}

export interface GameWithStats extends Game {
  best: number | null; // null si nadie ha guardado un puntaje real
  plays: number; // 0 si no hay partidas guardadas
}

function withStats(game: Game, scores: { score: number }[]): GameWithStats {
  return {
    ...game,
    best: scores.length > 0 ? Math.max(...scores.map((s) => s.score)) : null,
    plays: scores.length,
  };
}

export async function getGames(): Promise<GameWithStats[]> {
  const supabase = await createClient();
  const [{ data: games, error: gamesError }, { data: scores, error: scoresError }] =
    await Promise.all([
      supabase.from("games").select("*"),
      supabase.from("scores").select("game_id, score"),
    ]);

  if (gamesError) throw gamesError;
  if (scoresError) throw scoresError;

  return (games ?? []).map((game) =>
    withStats(
      game,
      (scores ?? []).filter((s) => s.game_id === game.id)
    )
  );
}

export async function getGameById(id: string): Promise<GameWithStats | null> {
  const supabase = await createClient();
  const [{ data: game, error: gameError }, { data: scores, error: scoresError }] =
    await Promise.all([
      supabase.from("games").select("*").eq("id", id).maybeSingle(),
      supabase.from("scores").select("score").eq("game_id", id),
    ]);

  if (gameError) throw gameError;
  if (scoresError) throw scoresError;
  if (!game) return null;

  return withStats(game, scores ?? []);
}
