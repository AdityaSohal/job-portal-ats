# Job Portal & Applicant Tracking System

A two-sided hiring platform. Candidates build profiles, upload resumes and apply to jobs.
Recruiters post jobs and move applicants through a hiring pipeline. Admins approve companies
and jobs and manage the platform.

**Live demo:** [<your Vercel URL>](https://job-portal-ats-two.vercel.app/)

## Tech stack

React 18 (Vite) · Node.js · Express 5 · MongoDB Atlas (Mongoose) · JWT in httpOnly cookies ·
Cloudinary (private files) · Nodemailer · Vercel (one project, two services)

## Architecture

```
React (client/) ──/api/*──▶ Express (server/) ──▶ MongoDB Atlas
                                  │
                                  ├──▶ Cloudinary  (private resumes, signed links)
                                  ├──▶ SMTP        (OTP, status and alert emails)
                                  └──▶ Vercel Cron (expire jobs, send job alerts)
```

## Features

- **Auth:** email and password, Google sign-in (candidates only), OTP password reset by email
- **Roles:** candidate, recruiter and admin, enforced in the database queries, not just the UI
- **Companies:** recruiters register a company, an admin must approve it before jobs can be posted
- **Jobs:** recruiter CRUD, admin approval, public search with filters, pagination and sorting
- **Applications:** one-click apply with resume choice, duplicate prevention, withdrawal
- **Pipeline:** applied, shortlisted, interview, offered, rejected. Rules are enforced on the server
- **Recruiter tools:** ranked applicants (skill match score), internal notes, resume download, funnel analytics
- **Candidate tools:** profile builder with completion score, saved jobs, job alerts, application tracker
- **Admin tools:** user management, platform analytics, audit log

## Security

- Ownership checks inside every query. Other people's resources return 404 (no IDOR)
- Unique index on `{jobId, candidateId}` stops duplicate applications, even with simultaneous requests
- Application stage changes go through one state machine with compare-and-swap updates
- Resumes are private: PDF/DOCX only, 2 MB, file contents verified on the server, served through 5-minute signed links
- httpOnly cookies, bcrypt (cost 12), generic login errors, hashed OTPs with attempt limits and cooldown
- helmet, CORS allowlist, rate limiting, request key sanitizing, body size limit, input validation on every route
- Mass assignment prevented with field whitelists. Admin accounts cannot be created or changed through the API
- Audit log for approvals, blocks, deletes, stage changes and resume downloads

## Run locally

Requires Node.js 20+ and a MongoDB Atlas database.

```bash
git clone https://github.com/AdityaSohal/job-portal-ats.git
cd job-portal-ats
npm install
npm run install-all
cp server/.env.example server/.env     # Windows: copy server\.env.example server\.env
# fill in server/.env, then:
cd server
npm run seed:admin
npm run seed:jobs
npm run seed:apps
cd ..
npm run dev
```

Client: http://localhost:5173 · API: http://localhost:5000/api/health

Other scripts (inside `server/`): `npm test`, `npm run explain:search`, `npm run db:reset -- --yes`

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | <ADMIN_EMAIL> | <demo admin password> |
| Recruiter (approved company) | nimbus@demo.jobportal.test | Demo1234 |
| Recruiter (approved company) | orbit@demo.jobportal.test | Demo1234 |
| Candidate | cand2@demo.jobportal.test | Demo1234 |

Demo candidates are `cand1` to `cand12` @demo.jobportal.test. Demo applications use placeholder
resumes, so resume downloads only work for files you upload yourself.

## API overview

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register` `login` `google` `logout` `forgot-password` `reset-password` · `GET /api/auth/me` |
| Public jobs | `GET /api/jobs` (search, filter, paginate) · `GET /api/jobs/:id` |
| Recruiter jobs | `POST /api/jobs` · `GET /api/jobs/mine` · `GET /api/jobs/mine/:id` · `PATCH /api/jobs/:id` · `PATCH /api/jobs/:id/close` · `DELETE /api/jobs/:id` · `GET /api/jobs/:id/applicants` |
| Company | `GET /api/companies/me` · `PATCH /api/companies/me` |
| Profile | `GET /api/profile/me` · `PUT /api/profile/me` · `POST /api/profile/resumes` · `PATCH` / `DELETE /api/profile/resumes/:id` · `GET /api/profile/resumes/:id/download` |
| Applications (candidate) | `POST /api/applications` · `GET /api/applications/me` · `GET /api/applications/me/:id` · `PATCH /api/applications/:id/withdraw` |
| Applications (recruiter) | `GET /api/applications/:id` · `PATCH /api/applications/:id/stage` · `POST /api/applications/:id/notes` · `GET /api/applications/:id/resume` |
| Saved jobs | `GET /api/saved-jobs` · `GET /api/saved-jobs/ids` · `POST /api/saved-jobs` · `DELETE /api/saved-jobs/:jobId` |
| Job alerts | `GET` / `POST /api/alerts` · `PATCH` / `DELETE /api/alerts/:id` |
| Recruiter analytics | `GET /api/analytics/recruiter/overview` · `GET /api/analytics/recruiter/jobs/:id/funnel` |
| Admin | `GET /api/admin/companies` · `PATCH /api/admin/companies/:id/approve` `reject` · `GET /api/admin/jobs` · `PATCH /api/admin/jobs/:id/approve` `reject` · `GET /api/admin/users` · `GET /api/admin/users/:id` · `PATCH /api/admin/users/:id/block` `unblock` · `DELETE /api/admin/users/:id` · `GET /api/admin/analytics/overview` · `GET /api/admin/audit-logs` |
| Scheduled | `GET /api/cron/daily` (secret required) |

## Application stages

| From | Recruiter can move to | Candidate can |
|---|---|---|
| applied | shortlisted, rejected | withdraw |
| shortlisted | interview, rejected | withdraw |
| interview | offered, rejected | withdraw |
| offered | rejected | withdraw |
| rejected, withdrawn | final | final |

## Deployment

One Vercel project with two services (see `vercel.json`): the Vite client and the Express server.
`/api/*` goes to the server, everything else to the client. Environment variables are listed in
`server/.env.example`. A daily Vercel Cron job closes expired jobs and sends job alert emails.