"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

interface YourBest {
  rank: number;
  score: number;
}

export function YourBestScore({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const { user } = useAuth();
  const [best, setBest] = useState<YourBest | null>(null);

  useEffect(() => {
    if (!user) {
      setBest(null);
      return;
    }

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("scores")
        .select("user_id, score")
        .eq("game_id", gameId)
        .order("score", { ascending: false });

      if (cancelled || !data) return;

      const idx = data.findIndex((row) => row.user_id === user.id);
      setBest(idx === -1 ? null : { rank: idx + 1, score: data[idx].score });
    })();

    return () => {
      cancelled = true;
    };
  }, [user, gameId]);

  if (!user || !best) return null;

  return (
    <>
      <div className="tr you-label">▸ TU MEJOR MARCA EN {gameTitle}</div>
      <div className="tr you">
        <div className="rk" style={{ color: "var(--yellow)" }}>
          #{String(best.rank).padStart(2, "0")}
        </div>
        <div className="pl" style={{ color: "var(--yellow)" }}>
          {user.displayName}
        </div>
        <div
          className="sc"
          style={{ color: "var(--yellow)", textShadow: "0 0 6px rgba(245,255,0,0.5)" }}
        >
          {best.score.toLocaleString("es-ES")}
        </div>
        <div className="dt">—</div>
      </div>
    </>
  );
}
