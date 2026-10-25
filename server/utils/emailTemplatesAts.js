const TZ = process.env.ANALYTICS_TZ || "Asia/Kolkata";

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const formatWhen = (date) =>
  `${new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: TZ }).format(new Date(date))} (${TZ})`;

const mail = (subject, paragraphs) => {
  const parts = paragraphs.filter(Boolean);
  return {
    subject,
    text: parts.join("\n\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2>${esc(subject)}</h2>
        ${parts.map((p) => `<p>${esc(p).replace(/\n/g, "<br>")}</p>`).join("")}
      </div>`,
  };
};

const details = (iv) =>
  [
    `When: ${formatWhen(iv.scheduledAt)}`,
    `Duration: ${iv.durationMinutes} minutes`,
    `Mode: ${iv.mode}`,
    iv.meetingLink && `Meeting link: ${iv.meetingLink}`,
    iv.location && `Location: ${iv.location}`,
    iv.interviewerName && `Interviewer: ${iv.interviewerName}`,
    iv.instructions && `Notes: ${iv.instructions}`,
  ]
    .filter(Boolean)
    .join("\n");

export const rejectionEmail = (jobTitle, companyName, feedback) =>
  mail("Update on your application", [
    `Thank you for applying for ${jobTitle} at ${companyName}. Unfortunately, they have decided not to move forward with your application.`,
    feedback && `Feedback from the recruiter:\n${feedback}`,
  ]);

export const offerResponseEmail = (candidateName, jobTitle, accepted, filled) =>
  accepted
    ? mail("Offer accepted", [
        `${candidateName} accepted your offer for ${jobTitle}.`,
        filled && "All openings for this job are now filled, so it has been closed.",
      ])
    : mail("Offer declined", [`${candidateName} declined your offer for ${jobTitle}.`]);

export const interviewEmail = (kind, { jobTitle, companyName, interview }) => {
  if (kind === "cancelled") {
    return mail("Interview cancelled", [
      `Your interview for ${jobTitle} at ${companyName} has been cancelled.`,
      `It was scheduled for ${formatWhen(interview.scheduledAt)}.`,
    ]);
  }
  return mail(kind === "updated" ? "Interview details updated" : "Interview scheduled", [
    kind === "updated"
      ? `The details of your interview for ${jobTitle} at ${companyName} have changed.`
      : `${companyName} would like to interview you for ${jobTitle}.`,
    details(interview),
    "Log in to confirm the time, or to ask for a different one.",
  ]);
};

export const interviewResponseEmail = (candidateName, jobTitle, kind, interview) =>
  kind === "confirmed"
    ? mail("Interview confirmed", [
        `${candidateName} confirmed the interview for ${jobTitle} on ${formatWhen(interview.scheduledAt)}.`,
      ])
    : mail("Reschedule requested", [
        `${candidateName} asked to reschedule the interview for ${jobTitle} (currently ${formatWhen(interview.scheduledAt)}).`,
        interview.rescheduleReason && `Reason: ${interview.rescheduleReason}`,
      ]);