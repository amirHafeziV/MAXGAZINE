/* MAXGAZINE — Brutal × Post-Modern port: condense-on-scroll sticky header.
   Builds a compact sticky bar from the existing masthead/nav and reuses the
   live controls (search / language / subscribe). Loaded after app.js so all
   live behaviour (i18n, ticker, hydration, modal, theme) stays intact. */
(function () {
  "use strict";
  function ready(fn){ if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",fn); else fn(); }
  ready(function () {
    var nav = document.querySelector(".bs-nav");
    if (!nav || document.querySelector(".bs-cbar")) return;

    var cbar = document.createElement("div");
    cbar.className = "bs-cbar";

    var logo = document.createElement("a");
    logo.className = "bs-cbar-logo";
    logo.href = "index.html";
    logo.innerHTML = 'Maxgazine<span class="dot">.</span>';

    var cnav = document.createElement("nav");
    cnav.className = "bs-cbar-nav";
    Array.prototype.forEach.call(nav.querySelectorAll("a"), function (a) {
      var x = document.createElement("a");
      x.href = a.getAttribute("href");
      // keep i18n: mirror data-i so app.js translates the compact nav too
      if (a.getAttribute("data-i")) x.setAttribute("data-i", a.getAttribute("data-i"));
      x.textContent = a.textContent.trim();
      cnav.appendChild(x);
    });

    var tools = document.createElement("div");
    tools.className = "bs-cbar-tools";
    function tool(label, handler, cls) {
      var b = document.createElement("button");
      b.type = "button";
      if (cls) b.className = cls;
      b.innerHTML = label;
      b.addEventListener("click", handler);
      tools.appendChild(b);
    }
    var SEARCH = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>';
    var GLOBE = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.4 3.8 5.6 3.8 9s-1.3 6.6-3.8 9c-2.5-2.4-3.8-5.6-3.8-9S9.5 5.4 12 3z"/></svg>';
    var click = function (sel) { return function () { var el = document.querySelector(sel); if (el) el.click(); }; };
    tool(SEARCH, click("#bs-search-btn"));
    tool(GLOBE, click(".bs-lang-toggle"));
    tool("Subscribe", click("#bs-subscribe-btn"), "csub");

    cbar.appendChild(logo); cbar.appendChild(cnav); cbar.appendChild(tools);
    document.body.appendChild(cbar);

    var header = document.querySelector(".bsheet");
    function trigger() { return header ? header.offsetTop + header.offsetHeight - 4 : 240; }
    var t = trigger();
    function upd() { document.body.classList.toggle("scrolled", window.scrollY > t); }
    window.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", function () { t = trigger(); upd(); }, { passive: true });
    upd();
  });
})();
