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

**Settings page + currency fix:** `/dashboard/settings` — institution
admin can set a default currency (used for dashboard totals) and upload
the institution logo (finally closes the gap from the certificate
feature — logos now actually settable, stored via the same Cloudinary
upload endpoint used for applicant photos, just a different folder).
Root cause of the "always shows dollars" bug: several stat cards had
`$` hardcoded as a literal string instead of reading `Tenant.defaultCurrency`
— fixed everywhere across dashboard/donors/funds pages via a shared
`lib/currency.ts` formatter. Individual funds/pledges/awards can still use
their own currency independent of the tenant default.

**Zakat eligibility:** `Applicant.isZakatEligible` — a checkbox on the
public application form, but **only shown when the institution type is
Islamic or Waqf** (checked via `Tenant.institutionType`). Private,
Semi-Govt, Govt-funded, Trust, and NGO institutions never see this field —
matches the "no hardcoded rule across institution types" principle rather
than forcing an Islam-specific field on every tenant. Shown as a badge in
the officer review queue. When granting a scholarship from a Zakat-category
fund to a student not marked Zakat-eligible, the Grant Scholarship form
shows a soft warning — not a hard block, since Grantispro isn't positioned
to enforce religious rulings, just to surface the mismatch.

**Donation/fund categories — comprehensive, intentionally hardcoded (not
admin-configurable) per your request:** `FundCategory` enum covers actual
Islamic charity types (Zakat, Sadaqah, Sadaqah Jariyah, Fitrana, Waqf,
Qurbani) plus general/secular categories (General donation, Corporate CSR,
Government grant, Other) — not just "Zakat vs Other." Applied to both
`Fund` (a fund's overall designation) and `Pledge` (a donor's individual
contribution can be tagged independently, in case it differs from the
fund's primary designation). Selectable wherever a fund or pledge is
created — sponsor wizard, grant scholarship flow.

**A design note worth being upfront about:** Zakat has real Islamic
jurisprudence requirements around who's a valid recipient and how strictly
Zakat money must be segregated from other funds. This implementation
tracks the *label* and gives a soft nudge — it does not enforce religious
compliance rules. If this becomes something scholars/donors are relying on
for actual Zakat distribution correctness, that needs real fiqh review,
not just a software flag.

**Editable eligibility logic, delete everywhere, program-first grants,
reports/analytics, logo upload fix:**

- **Logic type is now editable after publishing.** The criteria builder
  page previously only showed logic type read-only; it's now the same
  editable ALL/ANY/SCORE selector as program creation, saved via a new
  `PATCH /api/programs/[id]`.
- **Delete added everywhere edit existed:** programs, donors, funds,
  grants. Each has real guardrails, not just a button: programs refuse
  to delete if applications exist (protects applicant history — suggests
  setting Inactive instead); funds refuse if sponsorships/grants reference
  them; donor deletion cascades to their pledges/sponsorship links/portal
  login but **does not retroactively adjust fund balances** (documented
  limitation — it's a records cleanup, not a financial reversal); grants
  delete cleanly since nothing else depends on them.
- **Grant Scholarship is now program-first**, matching the actual
  workflow: pick a program → see only applicants who are Shortlisted or
  Awarded in that program → grant to one of them. The old "any student in
  the tenant" flow still exists as an explicit second option ("Any student
  directly") for administrative grants outside the formal pipeline.
- **Reports and analytics** (`/dashboard/reports`): scholarships by type,
  applications by status, donors by type, fund balances by category,
  programs list with application counts, Zakat-eligible student count.
  Plus a **downloadable PDF** version of the same report
  (`GET /api/reports/pdf`), with the institution logo if set.
  Honest caveat printed on the PDF itself: amounts in different currencies
  are shown separately, not converted — this tool doesn't do FX.
- **Logo upload bug fixed** — root cause was UX, not the upload itself:
  errors were silently swallowed (no message shown on failure) and saving
  required a separate manual click after upload, which likely looked like
  "nothing happened." Now shows real error messages and auto-saves
  immediately after a successful upload.

**Two bugs fixed with real root-cause diagnosis, not guesses:**
- **Logo upload:** the upload endpoint now explicitly checks Cloudinary
  env vars are present and returns a clear error if not, and surfaces
  Cloudinary's actual error message on failure instead of a generic
  "upload failed." If it's still broken after this deploy, the error
  shown will finally say why.
- **PDF report:** the real bug — `/api/reports/pdf` was calling
  `/api/reports/summary` via an internal HTTP self-fetch with manually
  forwarded cookies, which is a fragile pattern on platforms like Railway
  (loopback/cookie issues). Refactored so both routes call a shared
  `lib/report-summary.ts` function directly, in-process. No network hop,
  no cookie-forwarding fragility. Also added real error messages instead
  of silent failure.

**Donor invitation pages — the big one.** `/invite/[programId]`, linked
from each program in the programs list ("Invite donors"). This is a
polished, public, shareable page distinct from the internal admin-driven
sponsor flow:
- Shows the program, institution branding, live transparency stats
  (students supported, pledges so far, amount raised for this specific
  program)
- Plain-English criteria list, so prospective donors understand who
  they're funding before committing
- Full pledge intent form: donor details, amount + currency + donation
  category (same Islamic/general categories as elsewhere), **frequency**
  (one-time/monthly/quarterly/yearly), **payment method** (cash/bank
  deposit/cheque/bank transfer/online), and **delivery preference** (donor
  delivers themselves vs. institution arranges collection) — each
  selection reveals the right contextual info (bank details for bank
  deposit/transfer, a collection-address field when the institution should
  collect, an honest "not set up yet" note for online payment since there's
  no payment gateway integrated)
- **Optional donor portal account creation right in the same form** —
  closes the loop with the existing donor transparency portal built
  earlier, so a first-time donor can start tracking their impact
  immediately without a separate staff-driven signup step later
- Confirmation screen tailored to what they chose (repeats bank details if
  relevant, confirms portal account, sets expectations on next steps)

Institution bank details are now settable in `/dashboard/settings` (bank
name, account title, account number, IBAN) specifically to power the
"Bank Deposit" contextual panel on invite pages.

**Scope decisions made here, worth knowing:**
- A public pledge submission creates a `Donor` (matched by email if one
  already exists) and a `Pledge` tied to the program — it does **not**
  automatically create a `Fund`/`SponsorshipLink` or touch any fund
  balance. Staff still need to formalize it (via the existing sponsor
  flow) once they've actually verified the money arrived. This keeps
  unverified public submissions from silently inflating fund totals.
- No payment gateway is integrated (Stripe/etc.) — "Online payment" is
  honestly labeled as not yet available rather than faked.

**Campus and class filtering:** `Campus` and `SchoolClass` are new
tenant-configurable lists (not hardcoded — naming varies too much between
institutions: city-named campuses vs. Boys/Girls vs. numbered branches;
Grade 1-12 vs. Hifz Year 1-5 vs. semester systems). Managed in
`/dashboard/settings` (simple add/remove tag lists). Applicants can
optionally be tagged with a campus and class — shown as dropdowns on the
public application form only when the tenant has actually configured at
least one of each (skipped entirely for single-campus schools that never
set them up). The officer review queue now has campus/class filter
dropdowns at the top, and shows the tags inline per applicant. Delete on
a campus/class is blocked if any student is still assigned to it, same
guardrail pattern as programs/funds.

**Not wired up yet:** the "Add new student" flow inside Grant Scholarship
doesn't have campus/class fields — only the public application form does.
Also, `SponsorshipLink.targetType = CLASS` (a donor sponsoring "a class"
as a funding target) is still free text, not linked to the new
`SchoolClass` entity — those are conceptually related but I kept them
separate rather than conflating "a donor's funding target" with "a
student's own class assignment."

**Certificate redesigned to match a real reference template** (a physical
certificate the school already uses). Now includes: institution logo,
campus badge if the student has one assigned, student name, reason
subtitle, an actual script font ("Great Vibes") for the "Certificate of
Scholarship" heading, the acknowledgment paragraph, the specific grant
detail (Full/Partial %/Fixed, with a computed "Academic Year" label from
the award's start date and duration), a closing message that's the
Islamic blessing text **only for Islamic/Waqf institutions** (neutral
closing otherwise — same conditional pattern as Zakat eligibility), award
date, and a proper signature line. **Signatory name/title is now a Settings
field** (`Tenant.signatoryName`/`signatoryTitle`) rather than whoever
happens to be logged in when the grant is made — matches how the reference
certificate has a fixed "Founder | Director" signature regardless of which
staff member processes the paperwork.

Honest limitation: the reference certificate's ornate corner flourishes
aren't replicated — pdf-lib draws primitive shapes, not hand-drawn
scrollwork, so the border is a clean double gold line instead. Everything
else (logo, campus tag, script heading, wording, signature) matches
closely.

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
