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
  SponsorshipLink, Award, Disbursement, AuditLog
- Tailwind configured with the Grantispro brand palette
- **Auth:** NextAuth with credentials provider, JWT sessions carrying
  `tenantId` + `role` (no database adapter needed — kept the schema lean)
- **Tenant onboarding:** `/onboarding` creates a Tenant + its first
  Institution Admin in one transaction, with an audit log entry
- **Login:** `/login` via NextAuth credentials
- **Protected dashboard:** `/dashboard` (middleware-gated), confirms
  session + tenant context resolve correctly
- Landing page with CTAs into onboarding/login

**Not yet built (next milestones, per the PRD's Phase 1 scope):**
1. Dynamic criteria builder UI (admin composes `CriteriaBlock`s per program)
2. Application intake form (auto-generated from a program's criteria set)
3. Review/scoring queue for officers
4. Fund & donor management screens + sponsorship linking
5. Donor transparency dashboard
6. CSV/Excel export for all core entities
7. Inviting additional users (Officer/Finance roles) into an existing tenant
   — today, onboarding only creates the first Institution Admin

See the PRD (`PRD_Scholarship_Donor_Management_Platform.md`, shared separately)
for full feature detail on each of these.

## Auth note

Chose **NextAuth (credentials provider, JWT sessions)** over Clerk for this
scaffold — it's free, keeps the whole stack inside Railway/Postgres with no
third-party auth vendor, and JWT sessions avoid needing `Account`/`Session`
tables in the schema. Trade-off: no built-in social login or magic links —
if you want those later, swapping in an OAuth provider inside
`lib/auth.ts` is straightforward, or migrating to Clerk remains an option.
