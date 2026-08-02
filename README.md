# Argyrios &amp; Tomislav — wedding invitation &amp; RSVP

A single-page invitation in **Swedish, Greek, English and Croatian**, with an RSVP
form whose answers land in a Google Sheet (or a Google Form).

- Ceremony — Stockholm City Hall, Saturday 10 April 2027. The page states clearly
  that only the very closest relatives fit inside the City Hall, and that the
  invitation is for the dinner afterwards.
- Dinner — 18:00, venue to be announced.
- RSVP deadline — 31 December 2026.

Nothing to build and no dependencies: plain HTML, CSS and JavaScript. Open
`index.html` in a browser, or serve the folder with any static host.

---

## 1. Where the answers are stored

Pick **one** of the two options and fill it into `assets/js/config.js`.
Until one of them is configured, the form falls back to opening a pre-filled
email to `contactEmail`, so the page is never a dead end.

### Option A — Google Sheet via Apps Script (recommended)

Gives you a real spreadsheet, one row per guest, and optional email alerts.

1. Create a new Google Sheet — this is the guest database.
2. **Extensions → Apps Script**, delete the sample code, paste all of
   [`google-apps-script/Code.gs`](google-apps-script/Code.gs).
3. Optional: set `NOTIFY_EMAIL` at the top of that file to get a mail per answer.
4. **Deploy → New deployment → Web app**
   - *Execute as*: **Me**
   - *Who has access*: **Anyone**
5. Copy the `…/exec` URL into `config.js`:

```js
appsScriptUrl: "https://script.google.com/macros/s/AKfy..../exec",
```

Open that URL in a browser once — it should print `{"ok":true,"service":"rsvp"}`.

After editing the script later, redeploy with **Manage deployments → edit (pencil)
→ Version: New version → Deploy**, otherwise the old code keeps running.

### Option B — plain Google Form

1. Create a Google Form with **seven short-answer / paragraph questions**, in
   any order: first name, surname, attending, diet, allergies, email, message.
   Use *short answer* (not multiple choice) so no value can be rejected.
2. Open the live form → right-click → **View page source** → search for
   `entry.` — each question has an id like `entry.123456789`. (Easier: open the
   form, press **⋮ → Get pre-filled link**, fill dummy values, copy the link and
   read the `entry.…` ids from it.)
3. Copy the form id from the URL `…/forms/d/e/<FORM_ID>/viewform`.
4. Fill both into `config.js`:

```js
googleForm: {
  formId: "1FAIpQLSd…",
  entries: {
    firstName: "entry.111111111",
    lastName:  "entry.222222222",
    attending: "entry.333333333",
    diet:      "entry.444444444",
    allergies: "entry.555555555",
    email:     "entry.666666666",
    message:   "entry.777777777"
  }
}
```

Responses appear under the form's **Responses** tab and can be linked to a Sheet.

> Google Forms never replies to a cross-site POST, so the page cannot tell a
> rejected submission from an accepted one. Send yourself one test answer after
> setup. Option A does not have this limitation.

The values sent are always canonical English (`Yes` / `No`, `Vegan`,
`Gluten-free`, …) whatever language the guest used, so the spreadsheet stays
easy to sort. The guest's chosen language is stored in its own column.

---

## 2. Things you will want to change

Everything below lives in `assets/js/config.js` and `assets/js/i18n.js`.

| What | Where |
|---|---|
| Dinner venue and address | `i18n.js` → `dinner.venue` in all four languages |
| Ceremony time, if you want it shown | add it to the ceremony card in `index.html` |
| Dress code, gift wording | `i18n.js` → `info.dress`, `info.gifts` |
| Contact address | `config.js` → `contactEmail` |
| Dates for the countdown / deadline | `config.js` → `weddingDate`, `rsvpDeadline` |
| Diet options | the checkbox list in `index.html` + `diet.*` keys in `i18n.js` |

Language is chosen automatically from the browser, remembered in
`localStorage`, and can be forced with `?lang=sv` (`el`, `en`, `hr`) — handy for
sending the right link to each side of the family.

---

## 3. Publishing

**GitHub Pages** — push this branch, then *Settings → Pages → Deploy from a
branch* and pick the branch with `/ (root)`. The site appears at
`https://<user>.github.io/invitation/`.

Any other static host works the same way (Netlify, Vercel, Cloudflare Pages):
drop the folder in, no build step.

---

## 4. Design notes

The three homes of this wedding are woven in rather than pasted on:

- **Sweden** — Stockholm City Hall in line drawing with the *Tre Kronor* on the
  spire, and the blue-and-gold of the city's own colours.
- **Greece** — a meander (Greek key) band across the top of the invitation and
  in the divider, and the Aegean blue used for the ceremony card.
- **Croatia** — the interlaced *pleter* motif in the divider, and the warm brick
  red of the dinner card.

Flags of all three countries sit in the footer. The layout is mobile-first,
works without JavaScript for reading (only the form and the countdown need it),
respects `prefers-reduced-motion`, and the form is keyboard- and
screen-reader-navigable.
