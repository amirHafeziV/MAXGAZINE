/* ============================================================
   MAXGAZINE — app behaviours
   live ticker · live markets table · count-up · motion · nav
   ============================================================ */

/* ---------- live data sources ---------- */
const CG = 'https://api.coingecko.com/api/v3/simple/price';
const FX_API = 'https://api.frankfurter.dev/v1';

const TICKER_CRYPTO = [['BTC','bitcoin'],['ETH','ethereum'],['SOL','solana'],['BNB','binancecoin'],['XRP','ripple'],['TON','the-open-network'],['AVAX','avalanche-2'],['DOGE','dogecoin']];
const MARKET_CRYPTO = [
  ['BTC','bitcoin','Bitcoin'],['ETH','ethereum','Ethereum'],['BNB','binancecoin','BNB'],['SOL','solana','Solana'],
  ['XRP','ripple','XRP'],['TON','the-open-network','Toncoin'],['ADA','cardano','Cardano'],['AVAX','avalanche-2','Avalanche'],
  ['DOGE','dogecoin','Dogecoin'],['DOT','polkadot','Polkadot'],['LINK','chainlink','Chainlink'],['MATIC','matic-network','Polygon']
];
const FX_PAIRS = [
  ['EUR/USD','Euro',r=>1/r.EUR],['GBP/USD','Pound',r=>1/r.GBP],['USD/JPY','Yen',r=>r.JPY],
  ['USD/CHF','Franc',r=>r.CHF],['AUD/USD','Aussie',r=>1/r.AUD],['USD/CAD','Loonie',r=>r.CAD]
];
const FX_SYMBOLS = 'EUR,GBP,JPY,CHF,AUD,CAD';

const fmtPrice = v => v>=1000 ? '$'+v.toLocaleString('en-US',{maximumFractionDigits:0})
  : v>=1 ? '$'+v.toFixed(2) : '$'+v.toFixed(4);
const fmtFx = v => v>=20 ? v.toFixed(2) : v.toFixed(4);
const isoDaysAgo = n => new Date(Date.now()-n*864e5).toISOString().slice(0,10);

async function fetchCrypto(list){
  const ids = list.map(c=>c[1]).join(',');
  const r = await fetch(`${CG}?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
  return r.json();
}
async function fetchForex(){
  const r = await fetch(`${FX_API}/${isoDaysAgo(12)}..?base=USD&symbols=${FX_SYMBOLS}`);
  const data = await r.json();
  const dates = Object.keys(data.rates||{}).sort();
  return { cur:data.rates[dates[dates.length-1]], prev:data.rates[dates[dates.length-2]], date:dates[dates.length-1] };
}

/* ---------- ticker ---------- */
function tickItem(label,valStr,change){
  const up = change>=0;
  return `<span>${label} <span class="${up?'up':'down'}">${valStr} ${up?'▲':'▼'} ${Math.abs(change).toFixed(2)}%</span></span>`;
}
async function loadTicker(){
  const el = document.getElementById('ticker');
  if(!el) return;
  try{
    const [cg, fx] = await Promise.all([fetchCrypto(TICKER_CRYPTO), fetchForex()]);
    const items = [];
    TICKER_CRYPTO.forEach(([sym,id])=>{ const d=cg[id]; if(d&&typeof d.usd==='number') items.push(tickItem(sym,fmtPrice(d.usd),d.usd_24h_change||0)); });
    if(fx.cur) FX_PAIRS.forEach(([label,,fn])=>{ const c=fn(fx.cur),p=fx.prev?fn(fx.prev):c; items.push(tickItem(label,fmtFx(c),p?(c-p)/p*100:0)); });
    if(items.length){ const half=items.join(''); el.innerHTML=half+half; }
  }catch(e){/* keep static fallback */}
}

/* ---------- markets table (prices.html) ---------- */
function changeCell(ch){
  const up = ch>=0;
  return `<td class="num ${up?'up-c':'down-c'}">${up?'▲':'▼'} ${Math.abs(ch).toFixed(2)}%</td>`;
}
async function loadMarkets(){
  const cb = document.getElementById('crypto-rows');
  const fb = document.getElementById('forex-rows');
  if(!cb && !fb) return;
  try{
    if(cb){
      const cg = await fetchCrypto(MARKET_CRYPTO);
      cb.innerHTML = MARKET_CRYPTO.map(([sym,id,name],i)=>{
        const d=cg[id]; if(!d) return '';
        return `<tr><td class="rank">${String(i+1).padStart(2,'0')}</td><td><span class="sym">${sym}</span> <span class="muted">${name}</span></td><td class="num">${fmtPrice(d.usd)}</td>${changeCell(d.usd_24h_change||0)}</tr>`;
      }).join('');
    }
    if(fb){
      const fx = await fetchForex();
      const stamp = document.getElementById('fx-stamp'); if(stamp&&fx.date) stamp.textContent = fx.date;
      fb.innerHTML = FX_PAIRS.map(([label,name,fn],i)=>{
        if(!fx.cur) return '';
        const c=fn(fx.cur),p=fx.prev?fn(fx.prev):c,ch=p?(c-p)/p*100:0;
        return `<tr><td class="rank">${String(i+1).padStart(2,'0')}</td><td><span class="sym">${label}</span> <span class="muted">${name}</span></td><td class="num">${fmtFx(c)}</td>${changeCell(ch)}</tr>`;
      }).join('');
    }
  }catch(e){/* leave skeleton */}
}

/* ---------- count-up + reveal + bars ---------- */
function animateCount(el){
  if(el.dataset.done) return; el.dataset.done='1';
  const target = parseFloat(el.dataset.count);
  if(isNaN(target)){ return; }
  const dec = parseInt(el.dataset.decimals||'0');
  const pre = el.dataset.prefix||'', suf = el.dataset.suffix||'';
  const dur = 1400, t0 = performance.now();
  (function frame(t){
    const p = Math.min(1,(t-t0)/dur), e = 1-Math.pow(1-p,3), v = target*e;
    el.textContent = pre + v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec}) + suf;
    if(p<1) requestAnimationFrame(frame);
  })(t0);
}
function initObservers(){
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const targets = document.querySelectorAll('.reveal,[data-count],.bar i');
  if(reduce || !('IntersectionObserver' in window)){
    targets.forEach(el=>{
      el.classList.add('in');
      if(el.dataset.count!==undefined){ el.textContent=(el.dataset.prefix||'')+parseFloat(el.dataset.count).toLocaleString('en-US',{minimumFractionDigits:parseInt(el.dataset.decimals||'0'),maximumFractionDigits:parseInt(el.dataset.decimals||'0')})+(el.dataset.suffix||''); }
      if(el.dataset.w!==undefined) el.style.width=el.dataset.w;
    });
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(en=>{
      if(!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      if(el.dataset.count!==undefined) animateCount(el);
      if(el.dataset.w!==undefined) el.style.width = el.dataset.w;
      io.unobserve(el);
    });
  },{threshold:.25});
  targets.forEach(el=>io.observe(el));
}

/* ---------- nav: active link + mobile burger ---------- */
function initNav(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(a=>{
    const href = (a.getAttribute('href')||'').split('?')[0];
    if(href===path || (path==='index.html'&&(href==='index.html'||href===''||href==='/'))) a.classList.add('current');
  });
  const burger = document.querySelector('.burger');
  const links = document.querySelector('.nav-links');
  if(burger && links){
    const closeMenu = ()=>{
      links.classList.remove('open');
      burger.textContent='☰'; burger.setAttribute('aria-expanded','false');
      document.body.classList.remove('menu-open');
      // collapse any open accordions
      links.querySelectorAll('.nav-group.open-sub').forEach(g=>{
        g.classList.remove('open-sub');
        const t=g.querySelector('.sub-toggle');
        if(t){ t.textContent='+'; t.setAttribute('aria-expanded','false'); }
      });
    };
    burger.addEventListener('click',()=>{
      const open = links.classList.toggle('open');
      burger.textContent = open?'✕':'☰';
      burger.setAttribute('aria-expanded',String(open));
      document.body.classList.toggle('menu-open',open);
    });
    const close = links.querySelector('.menu-close');
    if(close) close.addEventListener('click',closeMenu);
    // accordion sub-menus (mobile)
    links.querySelectorAll('.sub-toggle').forEach(t=>{
      t.addEventListener('click',e=>{
        e.preventDefault(); e.stopPropagation();
        const group = t.closest('.nav-group');
        const open = group.classList.toggle('open-sub');
        t.textContent = open?'−':'+';
        t.setAttribute('aria-expanded',String(open));
      });
    });
    // close menu only when navigating via an actual link
    links.querySelectorAll('a').forEach(a=>a.addEventListener('click',closeMenu));
  }
  document.querySelectorAll('.lang button').forEach(b=>{
    b.addEventListener('click',e=>{e.preventDefault(); window.setLang(b.dataset.lang);});
  });
  document.querySelectorAll('[data-lang]').forEach(b=>{
    if(b.tagName==='A') b.addEventListener('click',e=>{e.preventDefault(); window.setLang(b.dataset.lang);});
  });
}

/* ---------- sticky wordmark: reveal MAXGAZINE in header on scroll ---------- */
function initStickyMark(){
  const word = document.querySelector('.logo-word');
  if(!word) return;
  const mast = document.querySelector('.masthead');
  const setOn = on => document.body.classList.toggle('scrolled', on);
  if(!mast){ setOn(true); return; }            // pages without a masthead: always show
  if(!('IntersectionObserver' in window)){
    const onScroll = ()=> setOn(window.scrollY > mast.offsetHeight*0.5);
    addEventListener('scroll', onScroll, {passive:true}); onScroll(); return;
  }
  const io = new IntersectionObserver(([e])=> setOn(!e.isIntersecting),
    { rootMargin:'-72px 0px 0px 0px', threshold:0 });
  io.observe(mast);
}

/* ---------- contact form (no backend yet) ---------- */
function initForm(){
  const f = document.getElementById('contact-form');
  if(!f) return;
  f.addEventListener('submit',e=>{
    e.preventDefault();
    const ok = document.getElementById('form-ok');
    if(ok) ok.style.display='block';
    f.reset();
  });
}

document.addEventListener('DOMContentLoaded',()=>{
  if(window.initLang) window.initLang();
  initNav();
  initObservers();
  initStickyMark();
  initForm();
  loadTicker();
  loadMarkets();
  setInterval(loadTicker,60000);
  setInterval(loadMarkets,60000);
});
