export const homeFor = (role) =>
  ({ candidate: "/candidate", recruiter: "/recruiter", admin: "/admin" })[role] || "/";