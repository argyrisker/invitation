# Argyrios &amp; Tomislav · wedding invitation &amp; RSVP

A single-page invitation in **Swedish, Greek, English and Croatian**, with an RSVP
form whose answers land in a Google Sheet (or a Google Form).

- Ceremony: Stockholm City Hall, Saturday 10 April 2027. The page states clearly
  that only the very closest relatives fit inside the City Hall, and that the
  invitation is for the dinner afterwards.
- Dinner: 18:00, venue to be announced.
- RSVP deadline: 31 December 2026.

Nothing to build and no dependencies: plain HTML, CSS and JavaScript. Open
`index.html` in a browser, or serve the folder with any static host.

---

## 1. Where the answers are stored

Pick **one** of the two options and fill it into `assets/js/config.js`.
Until one of them is configured, the form falls back to opening a pre-filled
email to `contactEmail`, so the page is never a dead end.

### Option A: Google Sheet via Apps Script (recommended)

Answers land in your own spreadsheet, one row per guest. Roughly five minutes,
all of it in the browser. Nothing to install.

**1. Make the Sheet.** Go to [sheets.new](https://sheets.new) and name it
something like *Wedding RSVP*. That file is the database.

**2. Paste the script.** In that Sheet: **Extensions → Apps Script**. Select the
sample `function myFunction() {}` and delete it, then paste all of
[`google-apps-script/Code.gs`](google-apps-script/Code.gs). Press the save icon.

**3. Optional but recommended.** On line 26 of the pasted code set your address
so every reply also arrives as an email:

```js
var NOTIFY_EMAIL = 'argyker@gmail.com';
```

**4. Publish it.** **Deploy → New deployment**, click the gear next to *Select
type* and pick **Web app**, then set:

| Field | Value |
|---|---|
| Description | anything, e.g. `rsvp` |
| Execute as | **Me** |
| Who has access | **Anyone** |

Press **Deploy**. Google asks for permission the first time: **Authorize
access** → choose your account → *Advanced* → *Go to (project name)* → **Allow**.
The "unverified app" warning is expected, the app is your own script.

> *Who has access* must be **Anyone**, not *Anyone with a Google account*.
> Guests are not signed in when they RSVP.

**5. Connect the page.** Copy the **Web app URL** (it ends in `/exec`) and paste
it into [`assets/js/config.js`](assets/js/config.js):

```js
appsScriptUrl: "https://script.google.com/macros/s/AKfy..../exec",
```

Commit and push that one line, and the form is live.

**6. Check it.** Open [`setup.html`](setup.html) (live at
`https://<user>.github.io/invitation/setup.html`), paste the `/exec` URL and
press **Run the check**. It sends a real test reply and tells you exactly what
happened: whether the row was written, or which setting is wrong. On success it
prints the line to paste into `config.js`. Delete the test row afterwards.

That page is not linked from the invitation, and guests never see it.

#### What the Sheet looks like

Two tabs are created on the first reply:

- **RSVP** — first reply, last update, first name, surname, attending, diet,
  allergies/notes, email, message, language.
- **Summary** — live counts: replies, coming, not coming, and how many need
  each diet. Useful for the caterer; the numbers update by themselves.

One row per email address. If a guest presses *Change my answer* and sends a
new reply, their existing row is updated rather than a second one added, and
*Last update* shows when. Answers are always stored in English (`Yes`, `No`,
`Vegan`, `Gluten-free`) whatever language the guest used, so the columns stay
sortable; the language they read the invitation in gets its own column.

#### If you edit the script later

Redeploy with **Manage deployments → edit (pencil) → Version: New version →
Deploy**. Keep the same deployment so the URL does not change, otherwise the
old code keeps running.

### Option B: plain Google Form

1. Create a Google Form with **seven short-answer / paragraph questions**, in
   any order: first name, surname, attending, diet, allergies, email, message.
   Use *short answer* (not multiple choice) so no value can be rejected.
2. Open the live form → right-click → **View page source** → search for
   `entry.`. Each question has an id like `entry.123456789`. (Easier: open the
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
| Where the RSVPs go | `config.js` → `appsScriptUrl` |
| Dates for the countdown / deadline | `config.js` → `weddingDate`, `rsvpDeadline` |
| Diet options | the checkbox list in `index.html` + `diet.*` keys in `i18n.js` |

Language is chosen automatically from the browser, remembered in
`localStorage`, and can be forced with `?lang=sv` (`el`, `en`, `hr`), handy for
sending the right link to each side of the family.

---

## 3. Publishing on GitHub Pages

There is nothing to build, so this is three clicks and no workflow:

1. The repository has to be **public** (Pages on a private repository needs a
   paid plan): *Settings -> General -> Danger Zone -> Change visibility*.
2. *Settings -> Pages -> Source:* **Deploy from a branch**.
3. Branch: **`claude/wedding-invitation-webpage-5a39de`**, folder **`/ (root)`**,
   then **Save**.

The site appears at `https://<user>.github.io/invitation/` a minute or two
later, and republishes by itself on every push to that branch. The empty
`.nojekyll` file stops GitHub from running the files through Jekyll.

> Turning Pages on has to be done by hand, once. A GitHub Actions workflow
> cannot do it for you: the workflow token may publish to Pages but not create
> the Pages site, and the API answers `Resource not accessible by integration`.
> That is why there is no deploy workflow in this repository.

One thing to update after the first deploy: the `og:` tags at the top of
`index.html` carry the full site URL so that WhatsApp, Messenger and iMessage
show a picture and a summary when the link is shared. They currently point at
`https://argyrisker.github.io/invitation/`. If the site ends up somewhere else,
change those two absolute URLs.

Any other static host works the same way (Netlify, Vercel, Cloudflare Pages):
drop the folder in, no build step.

---

## 4. Design notes

The three homes of this wedding are woven in rather than pasted on:

- **Sweden**: Stockholm City Hall in line drawing with the *Tre Kronor* on the
  spire, and the blue-and-gold of the city's own colours.
- **Greece**: a meander (Greek key) band across the top of the invitation and
  in the divider, and the Aegean blue used for the ceremony card.
- **Croatia**: the interlaced *pleter* motif in the divider, and the warm brick
  red of the dinner card.

The three flags in the footer each open their city on Wikipedia, in the
language the guest is reading, via `Special:Search/<name>` so a link can never
land on a missing page.

Flags of all three countries sit in the footer, and an illustration of the
couple (`assets/img/couple.webp`, JPEG fallback) hangs as a taped-up polaroid
next to the invitation letter. Its caption lives in `i18n.js`
(`invite.caption`) like all other text.

**The three cities** get their own section: the Bezesteni in Serres,
Pejačević Castle in Virovitica and the City Hall in Stockholm, drawn as gold
line art in the same style as the hero. They are drawings, not the municipal
coats of arms, which are copyrighted and in Sweden legally protected.

**Flags** in the footer are drawn to each country's official proportions
(Sweden 8:5, Greece 3:2, Croatia 2:1) at a shared height. The Croatian one
carries the full coat of arms: a 5 by 5 chequy starting on red, 13 red squares,
under the crown of the five historic shields.

**Animations**, all decorative: the hero arrives as a sequence, the City Hall
draws itself stroke by stroke and then casts a shimmering reflection in
Mälaren, faint northern lights drift across the hero sky, gold sparkles float,
the ampersand breathes (and releases a burst of hearts if a guest taps it),
the invitation letter arrives word by word, the polaroid develops from a soft
blur into full colour as it appears, section rules unroll, the photo floats,
the countdown numbers pop as they change, cards lift and enter staggered, the
divider bands trace themselves in and bob, a gold thread tracks scroll
position, the language switch crossfades, the submit button pulses while
sending, and petals fall when someone accepts. The pleter braid also runs corner to corner
along the bottom of the hero as a repeating tile; the tinted, dark and footer bands overlap the
section above them with softly rounded shoulders; and the two programme cards
slide in from either side, wearing small gold icons: rings for the ceremony, a
toast for the dinner. On a guest's first visit the invitation arrives sealed
in an envelope: the wax seal breaks, the flap opens and the card rises out. A
gold thread runs down the margin of the whole page, drawing itself as you
scroll, and the pleter braid in the divider weaves itself strand over strand as
it passes. With `prefers-reduced-motion`
(or without JavaScript) every one of them is skipped and the page is simply
fully visible.

**Typography**: **Cardo** for the headings, names and letter, **Commissioner**
for the small uppercase labels and the form. Both were picked because they
carry Latin, Latin Extended *and* Greek, so Swedish (å ä ö), Croatian
(č ć ž š đ) and Greek all render in the same typeface. This was a real bug
before: the previous pair (Cormorant Garamond and Jost) has no Greek at all, so
every Greek guest silently got a system fallback font. EB Garamond and Alegreya
do ship Greek, but draw it as a slanted, cursive design that would have made the
Greek page look italic next to the other three. Cardo keeps all four upright and
is Renaissance-classical, which suits an invitation.

The layout is mobile-first, works without JavaScript for reading (only the
form and the countdown need it), and the form is keyboard- and
screen-reader-navigable.
