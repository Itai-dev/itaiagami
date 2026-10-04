# /stats.html — private analytics summary

One page with the numbers from Google Analytics 4 and Microsoft Clarity, so
there is no need to open either. `stats.html` asks for a password and calls
`/api/stats`, which reads both services server-side with read-only keys.
The page itself loads no tracking, so visiting it is never counted.

## Setup (once, about 15 minutes)

All values go in **Vercel → itai-agami-portfolio → Settings → Environment
Variables** (Production). They take effect on the next deploy.

1. **`STATS_PASSWORD`** — any password you like. The page asks for it once
   per device and remembers it; "Sign out" forgets it.

2. **`GA_PROPERTY_ID`** — Google Analytics → Admin → Property details →
   *Property ID* (a number like `412345678`, not the `G-NTJQ076FLS`
   measurement ID).

3. **`GA_CREDENTIALS`** — a read-only Google service account:
   1. console.cloud.google.com → pick or create a project.
   2. APIs & Services → Library → enable **Google Analytics Data API**.
   3. IAM & Admin → Service Accounts → **Create service account** (any name,
      no roles needed) → open it → Keys → **Add key → JSON**. A file downloads.
   4. Paste the **whole file's contents** as the value of `GA_CREDENTIALS`.
   5. Copy the account's email (`…@….iam.gserviceaccount.com`), then in
      Google Analytics → Admin → **Property access management** → **+** →
      add that email with the **Viewer** role.

4. **`CLARITY_TOKEN`** — clarity.microsoft.com → the project → Settings →
   **Data Export** → *Generate new API token*.

5. Redeploy (or merge any change), then open **itaiagami.com/stats.html**.

## What it shows

- Visitors, new visitors, sessions, page views, engaged sessions and average
  session length, each against the same number of days before.
- Visitors per day (hover for the day; also as a table).
- The contact funnel: opened Contact → started the form → sent, plus
  book-a-call clicks, case studies opened and Work CTA clicks.
- Top pages, sources, channels, countries, devices.
- Clarity: sessions, scroll depth, and the share of sessions with rage
  clicks, dead clicks, quick backs and script errors.

## Limits

- Clarity's export API covers only the **last 3 days** and allows
  **10 calls a day**; the server keeps its answer for 3 hours. Recordings
  and heatmaps stay in Clarity.
- Google Analytics answers are kept for 10 minutes.
- `stats.html?demo` shows the layout with made-up numbers, no keys needed.
