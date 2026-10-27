import { STAGE_LABEL, cap } from "../lib/format";
import { Badge } from "./bits";

const TONE = {
  applied: "plain",
  shortlisted: "accent",
  interview: "accent",
  offered: "ink",
  hired: "ink",
  rejected: "danger",
  withdrawn: "plain",
  declined: "plain",
};

export default function StageBadge({ stage }) {
  return <Badge tone={TONE[stage] || "plain"}>{STAGE_LABEL[stage] || cap(stage)}</Badge>;
}