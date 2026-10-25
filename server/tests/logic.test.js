import test from "node:test";
import assert from "node:assert/strict";
import { allowedFor } from "../utils/applicationStateMachine.js";
import { STAGE_TRANSITIONS, APPLICATION_STAGES } from "../utils/constants.js";
import { skillBreakdown } from "../utils/matchScore.js";
import { computeCompletion } from "../utils/profileCompletion.js";
import { normalizeSkills } from "../utils/skills.js";
import { csvCell, toCsv } from "../utils/csv.js";

test("recruiters get only forward moves, plus rejection", () => {
  assert.deepEqual(allowedFor("applied", "recruiter"), ["shortlisted", "rejected"]);
  assert.deepEqual(allowedFor("shortlisted", "recruiter"), ["interview", "rejected"]);
  assert.deepEqual(allowedFor("interview", "recruiter"), ["offered", "rejected"]);
  assert.deepEqual(allowedFor("offered", "recruiter"), ["rejected"]);
});

test("recruiters cannot skip stages", () => {
  assert.ok(!allowedFor("applied", "recruiter").includes("interview"));
  assert.ok(!allowedFor("applied", "recruiter").includes("offered"));
  assert.ok(!allowedFor("shortlisted", "recruiter").includes("offered"));
});

test("recruiters can never withdraw, accept or decline for the candidate", () => {
  for (const stage of APPLICATION_STAGES) {
    const moves = allowedFor(stage, "recruiter");
    for (const forbidden of ["withdrawn", "hired", "declined"]) {
      assert.ok(!moves.includes(forbidden), `${stage} -> ${forbidden}`);
    }
  }
});

test("candidates can withdraw until they receive an offer", () => {
  for (const stage of ["applied", "shortlisted", "interview"]) {
    assert.deepEqual(allowedFor(stage, "candidate"), ["withdrawn"], stage);
  }
});

test("candidates answer an offer by accepting or declining", () => {
  assert.deepEqual(allowedFor("offered", "candidate"), ["hired", "declined"]);
});

test("hired, rejected, withdrawn and declined are final for everyone", () => {
  for (const stage of ["hired", "rejected", "withdrawn", "declined"]) {
    assert.deepEqual(allowedFor(stage, "recruiter"), [], stage);
    assert.deepEqual(allowedFor(stage, "candidate"), [], stage);
  }
});

test("transitions only point to known stages and never go backwards", () => {
  for (const [from, targets] of Object.entries(STAGE_TRANSITIONS)) {
    for (const to of targets) {
      assert.ok(APPLICATION_STAGES.includes(to), `${from} -> ${to} is not a stage`);
      assert.notEqual(to, from, `${from} points to itself`);
      assert.notEqual(to, "applied", `${from} goes back to applied`);
    }
  }
});

test("match score: full match is 100", () => {
  const r = skillBreakdown(["react", "node.js"], ["react", "node.js"]);
  assert.equal(r.score, 100);
  assert.deepEqual(r.missing, []);
});

test("match score: partial match is rounded and lists matched and missing skills", () => {
  const r = skillBreakdown(["react", "node.js", "mongodb"], ["node.js", "mongodb", "express"]);
  assert.equal(r.score, 67);
  assert.deepEqual(r.matched, ["node.js", "mongodb"]);
  assert.deepEqual(r.missing, ["express"]);
});

test("match score: a job with no listed skills is not applicable (null)", () => {
  assert.equal(skillBreakdown(["react"], []).score, null);
});

test("match score: a candidate with no skills scores 0", () => {
  assert.equal(skillBreakdown([], ["react"]).score, 0);
  assert.equal(skillBreakdown(undefined, ["react"]).score, 0);
});

test("skills are normalized to one canonical spelling", () => {
  assert.deepEqual(normalizeSkills(["NodeJS", "node", "Node.js", "ReactJS", " k8s ", "JS"]), [
    "node.js", "react", "kubernetes", "javascript",
  ]);
});

test("profile completion: an empty profile is 0", () => {
  assert.equal(computeCompletion({}), 0);
});

test("profile completion: a complete profile is 100", () => {
  const profile = {
    headline: "MERN developer",
    summary: "Builds full stack apps with React, Node.js and MongoDB.",
    location: "Pune",
    skills: ["react", "node.js", "mongodb"],
    education: [{ institution: "Example University" }],
    experience: [{ company: "Acme", title: "Intern" }],
    resumes: [{ key: "resumes/x.pdf" }],
    links: { github: "https://github.com/x" },
    expectedCtc: 6,
  };
  assert.equal(computeCompletion(profile), 100);
});

test("profile completion: sections add up (headline 10 + three skills 20)", () => {
  assert.equal(computeCompletion({ headline: "Dev", skills: ["a", "b", "c"] }), 30);
});

test("csv: cells that start like a formula are neutralised", () => {
  assert.equal(csvCell("=1+1"), "'=1+1");
  assert.equal(csvCell("+91 98765"), "'+91 98765");
  assert.equal(csvCell("@SUM(A1)"), "'@SUM(A1)");
  assert.equal(csvCell("-2+3"), "'-2+3");
  assert.equal(csvCell(-5), "-5"); 
});

test("csv: commas, quotes and line breaks are quoted correctly", () => {
  assert.equal(csvCell('say "hi", ok'), '"say ""hi"", ok"');
  assert.equal(csvCell("a\nb"), '"a\nb"');
});

test("csv: empty values, zero, lists and dates", () => {
  assert.equal(csvCell(null), "");
  assert.equal(csvCell(undefined), "");
  assert.equal(csvCell(0), "0");
  assert.equal(csvCell(["react", "node.js"]), "react; node.js");
  assert.equal(csvCell(new Date("2026-01-02T03:04:05.000Z")), "2026-01-02T03:04:05.000Z");
});

test("csv: rows are joined with CRLF", () => {
  assert.equal(toCsv(["a", "b"], [[1, "x,y"], [null, "z"]]), 'a,b\r\n1,"x,y"\r\n,z');
});