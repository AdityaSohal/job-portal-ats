import { useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api, { getError } from "../../lib/api";
import { Alert, Button, cx } from "../../components/ui";
import { EmptyState, Pagination, Skeleton } from "../../components/bits";
import RInterviewCard from "../../components/recruiter/RInterviewCard";

const FILTERS = [
  ["upcoming", "Upcoming"],
  ["attention", "Needs attention"],
  ["all", "All"],
];
const PARAMS = {
  upcoming: { upcoming: "true" },
  attention: { status: "reschedule_requested" },
  all: {},
};
const EMPTY = {
  upcoming: ["No upcoming interviews", "Schedule one from an applicant who is in the interview stage."],
  attention: ["Nothing needs your attention", "Candidates who ask for a new time appear here."],
  all: ["No interviews yet", "Interviews you schedule appear here."],
};

export default function Interviews() {
  const [filter, setFilter] = useState("upcoming");
  const [page, setPage] = useState(1);

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["r", "interviews", filter, page],
    queryFn: async () => (await api.get("/interviews", { params: { ...PARAMS[filter], page, limit: 10 } })).data,
    placeholderData: keepPreviousData,
    staleTime: 0,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Interviews</h1>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter interviews">
        {FILTERS.map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            onClick={() => {
              setFilter(value);
              setPage(1);
            }}
            className={cx(
              "shrink-0 rounded-full border-2 border-ink px-3.5 py-1 text-sm font-semibold transition-colors",
              filter === value ? "bg-ink text-paper" : "bg-white hover:bg-accent-soft"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      ) : isError ? (
        <div className="space-y-3">
          <Alert>{getError(error).message}</Alert>
          <Button variant="secondary" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      ) : data.items.length === 0 ? (
        <EmptyState title={EMPTY[filter][0]} text={EMPTY[filter][1]} />
      ) : (
        <>
          <div className={cx("space-y-4 transition-opacity", isFetching && "opacity-60")}>
            {data.items.map((iv) => (
              <RInterviewCard
                key={iv.id}
                interview={iv}
                headline={
                  <p className="text-sm font-bold">
                    {iv.candidate?.name || "Candidate"}
                    <span className="font-medium text-ink/65"> · {iv.job?.title}</span>
                  </p>
                }
                link={{ to: `/recruiter/jobs/${iv.jobId}/applicants?application=${iv.applicationId}`, label: "Open applicant" }}
              />
            ))}
          </div>
          <Pagination
            page={data.page}
            pages={data.pages}
            onChange={(p) => {
              setPage(p);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}
    </div>
  );
}