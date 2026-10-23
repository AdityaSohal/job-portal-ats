const RULES = [
  { key: "headline", label: "Add a headline", points: 10, done: (p) => !!p.headline?.trim() },
  { key: "summary", label: "Write a short summary (30+ characters)", points: 10, done: (p) => (p.summary?.trim().length || 0) >= 30 },
  { key: "location", label: "Add your location", points: 5, done: (p) => !!p.location?.trim() },
  { key: "skills", label: "Add at least 3 skills", points: 20, done: (p) => (p.skills?.length || 0) >= 3 },
  { key: "education", label: "Add your education", points: 15, done: (p) => (p.education?.length || 0) > 0 },
  { key: "experience", label: "Add work experience", points: 10, done: (p) => (p.experience?.length || 0) > 0 },
  { key: "resume", label: "Upload a resume", points: 20, done: (p) => (p.resumes?.length || 0) > 0 },
  { key: "links", label: "Add a portfolio, GitHub or LinkedIn link", points: 5, done: (p) => !!(p.links?.portfolio || p.links?.github || p.links?.linkedin) },
  { key: "ctc", label: "Add your expected CTC", points: 5, done: (p) => p.expectedCtc != null },
];

export const completionBreakdown = (profile) => {
  const score = RULES.reduce((sum, r) => sum + (r.done(profile) ? r.points : 0), 0);
  const missing = RULES.filter((r) => !r.done(profile)).map(({ key, label, points }) => ({ key, label, points }));
  return { score, missing };
};

export const computeCompletion = (profile) => completionBreakdown(profile).score;