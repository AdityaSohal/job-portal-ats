import test from "node:test";
import assert from "node:assert/strict";
import { allowedFor } from "../utils/applicationStateMachine.js";
import { STAGE_TRANSITIONS, APPLICATION_STAGES } from "../utils/constants.js";
import { skillBreakdown } from "../utils/matchScore.js";
import { computeCompletion } from "../utils/profileCompletion.js";

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

test("recruiters can never withdraw an application", () => {
  for (const stage of APPLICATION_STAGES) {
    assert.ok(!allowedFor(stage, "recruiter").includes("withdrawn"), stage);
  }
});

test("candidates can only withdraw, and only from non-final stages", () => {
  for (const stage of ["applied", "shortlisted", "interview", "offered"]) {
    assert.deepEqual(allowedFor(stage, "candidate"), ["withdrawn"], stage);
  }
});

test("rejected and withdrawn are final for everyone", () => {
  for (const stage of ["rejected", "withdrawn"]) {
    assert.deepEqual(allowedFor(stage, "recruiter"), []);
    assert.deepEqual(allowedFor(stage, "candidate"), []);
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

test("match score: a job with no skills, or a candidate with none, scores 0", () => {
  assert.equal(skillBreakdown(["react"], []).score, 0);
  assert.equal(skillBreakdown([], ["react"]).score, 0);
  assert.equal(skillBreakdown(undefined, ["react"]).score, 0);
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