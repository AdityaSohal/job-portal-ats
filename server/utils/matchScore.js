export const skillBreakdown = (candidateSkills = [], jobSkills = []) => {
  const have = new Set(candidateSkills);
  const matched = jobSkills.filter((s) => have.has(s));
  const missing = jobSkills.filter((s) => !have.has(s));
  const score = jobSkills.length ? Math.round((matched.length / jobSkills.length) * 100) : null;
  return { score, matched, missing };
};