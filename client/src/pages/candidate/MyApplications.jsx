import { useSearchParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import api, { getError } from "../../lib/api";
import { STAGE_LABEL } from "../../lib/format";
import ApplicationRow from "../../components/ApplicationRow";
import { Alert, Button, buttonClass, cx } from "../../components/ui";
import { EmptyState, Pagination, Skeleton } from "../../components/bits";
import { Link } from "react-router-dom";

const STAGES = ["applied", "shortlisted", "interview", "offered", "hired", "rejected", "withdrawn", "declined"];
const PAGE_SIZE = 10;

export default function MyApplications() {
  const [sp, setSp] = useSearchParams();
  const stage = STAGES.includes(sp.get("stage")) ? sp.get("stage") : "";
  const page = Math.min(Math.max(parseInt(sp.get("page"), 10) || 1, 1), 100);

  const update = (next) => {
    const params = {};
    if (next.stage) params.stage = next.stage;
    if (next.page > 1) params.page = String(next.page);
    setSp(params);
  };

  const { data, isPending, isError, error, isFetching, refetch } = useQuery({
    queryKey: ["my-applications", "list", { stage, page }],
    queryFn: async () => (await api.get("/applications/me", { params: { ...(stage && { stage }), page, limit: PAGE_SIZE } })).data,
    placeholderData: keepPreviousData,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-extrabold tracking-tight">Your applications</h1>

      <div className="flex gap-2 overflow-x-auto pb-1" role="group" aria-label="Filter by stage">
        {["", ...STAGES].map((s) => (
          <button
            key={s || "all"}
            type="button"
            aria-pressed={stage === s}
            onClick={() => update({ stage: s, page: 1 })}
            className={cx(
              "shrink-0 rounded-full border-2 border-ink px-3.5 py-1 text-sm font-semibold transition-colors",
              stage === s ? "bg-ink text-paper" : "bg-white hover:bg-accent-soft"
            )}
          >
            {s ? STAGE_LABEL[s] : "All"}
          </button>
        ))}
      </div>

      {isPending ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24" />
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
        <EmptyState
          title={stage ? "Nothing in this stage" : "No applications yet"}
          text={stage ? "Try another stage, or view all your applications." : "Find a job you like and apply in a few clicks."}
          action={
            stage ? (
              <Button variant="secondary" onClick={() => update({ stage: "", page: 1 })}>
                Show all
              </Button>
            ) : (
              <Link to="/jobs" className={buttonClass("primary")}>
                Browse jobs
              </Link>
            )
          }
        />
      ) : (
        <>
          <p className="text-sm font-semibold text-ink/70">
            {data.total} {data.total === 1 ? "application" : "applications"}
          </p>
          <div className={cx("space-y-3 transition-opacity", isFetching && "opacity-60")}>
            {data.items.map((a) => (
              <ApplicationRow key={a.id} app={a} />
            ))}
          </div>
          <Pagination
            page={data.page}
            pages={data.pages}
            onChange={(p) => {
              update({ stage, page: p });
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      )}
    </div>
  );
}