/* Invitation page: language switching, countdown and RSVP submission. */
(function () {
  "use strict";

  var CFG   = window.RSVP_CONFIG || {};
  var I18N  = window.I18N || {};
  var LANGS = ["sv", "el", "en", "hr"];
  var STORE_LANG = "rsvp.lang";
  var STORE_SENT = "rsvp.answer";

  var lang = pickLang();

  /* ── tiny helpers ──────────────────────────────────────────────────── */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function t(key) {
    var dict = I18N[lang] || I18N.en || {};
    return dict[key] != null ? dict[key] : ((I18N.en && I18N.en[key]) || key);
  }
  function store(key, value) {
    try {
      if (value === undefined) return localStorage.getItem(key);
      localStorage.setItem(key, value);
    } catch (e) { /* private mode, ignore */ }
    return null;
  }

  function pickLang() {
    var saved = null;
    try { saved = localStorage.getItem(STORE_LANG); } catch (e) {}
    var fromUrl = new URLSearchParams(location.search).get("lang");
    var candidates = [fromUrl, saved].concat(
      (navigator.languages || [navigator.language || ""]).map(function (l) {
        return String(l).slice(0, 2).toLowerCase();
      })
    );
    for (var i = 0; i < candidates.length; i++) {
      if (candidates[i] && LANGS.indexOf(candidates[i]) !== -1) return candidates[i];
    }
    return LANGS.indexOf(CFG.defaultLang) !== -1 ? CFG.defaultLang : "en";
  }

  /* ── translation ───────────────────────────────────────────────────── */
  function applyLang() {
    document.documentElement.lang = t("html.lang");
    document.title = t("meta.title");

    $$("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });

    $$("[data-i18n-attr]").forEach(function (el) {
      el.getAttribute("data-i18n-attr").split("|").forEach(function (pair) {
        var bits = pair.split(":");
        if (bits.length === 2) el.setAttribute(bits[0].trim(), t(bits[1].trim()));
      });
    });

    $$(".lang").forEach(function (btn) {
      var on = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", on);
      btn.setAttribute("aria-current", on ? "true" : "false");
    });

    var contact = $("#contactLink");
    if (contact) {
      contact.textContent = t("info.contact");
      contact.href = "mailto:" + (CFG.contactEmail || "") +
        "?subject=" + encodeURIComponent("Argyrios & Tomislav · 10.04.2027");
    }

    splitLede();
    renderThanks();
    tickCountdown();
  }

  /* Wrap each word of the invitation letter so it can arrive in sequence.
     Runs after every translation, since the text is replaced each time. */
  function splitLede() {
    if (reduceMotion) return;
    $$(".lede").forEach(function (el) {
      var words = (el.textContent || "").split(/\s+/).filter(Boolean);
      if (!words.length) return;
      el.textContent = "";
      words.forEach(function (word, i) {
        var span = document.createElement("span");
        span.className = "w";
        span.textContent = word;
        span.style.animationDelay = (i * 0.022).toFixed(3) + "s";
        el.appendChild(span);
        el.appendChild(document.createTextNode(" "));
      });
    });
  }

  $$(".lang").forEach(function (btn) {
    btn.addEventListener("click", function () {
      if (btn.getAttribute("data-lang") === lang) return;
      lang = btn.getAttribute("data-lang");
      store(STORE_LANG, lang);
      applyLang();
      // brief crossfade so the whole page changes language as one
      document.body.classList.remove("lang-swap");
      void document.body.offsetWidth;
      document.body.classList.add("lang-swap");
    });
  });

  /* ── countdown ─────────────────────────────────────────────────────── */
  var target = new Date(CFG.weddingDate || "2027-04-10T18:00:00+02:00").getTime();

  function tickCountdown() {
    var box = $("#countdown");
    if (!box) return;
    var left = target - Date.now();
    if (left <= 0) {
      box.innerHTML = '<li class="countdown__done"><strong>' + t("countdown.done") + "</strong></li>";
      return;
    }
    var s = Math.floor(left / 1000);
    set("days",    Math.floor(s / 86400));
    set("hours",   Math.floor(s / 3600) % 24);
    set("minutes", Math.floor(s / 60) % 60);
    set("seconds", s % 60);

    function set(name, value) {
      var el = box.querySelector('[data-cd="' + name + '"]');
      if (!el) return;
      var text = name === "days" ? String(value) : ("0" + value).slice(-2);
      if (el.textContent !== text) {
        el.textContent = text;
        el.classList.remove("pop");
        void el.offsetWidth; // restart the animation
        el.classList.add("pop");
      }
    }
  }
  setInterval(tickCountdown, 1000);

  /* ── form ──────────────────────────────────────────────────────────── */
  var form    = $("#rsvpForm");
  var status  = $("#formStatus");
  var submit  = $("#submitBtn");
  var thanks  = $("#thanks");
  var dietBox = $("#attendingOnly");

  $$('input[name="attending"]').forEach(function (radio) {
    radio.addEventListener("change", function () {
      dietBox.hidden = radio.value !== "Yes" || !radio.checked;
    });
  });

  /* Checked-state class: fallback for browsers without :has() */
  function syncChoices() {
    $$(".choice", form).forEach(function (label) {
      var input = label.querySelector("input");
      label.classList.toggle("is-checked", !!(input && input.checked));
    });
  }
  form.addEventListener("change", syncChoices);
  syncChoices();

  /* Same fallback for the focus ring, only where :has() is missing. */
  var hasSupport = !!(window.CSS && CSS.supports && CSS.supports("selector(:has(input:focus-visible))"));
  if (!hasSupport) {
    $$(".choice input", form).forEach(function (input) {
      input.addEventListener("focus", function () { input.closest(".choice").classList.add("is-focused"); });
      input.addEventListener("blur",  function () { input.closest(".choice").classList.remove("is-focused"); });
    });
  }

  function fieldOf(input) { return input.closest(".field"); }

  /* `reason` picks which message the field shows: "empty" or "invalid". */
  function markInvalid(input, invalid, reason) {
    var f = fieldOf(input);
    if (f) {
      f.classList.toggle("is-invalid", !!invalid);
      f.classList.toggle("err-empty", invalid && reason === "empty");
      f.classList.toggle("err-invalid", invalid && reason === "invalid");
    }
    input.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function validate(data) {
    var ok = true;
    ["firstName", "lastName"].forEach(function (name) {
      var input = form.elements[name];
      var bad = !input.value.trim();
      markInvalid(input, bad, "empty");
      if (bad) ok = false;
    });

    var attending = form.querySelector('input[name="attending"]:checked');
    var choiceField = form.querySelector('input[name="attending"]').closest(".field");
    choiceField.classList.toggle("is-invalid", !attending);
    if (!attending) ok = false;

    var email = form.elements.email;
    var mail = email.value.trim();
    if (!mail) {
      markInvalid(email, true, "empty");
      ok = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(mail)) {
      markInvalid(email, true, "invalid");
      ok = false;
    } else {
      markInvalid(email, false);
    }

    if (!ok) {
      var first = form.querySelector(".is-invalid input, .is-invalid textarea");
      if (first) first.focus();
    }
    return ok;
  }

  function collect() {
    var attending = form.querySelector('input[name="attending"]:checked');
    var coming = attending && attending.value === "Yes";
    var diet = $$('input[name="diet"]:checked', form).map(function (c) { return c.value; });
    return {
      firstName: form.elements.firstName.value.trim(),
      lastName:  form.elements.lastName.value.trim(),
      attending: coming ? "Yes" : "No",
      diet:      coming ? diet.join(", ") : "",
      allergies: coming ? form.elements.allergies.value.trim() : "",
      email:     form.elements.email.value.trim(),
      message:   form.elements.message.value.trim(),
      language:  lang,
      submittedAt: new Date().toISOString()
    };
  }

  function mailtoLink(data) {
    var body = [
      t("form.firstName") + ": " + data.firstName,
      t("form.lastName") + ": " + data.lastName,
      t("form.attending") + ": " + (data.attending === "Yes" ? t("form.yes") : t("form.no")),
      t("form.diet") + ": " + (data.diet || "-"),
      t("form.allergies") + ": " + (data.allergies || "-"),
      t("form.email") + ": " + (data.email || "-"),
      t("form.message") + ": " + (data.message || "-")
    ].join("\n");
    return "mailto:" + (CFG.contactEmail || "") +
      "?subject=" + encodeURIComponent("RSVP: " + data.firstName + " " + data.lastName) +
      "&body=" + encodeURIComponent(body);
  }

  /* Send to Google Apps Script (JSON row in a Sheet). */
  function sendToAppsScript(data) {
    var body = new URLSearchParams(data).toString();
    var opts = {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8" },
      body: body
    };
    return fetch(CFG.appsScriptUrl, opts)
      .then(function (res) {
        if (!res.ok) throw new Error("HTTP " + res.status);
        return res.text();
      })
      .then(function (text) {
        var payload = null;
        try { payload = JSON.parse(text); } catch (e) { /* not JSON, assume stored */ }
        if (payload && payload.ok === false) {
          var refused = new Error(payload.error || "rejected");
          refused.refused = true;
          throw refused;
        }
      })
      .catch(function (err) {
        // A refusal from the script is final. Only a network or CORS problem
        // is worth a second, unreadable attempt.
        if (err && err.refused) throw err;
        return fetch(CFG.appsScriptUrl, Object.assign({ mode: "no-cors" }, opts));
      });
  }

  /* Send to a plain Google Form. The response is always opaque, so a
     resolved promise only means "the request left the browser". */
  function sendToGoogleForm(data) {
    var gf = CFG.googleForm || {};
    var body = new URLSearchParams();
    Object.keys(gf.entries || {}).forEach(function (key) {
      var entry = gf.entries[key];
      if (entry && data[key] != null && data[key] !== "") body.append(entry, data[key]);
    });
    return fetch("https://docs.google.com/forms/d/e/" + gf.formId + "/formResponse", {
      method: "POST",
      mode: "no-cors",
      body: body
    });
  }

  function hasAppsScript() { return !!(CFG.appsScriptUrl && /^https?:\/\//.test(CFG.appsScriptUrl)); }
  function hasGoogleForm() {
    var gf = CFG.googleForm || {};
    return !!(gf.formId && gf.entries && gf.entries.firstName);
  }

  function send(data) {
    if (hasAppsScript()) return sendToAppsScript(data);
    if (hasGoogleForm()) return sendToGoogleForm(data);
    return Promise.reject(new Error("no-backend"));
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var data = collect();
    if (!validate(data)) return;

    submit.disabled = true;
    status.className = "form__status is-busy";
    status.textContent = t("form.sending");

    send(data)
      .then(function () {
        store(STORE_SENT, JSON.stringify(data));
        renderThanks();
        thanks.scrollIntoView({ behavior: "smooth", block: "center" });
        if (data.attending === "Yes") throwPetals();
      })
      .catch(function () {
        submit.disabled = false;
        status.className = "form__status is-error";
        status.innerHTML = "";
        status.appendChild(document.createTextNode(t("form.error") + " "));
        var link = document.createElement("a");
        link.href = mailtoLink(data);
        link.textContent = t("form.errorLink");
        status.appendChild(link);
      });
  });

  /* ── thank-you state ───────────────────────────────────────────────── */
  function savedAnswer() {
    try { return JSON.parse(store(STORE_SENT) || "null"); } catch (e) { return null; }
  }

  function renderThanks() {
    var saved = savedAnswer();
    if (!saved) {
      thanks.hidden = true;
      form.hidden = false;
      return;
    }
    var yes = saved.attending === "Yes";
    $("#thanksTitle").textContent = t(yes ? "thanks.yesTitle" : "thanks.noTitle");
    $("#thanksBody").textContent  = t(yes ? "thanks.yesBody"  : "thanks.noBody");
    thanks.hidden = false;
    form.hidden = true;
    status.textContent = "";
    submit.disabled = false;
  }

  $("#editAgain").addEventListener("click", function () {
    try { localStorage.removeItem(STORE_SENT); } catch (e) {}
    renderThanks();
    form.scrollIntoView({ behavior: "smooth", block: "center" });
  });

  /* ── hero animations (skipped when the guest prefers reduced motion) ── */
  var reduceMotion = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (!reduceMotion) {
    // City Hall draws itself in: normalize every path length to 1 so a
    // single CSS dash animation traces the whole facade evenly.
    var cityhall = $(".cityhall");
    if (cityhall) {
      $$("path", cityhall).forEach(function (p) { p.setAttribute("pathLength", "1"); });
      cityhall.classList.add("draw");
    }

    // A few gold sparkles drifting inside the hero.
    var hero = $(".hero");
    if (hero) {
      for (var i = 0; i < 14; i++) {
        var dot = document.createElement("span");
        dot.className = "sparkle";
        var size = 2 + Math.random() * 3;
        dot.style.width = dot.style.height = size.toFixed(1) + "px";
        dot.style.left = (3 + Math.random() * 94).toFixed(1) + "%";
        dot.style.top = (8 + Math.random() * 84).toFixed(1) + "%";
        dot.style.animationDuration = (4 + Math.random() * 5).toFixed(1) + "s";
        dot.style.animationDelay = (Math.random() * 6).toFixed(1) + "s";
        hero.insertBefore(dot, hero.firstChild);
      }
      // let the ampersand start breathing once the entrance is over
      setTimeout(function () { hero.classList.add("is-settled"); }, 2200);
    }

    // The meander, crown and pleter trace themselves when the divider
    // appears. dasharray/dashoffset inherit into the pleter's <use> copies.
    // The braid's real paths live in the shared sprite, so normalize those
    // too; the hero band reuses them but has no dash rules, so it is safe.
    $$(".svg-defs path").forEach(function (p) { p.setAttribute("pathLength", "1"); });
    $$(".divider .motif").forEach(function (svg) {
      $$("path", svg).forEach(function (p) { p.setAttribute("pathLength", "1"); });
      // the pleter is opened by the scroll-driven clip instead
      if (!svg.classList.contains("motif--weave")) svg.classList.add("draw");
    });

    // A small secret: tapping the ampersand releases a burst of hearts.
    var amp = $(".names .amp");
    if (amp) {
      amp.addEventListener("click", function () {
        var r = amp.getBoundingClientRect();
        spawnHearts(r.left + r.width / 2, r.top + r.height / 2);
      });
    }

    /* Everything that follows the scroll runs from one rAF-throttled
       handler: the thread that stitches the page together, and the braid
       that weaves itself as the divider goes by. */
    var threadPath = $(".thread path");
    var weaveRect = document.getElementById("weaveRect");
    var divider = $(".divider");
    var ticking = false;

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var view = window.innerHeight;

        if (threadPath) {
          var max = document.documentElement.scrollHeight - view;
          var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
          // the thread is always a little ahead of the reader
          threadPath.style.strokeDashoffset = String(1 - Math.min(1, p * 1.08));
        }

        if (weaveRect && divider) {
          // weave from the moment the divider appears until it is well up
          var box = divider.getBoundingClientRect();
          var w = (view * 0.9 - box.top) / (view * 0.55);
          weaveRect.setAttribute("width", (168 * clamp01(w)).toFixed(1));
        }
        ticking = false;
      });
    }

    function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

    if (weaveRect) weaveRect.setAttribute("width", "0");
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    onScroll();
  }

  /* The envelope: CSS runs the whole sequence, so this only remembers that
     the guest has seen it and lets them skip it. */
  (function envelope() {
    var box = $("#envelope");
    if (!box || box.hidden) return;
    try { localStorage.setItem("rsvp.opened", "1"); } catch (e) {}

    function open() {
      document.documentElement.classList.remove("is-sealed");
      box.remove();
    }
    box.addEventListener("click", open);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" || e.key === "Enter") open();
    });
    // the CSS fade ends at 3.0s; clear it from the page just after
    setTimeout(open, 3200);
  })();

  /* Hearts from the ampersand. */
  function spawnHearts(cx, cy) {
    if (reduceMotion) return;
    var colours = ["#e0c684", "#f8f4ec", "#d98b80", "#c9a44c"];
    for (var i = 0; i < 12; i++) {
      var h = document.createElement("span");
      h.className = "heart";
      h.textContent = "♥";
      h.style.left = cx + "px";
      h.style.top = cy + "px";
      h.style.fontSize = (11 + Math.random() * 10).toFixed(0) + "px";
      h.style.color = colours[i % colours.length];
      h.style.setProperty("--hx", (Math.random() * 150 - 75).toFixed(0) + "px");
      h.style.setProperty("--hy", (-40 - Math.random() * 85).toFixed(0) + "px");
      h.style.setProperty("--hr", (Math.random() * 80 - 40).toFixed(0) + "deg");
      h.style.setProperty("--hs", (0.9 + Math.random() * 0.7).toFixed(2));
      h.style.animationDuration = (1.1 + Math.random() * 0.8).toFixed(2) + "s";
      document.body.appendChild(h);
      setTimeout(function (node) {
        return function () { node.remove(); };
      }(h), 2100);
    }
  }

  /* Petals thrown across the screen when someone says yes. */
  function throwPetals() {
    if (reduceMotion) return;
    var colours = ["#c9a44c", "#e0c684", "#9c4a3c", "#1b4f86", "#f8f4ec"];
    for (var i = 0; i < 40; i++) {
      var petal = document.createElement("span");
      petal.className = "petal";
      var size = 6 + Math.random() * 9;
      petal.style.width = petal.style.height = size.toFixed(1) + "px";
      petal.style.left = (Math.random() * 100).toFixed(1) + "vw";
      petal.style.background = colours[i % colours.length];
      petal.style.setProperty("--drift", (Math.random() * 160 - 80).toFixed(0) + "px");
      petal.style.setProperty("--spin", (Math.random() * 900 - 300).toFixed(0) + "deg");
      petal.style.animationDuration = (3.4 + Math.random() * 2.6).toFixed(1) + "s";
      petal.style.animationDelay = (Math.random() * 1.1).toFixed(2) + "s";
      document.body.appendChild(petal);
      setTimeout(function (node) {
        return function () { node.remove(); };
      }(petal), 8000);
    }
  }

  /* ── reveal on scroll ──────────────────────────────────────────────── */
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0, rootMargin: "0px 0px -8% 0px" });
    $$(".section, .divider").forEach(function (el) {
      el.classList.add("reveal");
      io.observe(el);
    });
    // Safety net: never leave content hidden if the observer misbehaves
    // (printing, zoom, an old browser, a very tall window).
    window.addEventListener("beforeprint", showEverything);
    setTimeout(showEverything, 8000);

    function showEverything() {
      $$(".reveal").forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  applyLang();
})();
