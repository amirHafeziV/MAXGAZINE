/* ============================================================
   MasterWriter — MAXGAZINE publishing panel
   Talks to the GitHub Contents API through api.php, which holds the
   repo token server-side: articles -> content/articles/*.json,
   ads -> content/data/ads.json, images -> assets/uploads/. The site
   build (GitHub Actions) turns content into static HTML, releasing
   scheduled articles hourly.
   ============================================================ */

const LANGS = ['en','fa','ar','tr'];
const RTL = ['fa','ar'];
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];

/* Visible button feedback: while an async action runs, mark the button busy
   (spinner + label) and disable it, then restore it. Without this the panel
   buttons looked dead — you couldn't tell a save/upload was in flight. */
function btnBusy(btn, label){
  if(!btn) return ()=>{};
  if(btn.dataset.busy) return ()=>{};       // already busy — ignore re-entry
  btn.dataset.busy = '1';
  btn.dataset.label = btn.innerHTML;
  btn.disabled = true;
  btn.classList.add('is-busy');
  if(label) btn.innerHTML = `<span class="spin" aria-hidden="true"></span>${label}`;
  return ()=>{                                // call to restore
    if(!btn.dataset.busy) return;
    btn.innerHTML = btn.dataset.label;
    btn.classList.remove('is-busy');
    btn.disabled = false;
    delete btn.dataset.busy; delete btn.dataset.label;
  };
}

const state = {
  cfg: null,            // {owner, repo, branch, origin, user} from api.php?action=config
  articles: [],         // [{path, sha, data}]
  ads: null, adsSha: null,
  editing: null,        // {path, sha} when editing an existing article
  lang: 'en',
  articlesPage: 0,
  // per-language editor buffers: {en:{headline,dek,bodyHtml,seoTitle,seoDesc,seoKeywords}, ...}
  buf: {},
  banner: '',           // committed path/URL, or dataURL pending upload
  filters: { status: 'all', banner: 'all', category: 'all', type: 'all', sort: 'newest' },
  articlesLoaded: false,
  saving: false,
};

/* ---------------- GitHub API (proxied through api.php) ---------------- */
async function gh(path, opts={}){
  const r = await fetch('api.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ method: opts.method || 'GET', path, body: opts.body ?? null }),
  });
  if(!r.ok) throw new Error(`Panel API ${r.status}`);
  const j = await r.json();
  if(j.status === 404) return null;
  if(j.status >= 400) throw new Error(`GitHub ${j.status}: ${JSON.stringify(j.body).slice(0,200)}`);
  return j.status === 204 ? true : j.body;
}
const repoPath = (p)=>`/repos/${state.cfg.owner}/${state.cfg.repo}/contents/${p}`;

async function getFile(path){
  const j = await gh(`${repoPath(path)}?ref=${state.cfg.branch}`);
  if(!j) return null;
  const text = decodeURIComponent(escape(atob(j.content.replace(/\n/g,''))));
  return { sha: j.sha, text };
}
async function putFile(path, text, message, sha){
  const body = {
    message, branch: state.cfg.branch,
    content: btoa(unescape(encodeURIComponent(text))),
  };
  if(sha) body.sha = sha;
  return gh(repoPath(path), { method:'PUT', body });
}
async function putBinary(path, base64, message){
  return gh(repoPath(path), { method:'PUT', body: {
    message, branch: state.cfg.branch, content: base64,
  }});
}
async function deleteFile(path, sha, message){
  return gh(repoPath(path), { method:'DELETE', body: {
    message, branch: state.cfg.branch, sha,
  }});
}
async function triggerBuild(){
  try{
    await gh(`/repos/${state.cfg.owner}/${state.cfg.repo}/actions/workflows/build.yml/dispatches`,
      { method:'POST', body: { ref: state.cfg.branch } });
    return true;
  }catch(e){ console.warn('build dispatch failed', e); return false; }
}

/* ---------------- auth ---------------- */
// The PHP session (lib.php/guard.php) already gates access to this page —
// just load the repo config and enter the panel.
async function boot(){
  try{
    const r = await fetch('api.php?action=config');
    if(!r.ok) throw new Error(`config ${r.status}`);
    state.cfg = await r.json();
    $('#who').textContent = state.cfg.user;
    enterApp();
  }catch(e){
    document.body.innerHTML = '<p style="padding:2rem;font-family:monospace">'
      + 'Failed to load panel config — is admin/config.php set up? '
      + '<a href="logout.php">Log out</a> and try again.</p>';
  }
}
function logout(){
  location.href = 'logout.php';
}
function enterApp(){
  $('#app').hidden = false;
  refreshAll();
}

/* ---------------- data load ---------------- */
async function loadArticles(){
  const listEl = $('#articles-list');
  if(listEl) listEl.innerHTML = '<div class="row"><span class="m">Loading articles…</span></div>';
  const list = await gh(`${repoPath('content/articles')}?ref=${state.cfg.branch}`) || [];
  const files = list.filter(f=>f.name.endsWith('.json'));
  const fetched = await Promise.all(files.map(async f=>{
    try{
      const got = await getFile(`content/articles/${f.name}`);
      return { path:`content/articles/${f.name}`, sha: got.sha, data: JSON.parse(got.text) };
    }catch(e){ console.warn('bad article json', f.name, e); return null; }
  }));
  const out = fetched.filter(Boolean);
  out.sort((a,b)=> (a.data.date < b.data.date ? 1 : -1));
  state.articles = out;
  state.articlesLoaded = true;
}
async function loadAds(){
  const got = await getFile('content/data/ads.json');
  state.adsSha = got ? got.sha : null;
  state.ads = got ? JSON.parse(got.text) : { slots:{}, popup:{} };
}
async function refreshAll(){
  await Promise.all([loadArticles(), loadAds()]);
  renderDashboard(); renderArticles(); renderAds();
}

/* ---------------- helpers ---------------- */
function articleStatus(a){
  if(a.status === 'draft') return 'draft';
  if(a.publishAt && Date.parse(a.publishAt) > Date.now()) return 'scheduled';
  return 'published';
}
function slugify(s){
  return s.toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu,'-')
    .replace(/^-+|-+$/g,'').slice(0,80) || `article-${Date.now()}`;
}
function pickL(loc){ if(!loc) return ''; return loc.en || Object.values(loc).find(Boolean) || ''; }
function readFileAsDataURL(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(file); });
}
function pickImage(accept){
  return new Promise((res)=>{
    const inp = $('#file-input');
    inp.value = '';
    inp.setAttribute('accept', accept || 'image/*,.gif');
    inp.onchange = async ()=>{
      if(!inp.files[0]) return res(null);
      res({ file: inp.files[0], dataUrl: await readFileAsDataURL(inp.files[0]) });
    };
    inp.click();
  });
}
/** Resolve a possibly-relative repo path (legacy articles) to an absolute, browser-loadable URL. */
function resolveAssetUrl(src){
  if(!src || src.startsWith('data:') || /^https?:\/\//i.test(src)) return src;
  return `${state.cfg.origin}/${src.replace(/^\/+/,'')}`;
}
/** Upload a data: URL image to assets/uploads/, return the absolute site URL. */
async function uploadDataUrl(dataUrl, nameHint){
  const m = dataUrl.match(/^data:image\/([a-z+]+);base64,(.+)$/is);
  if(!m) throw new Error('unsupported image');
  const ext = m[1] === 'jpeg' ? 'jpg' : m[1].replace('svg+xml','svg');
  const name = `${Date.now()}-${slugify(nameHint||'img').slice(0,40)}.${ext}`;
  const path = `assets/uploads/${name}`;
  await putBinary(path, m[2], `panel: upload ${name}`);
  return `${state.cfg.origin}/${path}`;
}
/** Like uploadDataUrl but also accepts video (MP4) — used for ad creatives. */
async function uploadMediaDataUrl(dataUrl, nameHint){
  const m = dataUrl.match(/^data:(image|video)\/([a-z0-9.+-]+);base64,(.+)$/is);
  if(!m) throw new Error('unsupported media — upload an image, GIF or MP4');
  const sub = m[2].toLowerCase();
  const ext = sub === 'jpeg' ? 'jpg' : sub === 'quicktime' ? 'mov' : sub.replace('svg+xml','svg');
  const name = `${Date.now()}-${slugify(nameHint||'ad').slice(0,40)}.${ext}`;
  const path = `assets/uploads/${name}`;
  await putBinary(path, m[3], `panel: upload ${name}`);
  return `${state.cfg.origin}/${path}`;
}

/* ---------------- views ---------------- */
function show(view){
  $$('.view').forEach(v=>v.hidden = true);
  $(`#view-${view}`).hidden = false;
  $$('.mainnav button').forEach(b=>b.classList.toggle('active', b.dataset.view===view));
}

/* ----- dashboard ----- */
function renderDashboard(){
  const counts = { published:0, scheduled:0, draft:0 };
  const cats = {};
  state.articles.forEach(({data})=>{
    counts[articleStatus(data)]++;
    cats[data.category] = (cats[data.category]||0)+1;
  });
  $('#stats').innerHTML = `
    <div class="stat"><div class="n">${state.articles.length}</div><div class="l">Total articles</div></div>
    <div class="stat"><div class="n">${counts.published}</div><div class="l">Published</div></div>
    <div class="stat"><div class="n">${counts.scheduled}</div><div class="l">Waiting to publish</div></div>
    <div class="stat"><div class="n">${counts.draft}</div><div class="l">Drafts</div></div>`;
  const sched = state.articles.filter(a=>articleStatus(a.data)==='scheduled');
  $('#scheduled-list').innerHTML = sched.length ? sched.map(a=>`
    <div class="row"><div><div class="t">${esc(pickL(a.data.headline))}</div>
      <div class="m">${esc(a.data.publishAt||'')}</div></div>
      <span class="pill scheduled">scheduled</span></div>`).join('')
    : '<div class="row"><span class="m">Nothing scheduled.</span></div>';
  $('#cat-list').innerHTML = Object.entries(cats).sort((a,b)=>b[1]-a[1]).map(([c,n])=>`
    <div class="row"><span class="t">${esc(c.toUpperCase())}</span><span class="m">${n}</span></div>`).join('')
    || '<div class="row"><span class="m">No articles yet.</span></div>';
}

/* ----- articles list ----- */
const ARTICLES_PAGE_SIZE = 20;
const FILTER_DEFAULTS = { status:'all', banner:'all', category:'all', type:'all', sort:'newest' };
function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
// Light up any filter that differs from its default and reveal the Reset button,
// so it's always visually clear which filters are narrowing the list.
function syncFilterChrome(){
  const map = { 'filter-status':'status', 'filter-banner':'banner',
    'filter-category':'category', 'filter-type':'type', 'filter-sort':'sort' };
  let anyActive = false;
  Object.entries(map).forEach(([id, key])=>{
    const el = $('#'+id); if(!el) return;
    const active = state.filters[key] !== FILTER_DEFAULTS[key];
    el.classList.toggle('is-active', active);
    if(active) anyActive = true;
  });
  const reset = $('#btn-filter-reset');
  if(reset) reset.hidden = !anyActive;
}
function renderArticles(){
  // Apply active filters
  const f = state.filters;
  let items = state.articles.slice();
  if(f.status !== 'all') items = items.filter(a => articleStatus(a.data) === f.status);
  if(f.banner === 'has') items = items.filter(a => !!a.data.banner);
  if(f.banner === 'no') items = items.filter(a => !a.data.banner);
  if(f.category !== 'all') items = items.filter(a => a.data.category === f.category);
  if(f.type === 'featured') items = items.filter(a => !!a.data.featured);
  if(f.sort === 'oldest') items.sort((a,b) => a.data.date > b.data.date ? 1 : -1);

  syncFilterChrome();
  const countEl = $('#filter-count');
  if(countEl) countEl.textContent = items.length < state.articles.length
    ? `${items.length} / ${state.articles.length} articles`
    : `${state.articles.length} articles`;

  const total = items.length;
  const pages = Math.max(1, Math.ceil(total / ARTICLES_PAGE_SIZE));
  state.articlesPage = Math.min(state.articlesPage || 0, pages - 1);
  const start = state.articlesPage * ARTICLES_PAGE_SIZE;
  const pageItems = items.slice(start, start + ARTICLES_PAGE_SIZE);
  $('#articles-list').innerHTML = pageItems.map((a)=>{
    const i = state.articles.indexOf(a);
    const st = articleStatus(a.data);
    const noBanner = st !== 'draft' && !a.data.banner
      ? '<span class="pill nobanner">No Banner</span>' : '';
    return `<div class="row">
      <div><div class="t">${esc(pickL(a.data.headline))}</div>
        <div class="m">${esc(a.data.category)} · ${esc(a.data.date)} · ${esc(a.data.author||'')}</div></div>
      <div class="actions">
        <span class="pill ${st}">${st}</span>
        ${noBanner}
        <button class="ghost mono" data-edit="${i}">Edit</button>
      </div></div>`;
  }).join('') || '<div class="row"><span class="m">No articles match this filter.</span></div>';
  $$('#articles-list [data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(state.articles[+b.dataset.edit])));

  $('#articles-pager').innerHTML = pages > 1 ? `
    <button class="ghost" id="pager-prev" ${state.articlesPage===0?'disabled':''}>&larr; Prev</button>
    <span class="m">Page ${state.articlesPage+1} of ${pages}</span>
    <button class="ghost" id="pager-next" ${state.articlesPage>=pages-1?'disabled':''}>Next &rarr;</button>` : '';
  const prev = $('#pager-prev'), next = $('#pager-next');
  if(prev) prev.addEventListener('click', ()=>{ state.articlesPage--; renderArticles(); });
  if(next) next.addEventListener('click', ()=>{ state.articlesPage++; renderArticles(); });
}

/* ----- editor ----- */
function emptyBuf(){ return { headline:'', dek:'', bodyHtml:'', seoTitle:'', seoDesc:'', seoKeywords:'' }; }

function mdToHtml(src){
  // mirror of build/templates.ts md() — used when editing agent-written articles
  const lines = String(src||'').replace(/\r\n/g,'\n').split('\n');
  const out = []; let inList = false, inGallery = false;
  const inline = t => esc(t)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>');
  const closeList = ()=>{ if(inList){ out.push('</ul>'); inList=false; } };
  for(const raw of lines){
    const line = raw.trim();
    if(!line){ closeList(); continue; }
    const img = line.match(/^!\[([^\]]*)\]\(([^)\s]+)\)$/);
    if(line === ':::gallery'){ closeList(); out.push('<div class="article-gallery">'); inGallery = true; }
    else if(line === ':::' && inGallery){ out.push('</div>'); inGallery = false; }
    else if(img){
      closeList();
      const tag = `<img src="${esc(resolveAssetUrl(img[2]))}" alt="${esc(img[1])}">`;
      out.push(inGallery ? `<figure>${tag}</figure>` : `<figure class="article-figure">${tag}</figure>`);
    }
    else if(line.startsWith('### ')){ closeList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); }
    else if(line.startsWith('## ')){ closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if(line.startsWith('- ')){ if(!inList){ out.push('<ul>'); inList=true; } out.push(`<li>${inline(line.slice(2))}</li>`); }
    else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
  if(inGallery) out.push('</div>');
  return out.join('\n');
}

function newArticle(){
  state.editing = null;
  state.buf = {}; LANGS.forEach(l=>state.buf[l]=emptyBuf());
  state.banner = '';
  $('#editor-title').textContent = 'New article';
  $('#editor-status-pill').textContent = '';
  $('#f-status').value = 'published';
  $('#f-publish-at').value = '';
  $('#schedule-row').hidden = true;
  $('#f-author').value = 'MAXGAZINE Desk';
  $('#f-slug').value = '';
  $('#f-category').value = 'crypto';
  $('#f-tags').value = '';
  $('#f-featured').checked = false;
  $('#btn-delete').hidden = true;
  $('#save-msg').textContent = '';
  setBanner('');
  show('editor');
  setLang('en', true);
}
function openEditor(entry){
  const d = entry.data;
  state.editing = { path: entry.path, sha: entry.sha };
  state.buf = {};
  LANGS.forEach(l=>{
    state.buf[l] = {
      headline: d.headline?.[l] || '',
      dek: d.dek?.[l] || '',
      bodyHtml: d.bodyHtml?.[l] || (d.body?.[l] ? mdToHtml(d.body[l]) : ''),
      seoTitle: d.seo?.title?.[l] || '',
      seoDesc: d.seo?.description?.[l] || '',
      seoKeywords: (d.seo?.keywords?.[l] || []).join(', '),
    };
  });
  state.banner = d.banner || '';
  const st = articleStatus(d);
  $('#editor-title').textContent = 'Edit article';
  $('#editor-status-pill').textContent = st.toUpperCase();
  $('#f-status').value = st === 'scheduled' ? 'scheduled' : (d.status === 'draft' ? 'draft' : 'published');
  $('#f-publish-at').value = d.publishAt ? toLocalInput(d.publishAt) : '';
  $('#schedule-row').hidden = $('#f-status').value !== 'scheduled';
  $('#f-author').value = d.author || 'MAXGAZINE Desk';
  $('#f-slug').value = d.slug || '';
  $('#f-category').value = d.category || 'crypto';
  $('#f-tags').value = (d.tags||[]).join(', ');
  $('#f-featured').checked = !!d.featured;
  $('#btn-delete').hidden = false;
  $('#save-msg').textContent = '';
  setBanner(state.banner);
  show('editor');
  setLang('en', true);
}
function toLocalInput(iso){
  const d = new Date(iso); if(isNaN(d)) return '';
  const p = n=>String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}
function saveCurrentLangToBuf(){
  const b = state.buf[state.lang]; if(!b) return;
  b.headline = $('#f-headline').value;
  b.dek = $('#f-dek').value;
  b.bodyHtml = $('#f-body').innerHTML.trim() === '<br>' ? '' : $('#f-body').innerHTML;
  b.seoTitle = $('#f-seo-title').value;
  b.seoDesc = $('#f-seo-desc').value;
  b.seoKeywords = $('#f-seo-keywords').value;
}
function autoGrow(el){
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}
// Re-measure across layout/font settling: the first pass can run before the
// display font has loaded (giving a too-short height that clips a long,
// multi-line headline), so grow again next frame and once fonts are ready.
function growHeadline(){
  const el = $('#f-headline');
  if(!el) return;
  autoGrow(el);
  requestAnimationFrame(()=>autoGrow(el));
  if(document.fonts && document.fonts.ready) document.fonts.ready.then(()=>autoGrow(el));
}
function setLang(lang, skipSave){
  if(!skipSave) saveCurrentLangToBuf();
  state.lang = lang;
  const b = state.buf[lang] || emptyBuf();
  $('#f-headline').value = b.headline;
  $('#f-dek').value = b.dek;
  $('#f-body').innerHTML = b.bodyHtml;
  $('#f-seo-title').value = b.seoTitle;
  $('#f-seo-desc').value = b.seoDesc;
  $('#f-seo-keywords').value = b.seoKeywords;
  const rtl = RTL.includes(lang);
  ['#f-headline','#f-dek','#f-body','#f-seo-title','#f-seo-desc'].forEach(s=>$(s).setAttribute('dir', rtl?'rtl':'ltr'));
  ['#f-headline','#f-dek','#f-body'].forEach(s=>$(s).classList.toggle('lang-fa', lang==='fa'));
  growHeadline();
  $$('#lang-tabs button').forEach(t=>{
    t.classList.toggle('active', t.dataset.elang===lang);
    t.classList.toggle('has-content', !!(state.buf[t.dataset.elang]?.headline));
  });
}
function setBanner(src){
  const img = $('#banner-img');
  if(src){ img.src = resolveAssetUrl(src); img.hidden = false; $('#btn-banner-remove').hidden = false; $('#btn-banner').textContent = '⇄ Replace banner'; }
  else { img.removeAttribute('src'); img.hidden = true; $('#btn-banner-remove').hidden = true; $('#btn-banner').textContent = '＋ Banner image'; }
}

async function saveArticle(){
  if(state.saving) return;
  saveCurrentLangToBuf();
  const msg = $('#save-msg');
  const filled = LANGS.filter(l=>state.buf[l].headline.trim());
  if(!filled.length){ msg.textContent = 'Write a headline in at least one language.'; return; }
  if($('#f-featured').checked && !state.banner){ msg.textContent = 'Featured articles need a banner image — add one above.'; return; }
  msg.textContent = 'Saving…';
  const restoreSave = btnBusy($('#btn-save'), 'Saving…');
  state.saving = true;
  try{
    // 1) upload any pasted/inserted images that are still data: URLs
    for(const l of filled){
      const div = document.createElement('div');
      div.innerHTML = state.buf[l].bodyHtml;
      for(const img of [...div.querySelectorAll('img')]){
        if(img.src.startsWith('data:')) img.src = await uploadDataUrl(img.src, state.buf[l].headline);
        img.removeAttribute('style');
      }
      state.buf[l].bodyHtml = div.innerHTML;
    }
    let banner = state.banner;
    if(banner.startsWith('data:')) banner = await uploadDataUrl(banner, 'banner');

    // 2) assemble article JSON (only languages that were written)
    const loc = (key)=>Object.fromEntries(filled.map(l=>[l, state.buf[l][key]]));
    const statusSel = $('#f-status').value;
    const publishAtLocal = $('#f-publish-at').value;
    const slug = ($('#f-slug').value.trim() || slugify(state.buf[filled[0]].headline));
    $('#f-slug').value = slug;
    const article = {
      slug,
      category: $('#f-category').value,
      date: new Date().toISOString().slice(0,10),
      author: $('#f-author').value.trim() || 'MAXGAZINE Desk',
      headline: loc('headline'),
      dek: loc('dek'),
      body: Object.fromEntries(filled.map(l=>[l, ''])),  // rich HTML is the source for panel articles
      bodyHtml: loc('bodyHtml'),
      seo: {
        title: Object.fromEntries(filled.map(l=>[l, state.buf[l].seoTitle || `${state.buf[l].headline} — MAXGAZINE`])),
        description: Object.fromEntries(filled.map(l=>[l, state.buf[l].seoDesc || state.buf[l].dek])),
        keywords: Object.fromEntries(filled.map(l=>[l, (state.buf[l].seoKeywords||$('#f-tags').value).split(',').map(s=>s.trim()).filter(Boolean)])),
      },
      sources: [],
      tags: $('#f-tags').value.split(',').map(s=>s.trim()).filter(Boolean),
      status: statusSel === 'draft' ? 'draft' : 'published',
      ...(statusSel === 'scheduled' && publishAtLocal ? { publishAt: new Date(publishAtLocal).toISOString() } : {}),
      ...(banner ? { banner } : {}),
      featured: $('#f-featured').checked,
    };
    if(state.editing){
      const existing = state.articles.find(a=>a.path===state.editing.path);
      if(existing) article.date = existing.data.date;  // keep the original publish date
    }

    // 3) commit
    const path = state.editing?.path || `content/articles/${slug}.json`;

    // Guard against duplicate slugs when creating a new article
    if(!state.editing && state.articles.some(a => a.path === path)){
      msg.textContent = `Slug "${slug}" already exists — change the slug field or open the existing article to edit it.`;
      restoreSave();
      state.saving = false;
      return;
    }

    const result = await putFile(path, JSON.stringify(article, null, 2), `panel: ${state.editing?'update':'create'} ${slug}`, state.editing?.sha);
    state.banner = banner;

    // Pin editing state from the API response immediately — don't rely on
    // loadArticles() finding the file (GitHub has a short propagation delay that
    // can make a just-committed file temporarily invisible, causing the next
    // save to create a duplicate instead of updating).
    const newSha = result?.content?.sha;
    state.editing = { path, sha: newSha || state.editing?.sha };

    // 4) kick the site build (unless it's a draft or scheduled for later)
    const willGoLive = statusSel === 'published' || (statusSel==='scheduled' && publishAtLocal && Date.parse(publishAtLocal) <= Date.now());
    if(willGoLive) await triggerBuild();
    msg.textContent = statusSel==='draft' ? 'Draft saved.' :
      statusSel==='scheduled' ? `Scheduled — goes live ${publishAtLocal.replace('T',' ')}.` :
      'Saved & deploying — live in ~2 minutes.';
    await loadArticles(); renderDashboard(); renderArticles();
    // Refresh editing SHA from the reloaded list if available (keeps SHA in sync
    // for subsequent saves without needing a manual refresh)
    const saved = state.articles.find(a=>a.path===path);
    if(saved) state.editing = { path, sha: saved.sha };
  }catch(e){
    msg.textContent = `Save failed: ${e.message}`;
  }finally{
    restoreSave();
    state.saving = false;
  }
}

async function removeArticle(){
  if(!state.editing) return;
  if(!confirm('Delete this article from the site? This cannot be undone from the panel.')) return;
  try{
    await deleteFile(state.editing.path, state.editing.sha, `panel: delete ${state.editing.path}`);
    await triggerBuild();
    await loadArticles(); renderDashboard(); renderArticles();
    show('articles');
  }catch(e){ $('#save-msg').textContent = `Delete failed: ${e.message}`; }
}

/* ----- ads ----- */
const SLOT_LABELS = {
  leaderboard: 'Leaderboard — top strip (wide)',
  sponsored:   'Sponsored story slot',
  newsletter:  'Newsletter banner',
  sidebar1:    'Homepage sidebar — square 1',
  sidebar2:    'Homepage sidebar — square 2',
  advertorial: 'Advertorial strip (homepage)',
  exchange:    'Exchange spotlight (coin pages)',
};
// Recommended creative size per slot, shown to the writer so they don't upload a
// stretched or cropped image. Slots not listed fall back to no hint.
const SLOT_HINTS = {
  leaderboard: 'Recommended image size: 1200 × 400px (3:1, wide banner). JPG, PNG or WEBP.',
  sponsored:   'Recommended image size: 1200 × 400px (3:1, wide banner). JPG, PNG or WEBP.',
  newsletter:  'Recommended image size: 1200 × 400px (3:1, wide banner). JPG, PNG or WEBP.',
  sidebar1:    'Square box next to the homepage "Latest" feed. Recommended image size: 600 × 600px (1:1 square), JPG/PNG/WEBP, ideally under 300KB.',
  sidebar2:    'Square box next to the homepage "Latest" feed, below slot 1. Recommended image size: 600 × 600px (1:1 square), JPG/PNG/WEBP, ideally under 300KB.',
  advertorial: 'Recommended image size: 1200 × 400px (3:1, wide banner). JPG, PNG or WEBP.',
  exchange:    'Square box in the coin-page sidebar. Recommended image size: 600 × 600px (1:1 square), JPG/PNG/WEBP, ideally under 300KB.',
  popup:       'Recommended image size: 600 × 800px (3:4, portrait). JPG, PNG or WEBP.',
};
function adTypeOf(ad){ return ad.type || 'image'; }
function adPreviewHTML(ad){
  const t = adTypeOf(ad);
  if(t === 'video'){ const v = ad.video || ad.image; return v ? `<video src="${esc(v)}" muted autoplay loop playsinline></video>` : 'NO CREATIVE'; }
  return ad.image ? `<img src="${esc(ad.image)}" alt="">` : 'NO CREATIVE';
}
function adCard(key, ad, isPopup){
  const label = isPopup ? 'Popup (overlay on visit)' : (SLOT_LABELS[key] || key);
  const hint = SLOT_HINTS[key];
  const t = adTypeOf(ad);
  const mediaUrl = t === 'video' ? (ad.video || ad.image || '') : (ad.image || '');
  return `<div class="ad-card" data-slot="${key}" data-popup="${isPopup?1:0}" data-type="${t}">
    <h3>${esc(label)}
      <span class="switch"><input type="checkbox" class="a-enabled" ${ad.enabled?'checked':''}> live</span></h3>
    ${hint?`<p class="mono ad-hint">${esc(hint)}</p>`:''}
    <label class="mono">Creative type
      <select class="a-type">
        <option value="image"${t==='image'?' selected':''}>Image — JPG / PNG / WEBP</option>
        <option value="gif"${t==='gif'?' selected':''}>GIF — animated</option>
        <option value="video"${t==='video'?' selected':''}>Video — MP4</option>
        <option value="script"${t==='script'?' selected':''}>Script / embed code</option>
      </select>
    </label>
    <div class="preview">${adPreviewHTML(ad)}</div>
    <div class="ad-f-media">
      <label class="mono">Media URL <input class="a-image" value="${esc(mediaUrl)}" placeholder="https://… or upload below"></label>
      <button class="ghost mono a-upload" type="button">⬆ Upload file</button>
    </div>
    <div class="ad-f-code">
      <label class="mono">Embed / script code
        <textarea class="a-code" rows="6" spellcheck="false" placeholder="Paste any HTML/JS embed, e.g. an ad-network tag or a &lt;script&gt;…&lt;/script&gt; snippet">${esc(ad.code||'')}</textarea>
      </label>
      <p class="mono note">Runs as-is on the live site. Paste only code from sources you trust.</p>
    </div>
    <label class="mono" style="margin-top:12px">Destination link <input class="a-link" value="${esc(ad.link||'')}" placeholder="https://…"></label>
    <label class="mono">Alt text <input class="a-alt" value="${esc(ad.alt||'')}"></label>
    ${isPopup?`
    <label class="mono">Show again after (hours) <input class="a-freq" type="number" value="${Number(ad.frequencyHours)||24}"></label>
    <label class="mono">Delay before showing (seconds) <input class="a-delay" type="number" value="${Number(ad.delaySeconds)||4}"></label>`:''}
  </div>`;
}
function renderAds(){
  if(!state.ads) return;
  const slots = state.ads.slots || {};
  const keys = ['leaderboard','sponsored','newsletter','sidebar1','sidebar2','advertorial','exchange'];
  $('#ads-list').innerHTML =
    keys.map(k=>adCard(k, slots[k]||{}, false)).join('') +
    adCard('popup', state.ads.popup||{}, true);
  // Switching creative type just flips which fields the card shows (CSS keys off
  // data-type); nothing is saved until "Save all placements".
  $$('#ads-list .a-type').forEach(sel=>sel.addEventListener('change', ()=>{
    sel.closest('.ad-card').dataset.type = sel.value;
  }));
  $$('#ads-list .a-upload').forEach(b=>b.addEventListener('click', async ()=>{
    const card = b.closest('.ad-card');
    const type = card.dataset.type;
    const accept = type === 'video' ? 'video/mp4,.mp4'
      : type === 'gif' ? 'image/gif,.gif' : 'image/*,.gif';
    const picked = await pickImage(accept); if(!picked) return;
    card.querySelector('.a-image').value = picked.dataUrl;  // uploaded on save
    card.querySelector('.preview').innerHTML = type === 'video'
      ? `<video src="${picked.dataUrl}" muted autoplay loop playsinline></video>`
      : `<img src="${picked.dataUrl}" alt="">`;
    // Confirm the file is queued — it's only sent to GitHub on "Save all placements".
    b.classList.add('is-picked');
    b.textContent = '✓ File ready — Save to upload';
  }));
}
async function saveAds(){
  const msg = $('#ads-msg');
  msg.textContent = 'Saving…';
  const restore = btnBusy($('#btn-ads-save'), 'Saving…');
  try{
    const ads = { updated: new Date().toISOString(), slots: {}, popup: {} };
    for(const card of $$('#ads-list .ad-card')){
      const type = card.dataset.type || 'image';
      const entry = {
        enabled: card.querySelector('.a-enabled').checked,
        type,
        link: card.querySelector('.a-link').value.trim(),
        alt: card.querySelector('.a-alt').value.trim(),
      };
      if(type === 'script'){
        entry.code = card.querySelector('.a-code').value;
      }else{
        let media = card.querySelector('.a-image').value.trim();
        if(media.startsWith('data:')){
          msg.textContent = `Uploading ${card.dataset.slot} creative…`;
          media = await uploadMediaDataUrl(media, `ad-${card.dataset.slot}`);
        }
        if(type === 'video') entry.video = media; else entry.image = media;
      }
      if(card.dataset.popup === '1'){
        entry.frequencyHours = Number(card.querySelector('.a-freq').value)||24;
        entry.delaySeconds = Number(card.querySelector('.a-delay').value)||0;
        ads.popup = entry;
      }else{
        ads.slots[card.dataset.slot] = entry;
      }
    }
    await putFile('content/data/ads.json', JSON.stringify(ads, null, 2), 'panel: update ad placements', state.adsSha);
    await loadAds(); renderAds();
    msg.textContent = 'Placements saved — live on next page load after deploy.';
  }catch(e){
    msg.textContent = `Save failed: ${e.message}`;
  }finally{
    restore();
  }
}

/* ---------------- editor commands ---------------- */
function exec(cmd, val){ document.execCommand(cmd, false, val); $('#f-body').focus(); }
function initToolbar(){
  $$('#toolbar [data-cmd]').forEach(b=>b.addEventListener('click', e=>{
    e.preventDefault();
    exec(b.dataset.cmd, b.dataset.val ? `<${b.dataset.val}>` : undefined);
  }));
  $('#btn-link').addEventListener('click', ()=>{
    const sel = window.getSelection();
    if(!sel || sel.isCollapsed){ alert('Select the text you want to link first.'); return; }
    const url = prompt('Link URL:', 'https://');
    if(url) exec('createLink', url);
  });
  $('#btn-font-up').addEventListener('click', ()=>exec('fontSize', '5'));
  $('#btn-font-down').addEventListener('click', ()=>exec('fontSize', '2'));
  $('#btn-img').addEventListener('click', async ()=>{
    const picked = await pickImage(); if(!picked) return;
    exec('insertImage', picked.dataUrl);  // swapped for a hosted URL on save
  });
  $('#btn-banner').addEventListener('click', async ()=>{
    const picked = await pickImage(); if(!picked) return;
    state.banner = picked.dataUrl;
    setBanner(picked.dataUrl);
  });
  $('#btn-banner-remove').addEventListener('click', ()=>{ state.banner=''; setBanner(''); });
}

/* ---------------- wire-up ---------------- */
document.addEventListener('DOMContentLoaded', ()=>{
  $('#btn-logout').addEventListener('click', logout);
  $$('.mainnav button, #btn-new').forEach(b=>b.addEventListener('click', ()=>{
    const v = b.dataset.view;
    if(v === 'editor') newArticle();
    else {
      show(v);
      if(v==='dashboard'||v==='articles'){
        // Only fetch from GitHub on first load — use cached state for subsequent
        // navigation. User can force a refresh with the ⟳ Refresh button.
        if(!state.articlesLoaded) refreshAll();
        else { renderDashboard(); renderArticles(); }
      }
    }
  }));

  // Filter bar
  const filterMap = { 'filter-status':'status', 'filter-banner':'banner',
    'filter-category':'category', 'filter-type':'type', 'filter-sort':'sort' };
  Object.entries(filterMap).forEach(([id, key])=>{
    const el = $('#'+id); if(!el) return;
    el.addEventListener('change', ()=>{
      state.filters[key] = el.value;
      state.articlesPage = 0;
      renderArticles();
    });
  });
  $('#btn-filter-reset').addEventListener('click', ()=>{
    state.filters = { ...FILTER_DEFAULTS };
    $('#filter-status').value = 'all'; $('#filter-banner').value = 'all';
    $('#filter-category').value = 'all'; $('#filter-type').value = 'all';
    $('#filter-sort').value = 'newest';
    state.articlesPage = 0;
    renderArticles();
  });
  $('#btn-refresh').addEventListener('click', refreshAll);
  $('#f-status').addEventListener('change', ()=>{
    $('#schedule-row').hidden = $('#f-status').value !== 'scheduled';
  });
  $('#f-headline').addEventListener('input', ()=>{
    autoGrow($('#f-headline'));
    if(!state.editing && !$('#f-slug').value && state.lang==='en')
      $('#f-slug').placeholder = slugify($('#f-headline').value)||'auto from headline';
  });
  $$('#lang-tabs button').forEach(t=>t.addEventListener('click', ()=>setLang(t.dataset.elang)));
  $('#btn-save').addEventListener('click', saveArticle);
  $('#btn-delete').addEventListener('click', removeArticle);
  $('#btn-seo-auto').addEventListener('click', e=>{
    e.preventDefault();
    saveCurrentLangToBuf();
    const b = state.buf[state.lang];
    const text = $('#f-body').textContent.trim();
    $('#f-seo-title').value = b.seoTitle || (b.headline ? `${b.headline} — MAXGAZINE` : '');
    $('#f-seo-desc').value = b.seoDesc || b.dek || text.slice(0,155);
    $('#f-seo-keywords').value = b.seoKeywords || $('#f-tags').value;
  });
  $('#btn-ads-save').addEventListener('click', saveAds);
  $('#btn-build').addEventListener('click', async ()=>{
    $('#btn-build').textContent = '⟳ Deploying…';
    const ok = await triggerBuild();
    $('#btn-build').textContent = ok ? '✓ Build started' : '✕ Build failed';
    setTimeout(()=>$('#btn-build').textContent='⟳ Deploy site', 4000);
  });
  initToolbar();
  boot();
});
