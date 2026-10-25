export const otpEmail = (otp, minutes) => ({
  subject: "Your password reset code",
  text: `Your password reset code is ${otp}. It expires in ${minutes} minutes. If you didn't request this, you can ignore this email.`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Reset your password</h2>
      <p>Use this code to reset your password. It expires in ${minutes} minutes.</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:24px 0">${otp}</p>
      <p style="color:#666;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    </div>`,
});

// const esc = (s = "") =>
//   String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const companyApprovedEmail = (companyName) => ({
  subject: "Your company has been approved",
  text: `Good news! ${companyName} has been approved. You can now post jobs.`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Your company is approved</h2>
      <p><strong>${esc(companyName)}</strong> has been approved. You can now log in and post jobs.</p>
    </div>`,
});

export const companyRejectedEmail = (companyName, reason) => ({
  subject: "Your company registration needs changes",
  text: `${companyName} was not approved. Reason: ${reason}. Update your company details and it will be reviewed again.`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Company not approved</h2>
      <p><strong>${esc(companyName)}</strong> was not approved.</p>
      <p><strong>Reason:</strong> ${esc(reason)}</p>
      <p>Update your company details in your dashboard and it will be reviewed again.</p>
    </div>`,
});

export const jobApprovedEmail = (jobTitle) => ({
  subject: "Your job post is live",
  text: `Your job "${jobTitle}" has been approved and is now visible to candidates.`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Your job is live</h2>
      <p><strong>${esc(jobTitle)}</strong> has been approved and is now visible to candidates.</p>
    </div>`,
});

export const jobRejectedEmail = (jobTitle, reason) => ({
  subject: "Your job post needs changes",
  text: `Your job "${jobTitle}" was not approved. Reason: ${reason}. Edit the job to resubmit it for review.`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Job not approved</h2>
      <p><strong>${esc(jobTitle)}</strong> was not approved.</p>
      <p><strong>Reason:</strong> ${esc(reason)}</p>
      <p>Edit the job to resubmit it for review.</p>
    </div>`,
});

export const applicationReceivedEmail = (jobTitle, companyName) => ({
  subject: "Application received",
  text: `Your application for ${jobTitle} at ${companyName} has been received.`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Application received</h2>
      <p>Your application for <strong>${esc(jobTitle)}</strong> at ${esc(companyName)} has been received.</p>
    </div>`,
});

const STAGE_COPY = {
  shortlisted: {
    subject: "You have been shortlisted",
    body: (j, c) => `Good news! Your application for ${j} at ${c} has been shortlisted.`,
  },
  interview: {
    subject: "Interview update",
    body: (j, c) => `Your application for ${j} at ${c} has moved to the interview stage. The recruiter will share the details with you.`,
  },
  offered: {
    subject: "You have received an offer",
    body: (j, c) => `Congratulations! ${c} has made you an offer for ${j}.`,
  },
  rejected: {
    subject: "Update on your application",
    body: (j, c) => `Thank you for applying for ${j} at ${c}. Unfortunately, they have decided not to move forward with your application.`,
  },
};

export const stageChangeEmail = (jobTitle, companyName, stage) => {
  const copy = STAGE_COPY[stage];
  const message = copy.body(jobTitle, companyName);
  return {
    subject: copy.subject,
    text: message,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
        <h2>${esc(copy.subject)}</h2>
        <p>${esc(message)}</p>
      </div>`,
  };
};

export const jobAlertEmail = (alertName, jobs, total, baseUrl) => {
  const lines = jobs.map((j) => ({
    title: j.title,
    meta: [
      j.companyId?.name || "Company",
      j.location,
      j.workMode,
      j.ctcRange?.max ? `up to ${j.ctcRange.max} LPA` : null,
    ].filter(Boolean).join(" · "),
    url: `${baseUrl}/jobs/${j._id}`,
  }));
  const more = total > jobs.length ? `${total - jobs.length} more jobs match this alert.` : "";
  const subject = total === 1 ? "1 new job matches your alert" : `${total} new jobs match your alert`;

  const text = [`New jobs for "${alertName}":`, ...lines.map((l) => `${l.title}\n${l.meta}\n${l.url}`), more]
    .filter(Boolean)
    .join("\n\n");

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;padding:24px">
      <h2>${esc(subject)}</h2>
      <p style="color:#666">Alert: ${esc(alertName)}</p>
      ${lines
        .map(
          (l) => `
        <div style="padding:12px 0;border-top:1px solid #eee">
          <a href="${esc(l.url)}" style="font-size:16px;font-weight:bold;color:#2563eb;text-decoration:none">${esc(l.title)}</a>
          <div style="color:#555;font-size:14px;margin-top:4px">${esc(l.meta)}</div>
        </div>`
        )
        .join("")}
      ${more ? `<p style="color:#666">${esc(more)}</p>` : ""}
    </div>`;

  return { subject, text, html };
};

export const verifyEmailOtp = (otp, minutes) => ({
  subject: "Verify your email",
  text: `Your verification code is ${otp}. It expires in ${minutes} minutes. If you didn't sign up, you can ignore this email.`,
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>Verify your email</h2>
      <p>Enter this code to finish signing up. It expires in ${minutes} minutes.</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:bold;margin:24px 0">${esc(otp)}</p>
      <p style="color:#666;font-size:13px">If you didn't sign up, you can safely ignore this email.</p>
    </div>`,
});

export const accountExistsEmail = () => ({
  subject: "Someone tried to register with your email",
  text: "Someone tried to create an account with this email address, but you already have one. If it was you, log in, or use 'Forgot password' if you can't remember your password. If you never finished verifying your email, request a new code on the login page. If it wasn't you, ignore this email.",
  html: `
    <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px">
      <h2>You already have an account</h2>
      <p>Someone tried to create an account with this email address.</p>
      <p>If it was you, log in, or use <strong>Forgot password</strong> if you can't remember your password.
         If you never finished verifying your email, request a new code on the login page.</p>
      <p style="color:#666;font-size:13px">If it wasn't you, you can safely ignore this email.</p>
    </div>`,
});