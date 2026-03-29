import { Button } from "@/components/ui/button";
import { ScorerInputSchema } from "@/lib/scorer-schema";

export default function Home() {
  const samplePayload = {
    batterName: "Virat Kohli",
    runs: 4,
    wicket: false,
    over: 12.3,
  };

  const validation = ScorerInputSchema.safeParse(samplePayload);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center justify-center gap-6 px-6 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Cricket Scorer Starter</h1>
      <p className="text-muted-foreground">
        Next.js + Tailwind + Zod + shadcn/ui are configured and ready.
      </p>
      <Button>Record Delivery</Button>
      <p className="text-sm text-muted-foreground">
        Zod sample validation: {validation.success ? "passed" : "failed"}
      </p>
    </main>
  );
}
