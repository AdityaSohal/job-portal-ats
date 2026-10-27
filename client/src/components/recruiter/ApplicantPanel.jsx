import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarPlus, Check, Download, ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import toast from "react-hot-toast";
import api, { getError } from "../../lib/api";
import { cap, formatDate, formatDateTime, safeUrl, timeAgo } from "../../lib/format";
import { OPEN_INTERVIEW, RSTAGE_LABEL, STAGE_ACTIONS } from "../../lib/recruiter";
import Card from "../Card";
import { Alert, Button } from "../ui";
import { Skeleton, Textarea } from "../bits";
import { Avatar, MatchBar, RStageBadge } from "./bits";
import InterviewModal from "./InterviewModal";
import RInterviewCard from "./RInterviewCard";
import StageModal from "./StageModal";

const FINAL_TEXT = {
  hired: "The candidate accepted the offer. This application is complete.",
  rejected: "This application was rejected. It can't be changed.",
  withdrawn: "The candidate withdrew this application.",
  declined: "The candidate declined the offer.",
};

const fmtMonth = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "");

export default function ApplicantPanel({ id }) {
  const qc = useQueryClient();
  const [stageTarget, setStageTarget] = useState(null);
  const [scheduling, setScheduling] = useState(false);
  const [note, setNote] = useState("");
  const [downloading, setDownloading] = useState(false);

  const { data, isPending, isError, error, refetch } = useQuery({
    queryKey: ["r", "application", id],
    queryFn: async () => (await api.get(`/applications/${id}`)).data,
  });

  const addNote = useMutation({
    mutationFn: async (text) => (await api.post(`/applications/${id}/notes`, { text })).data,
    onSuccess: () => {
      setNote("");
      toast.success("Note added");
      qc.invalidateQueries({ queryKey: ["r", "application", id] });
    },
    onError: (err) => toast.error(getError(err).message),
  });

  const downloadResume = async () => {
    setDownloading(true);
    try {
      const res = await api.get(`/applications/${id}/resume`);
      const a = document.createElement("a");
      a.href = res.data.url; // a signed link that stops working after 5 minutes
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      toast.error(getError(err).message);
    } finally {
      setDownloading(false);
    }
  };

  if (isPending) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-32" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (isError) {
    const info = getError(error);
    return (
      <div className="space-y-3">
        <Alert>{info.status === 404 || info.status === 400 ? "This application wasn't found." : info.message}</Alert>
        {info.status !== 404 && info.status !== 400 && (
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        )}
      </div>
    );
  }

  const { application: app, candidate, skills, interviews, allowedNextStages } = data;
  const user = candidate.user;
  const profile = candidate.profile;
  const website = safeUrl(profile?.links?.portfolio);
  const github = safeUrl(profile?.links?.github);
  const linkedin = safeUrl(profile?.links?.linkedin);
  const hasOpenInterview = interviews.some((i) => OPEN_INTERVIEW.includes(i.status));
  const canSchedule = app.stage === "interview" && !hasOpenInterview;
  const totalSkills = skills.matched.length + skills.missing.length;
  const history = [...app.stageHistory].reverse();

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-4">
        <Avatar name={user?.name} size={56} />
        <div className="min-w-0 flex-1">
          <h3 className="text-xl font-extrabold leading-tight">{user?.name}</h3>
          {profile?.headline && <p className="text-[15px] text-ink/70">{profile.headline}</p>}
          <ul className="mt-2 space-y-1 text-sm">
            {user?.email && (
              <li className="flex items-center gap-2">
                <Mail size={14} aria-hidden="true" />
                <a href={`mailto:${user.email}`} className="break-all font-semibold underline underline-offset-4">
                  {user.email}
                </a>
              </li>
            )}
            {profile?.phone && (
              <li className="flex items-center gap-2">
                <Phone size={14} aria-hidden="true" />
                {profile.phone}
              </li>
            )}
            {profile?.location && (
              <li className="flex items-center gap-2">
                <MapPin size={14} aria-hidden="true" />
                {profile.location}
              </li>
            )}
          </ul>
        </div>
        <div className="flex flex-col items-end gap-2">
          <RStageBadge stage={app.stage} />
          <MatchBar score={app.matchScore} />
        </div>
      </div>

      <Card title="Decision">
        {allowedNextStages.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {allowedNextStages.map((target) => (
              <Button
                key={target}
                variant={target === "rejected" ? "secondary" : "primary"}
                onClick={() => setStageTarget(target)}
              >
                {target === "rejected" && app.stage === "offered" ? "Withdraw offer" : STAGE_ACTIONS[target]?.label || cap(target)}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink/70">{FINAL_TEXT[app.stage] || "No further changes are possible."}</p>
        )}
        <p className="mt-3 text-xs text-ink/55">Applied {timeAgo(app.createdAt)}. The candidate gets an email for each change.</p>
      </Card>

      <Card title="Resume and cover note">
        <Button variant="secondary" size="sm" onClick={downloadResume} loading={downloading}>
          <Download size={16} aria-hidden="true" />
          Download {app.resumeName}
        </Button>
        <p className="mt-4 text-xs font-bold uppercase tracking-wide text-ink/55">Cover note</p>
        <p className="mt-1 whitespace-pre-line break-words text-[15px]">{app.coverNote || <span className="text-ink/55">No cover note.</span>}</p>
      </Card>

      <Card title="Skill match">
        {totalSkills === 0 ? (
          <p className="text-sm text-ink/70">This job doesn't list required skills, so there is no match score.</p>
        ) : (
          <>
            <p className="mb-3 text-sm text-ink/70">
              Has {skills.matched.length} of {totalSkills} required skills.
            </p>
            <ul className="flex flex-wrap gap-2">
              {skills.matched.map((s) => (
                <li key={s} className="inline-flex items-center gap-1.5 rounded-lg border-2 border-ink bg-accent-soft px-2.5 py-1 text-sm font-semibold">
                  <Check size={14} aria-label="Has this skill" />
                  {s}
                </li>
              ))}
              {skills.missing.map((s) => (
                <li key={s} className="rounded-lg border-2 border-dashed border-ink/50 px-2.5 py-1 text-sm font-semibold text-ink/60">
                  {s}
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>

      <Card
        title="Interviews"
        action={
          canSchedule && (
            <Button size="sm" onClick={() => setScheduling(true)}>
              <CalendarPlus size={16} aria-hidden="true" />
              Schedule
            </Button>
          )
        }
      >
        {interviews.length === 0 ? (
          <p className="text-sm text-ink/70">
            {app.stage === "interview" ? "No interview scheduled yet." : "Interviews can be scheduled while the application is in the interview stage."}
          </p>
        ) : (
          <div className="space-y-3">
            {interviews.map((iv) => (
              <RInterviewCard key={iv.id} interview={iv} />
            ))}
          </div>
        )}
        {app.stage === "interview" && hasOpenInterview && (
          <p className="mt-3 text-xs text-ink/55">Only one interview can be open at a time. Complete or cancel it to schedule another.</p>
        )}
      </Card>

      <Card title="Internal notes">
        <p className="mb-3 text-xs text-ink/55">Only recruiters see these. Candidates never do.</p>
        {app.recruiterNotes.length > 0 && (
          <ul className="mb-4 space-y-3">
            {app.recruiterNotes.map((n) => (
              <li key={n._id} className="rounded-xl bg-paper p-3 text-sm">
                <p className="whitespace-pre-line break-words">{n.text}</p>
                <p className="mt-1.5 text-xs text-ink/55">
                  {n.author?.name || "Recruiter"} · {timeAgo(n.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (note.trim()) addNote.mutate(note.trim());
          }}
          className="space-y-2"
        >
          <Textarea
            aria-label="Add a note"
            className="min-h-20"
            placeholder="Write a note about this candidate"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 1000))}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-ink/50">{note.length}/1000</span>
            <Button type="submit" size="sm" variant="secondary" loading={addNote.isPending} disabled={!note.trim()}>
              Add note
            </Button>
          </div>
        </form>
      </Card>

      <Card title="Profile">
        <dl className="space-y-4 text-[15px]">
          {profile?.summary && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Summary</dt>
              <dd className="mt-1 whitespace-pre-line break-words">{profile.summary}</dd>
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Experience</dt>
              <dd className="mt-1 font-semibold">{profile?.experienceYears ?? 0} years</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Expected pay</dt>
              <dd className="mt-1 font-semibold">{profile?.expectedCtc != null ? `₹${profile.expectedCtc} LPA` : "Not provided"}</dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Prefers</dt>
              <dd className="mt-1 font-semibold">{profile?.preferredWorkMode ? cap(profile.preferredWorkMode) : "No preference"}</dd>
            </div>
          </div>

          {profile?.skills?.length > 0 && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">All skills</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {profile.skills.map((s) => (
                  <span key={s} className="rounded-md border border-ink/30 bg-paper px-2 py-0.5 text-xs font-medium">
                    {s}
                  </span>
                ))}
              </dd>
            </div>
          )}

          {profile?.experience?.length > 0 && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Experience</dt>
              <dd className="mt-2 space-y-3">
                {profile.experience.map((x, i) => (
                  <div key={x._id || i}>
                    <p className="font-bold">
                      {x.title} · {x.company}
                    </p>
                    <p className="text-xs text-ink/55">
                      {fmtMonth(x.startDate)} – {x.endDate ? fmtMonth(x.endDate) : "Present"}
                    </p>
                    {x.description && <p className="mt-1 whitespace-pre-line break-words text-sm">{x.description}</p>}
                  </div>
                ))}
              </dd>
            </div>
          )}

          {profile?.education?.length > 0 && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Education</dt>
              <dd className="mt-2 space-y-2">
                {profile.education.map((e, i) => (
                  <div key={e._id || i}>
                    <p className="font-bold">{e.institution}</p>
                    <p className="text-sm text-ink/70">
                      {[e.degree, e.fieldOfStudy, e.grade].filter(Boolean).join(" · ")}
                      {(e.startYear || e.endYear) && ` · ${[e.startYear, e.endYear].filter(Boolean).join("–")}`}
                    </p>
                  </div>
                ))}
              </dd>
            </div>
          )}

          {(website || github || linkedin) && (
            <div>
              <dt className="text-xs font-bold uppercase tracking-wide text-ink/55">Links</dt>
              <dd className="mt-1 flex flex-wrap gap-4">
                {[["Portfolio", website], ["GitHub", github], ["LinkedIn", linkedin]]
                  .filter(([, url]) => url)
                  .map(([name, url]) => (
                    <a key={name} href={url} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex items-center gap-1 text-sm font-bold underline underline-offset-4">
                      {name}
                      <ExternalLink size={13} aria-hidden="true" />
                    </a>
                  ))}
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <Card title="History">
        <ol className="space-y-4">
          {history.map((h, i) => (
            <li key={h._id || i} className="border-l-2 border-ink pl-4">
              <p className="font-bold">{RSTAGE_LABEL[h.to] || h.to}</p>
              <p className="text-xs text-ink/55">
                {formatDateTime(h.at)}
                {h.changedBy?.name && ` · ${h.changedBy.name}`}
              </p>
              {h.note && (
                <p className="mt-2 whitespace-pre-line break-words rounded-xl bg-paper p-2.5 text-sm">
                  <span className="block text-xs font-bold uppercase tracking-wide text-ink/55">Internal note</span>
                  {h.note}
                </p>
              )}
              {h.feedback && (
                <p className="mt-2 whitespace-pre-line break-words rounded-xl border-2 border-ink bg-accent-soft p-2.5 text-sm">
                  <span className="block text-xs font-bold uppercase tracking-wide text-ink/55">Feedback sent to the candidate</span>
                  {h.feedback}
                </p>
              )}
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-ink/50">First applied {formatDate(app.createdAt)}.</p>
      </Card>

      {stageTarget && (
        <StageModal
          applicationId={app._id}
          fromStage={app.stage}
          target={stageTarget}
          candidateName={user?.name}
          onClose={() => setStageTarget(null)}
        />
      )}
      {scheduling && <InterviewModal applicationId={app._id} candidateName={user?.name} onClose={() => setScheduling(false)} />}
    </div>
  );
}