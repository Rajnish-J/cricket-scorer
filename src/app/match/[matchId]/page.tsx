import { MatchScoreboardContainer } from "@/app/match/[matchId]/MatchScoreboardContainer";

interface MatchPageProps {
  params: Promise<{ matchId: string }>;
}

export default async function Page({ params }: MatchPageProps): Promise<React.JSX.Element> {
  const { matchId } = await params;
  return <MatchScoreboardContainer matchId={matchId} />;
}

