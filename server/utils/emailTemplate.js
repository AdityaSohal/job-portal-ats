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