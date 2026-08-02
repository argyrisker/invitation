/* Invitation page — language switching, countdown and RSVP submission. */
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
    } catch (e) { /* private mode — ignore */ }
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
        "?subject=" + encodeURIComponent("Argyrios & Tomislav — 10.04.2027");
    }

    renderThanks();
    tickCountdown();
  }

  $$(".lang").forEach(function (btn) {
    btn.addEventListener("click", function () {
      lang = btn.getAttribute("data-lang");
      store(STORE_LANG, lang);
      applyLang();
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
      if (el) el.textContent = name === "days" ? String(value) : ("0" + value).slice(-2);
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

  /* Checked-state class — fallback for browsers without :has() */
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

  function markInvalid(input, invalid) {
    var f = fieldOf(input);
    if (f) f.classList.toggle("is-invalid", !!invalid);
    input.setAttribute("aria-invalid", invalid ? "true" : "false");
  }

  function validate(data) {
    var ok = true;
    ["firstName", "lastName"].forEach(function (name) {
      var input = form.elements[name];
      var bad = !input.value.trim();
      markInvalid(input, bad);
      if (bad) ok = false;
    });

    var attending = form.querySelector('input[name="attending"]:checked');
    var choiceField = form.querySelector('input[name="attending"]').closest(".field");
    choiceField.classList.toggle("is-invalid", !attending);
    if (!attending) ok = false;

    var email = form.elements.email;
    var badMail = email.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.value.trim());
    markInvalid(email, badMail);
    if (badMail) ok = false;

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
      "?subject=" + encodeURIComponent("RSVP — " + data.firstName + " " + data.lastName) +
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
      .then(function (res) { if (!res.ok) throw new Error("HTTP " + res.status); })
      .catch(function () {
        // Some deployments block CORS reads — fire and forget instead.
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
