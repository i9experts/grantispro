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
- **Funds and donors:** `/dashboard/funds` (list), `/dashboard/donors`
  (list + add), `/dashboard/donors/new` then `/dashboard/donors/[id]/sponsor`
  (3-step wizard: pledge amount/currency/fund → sponsorship target
  student/class/institute/project/fund-only → review with an internal
  summary plus a preview of what the donor will eventually see). Creates
  `Donor` + `Pledge` + `SponsorshipLink` together, creating a new `Fund`
  inline if needed.
- **Donor transparency portal:** `/portal` — a real donor-facing login,
  separate from the staff dashboard. Adding a donor now has an optional
  "create a portal login" step; that donor can then sign in (same
  `/login` page, same NextAuth flow — middleware routes by role) and see
  their own total contributed, active sponsorships, and pledge history.
  Staff can never end up on `/portal` and donors can never end up on
  `/dashboard` — middleware enforces this both ways.

**Privacy decision made here, flagging since the original PRD listed this
as an open question:** donors see a sponsored student's first name and
last-initial only (e.g. "Ayesha K."), never full name or other PII. This
is a conservative default, not a configurable setting yet — an
institution that wants different behavior would need that added as a
real feature (e.g. a consent flag on `Applicant`).

**Visual redesign — in progress, not complete:**
- Real design system started: `DashboardLayout` (dark plum sidebar + topbar,
  matching the concept shown earlier), `StatCard` component, Unbounded font
  now actually loaded (`lib/fonts.ts`, local files in `public/fonts`),
  `lucide-react` icons added
- **Redesigned so far:** `/dashboard`, `/dashboard/programs`,
  `/dashboard/donors`, `/dashboard/funds` — the four main hub/list pages
- **Not yet redesigned** (still on the old bare-Tailwind styling from
  earlier milestones): login, onboarding, new program form, criteria
  builder, applications review queue, new donor form, sponsor wizard,
  donor portal, public application form. These are next in line — flagging
  so "full redesign" isn't misread as finished when only the hub pages are
  done.
- Kept Grantispro's own brand palette (plum/emerald/marigold) rather than
  switching to the purple/green shown in the HifzPro reference — the logo
  and brand sheet already invested in this palette.

**Student photo upload — built, using Cloudinary (not Cloudflare R2):**
Switched from the originally-planned R2 to Cloudinary at your request, for
consistency with your other applications. `POST /api/upload` accepts an
image (5MB cap, image mimetypes only), uploads to Cloudinary, returns a
URL stored on `Applicant.photoUrl`. Wired into: the public application
form (optional photo field with live preview), the officer review queue
(thumbnail per applicant), and the donor transparency portal (shown next
to each sponsorship).

**Worth flagging — a real privacy tension, not fully resolved:** the donor
portal masks a sponsored student's name to "First L." but now shows their
full photo. A photo arguably reveals more identity than a first name does.
This was built as explicitly requested ("donors can witness everything"),
but if this becomes a real product decision later, it's worth revisiting
whether photo visibility should be consent-gated the same way full names
currently aren't shown.

**Requires `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`,
`CLOUDINARY_API_SECRET`** as Railway environment variables — see
`.env.example`.

**Known gap, called out on purpose:** document upload is not implemented.
The application form tells applicants what documents will be needed but
doesn't accept file uploads yet — that needs Cloudflare R2 wired in first
(credentials, upload API route, storage on the `Document` model). Rather
than build a fake upload button, the form is honest about this being
"coming soon."

**Decisions made building this (flagging since they weren't explicitly
specified):**
- Donor + pledge + sponsorship link creation happens as one combined flow
  rather than three separate independent actions — faster for the common
  case, easier to change to separate flows later if needed.
- Any `Applicant` in the tenant can be a sponsorship target, not just ones
  who've received an `Award` — lets a donor pre-commit to a student before
  the awarding process finishes.
- **Fund balance currently reflects total pledged/committed amounts, not
  confirmed bank receipt.** `Pledge.receivedAt` exists in the schema for
  this but nothing sets it yet — a "mark pledge as received" reconciliation
  step (which would then increment the fund balance instead of doing it
  at pledge-creation time) is real future work, not done here.

**Bug fixes from user testing:**
- Stat card grids were hardcoded to fixed column counts with no mobile
  breakpoints, causing the "stretched"/truncated look on narrow screens.
  Fixed with responsive Tailwind breakpoints across dashboard, donors, and
  funds pages.
- Sidebar had no mobile behavior at all (always rendered full-width,
  pushing content off-screen on phones). Now: hidden by default on mobile
  with a hamburger-triggered slide-in drawer, always visible on desktop
  (`md:` breakpoint).
- **Still not mobile-optimized:** the criteria builder, sponsor wizard, and
  a few older forms still use the pre-redesign styling and haven't been
  checked on narrow viewports. Flagging so it's not assumed done.

**Real logo now in use, not just styled text:** the actual brand mark
(from the earlier logo work) is now the favicon (`app/icon.png`) and
appears next to the wordmark in the sidebar, landing page, and login page.
The onboarding page and a few inner pages still show text-only — not yet
updated.

**Direct scholarship granting + auto-generated certificates:**
`/dashboard/grants` (list) and `/dashboard/grants/new` (grant form) —
a separate path from the public-application flow, for administratively
granting a scholarship straight to a student (existing or newly added on
the spot). Award type is Full / Partial % / Fixed Amount, matching the
HifzPro reference. `Award.applicationId` is now optional and
`Award.applicantId` was added, so an award can exist either through the
formal application pipeline or granted directly — both paths share the
same `Award` model.

Each grant gets a **downloadable PDF certificate** (`GET
/api/awards/[id]/certificate`, built with `pdf-lib`), embedding the
institution's logo (`Tenant.logoUrl`, if set — falls back gracefully to
just the tenant name if not), student name, scholarship name, award
type/amount, reason, start date, and duration.

**Not done:** linking a `Tenant.logoUrl` upload UI — the certificate reads
that field but nothing in the app lets an admin set it yet, so certificates
will show text-only until that's built. Also, awarding through the
*formal* application/review flow (officer marks status "Awarded") still
doesn't create an `Award` record or certificate — only the direct-grant
path does right now. Worth unifying those two paths later.

**Not yet built (next milestones, per the PRD's Phase 1 scope):**
1. Cloudflare R2 document upload (see gap above)
2. CSV/Excel export for all core entities
3. Inviting additional staff users (Officer/Finance roles) into an
   existing tenant — today, onboarding only creates the first Institution
   Admin, and donor portal logins are the only other invite path that
   exists
4. A real visual design pass — current UI is functional, unstyled Tailwind
   defaults. Deliberately deferred; flagged so it doesn't get forgotten.
5. Pledge received/reconciliation tracking (see decision above)

See the PRD (`PRD_Scholarship_Donor_Management_Platform.md`, shared separately)
for full feature detail on each of these.

## Auth note

Chose **NextAuth (credentials provider, JWT sessions)** over Clerk for this
scaffold — it's free, keeps the whole stack inside Railway/Postgres with no
third-party auth vendor, and JWT sessions avoid needing `Account`/`Session`
tables in the schema. Trade-off: no built-in social login or magic links —
if you want those later, swapping in an OAuth provider inside
`lib/auth.ts` is straightforward, or migrating to Clerk remains an option.
