# Lead flow, backup store and booking

Internal document. Not deployed (`docs` and `*.md` are in `.vercelignore`).

## How an enquiry travels

```
contact.html form ──POST──▶ /api/enquiry (Vercel function)
                               1. backup copy → Google Sheet (LEAD_WEBHOOK_URL)   ← optional, free
                               2. notification → your inbox via Resend            ← RESEND_API_KEY
                               3. receipt → the visitor via Resend (best effort)
                            ◀── ok:true only if 1 OR 2 succeeded
```

- **Success screen** appears only when the function answers `ok:true`, which means the
  lead is held in the sheet, your inbox, or both.
- **Email down, sheet up:** the visitor sees success and the lead is in the sheet. The
  failure is logged in Vercel → Logs.
- **Both down:** the visitor sees an error. Their answers stay in the form, with a
  **Try again** button, a prefilled "send it from your email app" link, your email and
  (if set) your phone. The full lead is also written to Vercel → Logs as
  `enquiry: NOT DELIVERED`. Logs are kept only briefly on the free plan, so treat this
  as a last resort.
- **Visitor offline or timed out (25 s):** same error and fallbacks. Nothing is lost
  from the screen.

## Config

| What | Where |
| --- | --- |
| Booking link | `BOOKING_URL` in `js/contact-config.js` |
| Phone (optional) | `PHONE_NUMBER` in `js/contact-config.js`. Empty means no phone shown anywhere |
| Email shown on the site | `CONTACT_EMAIL` in `js/contact-config.js` |
| Notification email | Vercel env `RESEND_API_KEY`, plus optional `ENQUIRY_TO` and `ENQUIRY_FROM` |
| Visitor receipt | On by default. Set Vercel env `ENQUIRY_CONFIRM=off` to stop it |
| Backup sheet | Vercel env `LEAD_WEBHOOK_URL` and `LEAD_WEBHOOK_SECRET` (see below) |

After changing any **Vercel env var**, redeploy (Deployments → ⋯ → Redeploy). Env changes
do not apply to the running deployment.

## Google Calendar booking page (free)

1. Google Calendar → **Create → Appointment schedule**. Set a 20 min duration and your
   availability, and add a Google Meet link.
2. Save, then **Open booking page → Share**, and copy the link (it looks like
   `https://calendar.app.google/…`).
3. Paste it into `BOOKING_URL` in `js/contact-config.js` and deploy. Both "Book a call"
   buttons appear by themselves, and the visitor receipt email gains the link.

The booking page opens in a new tab rather than as an embed. Google's embedded
scheduler is cramped on phones, and a new tab is the most reliable option on iPhone.

## Backup sheet: Google Sheets + Apps Script (free, about 10 minutes)

This is the recommended backup. It stays free, needs no new account beyond your Google
login, and gives you every lead in a spreadsheet even if email delivery fails.

1. Create a Google Sheet called **Website leads**.
2. **Extensions → Apps Script**. Replace the code with the script below, and set
   `SECRET` to a long random string.
3. **Deploy → New deployment → Web app**. Set *Execute as*: **Me**, and *Who has
   access*: **Anyone**. Authorise it, then copy the **Web app URL**.
4. Vercel → Project → Settings → Environment Variables (Production) and add:
   - `LEAD_WEBHOOK_URL` = the Web app URL
   - `LEAD_WEBHOOK_SECRET` = the same secret
5. Redeploy.

```js
const SECRET = 'paste-a-long-random-string-here';
const COLUMNS = ['timestamp','name','email','org','type','budget','timeline','project',
  'found_via','lead_source','referrer','utm_source','utm_medium','utm_campaign',
  'utm_content','utm_term','landing_page','pages_viewed'];

function doPost(e) {
  const out = o => ContentService.createTextOutput(JSON.stringify(o))
    .setMimeType(ContentService.MimeType.JSON);
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return out({ ok: false }); }
  if (d.secret !== SECRET) return out({ ok: false });

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheets()[0];
    if (sheet.getLastRow() === 0) sheet.appendRow(COLUMNS);
    /* a leading ' stops a value like "=…" being run as a formula */
    sheet.appendRow(COLUMNS.map(k => {
      const v = String(d[k] == null ? '' : d[k]);
      return /^[=+\-@]/.test(v) ? "'" + v : v;
    }));
  } finally { lock.releaseLock(); }
  return out({ ok: true });
}
```

**Alternative:** Vercel Marketplace → Upstash Redis (free tier). It is more engineering
for a one-person site, and you would read leads through a dashboard rather than a sheet.
It is not set up.

## Spam protection (no CAPTCHA)

- **Honeypot** field. Bots that fill it get a fake success and nothing is stored.
- **Server-side validation** of every field and every dropdown value.
- **Rate limit:** 5 accepted enquiries per IP per 10 minutes, per server instance.
  Failed or invalid attempts do not count, so a real client retrying is never locked
  out.
- **The visitor receipt** carries only a cleaned first name and fixed text, so the form
  cannot be used to send arbitrary content to arbitrary addresses.

## Testing

**Full lead:** open `https://itaiagami.com/contact.html?analytics_debug=1` and send an
enquiry with `[test]` in the message. Expect:

- the success screen;
- a new row in the sheet;
- an email to you titled `New enquiry - <name> - <type>`;
- a receipt in the inbox you entered.

**Booking:** after `BOOKING_URL` is set, click **Book a 20 min intro call** on the
contact page, then submit a test enquiry and click **Book a call**. Both open the Google
booking page in a new tab. With `?analytics_debug=1` the console logs
`book_call_click_from_contact` and `book_call_click_after_submission`.

**Failure path, without breaking production:** in DevTools → Network, set *Offline*,
then submit. Expect the error, **Try again**, and the prefilled email link. Go back
online and click **Try again**: it succeeds.

**API reachability:**

```bash
curl -s -X POST https://itaiagami.com/api/enquiry -H 'Content-Type: application/json' -d '{"name":"","email":"x","project":"short"}'
```

This should return `400 {"ok":false,"error":"Please add your name."}`.
