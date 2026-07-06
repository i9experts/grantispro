# Grantispro

Multi-tenant scholarship & donor management platform.
Scholarships → Sponsors → Transparency.

This is a starter scaffold: Next.js 14 (App Router) + TypeScript + Tailwind +
Prisma, modeled directly on the PRD's data schema (tenants, dynamic criteria
engine, applications, funds, donors, sponsorship links, awards, disbursements,
audit log).

## Stack

- **Frontend + API:** Next.js 14, deployed on Railway
- **Database:** PostgreSQL (Railway managed Postgres plugin)
- **ORM:** Prisma
- **Auth:** NextAuth (to be wired up — Institution Admin / Officer / Finance / Donor roles)
- **Styling:** Tailwind, brand colors pre-configured (`plum`, `emerald`, `marigold`, `ivory`)

## Local setup

```bash
npm install
cp .env.example .env
# fill in DATABASE_URL once Railway Postgres is provisioned (see below)
npx prisma generate
npm run dev
```

## 1. Push to GitHub

```bash
git add -A
git commit -m "Initial Grantispro scaffold: Next.js + Prisma data model"
gh repo create grantispro --private --source=. --remote=origin --push
```

(If `gh` isn't authenticated yet: `gh auth login` first. No `gh` CLI? Create
the repo manually on github.com, then:
`git remote add origin <your-repo-url> && git push -u origin main`)

## 2. Deploy to Railway

```bash
railway login
railway init          # creates a new Railway project, or `railway link` to an existing one
railway add            # choose "PostgreSQL" to provision the database plugin
railway up             # deploys this app
```

Then in the Railway dashboard:
1. Open the Postgres plugin → **Connect** tab → copy the `DATABASE_URL`.
2. Add it as an environment variable on the **app service** (not just locally).
3. Add `NEXTAUTH_SECRET` (generate via `openssl rand -base64 32`) and
   `NEXTAUTH_URL` (your Railway-provided domain, or your custom domain once
   connected).
4. Run the first migration against the Railway database:
   ```bash
   railway run npx prisma migrate dev --name init
   ```

## 3. Connect grantispro.com (registered on Hostinger)

In Railway: Service → Settings → Networking → **Custom Domain** → add
`grantispro.com` (and `www.grantispro.com` if you want both). Railway will
give you CNAME/A records.

In Hostinger: hPanel → Domains → **DNS Zone Editor** for grantispro.com →
add the records Railway gave you. Typical setup:
- `@` (root) → A record or ALIAS/ANAME pointing at Railway's IP (Railway will specify)
- `www` → CNAME pointing at your Railway app domain

Propagation is usually 15 minutes–a few hours. Once it resolves, update
`NEXTAUTH_URL` in Railway's environment variables to `https://grantispro.com`.

## What's built vs. what's next

**Built:**
- Full Prisma data model: Tenant, User, ScholarshipProgram, CriteriaBlock,
  Applicant, Application, Document, ReviewScore, Fund, Donor, Pledge,
  SponsorshipLink, Award, Disbursement, AuditLog, PresetCriteria
- Tailwind configured with the Grantispro brand palette
- **Auth:** NextAuth with credentials provider, JWT sessions carrying
  `tenantId` + `role` (no database adapter needed — kept the schema lean)
- **Tenant onboarding:** `/onboarding` creates a Tenant + its first
  Institution Admin in one transaction, with an audit log entry
- **Login:** `/login` via NextAuth credentials
- **Protected dashboard:** `/dashboard` (middleware-gated)
- **Dynamic criteria builder:** `/dashboard/programs` (list), `/dashboard/programs/new`
  (step 1: name, description, logic type — ALL/ANY/weighted score),
  `/dashboard/programs/[id]/criteria` (step 2: add criteria blocks from a
  shared preset library or blank, live plain-English eligibility preview,
  optional "requires supporting document" per criterion). Role-gated to
  Institution Admin / Officer.
- **Preset criteria library:** 16 presets across 6 categories (academic
  merit, financial need, demographic/social, institutional relationship,
  talent/service, geographic), seeded via `prisma/seed.ts`, re-seeded
  automatically on every Railway deploy via `preDeployCommand`
- **Public application intake:** `/apply/[programId]` — no login required.
  Renders applicant basics plus one question per criteria block, lists
  any documents the program will eventually need (upload itself isn't
  wired up yet — see below), and submits to a public API route
- **Eligibility engine:** `lib/eligibility.ts` evaluates a submitted
  application against its program's criteria blocks using whichever logic
  type the admin configured (ALL / ANY / weighted SCORE). By default,
  auto-eligibility only pre-sorts the review queue — it does not
  auto-reject unless a program explicitly has `requiresReview: false`
- **Officer review queue:** `/dashboard/programs/[id]/applications` —
  lists applicants sorted by eligibility score, expandable to show their
  submitted answers, with a status dropdown (Submitted / Under review /
  Shortlisted / Awarded / Rejected / Renewed)

**Known gap, called out on purpose:** document upload is not implemented.
The application form tells applicants what documents will be needed but
doesn't accept file uploads yet — that needs Cloudflare R2 wired in first
(credentials, upload API route, storage on the `Document` model). Rather
than build a fake upload button, the form is honest about this being
"coming soon."

**Not yet built (next milestones, per the PRD's Phase 1 scope):**
1. Cloudflare R2 document upload (see gap above)
2. Fund & donor management screens + sponsorship linking
3. Donor transparency dashboard
4. CSV/Excel export for all core entities
5. Inviting additional users (Officer/Finance roles) into an existing tenant
   — today, onboarding only creates the first Institution Admin
6. A real visual design pass — current UI is functional, unstyled Tailwind
   defaults. Deliberately deferred; flagged so it doesn't get forgotten.

See the PRD (`PRD_Scholarship_Donor_Management_Platform.md`, shared separately)
for full feature detail on each of these.

## Auth note

Chose **NextAuth (credentials provider, JWT sessions)** over Clerk for this
scaffold — it's free, keeps the whole stack inside Railway/Postgres with no
third-party auth vendor, and JWT sessions avoid needing `Account`/`Session`
tables in the schema. Trade-off: no built-in social login or magic links —
if you want those later, swapping in an OAuth provider inside
`lib/auth.ts` is straightforward, or migrating to Clerk remains an option.
