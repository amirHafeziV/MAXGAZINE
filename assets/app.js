/* ============================================================
   MAXGAZINE — app behaviours
   live ticker · live markets table · count-up · motion · nav
   ============================================================ */

/* ---------- live data sources ---------- */
const CG_API = 'https://api.coingecko.com/api/v3';
const FX_API = 'https://api.frankfurter.dev/v1';

const TICKER_CRYPTO = [['BTC','bitcoin'],['ETH','ethereum'],['SOL','solana'],['BNB','binancecoin'],['XRP','ripple'],['TON','the-open-network'],['AVAX','avalanche-2'],['DOGE','dogecoin']];
/* ECB / Frankfurter-supported currencies (USD base). Full names used as the
   language-neutral sub-label on each forex row. */
const FX_NAMES = {
  USD:'US Dollar', EUR:'Euro', GBP:'British Pound', JPY:'Japanese Yen', AUD:'Australian Dollar',
  NZD:'New Zealand Dollar', CAD:'Canadian Dollar', CHF:'Swiss Franc', CNY:'Chinese Yuan',
  HKD:'Hong Kong Dollar', SGD:'Singapore Dollar', SEK:'Swedish Krona', NOK:'Norwegian Krone',
  DKK:'Danish Krone', PLN:'Polish Zloty', CZK:'Czech Koruna', HUF:'Hungarian Forint',
  TRY:'Turkish Lira', ZAR:'South African Rand', MXN:'Mexican Peso', BRL:'Brazilian Real',
  INR:'Indian Rupee', KRW:'South Korean Won', IDR:'Indonesian Rupiah', MYR:'Malaysian Ringgit',
  PHP:'Philippine Peso', THB:'Thai Baht', ILS:'Israeli Shekel', RON:'Romanian Leu',
  BGN:'Bulgarian Lev', ISK:'Icelandic Krona'
};
const FX_CURRENCIES = Object.keys(FX_NAMES);
const FX_SYMBOLS = FX_CURRENCIES.filter(c => c !== 'USD').join(',');
// Build ~100 conventional pairs: major crosses first, then USD/EUR/GBP vs the rest.
const FX_PAIRS = (function buildFxPairs(){
  const majors = ['EUR','GBP','USD','JPY','AUD','NZD','CAD','CHF'];
  const rest = FX_CURRENCIES.filter(c => !majors.includes(c));
  const seen = new Set(), pairs = [];
  const add = (b, q) => {
    if(b === q) return;
    const k = b + q, rk = q + b;
    if(seen.has(k) || seen.has(rk)) return;
    seen.add(k); pairs.push([b, q]);
  };
  for(let i = 0; i < majors.length; i++) for(let j = i + 1; j < majors.length; j++) add(majors[i], majors[j]);
  rest.forEach(c => add('USD', c));
  rest.forEach(c => add('EUR', c));
  rest.forEach(c => add('GBP', c));
  return pairs;
})();
// rate of BASE/QUOTE given USD-based rates (units of CUR per 1 USD; USD itself = 1)
const fxRate = (base, quote, r) => (r[quote] || (quote === 'USD' ? 1 : NaN)) / (r[base] || (base === 'USD' ? 1 : NaN));

const fmtPrice = v => v>=1000 ? '$'+v.toLocaleString('en-US',{maximumFractionDigits:0})
  : v>=1 ? '$'+v.toFixed(2)
  : v>=0.01 ? '$'+v.toFixed(4) : '$'+v.toFixed(6);
const fmtFx = v => v>=20 ? v.toFixed(2) : v.toFixed(4);
const truncate = (s, n) => s.length > n ? s.slice(0, n).trimEnd() + '…' : s;
const fmtCap = v => {
  if(!v) return '—';
  if(v>=1e12) return '$'+(v/1e12).toFixed(2)+'T';
  if(v>=1e9) return '$'+(v/1e9).toFixed(2)+'B';
  if(v>=1e6) return '$'+(v/1e6).toFixed(2)+'M';
  return '$'+(v/1e3).toFixed(2)+'K';
};
const isoDaysAgo = n => new Date(Date.now()-n*864e5).toISOString().slice(0,10);

async function fetchCrypto(list){
  const ids = list.map(c=>c[1]).join(',');
  const r = await fetch(`${CG_API}/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`);
  if(!r.ok) throw new Error('HTTP '+r.status);
  return r.json();
}
// keep ~N evenly-spaced points from a long series (shrinks the 7d sparkline)
function downsample(arr, n){
  if(!Array.isArray(arr) || arr.length <= n) return arr || [];
  const step = (arr.length-1)/(n-1), out = [];
  for(let i=0;i<n;i++) out.push(arr[Math.round(i*step)]);
  return out;
}
let _top100Stamp = 0;   // ms timestamp of the data currently in _coins
// CoinGecko's free tier rate-limits aggressively (HTTP 429). Cache the last good
// response in localStorage and serve it (even if stale) when a live call fails,
// so the table shows data immediately and never blanks on a throttled refresh.
async function fetchTop100(){
  const KEY = 'mg_top100', TTL = 60000, now = Date.now();
  let cache = null;
  try{ cache = JSON.parse(localStorage.getItem(KEY) || 'null'); }catch(e){}
  if(cache && (now - cache.t) < TTL){ _top100Stamp = cache.t; return cache.d; }
  try{
    const url = `${CG_API}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1`
      + `&sparkline=true&price_change_percentage=24h,7d`;
    const r = await fetch(url);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const raw = await r.json();
    const slim = (raw||[]).map(c=>({
      id:c.id, symbol:c.symbol, name:c.name, image:c.image,
      current_price:c.current_price,
      price_change_percentage_24h:c.price_change_percentage_24h,
      price_change_percentage_7d:c.price_change_percentage_7d_in_currency,
      market_cap:c.market_cap, total_volume:c.total_volume,
      high_24h:c.high_24h, low_24h:c.low_24h, ath:c.ath,
      circulating_supply:c.circulating_supply,
      spark: downsample((c.sparkline_in_7d && c.sparkline_in_7d.price) || [], 28)
    }));
    try{ localStorage.setItem(KEY, JSON.stringify({t:now, d:slim})); }catch(e){}
    _top100Stamp = now;
    return slim;
  }catch(e){
    if(cache){ _top100Stamp = cache.t; return cache.d; }   // stale-but-usable
    throw e;
  }
}
async function fetchForex(){
  const r = await fetch(`${FX_API}/${isoDaysAgo(38)}..?base=USD&symbols=${FX_SYMBOLS}`);
  const data = await r.json();
  const rates = data.rates || {};
  const dates = Object.keys(rates).sort();
  const n = dates.length;
  return {
    cur:   rates[dates[n-1]],
    prev:  rates[dates[n-2]],
    week:  rates[dates[Math.max(0, n-6)]],    // ~5 business days back ≈ one week
    month: rates[dates[Math.max(0, n-22)]],   // ~22 business days back ≈ one month
    date:  dates[n-1],
    dates, rates
  };
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
    if(fx.cur) FX_PAIRS.slice(0,6).forEach(([base,quote])=>{ const c=fxRate(base,quote,fx.cur),p=fx.prev?fxRate(base,quote,fx.prev):c; if(isFinite(c)) items.push(tickItem(`${base}/${quote}`,fmtFx(c),p?(c-p)/p*100:0)); });
    if(items.length){ const half=items.join(''); el.innerHTML=half+half; }
  }catch(e){/* keep static fallback */}
}

/* ============================================================
   markets (prices.html) — segmented crypto/forex, inline desktop
   stats, language-aware detail, client-side search filter
   ============================================================ */
const PRICES_I = {
  en:{ price:'Price', chg24:'24h', chg7:'7d', mcap:'Market Cap', vol:'Volume', high24:'24h High', low24:'24h Low',
    ath:'All-Time High', supply:'Circ. Supply', trade:'Trade now →', pair:'Pair', rate:'Rate', day:'Day', trend:'Trend',
    noresults:'No matches found.', search_ph:'Search by name or symbol…', updated:'Updated' },
  fa:{ price:'قیمت', chg24:'۲۴ ساعت', chg7:'۷ روز', mcap:'ارزش بازار', vol:'حجم', high24:'سقف ۲۴ ساعته', low24:'کف ۲۴ ساعته',
    ath:'بالاترین تاریخی', supply:'عرضه در گردش', trade:'معامله کنید ←', pair:'جفت‌ارز', rate:'نرخ', day:'روزانه', trend:'روند',
    noresults:'موردی یافت نشد.', search_ph:'جستجو با نام یا نماد…', updated:'به‌روزرسانی' },
  ar:{ price:'السعر', chg24:'٢٤س', chg7:'٧ أيام', mcap:'القيمة السوقية', vol:'الحجم', high24:'أعلى ٢٤س', low24:'أدنى ٢٤س',
    ath:'أعلى سعر تاريخي', supply:'المعروض المتداول', trade:'تداول الآن ←', pair:'الزوج', rate:'السعر', day:'يومي', trend:'الاتجاه',
    noresults:'لا توجد نتائج.', search_ph:'ابحث بالاسم أو الرمز…', updated:'آخر تحديث' },
  tr:{ price:'Fiyat', chg24:'24s', chg7:'7g', mcap:'Piyasa Değeri', vol:'Hacim', high24:'24s Yüksek', low24:'24s Düşük',
    ath:'Tüm Zamanlar Zirvesi', supply:'Dolaşımdaki Arz', trade:'Şimdi işlem yap →', pair:'Parite', rate:'Oran', day:'Gün', trend:'Trend',
    noresults:'Sonuç bulunamadı.', search_ph:'İsim veya sembolle ara…', updated:'Güncellendi' }
};
const fmtSupply = v => {
  if(!v) return '—';
  if(v>=1e9) return (v/1e9).toFixed(2)+'B';
  if(v>=1e6) return (v/1e6).toFixed(2)+'M';
  if(v>=1e3) return (v/1e3).toFixed(2)+'K';
  return String(Math.round(v));
};
const _chgClass = ch => ch>=0 ? 'up' : 'down';
const _chgStr = ch => `${ch>=0?'▲':'▼'} ${Math.abs(ch).toFixed(2)}%`;

let _coins = [];      // last fetched top-100 crypto
let _fxData = null;   // last fetched forex snapshot
let _coinPages = {};  // coingeckoId -> slug, for Trade-Now deep links into /<lang>/<slug>.html SEO pages
async function loadCoinPages(){
  try{
    const r = await fetch(adPrefix() + 'content/data/coin-pages.json', {cache:'no-cache'});
    if(r.ok) _coinPages = await r.json();
  }catch(e){/* fall back to exchanges.html for all rows */}
}

function mCryptoRow(coin, i, lang, prefix){
  const d = PRICES_I[lang] || PRICES_I.en;
  const chg = coin.price_change_percentage_24h || 0;
  const chg7 = coin.price_change_percentage_7d;
  const sym = (coin.symbol||'').toUpperCase();
  const search = `${(coin.name||'')} ${sym}`.toLowerCase();
  const sp = coin.spark || [];
  const up7 = (chg7 != null) ? chg7 >= 0 : (sp.length>1 ? sp[sp.length-1] >= sp[0] : true);
  return `<div class="m-row" data-search="${esc(search)}">
    <button class="m-main" type="button" aria-expanded="false">
      <span class="m-rank mono">${String(i+1).padStart(2,'0')}</span>
      <span class="m-coin">
        <img class="m-ico" src="${esc(coin.image||'')}" alt="" loading="lazy">
        <span class="m-id"><span class="m-name">${esc(truncate(coin.name||'',22))}</span><span class="m-sym mono">${esc(sym)}</span></span>
      </span>
      <span class="m-price mono">${fmtPrice(coin.current_price||0)}</span>
      <span class="m-chg ${_chgClass(chg)} mono">${_chgStr(chg)}</span>
      <span class="m-cell mono"><span class="m-lbl">${esc(d.mcap)}</span>${fmtCap(coin.market_cap)}</span>
      <span class="m-cell mono"><span class="m-lbl">${esc(d.vol)}</span>${fmtCap(coin.total_volume)}</span>
      <span class="m-spark-wrap c-spark">${sparkline(sp, up7)}</span>
      <span class="m-chev" aria-hidden="true">▾</span>
    </button>
    <div class="m-detail"><div class="m-detail-in">
      <div class="m-stats">
        <div class="m-only"><b>${esc(d.mcap)}</b><span>${fmtCap(coin.market_cap)}</span></div>
        <div class="m-only"><b>${esc(d.vol)}</b><span>${fmtCap(coin.total_volume)}</span></div>
        <div><b>${esc(d.chg7)}</b><span class="${chg7!=null?_chgClass(chg7):''}">${chg7!=null?_chgStr(chg7):'—'}</span></div>
        <div><b>${esc(d.high24)}</b><span>${fmtPrice(coin.high_24h||0)}</span></div>
        <div><b>${esc(d.low24)}</b><span>${fmtPrice(coin.low_24h||0)}</span></div>
        <div><b>${esc(d.ath)}</b><span>${fmtPrice(coin.ath||0)}</span></div>
        <div><b>${esc(d.supply)}</b><span>${fmtSupply(coin.circulating_supply)} ${esc(sym)}</span></div>
      </div>
      <a class="btn" href="${_coinPages[coin.id] ? prefix+lang+'/'+_coinPages[coin.id]+'.html' : prefix+'exchanges.html'}">${esc(d.trade)}</a>
    </div></div>
  </div>`;
}

// Inline trend line stretched across the row's free space (fills the gap).
function sparkline(vals, up){
  const v = (vals||[]).filter(n=>isFinite(n));
  if(v.length < 2) return '';
  const w=120, h=30, pad=3;
  const min=Math.min(...v), max=Math.max(...v), range=(max-min)||1;
  const step=(w-pad*2)/(v.length-1);
  const pts=v.map((n,i)=>`${(pad+i*step).toFixed(1)},${(pad+(h-pad*2)*(1-(n-min)/range)).toFixed(1)}`).join(' ');
  return `<svg class="m-spark ${up?'spark-up':'spark-down'}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" vector-effect="non-scaling-stroke" fill="none"/></svg>`;
}

// Candlestick chart used on coin SEO pages (.coin-chart[data-coin-chart]).
// ohlc: array of [time, open, high, low, close] from CoinGecko's /ohlc endpoint.
// Renders a gridded plot with a price axis, a dashed last-price line and a
// date range footer so the chart reads as a real trading view, not a few
// bare candles floating on white.
function candlestickChart(ohlc){
  const v = (ohlc||[]).filter(c=>c && c.length>=5 && [1,2,3,4].every(i=>isFinite(c[i])));
  if(v.length < 2) return '';
  const w=600, h=220, pad=4;
  const min=Math.min(...v.map(c=>c[3])), max=Math.max(...v.map(c=>c[2])), range=(max-min)||1;
  const slot=(w-pad*2)/v.length;
  const bw=Math.max(1.5, slot*0.62);
  const y=p=>pad+(h-pad*2)*(1-(p-min)/range);

  const GRID_STEPS = 4;
  const grid = Array.from({length:GRID_STEPS+1},(_,i)=>{
    const yy=(pad+(h-pad*2)*(i/GRID_STEPS)).toFixed(2);
    return `<line x1="0" y1="${yy}" x2="${w}" y2="${yy}" class="coin-chart-gridline"/>`;
  }).join('');

  const body = v.map((c,i)=>{
    const [,o,hi,lo,cl]=c;
    const cx=pad+i*slot+slot/2, up=cl>=o;
    const yO=y(o), yC=y(cl);
    const top=Math.min(yO,yC), bh=Math.max(Math.abs(yC-yO),1.5);
    return `<g class="coin-candle ${up?'up':'down'}" style="--i:${i}">
      <line x1="${cx.toFixed(2)}" y1="${y(hi).toFixed(2)}" x2="${cx.toFixed(2)}" y2="${y(lo).toFixed(2)}" class="coin-candle-wick"/>
      <rect x="${(cx-bw/2).toFixed(2)}" y="${top.toFixed(2)}" width="${bw.toFixed(2)}" height="${bh.toFixed(2)}" class="coin-candle-body"/>
    </g>`;
  }).join('');

  const last = v[v.length-1][4];
  const lastUp = last >= v[0][1];
  const lastY = y(last).toFixed(2);
  const lastLine = `<line x1="0" y1="${lastY}" x2="${w}" y2="${lastY}" class="coin-chart-lastline"/>`;

  const svg = `<svg class="coin-chart-svg coin-candles ${lastUp?'spark-up':'spark-down'}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <g class="coin-chart-grid">${grid}</g>
    ${body}
    ${lastLine}
  </svg>`;

  const axis = Array.from({length:GRID_STEPS+1},(_,i)=>
    `<span>${fmtPrice(max - range*i/GRID_STEPS)}</span>`
  ).join('');

  const dateFmt = ts => new Date(ts).toLocaleDateString([], {month:'short', day:'numeric'});
  return `<div class="coin-chart-inner">
    <div class="coin-chart-plot">
      ${svg}
      <div class="coin-chart-axis mono">${axis}</div>
    </div>
    <div class="coin-chart-dates mono">
      <span>${dateFmt(v[0][0])}</span>
      <span>${dateFmt(v[v.length-1][0])}</span>
    </div>
  </div>`;
}

// Fallback area chart (used if the OHLC endpoint is unavailable).
// Builds a smooth Catmull-Rom spline through the price points instead of a
// jagged polyline, with a soft gradient fill under the curve.
function bigSparkline(vals, up){
  const v = (vals||[]).filter(n=>isFinite(n));
  if(v.length < 2) return '';
  const w=600, h=240, pad=10;
  const min=Math.min(...v), max=Math.max(...v), range=(max-min)||1;
  const step=(w-pad*2)/(v.length-1);
  const pts=v.map((n,i)=>[pad+i*step, pad+(h-pad*2)*(1-(n-min)/range)]);

  let d=`M${pts[0][0].toFixed(2)},${pts[0][1].toFixed(2)}`;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[i-1]||pts[i], p1=pts[i], p2=pts[i+1], p3=pts[i+2]||p2;
    const c1x=p1[0]+(p2[0]-p0[0])/6, c1y=p1[1]+(p2[1]-p0[1])/6;
    const c2x=p2[0]-(p3[0]-p1[0])/6, c2y=p2[1]-(p3[1]-p1[1])/6;
    d+=` C${c1x.toFixed(2)},${c1y.toFixed(2)} ${c2x.toFixed(2)},${c2y.toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  const firstX=pts[0][0].toFixed(2), lastX=pts[pts.length-1][0].toFixed(2), base=(h-pad).toFixed(2);
  const areaD=`${d} L${lastX},${base} L${firstX},${base} Z`;
  const gid='coinGrad'+Math.random().toString(36).slice(2,8);
  return `<svg class="coin-chart-svg ${up?'spark-up':'spark-down'}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="currentColor" stop-opacity=".22"/>
      <stop offset="100%" stop-color="currentColor" stop-opacity="0"/>
    </linearGradient></defs>
    <path d="${areaD}" class="coin-chart-area" fill="url(#${gid})" stroke="none"/>
    <path d="${d}" class="coin-chart-line" fill="none" pathLength="1"/>
  </svg>`;
}

// Coin SEO pages (/<lang>/<slug>.html): fill the live price card + 7-day chart from CoinGecko.
async function loadCoinPage(){
  const card = document.querySelector('.coin-hero-card[data-coin-id]');
  const chartEl = document.querySelector('.coin-chart[data-coin-chart]');
  if(!card && !chartEl) return;
  const id = (card && card.dataset.coinId) || (chartEl && chartEl.dataset.coinChart);
  if(!id) return;
  try{
    const url = `${CG_API}/coins/markets?vs_currency=usd&ids=${id}&sparkline=true&price_change_percentage=24h`;
    const r = await fetch(url);
    if(!r.ok) throw new Error('HTTP '+r.status);
    const data = await r.json();
    const c = data && data[0];
    if(!c) return;
    if(card){
      const set = (field, val) => { const el = card.querySelector(`[data-field="${field}"]`); if(el) el.textContent = val; };
      set('price', fmtPrice(c.current_price||0));
      const chg = c.price_change_percentage_24h || 0;
      const chgEl = card.querySelector('[data-field="chg24"]');
      if(chgEl){ chgEl.textContent = _chgStr(chg); chgEl.classList.remove('up','down'); chgEl.classList.add(_chgClass(chg)); }
      set('mcap', fmtCap(c.market_cap));
      set('vol', fmtCap(c.total_volume));
      set('high24', fmtPrice(c.high_24h||0));
      set('low24', fmtPrice(c.low_24h||0));
      set('updated', ' ' + new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}));
    }
    // Draw the 7-day chart once. The price card above refreshes every 60s,
    // but redrawing the chart on each tick risks a failed OHLC fetch
    // (rate limits) silently downgrading a candlestick chart to the line
    // fallback, making the chart appear to "switch" mid-session.
    if(chartEl && !chartEl.dataset.loaded){
      let svg = '';
      try{
        const ohlcR = await fetch(`${CG_API}/coins/${id}/ohlc?vs_currency=usd&days=7`);
        if(ohlcR.ok) svg = candlestickChart(await ohlcR.json());
      }catch(e){/* fall back to the sparkline area chart below */}
      if(!svg){
        const sp = downsample((c.sparkline_in_7d && c.sparkline_in_7d.price) || [], 48);
        const up = sp.length > 1 ? sp[sp.length-1] >= sp[0] : true;
        svg = bigSparkline(sp, up);
      }
      if(svg){
        chartEl.innerHTML = svg;
        chartEl.dataset.loaded = '1';
        // double rAF so the browser commits the initial (undrawn) state
        // before the class flips, letting the draw-in transition run
        requestAnimationFrame(()=>requestAnimationFrame(()=>chartEl.classList.add('is-drawn')));
      }
    }
  }catch(e){/* keep skeleton/placeholder values */}
}

function mForexRow(base, quote, rate, dayChg, weekChg, monthChg, series, i){
  const sym = `${base}/${quote}`;
  const name = `${FX_NAMES[base]||base} · ${FX_NAMES[quote]||quote}`;
  const search = `${sym} ${name}`.toLowerCase();
  return `<div class="m-row m-static" data-search="${esc(search)}">
    <div class="m-main">
      <span class="m-rank mono">${String(i+1).padStart(2,'0')}</span>
      <span class="m-coin">
        <span class="m-fx-badge mono">${esc(base)}</span>
        <span class="m-id"><span class="m-name">${esc(sym)}</span><span class="m-sym">${esc(name)}</span></span>
      </span>
      <span class="m-price mono">${isFinite(rate)?fmtFx(rate):'—'}</span>
      <span class="m-chg ${_chgClass(dayChg)} mono">${_chgStr(dayChg)}</span>
      <span class="m-chg m-week ${_chgClass(weekChg)} mono">${_chgStr(weekChg)}</span>
      <span class="m-chg m-month ${_chgClass(monthChg)} mono">${_chgStr(monthChg)}</span>
      <span class="m-spark-wrap">${sparkline(series, monthChg>=0)}</span>
    </div>
  </div>`;
}

function renderCrypto(lang, prefix){
  const cb = document.getElementById('crypto-rows');
  if(!cb || !_coins.length) return;
  cb.innerHTML = _coins.map((c,i)=>mCryptoRow(c,i,lang,prefix)).join('') + `<div class="m-empty mono" hidden>${esc((PRICES_I[lang]||PRICES_I.en).noresults)}</div>`;
  initMarketAccordion(cb);
  applySearch(cb);
  const stamp = document.getElementById('cg-stamp');
  if(stamp && _top100Stamp){
    const t = new Date(_top100Stamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
    stamp.textContent = ` · ${(PRICES_I[lang]||PRICES_I.en).updated} ${t}`;
  }
}
function renderForex(lang){
  const fb = document.getElementById('forex-rows');
  if(!fb || !_fxData || !_fxData.cur) return;
  const fx = _fxData;
  const monthIdx = Math.max(0, (fx.dates||[]).length - 22);
  const rows = FX_PAIRS.map(([base,quote],i)=>{
    const c = fxRate(base,quote,fx.cur);
    const p = fx.prev ? fxRate(base,quote,fx.prev) : c;
    const wk = fx.week ? fxRate(base,quote,fx.week) : c;
    const mo = fx.month ? fxRate(base,quote,fx.month) : c;
    const dayChg = p ? (c-p)/p*100 : 0;
    const weekChg = wk ? (c-wk)/wk*100 : 0;
    const monthChg = mo ? (c-mo)/mo*100 : 0;
    const series = (fx.dates||[]).slice(monthIdx).map(d=>fxRate(base,quote,fx.rates[d]));
    return mForexRow(base, quote, c, dayChg, weekChg, monthChg, series, i);
  }).join('');
  fb.innerHTML = rows + `<div class="m-empty mono" hidden>${esc((PRICES_I[lang]||PRICES_I.en).noresults)}</div>`;
  applySearch(fb);
}

function initMarketAccordion(container){
  if(!container || container.dataset.accBound) return;
  container.dataset.accBound = '1';
  const toggle = btn => {
    const row = btn.closest('.m-row');
    const body = row.querySelector('.m-detail');
    if(!body) return;
    const open = row.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    body.style.maxHeight = open ? body.scrollHeight+'px' : '';
    if(open){
      container.querySelectorAll('.m-row.open').forEach(other=>{
        if(other === row) return;
        other.classList.remove('open');
        const otherBody = other.querySelector('.m-detail');
        const otherBtn = other.querySelector('.m-main');
        if(otherBody) otherBody.style.maxHeight = '';
        if(otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
      });
    }
  };
  container.addEventListener('click', e=>{
    const btn = e.target.closest('.m-main');
    if(btn && container.contains(btn) && !btn.closest('.m-static')) toggle(btn);
  });
}

/* client-side search: hides rows whose data-search misses the active query */
function applySearch(container){
  if(!container) return;
  const q = (container.dataset.q || '').trim().toLowerCase();
  let shown = 0;
  container.querySelectorAll('.m-row').forEach(row=>{
    const hit = !q || (row.dataset.search||'').includes(q);
    row.hidden = !hit;
    if(hit) shown++;
    if(row.classList.contains('open')){ // recompute open height after filtering
      const body = row.querySelector('.m-detail');
      if(body) body.style.maxHeight = body.scrollHeight+'px';
    }
  });
  const empty = container.querySelector('.m-empty');
  if(empty) empty.hidden = shown>0;
}

async function loadMarkets(){
  const cb = document.getElementById('crypto-rows');
  const fb = document.getElementById('forex-rows');
  if(!cb && !fb) return;
  const lang = feedLang();
  const prefix = adPrefix();
  // Load the two markets independently so a failure in one (e.g. a CoinGecko
  // rate-limit) never blocks the other from rendering.
  if(cb && !_coins.length) await loadCoinPages();
  const jobs = [];
  if(cb) jobs.push((async()=>{
    // Retry with backoff so the first paint still succeeds through a transient
    // 429. Once _coins holds data we stop retrying (interval handles refresh).
    const delays = _coins.length ? [0] : [0, 4000, 12000];
    for(const wait of delays){
      if(wait) await new Promise(r=>setTimeout(r, wait));
      try{
        const coins = await fetchTop100();
        if(Array.isArray(coins) && coins.length){ _coins = coins; renderCrypto(lang, prefix); return; }
      }catch(e){/* try again after backoff */}
    }
  })());
  if(fb) jobs.push((async()=>{
    try{
      const fx = await fetchForex();
      _fxData = fx;
      const stamp = document.getElementById('fx-stamp'); if(stamp&&fx.date) stamp.textContent = fx.date;
      renderForex(lang);
    }catch(e){/* leave forex skeleton */}
  })());
  await Promise.all(jobs);
}

/* segmented crypto/forex switcher + search box (prices.html only) */
function initPricesUI(){
  const root = document.getElementById('markets');
  if(!root || root.dataset.bound) return;
  root.dataset.bound = '1';
  const tabs = root.querySelectorAll('.seg-btn');
  const panels = { crypto: document.getElementById('panel-crypto'), forex: document.getElementById('panel-forex') };
  const search = document.getElementById('market-search');
  if(search) search.placeholder = (PRICES_I[feedLang()] || PRICES_I.en).search_ph;
  const activeContainer = () => {
    const on = root.querySelector('.seg-btn.active');
    const which = on ? on.dataset.market : 'crypto';
    return document.getElementById(which==='crypto'?'crypto-rows':'forex-rows');
  };
  tabs.forEach(b=>b.addEventListener('click', ()=>{
    tabs.forEach(t=>{ const on=t===b; t.classList.toggle('active',on); t.setAttribute('aria-selected',String(on)); });
    Object.entries(panels).forEach(([k,el])=>{ if(el) el.hidden = (k !== b.dataset.market); });
    if(search){ // re-apply current query against the now-visible list
      const c = activeContainer(); if(c){ c.dataset.q = search.value; applySearch(c); }
    }
  }));
  if(search){
    search.addEventListener('input', ()=>{
      const c = activeContainer(); if(!c) return;
      c.dataset.q = search.value; applySearch(c);
    });
  }
}

/* ---------- ranking accordions: top-100 crypto + exchanges/brokers ---------- */
const RANK_I = {
  en:{ mcap:'Market Cap', vol:'24h Volume', high24:'24h High', low24:'24h Low', cta_trade:'Trade now →',
    founded:'Founded', regulation:'Regulation', platforms:'Platforms', mindep:'Min. deposit',
    tags:{ regulated:'Regulated', raw_spreads:'Raw Spreads', mt4_mt5:'MT4/MT5', pro_platform:'Pro Platform',
      no_minimum:'No Minimum', islamic_accounts:'Islamic Accounts', copy_trading:'Copy Trading',
      beginner:'Beginner Friendly', wide_assets:'Wide Assets', low_fees:'Low Fees',
      high_liquidity:'High Liquidity', derivatives:'Derivatives', web3:'Web3 Wallet', staking:'Staking' } },
  fa:{ mcap:'ارزش بازار', vol:'حجم ۲۴ ساعته', high24:'سقف ۲۴ ساعته', low24:'کف ۲۴ ساعته', cta_trade:'معامله کنید ←',
    founded:'تأسیس', regulation:'رگولاتوری', platforms:'پلتفرم‌ها', mindep:'حداقل واریز',
    tags:{ regulated:'دارای مجوز', raw_spreads:'اسپرد خام', mt4_mt5:'MT4/MT5', pro_platform:'پلتفرم حرفه‌ای',
      no_minimum:'بدون حداقل', islamic_accounts:'حساب اسلامی', copy_trading:'کپی‌تریدینگ',
      beginner:'مناسب مبتدی', wide_assets:'تنوع دارایی', low_fees:'کارمزد پایین',
      high_liquidity:'نقدشوندگی بالا', derivatives:'مشتقات', web3:'کیف‌پول وب۳', staking:'استیکینگ' } },
  ar:{ mcap:'القيمة السوقية', vol:'حجم ٢٤ ساعة', high24:'أعلى ٢٤ ساعة', low24:'أدنى ٢٤ ساعة', cta_trade:'تداول الآن ←',
    founded:'التأسيس', regulation:'الترخيص', platforms:'المنصّات', mindep:'الحد الأدنى للإيداع',
    tags:{ regulated:'مرخّص', raw_spreads:'فروقات خام', mt4_mt5:'MT4/MT5', pro_platform:'منصّة محترفة',
      no_minimum:'بلا حد أدنى', islamic_accounts:'حسابات إسلامية', copy_trading:'نسخ التداول',
      beginner:'مناسب للمبتدئين', wide_assets:'تنوّع الأصول', low_fees:'رسوم منخفضة',
      high_liquidity:'سيولة عالية', derivatives:'مشتقات', web3:'محفظة ويب٣', staking:'تخزين' } },
  tr:{ mcap:'Piyasa Değeri', vol:'24s Hacim', high24:'24s Yüksek', low24:'24s Düşük', cta_trade:'Şimdi işlem yap →',
    founded:'Kuruluş', regulation:'Düzenleme', platforms:'Platformlar', mindep:'Min. yatırım',
    tags:{ regulated:'Düzenlemeli', raw_spreads:'Ham Spread', mt4_mt5:'MT4/MT5', pro_platform:'Profesyonel Platform',
      no_minimum:'Minimum Yok', islamic_accounts:'İslami Hesap', copy_trading:'Kopya İşlem',
      beginner:'Yeni Başlayana Uygun', wide_assets:'Geniş Varlık Yelpazesi', low_fees:'Düşük Ücret',
      high_liquidity:'Yüksek Likidite', derivatives:'Türevler', web3:'Web3 Cüzdan', staking:'Staking' } }
};
const avatarClass = i => ['av-a','av-b','av-c','av-d'][i%4];
const tagClass = i => ['tag-a','tag-b','tag-c','tag-d'][i%4];

function rankingRow(entry, i, lang){
  const dict = RANK_I[lang] || RANK_I.en;
  const visitLabel = esc((window.I[lang] && window.I[lang].cta_visit) || 'Visit');
  const blurb = esc(pickLoc(entry.blurb, lang));
  const details = esc(pickLoc(entry.details, lang));
  const letter = esc((entry.name||'?').charAt(0).toUpperCase());
  const info = entry.info || {};
  const tags = (entry.tags||[]).map((t,ti)=>`<span class="tag ${tagClass(ti)}">${esc((dict.tags&&dict.tags[t])||t)}</span>`).join('');
  return `<div class="rank-row">
    <div class="rank-head" role="button" tabindex="0" aria-expanded="false">
      <span class="rank-num">${String(i+1).padStart(2,'0')}</span>
      <div class="rank-id-wrap">
        <span class="rank-id ${avatarClass(i)}">${letter}</span>
        <div class="rank-info"><span class="rank-name">${esc(entry.name)}</span><span class="rank-sub">${blurb}</span></div>
      </div>
      <span class="rank-score"><b data-count="${entry.score}" data-decimals="1"></b><span class="stars" style="--p:${entry.score*10}%"><i></i></span></span>
      <span class="rank-chevron">▾</span>
    </div>
    <div class="rank-body"><div class="rank-body-inner">
      <p>${details}</p>
      <div class="rank-stats">
        <div><b>${esc(dict.founded)}</b><span>${esc(info.founded||'—')}</span></div>
        <div><b>${esc(dict.regulation)}</b><span>${esc(info.regulation||'—')}</span></div>
        <div><b>${esc(dict.platforms)}</b><span>${esc(info.platforms||'—')}</span></div>
        <div><b>${esc(dict.mindep)}</b><span>${esc(info.minDeposit||'—')}</span></div>
      </div>
      <div class="tag-row">${tags}</div>
      <a class="btn" href="${esc(entry.url||'#')}" rel="sponsored nofollow" target="_blank">${visitLabel}</a>
    </div></div>
  </div>`;
}

function initAccordion(container){
  if(!container || container.dataset.accBound) return;
  container.dataset.accBound = '1';
  const toggle = head=>{
    const row = head.closest('.rank-row');
    const body = row.querySelector('.rank-body');
    const open = row.classList.toggle('open');
    head.setAttribute('aria-expanded', String(open));
    body.style.maxHeight = open ? body.scrollHeight+'px' : '';
  };
  container.addEventListener('click', e=>{
    const head = e.target.closest('.rank-head');
    if(head && container.contains(head)) toggle(head);
  });
  container.addEventListener('keydown', e=>{
    if(e.key!=='Enter' && e.key!==' ') return;
    const head = e.target.closest('.rank-head');
    if(!head || !container.contains(head)) return;
    e.preventDefault();
    toggle(head);
  });
}

async function loadRankings(){
  const eb = document.getElementById('exchange-rows');
  const bb = document.getElementById('broker-rows');
  if(!eb && !bb) return;
  const prefix = adPrefix();
  const lang = feedLang();
  try{
    if(eb){
      const r = await fetch(prefix + 'content/data/exchanges.json', {cache:'no-cache'});
      if(r.ok){
        const data = await r.json();
        eb.innerHTML = (data.entries||[]).map((e,i)=>`<div class="reveal">${rankingRow(e,i,lang)}</div>`).join('');
        initAccordion(eb);
        initObservers();
      }
    }
    if(bb){
      const r = await fetch(prefix + 'content/data/brokers.json', {cache:'no-cache'});
      if(r.ok){
        const data = await r.json();
        bb.innerHTML = (data.entries||[]).map((e,i)=>`<div class="reveal">${rankingRow(e,i,lang)}</div>`).join('');
        initAccordion(bb);
        initObservers();
      }
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
  // On generated /<lang>/ pages, switching language means navigating to the
  // sibling page in that language; elsewhere it swaps strings in place.
  const fixedLang = (location.pathname.match(/\/(en|fa|ar|tr)\//)||[])[1];
  const switchLang = l=>{
    if(fixedLang){ location.href = `../${l}/${location.pathname.split('/').pop()}`; }
    else window.setLang(l);
  };
  // only data-lang buttons switch language — the .bs-lang-toggle (globe) has no
  // data-lang and just opens the dropdown, so it must NOT be in this selector.
  document.querySelectorAll('.lang button, .bs-lang-menu button').forEach(b=>{
    b.addEventListener('click',e=>{e.preventDefault(); switchLang(b.dataset.lang);});
  });
  document.querySelectorAll('[data-lang]').forEach(b=>{
    if(b.tagName==='A') b.addEventListener('click',e=>{e.preventDefault(); switchLang(b.dataset.lang);});
  });
  // globe toggle → open/close the language dropdown
  document.querySelectorAll('.bs-lang-toggle').forEach(t=>{
    t.addEventListener('click',e=>{
      e.preventDefault(); e.stopPropagation();
      const box = t.closest('.bs-lang');
      const open = box.classList.toggle('open');
      t.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  });
  // click outside closes any open dropdown
  document.addEventListener('click',e=>{
    document.querySelectorAll('.bs-lang.open').forEach(box=>{
      if(!box.contains(e.target)){
        box.classList.remove('open');
        const t = box.querySelector('.bs-lang-toggle'); if(t) t.setAttribute('aria-expanded','false');
      }
    });
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

/* ---------- ads: fill placement slots + popup from content/data/ads.json ---------- */
function adPrefix(){
  // generated article pages live one level down (/en/, /fa/, /ar/, /tr/)
  return /\/(en|fa|ar|tr)\//.test(location.pathname) ? '../' : '';
}
// An ad creative can be an image/GIF (<img>), an MP4 (<video>), or a raw
// HTML/JS embed (script). The media URL lives in `image` for image/gif and in
// `video` for mp4 (falling back to `image` for older data); script ads carry
// their markup in `code`. Type defaults to 'image' so existing ads keep working.
function adResolve(url, prefix){
  return /^https?:/.test(url) ? url : prefix + String(url).replace(/^\/+/,'');
}
function adHasContent(ad){
  const t = ad.type || 'image';
  if(t === 'script') return !!(ad.code && ad.code.trim());
  if(t === 'video')  return !!(ad.video || ad.image);
  return !!ad.image;
}
function adMediaHTML(ad, prefix, fit){
  const t = ad.type || 'image';
  const objfit = `object-fit:${fit||'cover'};`;
  if(t === 'video'){
    const v = ad.video || ad.image;
    return `<video src="${adResolve(v, prefix)}" autoplay muted loop playsinline preload="metadata"`
      + ` aria-label="${esc(ad.alt||'Advertisement')}"`
      + ` style="width:100%;height:100%;${objfit}display:block"></video>`;
  }
  return `<img src="${adResolve(ad.image, prefix)}" alt="${esc(ad.alt||'Advertisement')}"`
    + ` loading="lazy" style="width:100%;height:100%;${objfit}display:block">`;
}
// Script/embed ads run inside a sandboxed <iframe srcdoc> scoped to the slot
// box. This is mandatory: real ad-network tags — and especially self-unpacking
// "bundler" embeds — ship a FULL HTML document that calls replaceWith on the
// document root and styles itself position:fixed/inset:0/100vh. Injected inline
// that escapes the slot and takes over the whole page; inside an iframe it can
// only ever fill its own box. The markup comes from the authenticated panel
// admin's own ads.json (owner-trusted), so scripts are allowed to run.
// Derive the creative's native aspect ratio so the slot box matches it exactly
// (no letterboxing, and the SAME shape on every screen — the advertiser ships a
// fixed-size banner, so we never reshape it on mobile). Prefer explicit
// width/height from the panel, else read the bundle's <svg viewBox> or a
// width×height pair from its markup.
function adAspectRatio(ad){
  if(ad.width && ad.height) return `${ad.width} / ${ad.height}`;
  const code = ad.code || '';
  const vb = /viewBox=["']?\s*[\d.+-]+\s+[\d.+-]+\s+([\d.]+)\s+([\d.]+)/i.exec(code);
  if(vb && +vb[1] && +vb[2]) return `${vb[1]} / ${vb[2]}`;
  const wh = /\b(?:width)=["']?(\d{2,4})[^>]*\bheight=["']?(\d{2,4})/i.exec(code);
  if(wh && +wh[1] && +wh[2]) return `${wh[1]} / ${wh[2]}`;
  return '';
}
function adInjectFrame(el, code){
  const frame = document.createElement('iframe');
  frame.className = 'ad-frame';
  frame.setAttribute('scrolling', 'no');
  frame.setAttribute('loading', 'lazy');
  frame.setAttribute('title', 'Advertisement');
  // allow-scripts: embed needs JS. allow-same-origin is intentionally omitted so
  // the frame is opaque-origin and can't reach the parent page/cookies.
  frame.setAttribute('sandbox', 'allow-scripts allow-popups allow-popups-to-escape-sandbox');
  frame.style.cssText = 'width:100%;height:100%;border:0;display:block;background:transparent';
  frame.srcdoc = adShim() + code;
  el.replaceChildren(frame);
}
// A banner ad is a loop, not a player. Many "bundled page" creatives drop a
// runtime <video> with native controls that won't autoplay inside a sandbox.
// This shim (injected ahead of the creative) forces every video to play muted,
// loop forever and hide its controls/scrubber — so the ad behaves like a banner.
function adShim(){
  return `<style>video{controls:none!important;pointer-events:none!important}video::-webkit-media-controls{display:none!important}`
    + `video::-webkit-media-controls-enclosure{display:none!important}</style>`
    + `<script>(function(){function fix(){document.querySelectorAll('video').forEach(function(v){`
    + `v.controls=false;v.removeAttribute('controls');v.loop=true;v.muted=true;v.defaultMuted=true;`
    + `v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');`
    + `var p=v.play&&v.play();if(p&&p.catch)p.catch(function(){});});}`
    + `try{new MutationObserver(fix).observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['controls']});}catch(e){}`
    + `document.addEventListener('DOMContentLoaded',fix);setInterval(fix,400);fix();})();<\/script>`;
}
function fillAdSlot(el, ad, prefix){
  // No creative booked for this slot: hide it entirely rather than leaving the
  // "Book this spot" placeholder visible. hideEmptyAdContainers() then collapses
  // any wrapper grid that ends up with no filled slots.
  if(!ad || !ad.enabled || !adHasContent(ad)){
    el.classList.add('ad-empty');
    el.style.display = 'none';
    return;
  }
  const t = ad.type || 'image';
  if(t === 'script'){
    // Raw embed: drop any placeholder link, render the markup inside a sandboxed
    // iframe so it stays inside this slot box instead of taking over the page.
    if(el.tagName === 'A'){ el.removeAttribute('href'); el.removeAttribute('target'); }
    adInjectFrame(el, ad.code);
    el.classList.add('ad-filled', 'ad-filled-frame');
    const ar = adAspectRatio(ad);
    if(ar){ el.style.aspectRatio = ar; el.style.minHeight = '0'; el.style.height = 'auto'; }
    return;
  }
  const media = adMediaHTML(ad, prefix, 'cover');
  if(el.tagName === 'A'){
    el.innerHTML = media;
    if(ad.link){ el.href = ad.link; el.target = '_blank'; el.rel = 'noopener sponsored'; }
  }else{
    el.innerHTML = ad.link
      ? `<a href="${ad.link}" target="_blank" rel="noopener sponsored" style="display:block">${media}</a>`
      : media;
  }
  el.classList.add('ad-filled');
}
function showAdPopup(p, prefix){
  if(!p || !p.enabled || !adHasContent(p)) return;
  const KEY = 'mx_popup_last';
  const hours = Number(p.frequencyHours) || 24;
  const last = Number(localStorage.getItem(KEY) || 0);
  if(Date.now() - last < hours * 36e5) return;
  const t = p.type || 'image';
  setTimeout(()=>{
    const ov = document.createElement('div');
    ov.className = 'ad-popup-overlay';
    const body = ov.appendChild(document.createElement('div'));
    body.className = 'ad-popup';
    body.setAttribute('role', 'dialog');
    body.setAttribute('aria-label', 'Advertisement');
    if(t === 'script'){
      body.classList.add('ad-popup-frame');
      body.innerHTML = '<button class="ad-popup-close" aria-label="Close">✕</button>';
      // Frame the embed in a wrapper that fills the popup, so adInjectFrame's
      // replaceChildren doesn't wipe the close button on the body itself.
      const wrap = document.createElement('div');
      wrap.style.cssText = 'width:100%;height:100%;display:block';
      body.appendChild(wrap);
      adInjectFrame(wrap, p.code);
    }else{
      const media = adMediaHTML(p, prefix, 'contain');
      body.innerHTML = '<button class="ad-popup-close" aria-label="Close">✕</button>'
        + (p.link?`<a href="${p.link}" target="_blank" rel="noopener sponsored">`:'') + media + (p.link?'</a>':'');
    }
    document.body.appendChild(ov);
    localStorage.setItem(KEY, String(Date.now()));
    const close = ()=>ov.remove();
    ov.querySelector('.ad-popup-close').addEventListener('click', close);
    ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
  }, (Number(p.delaySeconds)||0) * 1000);
}
// Once empty slots are hidden, an ad-grid wrapper may be left with nothing but
// its own borders. Collapse any grid whose slots are all empty so no bare
// bordered strip remains.
function hideEmptyAdContainers(){
  document.querySelectorAll('.ad-grid').forEach(grid=>{
    const slots = grid.querySelectorAll('[data-ad-slot]');
    if(!slots.length) return;
    const visible = Array.from(slots).filter(s=>!s.classList.contains('ad-empty'));
    grid.classList.remove('ad-grid-vis-1','ad-grid-vis-2','ad-grid-vis-3');
    if(!visible.length){ grid.style.display = 'none'; return; }
    // Reflow the row to the booked-slot count (see .ad-grid-vis-* in styles.css).
    grid.classList.add('ad-grid-vis-' + Math.min(visible.length, 3));
  });
}
// The mid-article slot can't be placed by the template — the body is one opaque
// blob of rich HTML — so we inject an empty [data-ad-slot="article-mid"] anchor
// roughly halfway down the prose (after a whole paragraph, never mid-sentence).
// loadAds() then fills or hides it like any other slot.
function injectArticleMidSlot(){
  const prose = document.querySelector('.article-prose');
  if(!prose || prose.querySelector('[data-ad-slot="article-mid"]')) return;
  const blocks = Array.from(prose.children).filter(el=>{
    const t = el.tagName;
    return t === 'P' || t === 'H2' || t === 'H3' || t === 'UL' || t === 'OL' || t === 'BLOCKQUOTE';
  });
  if(blocks.length < 4) return;                 // too short to interrupt
  const after = blocks[Math.floor(blocks.length / 2) - 1];
  const slot = document.createElement('a');
  slot.className = 'ad-banner ad-inline';
  slot.setAttribute('data-ad-slot', 'article-mid');
  slot.href = 'contact.html';
  after.insertAdjacentElement('afterend', slot);
}
async function loadAds(){
  const prefix = adPrefix();
  injectArticleMidSlot();
  try{
    const r = await fetch(prefix + 'content/data/ads.json', {cache:'no-cache'});
    if(!r.ok) return;
    const ads = await r.json();
    document.querySelectorAll('[data-ad-slot]').forEach(el=>{
      fillAdSlot(el, ads.slots && ads.slots[el.dataset.adSlot], prefix);
    });
    hideEmptyAdContainers();
    showAdPopup(ads.popup, prefix);
  }catch(e){/* fetch failed — leave placeholders rather than guess slots are empty */}
}

/* ---------- feed: dynamic homepage sections + stories index ---------- */
function esc(s){
  return String(s==null?'':s).replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function feedLang(){
  const fixed = (location.pathname.match(/\/(en|fa|ar|tr)\//)||[])[1];
  if(fixed) return fixed;
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if(window.I && window.I[fromUrl]) return fromUrl;
  let stored=null; try{ stored=localStorage.getItem('mg_lang'); }catch(e){}
  if(window.I && window.I[stored]) return stored;
  // No explicit choice: match the chrome's language detection so labels and
  // feed content never disagree (e.g. Persian chrome must not show non-fa cards).
  if(typeof window.detectLang === 'function'){
    const d = window.detectLang();
    if(window.I && window.I[d]) return d;
  }
  return 'en';
}
function pickLoc(loc, lang){
  if(!loc) return '';
  return loc[lang] || loc.en || Object.values(loc).find(Boolean) || '';
}
function articleHref(a, lang, prefix){
  return `${prefix}${lang}/${a.slug}.html`;
}
const CAT_LABELS = {
  en:{all:'All',markets:'Markets',crypto:'Crypto',forex:'Forex',defi:'DeFi',policy:'Policy',mining:'Mining',analysis:'Analysis',tech:'Tech',cars:'Cars',staff:'Staff',reportage:'Reportage'},
  fa:{all:'همه',markets:'بازارها',crypto:'کریپتو',forex:'فارکس',defi:'دیفای',policy:'سیاست',mining:'ماینینگ',analysis:'تحلیل',tech:'تکنولوژی',cars:'خودرو',staff:'کارکنان',reportage:'رپورتاژ'},
  ar:{all:'الكل',markets:'الأسواق',crypto:'كريبتو',forex:'فوركس',defi:'ديفاي',policy:'سياسة',mining:'تعدين',analysis:'تحليل',tech:'تقنية',cars:'سيارات',staff:'الطاقم',reportage:'ريبورتاج'},
  tr:{all:'Tümü',markets:'Piyasalar',crypto:'Kripto',forex:'Forex',defi:'DeFi',policy:'Politika',mining:'Madencilik',analysis:'Analiz',tech:'Teknoloji',cars:'Otomobil',staff:'Personel',reportage:'Röportaj'}
};
/* ---- topic & type vocab (mirrors agents/src/taxonomy.ts) ---- */
/* Editorial, SEO-friendly desk titles (shown as the big reflected section
   heading) — descriptive "Best …" framing rather than the bare topic word. */
const TOPIC_LABELS = {
  en:{market:'Best Market Analysis',crypto:'Best Crypto Coverage',cars:'Best Automotive Articles',tech:'Best Tech Stories'},
  fa:{market:'بهترین تحلیل‌های بازار',crypto:'بهترین پوشش کریپتو',cars:'بهترین مقالات خودرو',tech:'بهترین مطالب تکنولوژی'},
  ar:{market:'أفضل تحليلات السوق',crypto:'أفضل تغطية الكريبتو',cars:'أفضل مقالات السيارات',tech:'أفضل قصص التقنية'},
  tr:{market:'En İyi Piyasa Analizleri',crypto:'En İyi Kripto Haberleri',cars:'En İyi Otomotiv Yazıları',tech:'En İyi Teknoloji Yazıları'}
};
const VIEWALL_LABELS = {
  en:'View All Articles →', fa:'مشاهده همه مطالب ←', ar:'عرض كل المقالات ←', tr:'Tüm Yazıları Gör →'
};
const TYPE_LABELS = {
  en:{news:'News',article:'Feature',analysis:'Analysis',review:'Review',reportage:'Reportage',podcast:'Podcast',video:'Video'},
  fa:{news:'خبر',article:'مقاله',analysis:'تحلیل',review:'معرفی',reportage:'رپورتاژ',podcast:'پادکست',video:'ویدیو'},
  ar:{news:'خبر',article:'مقال',analysis:'تحليل',review:'مراجعة',reportage:'ريبورتاج',podcast:'بودكاست',video:'فيديو'},
  tr:{news:'Haber',article:'Makale',analysis:'Analiz',review:'İnceleme',reportage:'Röportaj',podcast:'Podcast',video:'Video'}
};
const MEDIA_TYPES = ['podcast','video'];
const TOPIC_TO_CATEGORY = { market:'markets', crypto:'crypto', cars:'cars', tech:'tech' };
/* Type chip — shown only for non-news formats so plain news cards stay clean.
   data-type drives the accent colour (see styles.css). */
function typeChip(a, lang){
  const t = a.type;
  if(!t || t === 'news') return '';
  const label = esc(((TYPE_LABELS[lang]||TYPE_LABELS.en)[t]) || t);
  return `<span class="type-chip mono" data-type="${esc(t)}">${label}</span>`;
}
function feedCard(a, lang, prefix){
  const href = articleHref(a, lang, prefix);
  const cat = esc((a.category||'').toUpperCase());
  const catKey = esc((a.category||'').toLowerCase());
  const headline = esc(pickLoc(a.headline, lang));
  const dek = esc(pickLoc(a.dek, lang));
  const date = esc(a.date||'');
  const readLabel = esc((window.I[lang]&&window.I[lang].cta_read) || 'Read →');
  const img = a.banner ? `<div class="card-img"><img src="${prefix}${esc(String(a.banner).replace(/^\/+/,''))}" alt="" loading="lazy"></div>` : '';
  // Sub-tags: first 2 article tags (shown in desk sections where primary cat is hidden)
  const subTags = (a.tags||[]).slice(0,2).map(t=>`<span class="cat mono sub-tag">${esc(String(t).toUpperCase())}</span>`).join('');
  return `<a class="card reveal" href="${href}">${img}<span class="cat-line"><span class="cat mono cat-${catKey}">${cat}</span>${subTags}${typeChip(a,lang)}</span><h3>${headline}</h3><p>${dek}</p><div class="card-meta mono"><span>${date}</span><span class="read">${readLabel}</span></div></a>`;
}
/* Crimson, image-less "dispatch" card — the Dispatch signature tile. Leads with
   the category set huge in Fraunces, then the headline and meta. */
function dispatchCard(a, lang, prefix){
  const href = articleHref(a, lang, prefix);
  const cat = esc((a.category||'').toUpperCase());
  const headline = esc(pickLoc(a.headline, lang));
  const date = esc(a.date||'');
  const readLabel = esc((window.I[lang]&&window.I[lang].cta_read) || 'Read →');
  return `<a class="dispatch-card reveal" href="${href}"><span class="dc-cat">${cat}</span><div class="dc-body"><h3>${headline}</h3><div class="card-meta mono"><span>${date}</span><span class="read">${readLabel}</span></div></div></a>`;
}
function listRow(a, lang, prefix, i){
  const href = articleHref(a, lang, prefix);
  const headline = esc(pickLoc(a.headline, lang));
  const dek = esc(pickLoc(a.dek, lang));
  const cat = esc((a.category||'').toUpperCase());
  const catKey = esc((a.category||'').toLowerCase());
  const date = esc(a.date||'');
  if(!a.banner){
    // No image: a solid accent tile fills the image slot with the category
    // and date in display type, keeping the row's two-column rhythm.
    return `<article class="list-row no-img reveal">
    <div class="dispatch-mark"><span class="cat cat-${catKey}">${cat}</span><span class="post-date mono">${date}</span></div>
    <div class="list-body">
      <span class="cat mono cat-${catKey}">${cat}</span>
      <h3><a href="${href}" style="color:inherit;text-decoration:none">${headline}</a></h3>
      <p>${dek}</p>
    </div>
  </article>`;
  }
  const visual = `<a class="thumb" href="${href}" aria-label="Read story" style="background-image:url('${prefix}${esc(String(a.banner).replace(/^\/+/,''))}');background-size:cover;background-position:center"></a>`;
  return `<article class="list-row reveal">
    ${visual}
    <div class="list-body">
      <span class="cat mono cat-${catKey}">${cat}</span>
      <h3><a href="${href}" style="color:inherit;text-decoration:none">${headline}</a></h3>
      <p>${dek}</p>
      <div class="byline mono"><span>${date}</span></div>
    </div>
  </article>`;
}
/* Editor's Pick row — compact item in the panel beside the hero. */
function editorRow(a, lang, prefix, i){
  const href = articleHref(a, lang, prefix);
  const cat = esc((a.category||'').toUpperCase());
  const catKey = esc((a.category||'').toLowerCase());
  const headline = esc(pickLoc(a.headline, lang));
  const date = esc(a.date||'');
  const thumb = a.banner
    ? `<span class="ep-thumb" style="background-image:url('${prefix}${esc(String(a.banner).replace(/^\/+/,''))}')"></span>`
    : `<span class="ep-thumb ep-num" data-cat="${catKey}">${cat}</span>`;
  return `<a class="ep-row" href="${href}">${thumb}<span class="ep-body"><span class="ep-title">${headline}</span><span class="ep-meta"><span class="cat mono cat-${catKey}">${cat}</span><span class="ep-date mono">${date}</span></span></span></a>`;
}
/* ── Desk FEATURE layout (Markets, Tech) — one big hero on the left + up to
   three compact text+thumb side rows on the right, then a "view all" link.
   Mirrors the supplied editorial reference. ── */
function deskFeature(items, lang, prefix, allHref){
  const hero = items[0];
  if(!hero) return '';
  const side = items.slice(1, 4);
  const viewAll = esc((window.I[lang]&&window.I[lang].cta_all) || 'View all stories');
  const heroImg = hero.banner
    ? `<span class="dfh-img"><img src="${prefix}${esc(String(hero.banner).replace(/^\/+/,''))}" alt="" loading="lazy"></span>` : '';
  const heroHtml = `<a class="df-hero" href="${articleHref(hero,lang,prefix)}">
      ${heroImg}
      <span class="dfh-body">
        <h3 class="dfh-title">${esc(pickLoc(hero.headline,lang))}</h3>
        <p class="dfh-dek">${esc(pickLoc(hero.dek,lang))}</p>
        <span class="df-author mono">${esc(hero.author||'MAXGAZINE')}</span>
      </span></a>`;
  const sideHtml = side.map(a=>{
    const thumb = a.banner
      ? `<span class="dfs-thumb"><img src="${prefix}${esc(String(a.banner).replace(/^\/+/,''))}" alt="" loading="lazy"></span>` : '';
    return `<a class="df-side-row" href="${articleHref(a,lang,prefix)}">
      <span class="dfs-body">
        <span class="dfs-title">${esc(pickLoc(a.headline,lang))}</span>
        <span class="dfs-dek">${esc(pickLoc(a.dek,lang))}</span>
        <span class="df-author mono">${esc(a.author||'MAXGAZINE')}</span>
      </span>${thumb}</a>`;
  }).join('');
  return `<div class="df-main">${heroHtml}</div>
    <div class="df-side">${sideHtml}</div>`;
}

/* ── Desk SPLIT layout (Crypto) — a six-card image grid on the left + a
   "Top Stories" text list (no images) on the right, sitting on a colour band.
   Mirrors the supplied editorial reference. ── */
function deskSplit(cards, list, lang, prefix){
  const gridHtml = cards.map(a=>{
    const img = a.banner
      ? `<span class="dsc-img"><img src="${prefix}${esc(String(a.banner).replace(/^\/+/,''))}" alt="" loading="lazy"></span>`
      : `<span class="dsc-img dsc-noimg"></span>`;
    return `<a class="ds-card" href="${articleHref(a,lang,prefix)}">${img}<span class="dsc-title">${esc(pickLoc(a.headline,lang))}</span></a>`;
  }).join('');
  const listHead = esc((window.I[lang]&&window.I[lang].sec_latest) || 'Top Stories');
  const listHtml = list.map(a=>`<a class="ds-list-row" href="${articleHref(a,lang,prefix)}">
      <span class="dsl-date mono">${esc(a.date||'')}</span>
      <span class="dsl-title">${esc(pickLoc(a.headline,lang))}</span></a>`).join('');
  return `<div class="ds-grid">${gridHtml}</div>
    <aside class="ds-list"><div class="ds-list-head mono">${listHead}</div>${listHtml}</aside>`;
}

// Featured rotation: every featured article with a banner gets a turn in the
// hero; with 2+ of them the stage cross-fades to the next one every 10s.
let featuredList = [];
let featuredIdx = 0;
let featuredTimer = null;
let featuredLangCur = 'en';
function applyFeatured(lang){
  featuredLangCur = lang;
  const a = featuredList[featuredIdx];
  if(!a) return;
  const prefix = adPrefix();
  const href = articleHref(a, lang, prefix);
  const kicker = document.getElementById('hero-kicker');
  const titleLink = document.getElementById('hero-title-link');
  const sub = document.getElementById('hero-sub');
  const author = document.getElementById('hero-author');
  const dateEl = document.getElementById('hero-date');
  const catEl = document.getElementById('hero-cat');
  const img = document.getElementById('hero-img');
  if(kicker) kicker.textContent = (a.category||'').toUpperCase();
  if(titleLink){
    titleLink.href = href;
    let hl = titleLink.querySelector('.hl');
    if(!hl){ hl = document.createElement('span'); hl.className='hl'; titleLink.textContent=''; titleLink.appendChild(hl); }
    hl.textContent = pickLoc(a.headline, lang);
  }
  if(sub) sub.textContent = pickLoc(a.dek, lang);
  if(author) author.textContent = a.author || 'MAXGAZINE Desk';
  if(dateEl) dateEl.textContent = a.date || '';
  if(catEl) catEl.textContent = (a.category||'').toUpperCase();
  if(img){
    img.href = href;
    if(a.banner){
      img.classList.add('has-img');
      let ph = img.querySelector('.hero-photo');
      if(!ph){ ph = document.createElement('img'); ph.className='hero-photo'; ph.alt=''; img.appendChild(ph); }
      ph.src = prefix + String(a.banner).replace(/^\/+/,'');
    }
  }
}
function startHeroRotation(){
  if(featuredTimer || featuredList.length < 2) return;
  featuredTimer = setInterval(()=>{
    if(document.hidden) return;
    const stage = document.querySelector('.hero-stage');
    if(stage) stage.classList.add('swapping');
    setTimeout(()=>{
      featuredIdx = (featuredIdx + 1) % featuredList.length;
      applyFeatured(featuredLangCur);
      if(stage) stage.classList.remove('swapping');
    }, 400);
  }, 10000);
}
/* Verge-style main "river" card — thumb + headline + byline. The first card is a
   full-width lead with a large image. */
function riverItem(a, lang, prefix, lead){
  const href = articleHref(a, lang, prefix);
  const cat = esc((a.category||'').toUpperCase());
  const catKey = esc((a.category||'').toLowerCase());
  const headline = esc(pickLoc(a.headline, lang));
  const dek = esc(pickLoc(a.dek, lang));
  const author = esc(a.author||'MAXGAZINE DESK');
  const date = esc(a.date||'');
  const src = a.banner ? `${prefix}${esc(String(a.banner).replace(/^\/+/,''))}` : '';
  if(lead){
    const img = src
      ? `<span class="vrl-img"><img src="${src}" alt="" loading="lazy"></span>`
      : `<span class="vrl-img vr-thumb-empty" data-cat="${catKey}">${cat}</span>`;
    return `<a class="vriver-item lead reveal" href="${href}">${img}<span class="vrl-body"><span class="cat-line"><span class="cat mono cat-${catKey}">${cat}</span>${typeChip(a,lang)}</span><h3>${headline}</h3><p class="vrl-dek">${dek}</p><span class="vr-by mono"><b>${author}</b> · ${date}</span></span></a>`;
  }
  const thumb = src
    ? `<span class="vr-thumb"><img src="${src}" alt="" loading="lazy"></span>`
    : `<span class="vr-thumb vr-thumb-empty" data-cat="${catKey}">${cat}</span>`;
  return `<a class="vriver-item reveal" href="${href}">${thumb}<span class="vr-body"><span class="cat-line"><span class="cat mono cat-${catKey}">${cat}</span>${typeChip(a,lang)}</span><h3>${headline}</h3><span class="vr-by mono"><b>${author}</b> · ${date}</span></span></a>`;
}
/* "Latest" rail row — author avatar + name + date, headline, excerpt, thumb. */
function streamRow(a, lang, prefix){
  const href = articleHref(a, lang, prefix);
  const cat = esc((a.category||'').toUpperCase());
  const catKey = esc((a.category||'').toLowerCase());
  const headline = esc(pickLoc(a.headline, lang));
  const dek = esc(pickLoc(a.dek, lang));
  const author = esc(a.author||'MAXGAZINE DESK');
  const date = esc(a.date||'');
  const initial = esc((String(a.author||'M').trim()[0]||'M').toUpperCase());
  const thumb = a.banner ? `<a class="vs-thumb" href="${href}" aria-hidden="true" tabindex="-1"><img src="${prefix}${esc(String(a.banner).replace(/^\/+/,''))}" alt="" loading="lazy"></a>` : '';
  return `<article class="vstream-item">
    <div class="vs-top mono"><span class="vs-avatar">${initial}</span><span class="vs-name">${author}</span><span class="vs-date">${date}</span></div>
    <div class="vs-row"><div class="vs-text"><span class="cat-line"><span class="vs-cat mono cat-${catKey}">${cat}</span>${typeChip(a,lang)}</span><a class="vs-title" href="${href}">${headline}</a><p class="vs-excerpt">${dek}</p></div>${thumb}</div>
  </article>`;
}

/* Editor's-Pick reading modal — desktop only, plain (non-modified) clicks. Pulls
   the real article's .article-read block (text + image, no site chrome) into an
   in-page overlay so the reader never leaves the homepage. New-tab / cmd-click and
   small screens fall through to a normal navigation. */
function openArticleModal(href){
  const ov = document.createElement('div');
  ov.className = 'art-modal-ov';
  ov.innerHTML = '<div class="art-modal" role="dialog" aria-modal="true" aria-label="Article"><button class="art-modal-close" aria-label="Close">✕</button><div class="art-modal-scroll"><div class="art-modal-body art-modal-loading">Loading…</div></div></div>';
  document.body.appendChild(ov);
  document.body.classList.add('modal-open');
  requestAnimationFrame(()=>ov.classList.add('in'));
  const close = ()=>{ ov.classList.remove('in'); document.body.classList.remove('modal-open');
    setTimeout(()=>ov.remove(), 240); document.removeEventListener('keydown', onKey); };
  function onKey(e){ if(e.key==='Escape') close(); }
  ov.querySelector('.art-modal-close').addEventListener('click', close);
  ov.addEventListener('click', e=>{ if(e.target===ov) close(); });
  document.addEventListener('keydown', onKey);
  fetch(href).then(r=>r.text()).then(html=>{
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const content = doc.querySelector('.article-read');
    if(!content){ location.href = href; return; }
    content.querySelectorAll('img').forEach(img=>{ const s=img.getAttribute('src'); if(s) img.src = new URL(s, href).href; });
    const body = ov.querySelector('.art-modal-body');
    body.classList.remove('art-modal-loading');
    body.replaceChildren(content);
  }).catch(()=>{ location.href = href; });
}
function initEditorPopups(){
  const list = document.querySelector('[data-feed-editors]');
  if(!list || list.__popupBound) return;
  list.__popupBound = true;
  list.addEventListener('click', e=>{
    const row = e.target.closest('a.ep-row');
    if(!row || !list.contains(row)) return;
    if(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button!==0) return; // honour new-tab
    if(window.innerWidth < 900) return; // desktop only
    e.preventDefault();
    openArticleModal(row.href);
  });
}

/* ---- placement & ordering (mirrors agents/src/taxonomy.ts) ----
   Every feed entry carries a `placement` { hero, editorsPick, hideFromLatest,
   pinned, priority }. These helpers turn those editor controls into ordering. */
function plc(a){ return a.placement || {}; }
function byPriorityDate(a,b){
  const pa = plc(a).priority||0, pb = plc(b).priority||0;
  if(pb !== pa) return pb - pa;            // higher priority first
  return (a.date < b.date) ? 1 : -1;       // then newest first
}
/* LATEST pool: drop stories the editor hid, float pinned ones to the top, then
   order by priority and date. */
function latestPool(feed){
  return feed.filter(a=>!plc(a).hideFromLatest).slice().sort((a,b)=>{
    const pinA = plc(a).pinned?1:0, pinB = plc(b).pinned?1:0;
    if(pinB !== pinA) return pinB - pinA;
    return byPriorityDate(a,b);
  });
}
function renderFeedSections(feed, lang, prefix){
  // LATEST sections draw from a placement-aware pool (hidden removed, pinned up)
  const latestFeed = latestPool(feed);
  // Page-wide de-duplication: a story shown in one section won't reappear in
  // another. Seed the "used" set with the hero rotation, then have every
  // section draw the next unused items from the pool. This keeps each block a
  // distinct slice of the feed (Zoomit-style silos) instead of every section
  // re-showing the same newest stories.
  const used = new Set(featuredList.map(a=>a.slug));
  // Pull up to `n` not-yet-shown items from `pool`; marks them used by default.
  const take = (pool, n, mark=true) => {
    const out = [];
    for(const a of pool){
      if(out.length >= n) break;
      if(used.has(a.slug)) continue;
      out.push(a);
      if(mark) used.add(a.slug);
    }
    return out;
  };

  // Editor's Pick — explicit picks first, then featured, then recent; skipping
  // anything already in the hero rotation. Marked used so it isn't repeated below.
  const editors = document.querySelector('[data-feed-editors]');
  if(editors){
    const explicit = feed.filter(a=>plc(a).editorsPick).sort(byPriorityDate);
    const seen = new Set(featuredList.map(a=>a.slug));
    const picks = [];
    [...explicit, ...featuredList, ...latestFeed].forEach(a=>{
      if(picks.length < 3 && !seen.has(a.slug)){ seen.add(a.slug); picks.push(a); }
    });
    editors.innerHTML = picks.map((a,i)=>editorRow(a,lang,prefix,i)).join('');
    picks.forEach(a=>used.add(a.slug));
  }

  // Latest Dispatches — Terminal card grid. First row pairs two image cards
  // with a crimson, image-less "dispatch" card (the Dispatch signature). The
  // second grid carries the next six stories. Older pages may still use the
  // vertical stack / three-card containers, so those are filled when present.
  const grid1 = document.querySelector('[data-feed-grid]');
  if(grid1){
    const row = take(latestFeed, 3);
    grid1.innerHTML = row.map((a,i)=> i===1 ? dispatchCard(a,lang,prefix) : feedCard(a,lang,prefix)).join('');
  }
  const grid2 = document.querySelector('[data-feed-grid-2]');
  if(grid2) grid2.innerHTML = take(latestFeed, 6).map(a=>feedCard(a,lang,prefix)).join('');

  const latest = document.querySelector('[data-feed-latest]');
  if(latest) latest.innerHTML = take(latestFeed, 10).map((a,i)=>listRow(a,lang,prefix,i)).join('');
  const cards = document.querySelector('[data-feed-cards]');
  if(cards) cards.innerHTML = take(latestFeed, 3).map(a=>feedCard(a,lang,prefix)).join('');

  // River (main column) fills first, then stream gets the NEXT stories so
  // the sidebar never repeats what the river already showed.
  const river = document.querySelector('[data-feed-river]');
  if(river) river.innerHTML = take(latestFeed, 9).map((a,i)=>riverItem(a,lang,prefix,i===0)).join('');
  const stream = document.querySelector('[data-feed-stream]');
  if(stream) stream.innerHTML = take(latestFeed, 8).map(a=>streamRow(a,lang,prefix)).join('');

  // Tabbed "Latest" hub — fills FIRST so its top-12 get marked used before
  // any topic desk runs; desks then show only stories not already in the hub.
  renderLatestTabs(feed, lang, prefix, used);

  // Per-topic desk sections — each fills with its topic's latest stories that
  // haven't appeared above, and hides itself when that desk has nothing fresh.
  document.querySelectorAll('[data-feed-topic]').forEach(grid=>{
    const topic = grid.getAttribute('data-feed-topic');
    const section = grid.closest('[data-topic-section]') || grid;
    const isFeature = section.classList.contains('desk-style-a'); // Markets, Tech
    const isSplit   = section.classList.contains('desk-style-c'); // Crypto
    const need = isSplit ? 6 : (isFeature ? 4 : 4);
    const items = take(latestFeed.filter(a=>a.topic===topic), need);
    if(!items.length){ section.hidden = true; return; }
    section.hidden = false;
    const allHref = `${prefix}${lang}/stories.html?cat=${esc(TOPIC_TO_CATEGORY[topic]||topic)}`;
    if(isFeature)      grid.innerHTML = deskFeature(items, lang, prefix, allHref);
    else if(isSplit){
      // "Top Stories" recap can repeat headlines shown elsewhere (Verge-style),
      // so draw it from the whole topic pool minus the 6 grid cards — this keeps
      // the right rail full even when fresh items are scarce.
      const gridSlugs = new Set(items.map(a=>a.slug));
      const listItems = latestFeed.filter(a=>a.topic===topic && !gridSlugs.has(a.slug)).slice(0,5);
      grid.innerHTML = deskSplit(items, listItems, lang, prefix);
    }
    else               grid.innerHTML = items.map(a=>feedCard(a,lang,prefix)).join('');
    const head = section.querySelector('[data-topic-head]');
    if(head) head.textContent = (TOPIC_LABELS[lang]||TOPIC_LABELS.en)[topic] || topic;
    const all = section.querySelector('[data-topic-all]');
    if(all){ all.href = allHref; all.removeAttribute('data-i'); all.textContent = (VIEWALL_LABELS[lang]||VIEWALL_LABELS.en); }
  });

  // Podcast / video strip — surfaces media formats; hidden until such content
  // exists (ignores hideFromLatest so a desk can stay news-only).
  const mediaGrid = document.querySelector('[data-feed-media]');
  if(mediaGrid){
    const media = take(feed.filter(a=>MEDIA_TYPES.includes(a.type)).sort(byPriorityDate), 4);
    const section = mediaGrid.closest('[data-media-section]') || mediaGrid;
    if(!media.length){ section.hidden = true; }
    else { section.hidden = false; mediaGrid.innerHTML = media.map(a=>feedCard(a,lang,prefix)).join(''); }
  }

  const moreLink = document.querySelector('[data-feed-more]');
  if(moreLink) moreLink.href = `${prefix}${lang}/stories.html`;

  if(document.getElementById('stories-grid')) initStoriesPage(feed, lang, prefix);
  initEditorPopups();
  initObservers();
}
/* Tabbed "Latest" hub — the main browse section below the hero (replaces the
   old river+stream layout). Uses listRow for an editorial list feel.
   "All" shows the top 12 newest stories and marks them in usedSet so the
   topic desks below don't repeat them. Category tabs show that category's own
   freshest 12, independently, so clicking "Crypto" always shows top crypto. */
function renderLatestTabs(feed, lang, prefix, usedSet){
  const wrap = document.querySelector('[data-latest-section]');
  if(!wrap) return;
  const tabsEl = wrap.querySelector('[data-latest-tabs]');
  const listEl = wrap.querySelector('[data-feed-latest-grid]');
  if(!tabsEl || !listEl){ wrap.hidden = true; return; }
  const pool = latestPool(feed);
  if(!pool.length){ wrap.hidden = true; return; }
  wrap.hidden = false;
  const labels = CAT_LABELS[lang] || CAT_LABELS.en;
  const cats = ['all', ...Array.from(new Set(pool.map(a=>a.category).filter(Boolean)))];
  let active = tabsEl.dataset.active || 'all';
  if(!cats.includes(active)) active = 'all';
  const PER = 12;
  // The "All" view shows the freshest 12 and marks them as used so desks skip them.
  const allItems = pool.slice(0, PER);
  if(usedSet) allItems.forEach(a=>usedSet.add(a.slug));
  function paint(){
    tabsEl.dataset.active = active;
    tabsEl.innerHTML = cats.map(c=>`<a class="tab${c===active?' active':''}" href="#" data-cat="${esc(c)}">${esc(labels[c]||c)}</a>`).join('');
    tabsEl.querySelectorAll('.tab').forEach(t=>t.addEventListener('click',e=>{ e.preventDefault(); active = t.dataset.cat; paint(); }));
    const items = active==='all' ? allItems : pool.filter(a=>a.category===active).slice(0,PER);
    listEl.innerHTML = items.map((a,i)=>listRow(a,lang,prefix,i)).join('');
    initObservers();
  }
  paint();
}
async function loadFeed(){
  const prefix = adPrefix();
  let feed = [];
  try{
    const r = await fetch(prefix + 'content/data/feed.json', {cache:'no-cache'});
    if(r.ok) feed = await r.json();
  }catch(e){/* keep static fallback */}
  if(!Array.isArray(feed) || !feed.length) return;
  const lang = feedLang();

  featuredList = feed.filter(a=>(plc(a).hero || a.featured) && a.banner).sort(byPriorityDate);
  if(featuredList.length){
    ['hero-kicker','hero-sub'].forEach(id=>{
      const el = document.getElementById(id);
      if(el) el.removeAttribute('data-i');
    });
    const hl = document.querySelector('#hero-title-link .hl');
    if(hl) hl.removeAttribute('data-i');
    applyFeatured(lang);
    startHeroRotation();
  }

  renderFeedSections(feed, lang, prefix);

  // Re-render translated feed content whenever the language is switched
  // in place (root-level pages where switchLang calls window.setLang).
  if(window.setLang && !window.__feedSetLangWrapped){
    const origSetLang = window.setLang;
    window.setLang = function(l){
      origSetLang(l);
      initBroadsheetDate();
      if(featuredList.length) applyFeatured(l);
      renderFeedSections(feed, l, prefix);
    };
    window.__feedSetLangWrapped = true;
  }
}
function initStoriesPage(feed, lang, prefix){
  const grid = document.getElementById('stories-grid');
  const tabsEl = document.getElementById('story-tabs');
  const pagerEl = document.getElementById('story-pager');
  if(!grid) return;

  const PAGE_SIZE = 9;
  const labels = CAT_LABELS[lang] || CAT_LABELS.en;
  const cats = ['all', ...Array.from(new Set(feed.map(a=>a.category).filter(Boolean)))];

  const params = new URLSearchParams(location.search);
  let activeCat = params.get('cat') || 'all';
  if(!cats.includes(activeCat)) activeCat = 'all';
  let page = parseInt(params.get('page')||'1',10);
  if(!page || page < 1) page = 1;

  function updateUrl(){
    const url = new URL(location.href);
    if(activeCat==='all') url.searchParams.delete('cat'); else url.searchParams.set('cat', activeCat);
    if(page<=1) url.searchParams.delete('page'); else url.searchParams.set('page', String(page));
    history.replaceState(null,'',url);
  }

  function render(){
    const filtered = activeCat==='all' ? feed : feed.filter(a=>a.category===activeCat);
    const totalPages = Math.max(1, Math.ceil(filtered.length/PAGE_SIZE));
    if(page > totalPages) page = totalPages;

    if(tabsEl){
      tabsEl.innerHTML = cats.map(c=>{
        const label = esc(labels[c] || c);
        const active = c===activeCat ? ' active' : '';
        return `<a class="tab${active}" href="#" data-cat="${esc(c)}">${label}</a>`;
      }).join('');
      tabsEl.querySelectorAll('.tab').forEach(t=>{
        t.addEventListener('click', e=>{
          e.preventDefault();
          activeCat = t.dataset.cat;
          page = 1;
          updateUrl();
          render();
        });
      });
    }

    const pageItems = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE);
    grid.innerHTML = pageItems.map(a=>feedCard(a,lang,prefix)).join('');

    if(pagerEl){
      let html = '';
      html += page>1 ? `<a href="#" data-page="${page-1}" aria-label="Previous page">←</a>` : `<span class="disabled">←</span>`;
      for(let p=1;p<=totalPages;p++){
        html += p===page ? `<span class="active">${p}</span>` : `<a href="#" data-page="${p}">${p}</a>`;
      }
      html += page<totalPages ? `<a href="#" data-page="${page+1}" aria-label="Next page">→</a>` : `<span class="disabled">→</span>`;
      pagerEl.innerHTML = html;
      pagerEl.querySelectorAll('a[data-page]').forEach(a=>{
        a.addEventListener('click', e=>{
          e.preventDefault();
          page = parseInt(a.dataset.page,10);
          updateUrl();
          render();
          window.scrollTo({top: grid.offsetTop - 100, behavior:'smooth'});
        });
      });
    }
    initObservers();
  }

  render();
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

function initBroadsheetDate(){
  const el = document.getElementById('bs-date');
  if(!el) return;
  const lang = (typeof feedLang==='function') ? feedLang() : 'en';
  const d = new Date();
  try{
    if(lang==='fa'){
      // Jalali date, composed in natural order: «یکشنبه، ۳۱ خرداد ۱۴۰۵»
      const wd = new Intl.DateTimeFormat('fa-IR',{weekday:'long'}).format(d);
      const dm = new Intl.DateTimeFormat('fa-IR',{day:'numeric',month:'long'}).format(d);
      const yr = new Intl.DateTimeFormat('fa-IR',{year:'numeric'}).format(d);
      el.textContent = `${wd}، ${dm} ${yr}`;
    } else {
      const locale = {en:'en-US',ar:'ar-SA',tr:'tr-TR'}[lang] || 'en-US';
      el.textContent = d.toLocaleDateString(locale,{weekday:'long',year:'numeric',month:'short',day:'numeric'});
    }
  }catch(e){ el.textContent = d.toDateString(); }
}

/* Header motion: five selectable background animations that play behind the
   wordmark. The active model is panel-controlled via content/data/site.json
   ({"headerMotion":"bauhaus"}); markup is injected here so every page — home and
   built — shares the same system. Falls back to 'bauhaus'. */
const HEADER_MOTIONS = {
  bauhaus: `<span class="bh bh-circle"></span><span class="bh bh-triangle"></span><span class="bh bh-semi"></span><span class="bh bh-quarter"></span><span class="bh bh-bar"></span>`,
  grid:    ``,
  orbits:  `<span class="orb orb-1"></span><span class="orb orb-2"></span><span class="orb orb-3"></span><span class="orb orb-4"></span>`,
  rays:    ``,
  ticker:  `<div class="hm-ticker"><span>crypto · forex · tech · cars · markets · ai · web3 · defi · nft · blockchain · </span><span>crypto · forex · tech · cars · markets · ai · web3 · defi · nft · blockchain · </span></div>`,
};
const HEADER_MOTION_DEFAULT = 'bauhaus';
function applyHeaderMotion(model){
  // NB: some models (grid, rays) have empty markup, so test key existence — not
  // truthiness of the value, which would wrongly fall back to the default.
  const m = Object.prototype.hasOwnProperty.call(HEADER_MOTIONS, model) ? model : HEADER_MOTION_DEFAULT;
  document.querySelectorAll('.bs-motion').forEach(el=>{
    el.setAttribute('data-motion', m);
    el.innerHTML = HEADER_MOTIONS[m];
  });
}
async function initHeaderMotion(){
  applyHeaderMotion(HEADER_MOTION_DEFAULT);            // paint a default immediately
  try{
    const r = await fetch(adPrefix() + 'content/data/site.json', {cache:'no-cache'});
    if(r.ok){ const cfg = await r.json(); if(cfg && cfg.headerMotion) applyHeaderMotion(cfg.headerMotion); }
  }catch(e){/* keep the default */}
}

/* Broadsheet chrome: a slim sticky header that slides in on scroll (wordmark in
   the corner + playful orange dot) and carries the mobile menu trigger. It injects
   the ORIGINAL full-screen mega-menu (.burger + .nav-links) so the existing initNav
   + menu styles drive it — same menu design as before the broadsheet masthead. */
function initBroadsheetChrome(){
  const nav = document.querySelector('.bs-nav');
  const logo = document.querySelector('.bs-logo');
  if(!nav || !logo || document.querySelector('.bs-mini')) return;
  const homeHref = logo.getAttribute('href') || 'index.html';
  const prefix = homeHref.replace(/index\.html.*$/,'');           // '' or '../'
  const sample = nav.querySelector('a') ? nav.querySelector('a').getAttribute('href') : '';
  const sfx = (sample.match(/\?lang=\w+/)||[''])[0];               // '' or '?lang=fa'
  const lang = document.documentElement.getAttribute('lang') || 'en';
  const langName = {en:'EN',fa:'فارسی',ar:'العربية',tr:'Türkçe'};
  const p = h => `${prefix}${h}${sfx}`;

  // sticky mini bar: wordmark (to the corner on scroll) + desktop nav + mobile burger
  const mini = document.createElement('div'); mini.className = 'bs-mini';
  mini.innerHTML = `<a class="bs-mini-logo" href="${homeHref}" aria-label="MAXGAZINE — home">MAXGAZINE<span class="dot">.</span></a>`;
  const mnav = document.createElement('nav'); mnav.className = 'bs-mini-nav';
  nav.querySelectorAll('a').forEach(a=>{ const c=a.cloneNode(true); c.removeAttribute('class'); mnav.appendChild(c); });
  const burger = document.createElement('button'); burger.className='burger'; burger.type='button';
  burger.setAttribute('aria-label','Toggle menu'); burger.setAttribute('aria-expanded','false');
  burger.innerHTML='<span></span><span></span><span></span>';
  mini.append(mnav, burger);

  // rich full-screen mega-menu
  const langBtns = ['en','fa','ar','tr'].map(l=>`<button data-lang="${l}"${l===lang?' class="active"':''} lang="${l}">${langName[l]}</button>`).join('');
  const menu = document.createElement('div'); menu.className='nav-links'; menu.id='nav-links';
  menu.innerHTML = `
    <div class="menu-watermark" aria-hidden="true">MAXGAZINE</div>
    <div class="menu-head">
      <div class="menu-head-links">
        <a class="menu-subscribe" href="${p('contact.html')}">Subscribe</a>
        <span class="menu-head-sep" aria-hidden="true">/</span>
        <a href="${p('contact.html')}">Contact</a>
      </div>
      <button class="menu-close" type="button" aria-label="Close menu"><span class="menu-close-label">close</span><span class="menu-close-x" aria-hidden="true">✕</span></button>
    </div>
    <div class="menu-search">
      <input class="menu-search-input" type="search" placeholder="Search" aria-label="Search">
      <svg class="menu-search-icon" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.35-4.35"/></svg>
    </div>
    <div class="menu-theme" role="group" aria-label="Theme">
      <button type="button" data-theme-set="light"><span aria-hidden="true">☀</span> Light</button>
      <button type="button" data-theme-set="system"><span aria-hidden="true">◑</span> System</button>
      <button type="button" data-theme-set="dark"><span aria-hidden="true">☾</span> Dark</button>
    </div>
    <div class="nav-groups">
      <div class="nav-group has-sub">
        <a href="${p('stories.html')}" data-i="nav_stories">Stories</a>
        <button class="sub-toggle" type="button" aria-expanded="false" aria-label="Expand Stories">+</button>
        <div class="sub">
          <a href="${prefix}stories.html?cat=crypto${sfx}">Crypto</a>
          <a href="${prefix}stories.html?cat=forex${sfx}">Forex</a>
          <a href="${prefix}stories.html?cat=tech${sfx}">Tech</a>
          <a href="${prefix}stories.html?cat=cars${sfx}">Cars</a>
          <a href="${prefix}stories.html?cat=analysis${sfx}">Market Analysis</a>
        </div>
      </div>
      <div class="nav-group has-sub">
        <a href="${prefix}stories.html?cat=crypto${sfx}" data-i="nav_crypto">Crypto</a>
        <button class="sub-toggle" type="button" aria-expanded="false" aria-label="Expand Crypto">+</button>
        <div class="sub">
          <a href="${prefix}stories.html?cat=crypto&tag=bitcoin${sfx}">Bitcoin</a>
          <a href="${prefix}stories.html?cat=crypto&tag=ethereum${sfx}">Ethereum</a>
          <a href="${prefix}stories.html?cat=defi${sfx}">DeFi</a>
          <a href="${prefix}stories.html?cat=policy${sfx}">Regulation</a>
        </div>
      </div>
      <div class="nav-group has-sub">
        <a href="${p('exchanges.html')}" data-i="nav_topmarkets">Markets</a>
        <button class="sub-toggle" type="button" aria-expanded="false" aria-label="Expand Markets">+</button>
        <div class="sub">
          <a href="${p('exchanges.html')}">Crypto Exchanges</a>
          <a href="${p('brokers.html')}">Brokers</a>
          <a href="${prefix}stories.html?cat=forex${sfx}">Forex</a>
        </div>
      </div>
      <div class="nav-group"><a href="${p('prices.html')}" data-i="nav_prices">Prices</a></div>
    </div>
    <div class="nav-extras">
      <div class="nav-group has-sub">
        <a href="${prefix}stories.html?cat=ai${sfx}">AI News</a>
        <button class="sub-toggle" type="button" aria-expanded="false" aria-label="Expand AI News">+</button>
        <div class="sub">
          <a href="${prefix}stories.html?cat=ai&tag=chatgpt${sfx}">ChatGPT</a>
          <a href="${prefix}stories.html?cat=ai&tag=gemini${sfx}">Gemini</a>
          <a href="${prefix}stories.html?cat=ai&tag=openai${sfx}">OpenAI</a>
        </div>
      </div>
      <div class="nav-group has-sub">
        <a href="${prefix}stories.html?cat=cars${sfx}" data-i="nav_cars">Cars</a>
        <button class="sub-toggle" type="button" aria-expanded="false" aria-label="Expand Cars">+</button>
        <div class="sub">
          <a href="${prefix}stories.html?cat=cars&brand=bmw${sfx}">BMW</a>
          <a href="${prefix}stories.html?cat=cars&brand=tesla${sfx}">Tesla</a>
          <a href="${prefix}stories.html?cat=cars&brand=byd${sfx}">BYD</a>
          <a href="${prefix}stories.html?cat=cars&brand=porsche${sfx}">Porsche</a>
        </div>
      </div>
      <div class="nav-group has-sub">
        <a href="${prefix}stories.html?cat=tech${sfx}">Tech</a>
        <button class="sub-toggle" type="button" aria-expanded="false" aria-label="Expand Tech">+</button>
        <div class="sub">
          <a href="${prefix}stories.html?cat=tech&brand=apple${sfx}">Apple</a>
          <a href="${prefix}stories.html?cat=tech&brand=google${sfx}">Google</a>
          <a href="${prefix}stories.html?cat=tech&brand=microsoft${sfx}">Microsoft</a>
        </div>
      </div>
      <div class="nav-group"><a href="${p('chart.html')}" data-i="nav_chart">Charts</a></div>
      <div class="nav-group"><a href="${p('about.html')}" data-i="nav_about">About</a></div>
      <div class="nav-group"><a href="${p('contact.html')}" data-i="nav_contact">Contact</a></div>
    </div>
    <div class="menu-foot">
      <div class="lang menu-lang" role="group" aria-label="Select language">${langBtns}</div>
      <div class="menu-socials"><a href="#" aria-label="Instagram">IG</a><a href="#" aria-label="X">X</a><a href="#" aria-label="YouTube">YT</a></div>
    </div>`;
  document.body.append(mini, menu);

  // search overlay
  const searchOverlay = document.createElement('div'); searchOverlay.className='bs-search-overlay'; searchOverlay.id='bs-search-overlay';
  searchOverlay.innerHTML=`<button class="bs-search-close" aria-label="Close search">✕</button>
    <form class="bs-search-form" action="stories.html" method="get">
      <input class="bs-search-input" name="q" type="search" placeholder="Search stories, coins, markets…" autocomplete="off" aria-label="Search">
      <button class="bs-search-submit" type="submit" aria-label="Submit search">→</button>
    </form>
    <p class="bs-search-hint">Press ESC to close</p>`;
  document.body.appendChild(searchOverlay);

  // wire up search open/close
  const openSearch = ()=>{ searchOverlay.classList.add('open'); searchOverlay.querySelector('.bs-search-input').focus(); };
  const closeSearch = ()=>{ searchOverlay.classList.remove('open'); };
  document.getElementById('bs-search-btn')?.addEventListener('click', openSearch);
  searchOverlay.querySelector('.bs-search-close').addEventListener('click', closeSearch);
  searchOverlay.addEventListener('click', e=>{ if(e.target===searchOverlay) closeSearch(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closeSearch(); });
  // menu search mirrors to overlay
  menu.querySelector('.menu-search-input')?.addEventListener('keydown', e=>{
    if(e.key==='Enter'){ window.location.href=`stories.html?q=${encodeURIComponent(e.target.value)}`; }
  });

  // localise the injected data-i strings to the active language
  if(window.I){
    const dict = Object.assign({}, window.I[lang]||window.I.en, (window.PAGE_I&&window.PAGE_I[lang])||{});
    menu.querySelectorAll('[data-i]').forEach(el=>{ const k=el.getAttribute('data-i'); if(dict[k]!=null) el.textContent=dict[k]; });
  }

  // reveal the sticky bar on scroll (wordmark to the corner + playful dot)
  const onScroll = ()=> document.body.classList.toggle('scrolled', window.scrollY > 220);
  addEventListener('scroll', onScroll, {passive:true}); onScroll();
}

/* ---------- theme: light / dark / system (follows OS) ---------- */
function currentThemeMode(){ try{ return localStorage.getItem('mg_theme') || 'system'; }catch(e){ return 'system'; } }
function systemPrefersDark(){ return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches); }
function applyTheme(mode){
  const dark = mode === 'dark' ? true : mode === 'light' ? false : systemPrefersDark();
  document.body.classList.toggle('theme-dark', dark);
  try{ localStorage.setItem('mg_theme', mode); }catch(e){}
  // reflect on the menu's 3-way segmented control
  document.querySelectorAll('[data-theme-set]').forEach(b=>{
    const on = b.getAttribute('data-theme-set') === mode;
    b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on));
  });
  // reflect on the masthead single toggle
  const btn = document.getElementById('theme-toggle');
  if(btn){
    const ti = btn.querySelector('.tt-icon'), tl = btn.querySelector('.tt-label');
    if(ti) ti.textContent = dark ? '☀' : '☽';
    if(tl) tl.textContent = dark ? 'LIGHT' : 'DARK';
    btn.setAttribute('aria-label', dark ? 'Switch to light theme' : 'Switch to dark theme');
  }
}
function initTheme(){
  applyTheme(currentThemeMode());
  const btn = document.getElementById('theme-toggle');
  if(btn) btn.addEventListener('click', ()=> applyTheme(document.body.classList.contains('theme-dark') ? 'light' : 'dark'));
  document.querySelectorAll('[data-theme-set]').forEach(b=>b.addEventListener('click', ()=> applyTheme(b.getAttribute('data-theme-set'))));
  // when in "system" mode, track OS theme changes live
  if(window.matchMedia){
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = ()=>{ if(currentThemeMode() === 'system') applyTheme('system'); };
    if(mq.addEventListener) mq.addEventListener('change', onChange);
    else if(mq.addListener) mq.addListener(onChange);
  }
}

document.addEventListener('DOMContentLoaded',()=>{
  if(window.initLang) window.initLang();
  initBroadsheetDate();
  initBroadsheetChrome();          // injects the menu (incl. theme controls)
  initTheme();                     // …so theme controls are wired after injection
  initHeaderMotion();
  initNav();
  initObservers();
  initStickyMark();
  initForm();
  loadAds();
  loadFeed();
  loadTicker();
  initPricesUI();
  loadMarkets();
  loadCoinPage();
  setInterval(loadTicker,60000);
  setInterval(loadMarkets,60000);
  setInterval(loadCoinPage,60000);

  // Re-render markets in the new language when switched in place (root pages).
  if(document.getElementById('markets') && window.setLang && !window.__marketsSetLangWrapped){
    const orig = window.setLang;
    window.setLang = function(l){
      orig(l);
      const lang = (window.I && window.I[l]) ? l : 'en';
      renderCrypto(lang, adPrefix());
      renderForex(lang);
      const s = document.getElementById('market-search');
      if(s) s.placeholder = (PRICES_I[lang] || PRICES_I.en).search_ph;
    };
    window.__marketsSetLangWrapped = true;
  }
});

/* ===== SUBSCRIBE MODAL ===== */
(function(){
  const overlay = document.getElementById('sub-modal-overlay');
  if(!overlay) return;
  const btn = document.getElementById('bs-subscribe-btn');
  const close = document.getElementById('sub-modal-close');
  const open  = ()=>{ overlay.classList.add('open'); overlay.querySelector('.sub-modal-input')?.focus(); };
  const shut  = ()=> overlay.classList.remove('open');
  btn?.addEventListener('click', open);
  close?.addEventListener('click', shut);
  overlay.addEventListener('click', e=>{ if(e.target===overlay) shut(); });
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') shut(); });
  // wire mega-menu subscribe link if present
  document.addEventListener('click', e=>{
    if(e.target.matches('.menu-subscribe,.bs-subscribe-btn')) { e.preventDefault(); open(); }
  });
})();
