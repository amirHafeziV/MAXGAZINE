/* ===================================================================
   MAXGAZINE — Brutal × Post-Modern — production chrome
   ticker · sticky condensed header · mobile drawer · language menu
   · search overlay · subscribe modal · candlestick chart
   Lang switching: via data-lang buttons → app.js handles localStorage.
   =================================================================== */
(function () {
  "use strict";
  var L = (localStorage.getItem("mg_lang") || document.documentElement.getAttribute("lang") || "en").toLowerCase();
  if (["en", "fa", "ar", "tr"].indexOf(L) < 0) L = "en";

  /* ---- i18n for injected chrome only ---- */
  var T = {
    en: { live: "LIVE", sHint: "Popular searches", sPh: "Search markets, coins, stories…",
          langTitle: "Choose language", subK: "The MAXGAZINE Brief", subT: "Markets, in your inbox.",
          subB: "One sharp email each morning — the moves that matter across crypto, forex, tech and cars.",
          subPh: "your@email.com", subBtn: "Subscribe", subNote: "No spam. Unsubscribe anytime.",
          subOk: "You're in. Watch your inbox.", close: "Close", menu: "Menu",
          tags: ["Bitcoin", "Ethereum", "ETF", "Crypto", "Forex", "AI", "Cars"] },
    fa: { live: "زنده", sHint: "جست‌وجوهای پرطرفدار", sPh: "جست‌وجوی بازار، کوین، خبر…",
          langTitle: "انتخاب زبان", subK: "خلاصهٔ مکس‌گزین", subT: "بازار، در ایمیل شما.",
          subB: "هر صبح یک ایمیل کوتاه و دقیق — مهم‌ترین تحولات کریپتو، فارکس، فناوری و خودرو.",
          subPh: "ایمیل شما", subBtn: "عضویت", subNote: "بدون اسپم. هر زمان لغو کنید.",
          subOk: "ثبت شد. منتظر ایمیل باشید.", close: "بستن", menu: "منو",
          tags: ["بیت‌کوین", "اتریوم", "ETF", "کریپتو", "فارکس", "هوش مصنوعی", "خودرو"] },
    ar: { live: "مباشر", sHint: "عمليات بحث رائجة", sPh: "ابحث في الأسواق والعملات والأخبار…",
          langTitle: "اختر اللغة", subK: "موجز ماكسغازين", subT: "السوق في بريدك.",
          subB: "بريد واحد دقيق كل صباح — أهم تحركات الكريبتو والفوركس والتقنية والسيارات.",
          subPh: "بريدك الإلكتروني", subBtn: "اشترك", subNote: "بلا إزعاج. ألغِ في أي وقت.",
          subOk: "تم تسجيلك. تابع بريدك.", close: "إغلاق", menu: "القائمة",
          tags: ["بيتكوين", "إيثريوم", "ETF", "كريبتو", "فوركس", "ذكاء اصطناعي", "سيارات"] },
    tr: { live: "Canlı", sHint: "Popüler aramalar", sPh: "Piyasa, coin, haber ara…",
          langTitle: "Dil seçin", subK: "MAXGAZINE Bülteni", subT: "Piyasa, gelen kutunda.",
          subB: "Her sabah tek ve net bir e-posta — kripto, forex, teknoloji ve otomobilde önemli hareketler.",
          subPh: "e-postan", subBtn: "Abone ol", subNote: "Spam yok. İstediğin an çık.",
          subOk: "Kaydoldun. Gelen kutunu izle.", close: "Kapat", menu: "Menü",
          tags: ["Bitcoin", "Ethereum", "ETF", "Kripto", "Forex", "Yapay Zeka", "Otomobil"] }
  }[L];

  var LANGS = [
    { c: "en", n: "English" }, { c: "fa", n: "فارسی" },
    { c: "ar", n: "العربية" }, { c: "tr", n: "Türkçe" }
  ];

  var IC = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/></svg>',
    globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18"/></svg>',
    burger: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>'
  };

  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }

  /* =============== TICKER (reads [data-ticker-src] items or uses live prices from page) =============== */
  function fillTicker() {
    var host = document.querySelector("[data-ticker]");
    if (!host) return;
    /* If app.js already filled the ticker (id="ticker"), skip */
    if (host.children.length > 0) return;
    /* Fallback static data so the ticker is never empty */
    var TICK = [
      ["BTC/USD", "—", "—", 1], ["ETH/USD", "—", "—", 1],
      ["SOL/USD", "—", "—", 1], ["XRP/USD", "—", "—", 1],
      ["BNB/USD", "—", "—", 1], ["EUR/USD", "—", "—", 1]
    ];
    function items() {
      var frag = document.createDocumentFragment();
      TICK.forEach(function (r) {
        var it = el("span", "ticker-item");
        it.innerHTML = '<span class="ticker-sym">' + r[0] + '</span><span class="ticker-val">' + r[1] +
          '</span><span class="ticker-chg ' + (r[3] ? "up" : "dn") + '">' + r[2] + "</span>";
        frag.appendChild(it);
      });
      return frag;
    }
    host.appendChild(items()); host.appendChild(items());
  }

  /* =============== OVERLAYS =============== */
  function lock(on) { document.documentElement.style.overflow = on ? "hidden" : ""; }
  function closeAll() {
    document.body.classList.remove("menu-open", "search-open", "sub-open", "lang-open");
    lock(false);
  }
  function open(kind) {
    closeAll();
    document.body.classList.add(kind + "-open");
    if (kind === "search") { var i = document.querySelector(".search-bar input"); if (i) setTimeout(function () { i.focus(); }, 120); }
    if (kind !== "scrolled") lock(true);
  }

  function buildChrome() {
    var nav = document.querySelector(".mainnav .wrap");
    var navLinks = nav ? Array.prototype.slice.call(nav.querySelectorAll("a")) : [];

    /* scrim */
    var scrim = el("div", "scrim"); scrim.addEventListener("click", closeAll); document.body.appendChild(scrim);

    /* condensed sticky bar */
    var cbar = el("div", "cbar");
    cbar.setAttribute("dir", "ltr");
    var clogo = el("a", "cbar-logo", 'Maxgazine<span class="dot"></span>');
    clogo.href = "index.html";
    var cnav = el("nav", "cbar-nav");
    navLinks.forEach(function (a) {
      if (a.classList.contains("sub")) return;
      var x = el("a", a.classList.contains("on") ? "on" : "", a.textContent.trim());
      x.href = a.getAttribute("href"); cnav.appendChild(x);
    });
    var ctools = el("div", "cbar-tools");
    var cs = el("button", "", IC.search); cs.setAttribute("aria-label", "Search"); cs.addEventListener("click", function () { open("search"); });
    var cg = el("button", "", IC.globe); cg.setAttribute("aria-label", T.langTitle); cg.addEventListener("click", function () { open("lang"); });
    var csub = el("button", "csub", T.subBtn); csub.addEventListener("click", function () { open("sub"); });
    ctools.appendChild(cs); ctools.appendChild(cg); ctools.appendChild(csub);
    cbar.appendChild(clogo); cbar.appendChild(cnav); cbar.appendChild(ctools);
    document.body.appendChild(cbar);

    /* mobile drawer */
    var drawer = el("aside", "drawer");
    var dhead = el("div", "drawer-head");
    var dlogo = el("a", "logo on-dark", 'Maxgazine<span class="dot"></span>'); dlogo.href = "index.html";
    var dclose = el("button", "drawer-close", "✕"); dclose.setAttribute("aria-label", T.close); dclose.addEventListener("click", closeAll);
    dhead.appendChild(dlogo); dhead.appendChild(dclose);
    var dnav = el("nav", "drawer-nav");
    navLinks.forEach(function (a) {
      if (a.classList.contains("sub")) return;
      var x = el("a", a.classList.contains("on") ? "on" : "", a.textContent.trim());
      x.href = a.getAttribute("href"); dnav.appendChild(x);
    });
    var dlangs = el("div", "drawer-langs");
    LANGS.forEach(function (lg) {
      var x = el("button", "lang-btn" + (lg.c === L ? " on" : ""), lg.n);
      x.setAttribute("data-lang", lg.c);
      x.addEventListener("click", function () {
        localStorage.setItem("mg_lang", lg.c);
        location.reload();
      });
      dlangs.appendChild(x);
    });
    drawer.appendChild(dhead); drawer.appendChild(dnav); drawer.appendChild(dlangs);
    document.body.appendChild(drawer);

    /* search overlay */
    var so = el("div", "search-overlay");
    var sbar = el("div", "search-bar");
    var sinput = el("input"); sinput.type = "search"; sinput.placeholder = T.sPh;
    var sclose = el("button", "search-close", "✕"); sclose.setAttribute("aria-label", T.close); sclose.addEventListener("click", closeAll);
    sbar.appendChild(el("span", "", IC.search.replace(/18/g, "30")));
    sbar.children[0].style.cssText = "width:30px;flex-shrink:0";
    sbar.appendChild(sinput); sbar.appendChild(sclose);
    var sbody = el("div", "search-body");
    sbody.appendChild(el("div", "search-hint", T.sHint));
    var stags = el("div", "search-tags");
    T.tags.forEach(function (t) { var a = el("a", "", t); a.href = "stories.html"; stags.appendChild(a); });
    sbody.appendChild(stags);
    so.appendChild(sbar); so.appendChild(sbody);
    document.body.appendChild(so);

    /* subscribe modal */
    var sm = el("div", "submodal");
    var card = el("div", "submodal-card");
    var smclose = el("button", "submodal-close", "✕"); smclose.setAttribute("aria-label", T.close); smclose.addEventListener("click", closeAll);
    var top = el("div", "submodal-top",
      '<div class="submodal-kicker">⬤ ' + T.subK + '</div><div class="submodal-title">' + T.subT + '</div>');
    var body = el("div", "submodal-body");
    body.appendChild(el("p", "", T.subB));
    var form = el("form", "submodal-form");
    var inp = el("input"); inp.type = "email"; inp.placeholder = T.subPh; inp.required = true;
    var btn = el("button", "", T.subBtn); btn.type = "submit";
    form.appendChild(inp); form.appendChild(btn);
    var note = el("div", "submodal-note", T.subNote);
    form.addEventListener("submit", function (e) { e.preventDefault(); note.textContent = T.subOk; form.style.opacity = ".5"; });
    body.appendChild(form); body.appendChild(note);
    card.appendChild(smclose); card.appendChild(top); card.appendChild(body);
    sm.appendChild(card);
    sm.addEventListener("click", function (e) { if (e.target === sm) closeAll(); });
    document.body.appendChild(sm);

    /* language menu — buttons trigger localStorage lang switch + reload */
    var lm = el("div", "langmenu");
    var lcard = el("div", "langmenu-card");
    lcard.appendChild(el("h4", "", T.langTitle));
    LANGS.forEach(function (lg) {
      var btn = el("button", lg.c === L ? "on" : "", lg.n + '<span class="code">' + lg.c.toUpperCase() + "</span>");
      btn.setAttribute("data-lang", lg.c);
      btn.style.cssText = "display:flex;align-items:center;justify-content:space-between;width:100%;padding:14px 20px;border:none;border-bottom:1px solid var(--hair);font-family:var(--body);font-weight:700;color:var(--k);cursor:pointer;background:var(--w);text-align:start";
      btn.addEventListener("click", function () {
        localStorage.setItem("mg_lang", lg.c);
        location.reload();
      });
      lcard.appendChild(btn);
    });
    lm.appendChild(lcard);
    lm.addEventListener("click", function (e) { if (e.target === lm) closeAll(); });
    document.body.appendChild(lm);

    /* wire header tool buttons (in nameplate) */
    document.querySelectorAll("[data-open]").forEach(function (b) {
      b.addEventListener("click", function (e) { e.preventDefault(); open(b.getAttribute("data-open")); });
    });

    /* footer subscribe form → inline confirmation */
    document.querySelectorAll(".foot-sub-form").forEach(function (f) {
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        f.innerHTML = '<span style="color:#fff;font-family:var(--mono);font-size:12px;padding:11px 13px;line-height:1.4">' + T.subOk + "</span>";
      });
    });

    /* esc closes */
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeAll(); });
  }

  /* =============== SCROLL — condensed header =============== */
  function scrollWatch() {
    var trigger = 200;
    var np = document.querySelector(".nameplate");
    if (np) trigger = np.offsetTop + np.offsetHeight - 4;
    function upd() { document.body.classList.toggle("scrolled", window.scrollY > trigger); }
    window.addEventListener("scroll", upd, { passive: true });
    window.addEventListener("resize", function () {
      if (np) trigger = np.offsetTop + np.offsetHeight - 4;
      upd();
    }, { passive: true });
    upd();
  }

  /* =============== CANDLESTICK =============== */
  function drawCandles() {
    var svg = document.querySelector("[data-candles]");
    if (!svg) return;
    var NS = "http://www.w3.org/2000/svg";
    var MONO = "IBM Plex Mono, monospace";
    var W = 1200, H = 380, plotL = 14, plotR = W - 88, plotT = 18, plotB = 250, volT = 276, volB = 332, N = 34;
    function mk(tag, attrs, text) {
      var e = document.createElementNS(NS, tag);
      for (var k in attrs) e.setAttribute(k, attrs[k]);
      if (text != null) e.textContent = text;
      svg.appendChild(e); return e;
    }
    function fmt(n) { return Math.round(n).toLocaleString("en-US"); }
    var candles = [], vols = [], prev = 91000;
    for (var i = 0; i < N; i++) {
      var t = i / (N - 1);
      var close = 89000 + t * 16800 + Math.sin(i * 0.7) * 1700 + Math.cos(i * 0.33) * 1050;
      var open = prev;
      var hi = Math.max(open, close) + (300 + Math.abs(Math.sin(i * 1.7)) * 900);
      var lo = Math.min(open, close) - (300 + Math.abs(Math.cos(i * 1.3)) * 900);
      candles.push({ o: open, c: close, h: hi, l: lo });
      vols.push(0.35 + Math.abs(Math.sin(i * 0.9)) * 0.65);
      prev = close;
    }
    candles[N - 1].c = 107842; candles[N - 1].h = Math.max(candles[N - 1].h, 108700);
    var pMin = Infinity, pMax = -Infinity;
    candles.forEach(function (c) { pMin = Math.min(pMin, c.l); pMax = Math.max(pMax, c.h); });
    var padP = (pMax - pMin) * 0.08; pMin -= padP; pMax += padP;
    function yOf(p) { return plotT + (1 - (p - pMin) / (pMax - pMin)) * (plotB - plotT); }
    for (var g = 0; g < 5; g++) {
      var p = pMax - (g / 4) * (pMax - pMin), y = yOf(p);
      mk("line", { x1: plotL, x2: plotR, y1: y, y2: y, stroke: "#EAEAEA", "stroke-width": 1 });
      mk("text", { x: plotR + 8, y: y + 4, "font-family": MONO, "font-size": 12, fill: "#8a8a8a" }, "$" + fmt(p));
    }
    var step = (plotR - plotL) / N, bw = step * 0.6, maxV = Math.max.apply(null, vols);
    candles.forEach(function (c, i) {
      var cx = plotL + (i + 0.5) * step, up = c.c >= c.o, col = up ? "#007A00" : "#CC0000";
      var vh = (vols[i] / maxV) * (volB - volT);
      mk("rect", { x: cx - bw / 2, y: volB - vh, width: bw, height: vh, fill: col, opacity: 0.22 });
      mk("line", { x1: cx, x2: cx, y1: yOf(c.h), y2: yOf(c.l), stroke: col, "stroke-width": 1.5 });
      var bt = yOf(Math.max(c.o, c.c)), bb = yOf(Math.min(c.o, c.c));
      mk("rect", { x: cx - bw / 2, y: bt, width: bw, height: Math.max(2, bb - bt), fill: col });
    });
    var ly = yOf(107842);
    mk("line", { x1: plotL, x2: plotR, y1: ly, y2: ly, stroke: "#CC0000", "stroke-width": 1.4, "stroke-dasharray": "5 4" });
    mk("rect", { x: plotR, y: ly - 12, width: 86, height: 24, fill: "#CC0000" });
    mk("text", { x: plotR + 43, y: ly + 5, "text-anchor": "middle", "font-family": MONO, "font-size": 12, "font-weight": 600, fill: "#fff" }, "107,842");
    mk("text", { x: plotL + 2, y: volT - 6, "font-family": MONO, "font-size": 10, fill: "#aaa", "letter-spacing": "1.5" }, "VOLUME");
    ["1 Jun", "8 Jun", "15 Jun", "22 Jun", "28 Jun"].forEach(function (d, k, a) {
      var x = plotL + (k / (a.length - 1)) * (plotR - plotL);
      mk("text", { x: x, y: H - 12, "text-anchor": k === 0 ? "start" : (k === a.length - 1 ? "end" : "middle"), "font-family": MONO, "font-size": 11, fill: "#999" }, d);
    });
  }

  /* =============== INIT =============== */
  function init() {
    fillTicker();
    buildChrome();
    scrollWatch();
    drawCandles();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
