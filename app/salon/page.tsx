import Link from "next/link";
import { getGames } from "@/lib/games";
import { getTopScores } from "@/lib/scores";
import { YourBestScore } from "@/components/YourBestScore";

export default async function HallOfFamePage({
  searchParams,
}: {
  searchParams: Promise<{ game?: string }>;
}) {
  const { game: gameParam } = await searchParams;
  const games = await getGames();
  const game = games.find((g) => g.id === gameParam) ?? games[0];
  const rows = game ? await getTopScores(game.id, 12) : [];

  return (
    <div className="av-hall fade-in">
      <div className="hall-head">
        <h1>SALÓN DE LA FAMA</h1>
        <p className="pixel" style={{ fontSize: 10 }}>
          LOS NOMBRES QUE NUNCA SE BORRAN DE LA PANTALLA
        </p>
      </div>

      <div className="hall-tabs">
        {games.map((g) => (
          <Link
            key={g.id}
            href={`/salon?game=${g.id}`}
            className={"chip" + (game?.id === g.id ? " active" : "")}
          >
            {g.title}
          </Link>
        ))}
      </div>

      {!game || rows.length === 0 ? (
        <div style={{ textAlign: "center", padding: 80, color: "var(--ink-faint)" }}>
          <div
            className="pixel"
            style={{ fontSize: 14, color: "var(--magenta)", marginBottom: 12 }}
          >
            SIN PUNTAJES TODAVÍA
          </div>
          <div>Sé el primero en anotar en {game?.title ?? "este juego"}.</div>
        </div>
      ) : (
        <>
          <div className="podium">
            {rows[1] && (
              <div className="podium-slot silver">
                <div className="rank-num">02</div>
                <div className="name">{rows[1].name}</div>
                <div className="score">{rows[1].score.toLocaleString("es-ES")}</div>
                <div className="date">{rows[1].date}</div>
              </div>
            )}
            <div className="podium-slot gold">
              <div
                className="pixel"
                style={{ fontSize: 9, color: "var(--gold)", letterSpacing: "0.18em" }}
              >
                CAMPEÓN
              </div>
              <div className="rank-num" style={{ fontSize: 36, marginTop: 4 }}>
                01
              </div>
              <div className="name">{rows[0].name}</div>
              <div className="score" style={{ fontSize: 20 }}>
                {rows[0].score.toLocaleString("es-ES")}
              </div>
              <div className="date">{rows[0].date}</div>
            </div>
            {rows[2] && (
              <div className="podium-slot bronze">
                <div className="rank-num">03</div>
                <div className="name">{rows[2].name}</div>
                <div className="score">{rows[2].score.toLocaleString("es-ES")}</div>
                <div className="date">{rows[2].date}</div>
              </div>
            )}
          </div>

          <div className="hall-table">
            <div className="th">
              <div>RANGO</div>
              <div>JUGADOR</div>
              <div>PUNTUACIÓN</div>
              <div>FECHA</div>
            </div>
            {rows.map((r, i) => (
              <div
                key={r.name + i}
                className={"tr" + (i === 0 ? " top1" : i === 1 ? " top2" : i === 2 ? " top3" : "")}
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <div className="rk">#{String(r.rank).padStart(2, "0")}</div>
                <div className="pl">{r.name}</div>
                <div className="sc">{r.score.toLocaleString("es-ES")}</div>
                <div className="dt">{r.date}</div>
              </div>
            ))}
            <YourBestScore gameId={game.id} gameTitle={game.title} />
          </div>
        </>
      )}

      <div style={{ textAlign: "center", marginTop: 32 }}>
        <Link href="/juegos" className="btn lg">
          VOLVER A LA BIBLIOTECA
        </Link>
      </div>
    </div>
  );
}
