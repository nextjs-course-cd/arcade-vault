import { getGames } from "@/lib/games";
import { HomeContent } from "@/components/HomeContent";

export default async function HomePage() {
  const games = await getGames();
  return <HomeContent games={games} />;
}
