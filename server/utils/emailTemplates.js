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

const esc = (s = "") =>
  String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

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