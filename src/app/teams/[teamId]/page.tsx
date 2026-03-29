import { TeamDetailsContainer } from "@/app/teams/[teamId]/TeamDetailsContainer";

interface TeamDetailsPageProps {
  params: Promise<{ teamId: string }>;
}

export default async function Page({ params }: TeamDetailsPageProps): Promise<React.JSX.Element> {
  const { teamId } = await params;
  return <TeamDetailsContainer teamId={teamId} />;
}

