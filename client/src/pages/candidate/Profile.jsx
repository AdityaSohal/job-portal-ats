import { getError } from "../../lib/api";
import { useProfile } from "../../hooks/useCandidateData";
import Card from "../../components/Card";
import ProgressRing from "../../components/ProgressRing";
import ProfileForm from "../../components/ProfileForm";
import ResumeManager from "../../components/ResumeManager";
import { Alert, Button } from "../../components/ui";
import { Skeleton } from "../../components/bits";

export default function Profile() {
  const { data, isPending, isError, error, refetch } = useProfile();

  if (isPending) {
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <Skeleton className="h-72" />
          <Skeleton className="h-40" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-3">
        <Alert>{getError(error).message}</Alert>
        <Button variant="secondary" onClick={() => refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  const { profile, completion } = data;

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Your profile</h1>

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        {/* The form keeps its own state, so uploading a resume never wipes unsaved edits */}
        <ProfileForm profile={profile} />

        <aside className="space-y-6 lg:sticky lg:top-24">
          <Card title="Completion">
            <div className="flex items-center gap-4">
              <ProgressRing value={completion.score} />
              <p className="text-sm text-ink/70">{completion.score === 100 ? "Your profile is complete." : "Fill in more to stand out to recruiters."}</p>
            </div>
            {completion.missing.length > 0 && (
              <ul className="mt-4 space-y-1.5 text-sm">
                {completion.missing.map((m) => (
                  <li key={m.key} className="flex justify-between gap-3">
                    <span>{m.label}</span>
                    <span className="shrink-0 font-bold text-accent">+{m.points}</span>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink/55">The score updates when you save.</p>
          </Card>

          <Card title="Resumes">
            <ResumeManager resumes={profile.resumes} />
          </Card>
        </aside>
      </div>
    </div>
  );
}