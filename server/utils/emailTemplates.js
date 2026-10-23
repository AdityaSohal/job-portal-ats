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