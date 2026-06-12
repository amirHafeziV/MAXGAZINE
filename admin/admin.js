/* ============================================================
   MasterWriter — MAXGAZINE publishing panel
   Static panel that talks straight to the GitHub Contents API:
   articles -> content/articles/*.json, ads -> content/data/ads.json,
   images -> assets/uploads/. The site build (GitHub Actions) turns
   content into static HTML, releasing scheduled articles hourly.
   ============================================================ */

const LANGS = ['en','fa','ar','tr'];
const RTL = ['fa','ar'];
const API = 'https://api.github.com';
const $ = (s)=>document.querySelector(s);
const $$ = (s)=>[...document.querySelectorAll(s)];

const state = {
  cfg: null,            // {token, owner, repo, branch, origin}
  articles: [],         // [{path, sha, data}]
  ads: null, adsSha: null,
  editing: null,        // {path, sha} when editing an existing article
  lang: 'en',
  // per-language editor buffers: {en:{headline,dek,bodyHtml,seoTitle,seoDesc,seoKeywords}, ...}
  buf: {},
  banner: '',           // committed path/URL, or dataURL pending upload
};

/* ---------------- GitHub API ---------------- */
async function gh(path, opts={}){
  const r = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Authorization': `Bearer ${state.cfg.token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(opts.headers||{}),
    },
  });
  if(r.status === 404) return null;
  if(!r.ok) throw new Error(`GitHub ${r.status}: ${(await r.text()).slice(0,200)}`);
  return r.status === 204 ? true : r.json();
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
  return gh(repoPath(path), { method:'PUT', body: JSON.stringify(body) });
}
async function putBinary(path, base64, message){
  return gh(repoPath(path), { method:'PUT', body: JSON.stringify({
    message, branch: state.cfg.branch, content: base64,
  })});
}
async function deleteFile(path, sha, message){
  return gh(repoPath(path), { method:'DELETE', body: JSON.stringify({
    message, branch: state.cfg.branch, sha,
  })});
}
async function triggerBuild(){
  try{
    await gh(`/repos/${state.cfg.owner}/${state.cfg.repo}/actions/workflows/build.yml/dispatches`,
      { method:'POST', body: JSON.stringify({ ref: state.cfg.branch }) });
    return true;
  }catch(e){ console.warn('build dispatch failed', e); return false; }
}

/* ---------------- auth ---------------- */
async function login(){
  const cfg = {
    token: $('#login-token').value.trim(),
    owner: $('#login-owner').value.trim(),
    repo: $('#login-repo').value.trim(),
    branch: $('#login-branch').value.trim() || 'main',
    origin: ($('#login-origin').value.trim() || 'https://maxgazine.com').replace(/\/$/,''),
  };
  if(!cfg.token){ $('#login-err').textContent = 'Token required.'; return; }
  state.cfg = cfg;
  $('#login-err').textContent = '';
  try{
    const me = await gh('/user');
    await gh(`/repos/${cfg.owner}/${cfg.repo}`);
    localStorage.setItem('mw_cfg', JSON.stringify(cfg));
    $('#who').textContent = me.login;
    enterApp();
  }catch(e){
    state.cfg = null;
    $('#login-err').textContent = 'Login failed — check token & repo access.';
  }
}
function logout(){
  localStorage.removeItem('mw_cfg');
  location.reload();
}
function enterApp(){
  $('#view-login').hidden = true;
  $('#app').hidden = false;
  refreshAll();
}

/* ---------------- data load ---------------- */
async function loadArticles(){
  const list = await gh(`${repoPath('content/articles')}?ref=${state.cfg.branch}`) || [];
  const files = list.filter(f=>f.name.endsWith('.json'));
  const out = [];
  for(const f of files){
    try{
      const got = await getFile(`content/articles/${f.name}`);
      out.push({ path:`content/articles/${f.name}`, sha: got.sha, data: JSON.parse(got.text) });
    }catch(e){ console.warn('bad article json', f.name, e); }
  }
  out.sort((a,b)=> (a.data.date < b.data.date ? 1 : -1));
  state.articles = out;
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
function pickImage(){
  return new Promise((res)=>{
    const inp = $('#file-input');
    inp.value = '';
    inp.onchange = async ()=>{
      if(!inp.files[0]) return res(null);
      res({ file: inp.files[0], dataUrl: await readFileAsDataURL(inp.files[0]) });
    };
    inp.click();
  });
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
function esc(s){ return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function renderArticles(){
  $('#articles-list').innerHTML = state.articles.map((a,i)=>{
    const st = articleStatus(a.data);
    return `<div class="row">
      <div><div class="t">${esc(pickL(a.data.headline))}</div>
        <div class="m">${esc(a.data.category)} · ${esc(a.data.date)} · ${esc(a.data.author||'')}</div></div>
      <div class="actions">
        <span class="pill ${st}">${st}</span>
        <button class="ghost mono" data-edit="${i}">Edit</button>
      </div></div>`;
  }).join('') || '<div class="row"><span class="m">No articles yet — write the first one.</span></div>';
  $$('#articles-list [data-edit]').forEach(b=>b.addEventListener('click',()=>openEditor(state.articles[+b.dataset.edit])));
}

/* ----- editor ----- */
function emptyBuf(){ return { headline:'', dek:'', bodyHtml:'', seoTitle:'', seoDesc:'', seoKeywords:'' }; }

function mdToHtml(src){
  // mirror of build/templates.ts md() — used when editing agent-written articles
  const lines = String(src||'').replace(/\r\n/g,'\n').split('\n');
  const out = []; let inList = false;
  const inline = t => esc(t)
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,'<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g,'<em>$1</em>');
  const closeList = ()=>{ if(inList){ out.push('</ul>'); inList=false; } };
  for(const raw of lines){
    const line = raw.trim();
    if(!line){ closeList(); continue; }
    if(line.startsWith('### ')){ closeList(); out.push(`<h3>${inline(line.slice(4))}</h3>`); }
    else if(line.startsWith('## ')){ closeList(); out.push(`<h2>${inline(line.slice(3))}</h2>`); }
    else if(line.startsWith('- ')){ if(!inList){ out.push('<ul>'); inList=true; } out.push(`<li>${inline(line.slice(2))}</li>`); }
    else { closeList(); out.push(`<p>${inline(line)}</p>`); }
  }
  closeList();
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
  $('#btn-delete').hidden = true;
  $('#save-msg').textContent = '';
  setBanner('');
  setLang('en', true);
  show('editor');
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
  $('#btn-delete').hidden = false;
  $('#save-msg').textContent = '';
  setBanner(state.banner);
  setLang('en', true);
  show('editor');
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
  $$('#lang-tabs button').forEach(t=>{
    t.classList.toggle('active', t.dataset.elang===lang);
    t.classList.toggle('has-content', !!(state.buf[t.dataset.elang]?.headline));
  });
}
function setBanner(src){
  const img = $('#banner-img');
  if(src){ img.src = src; img.hidden = false; $('#btn-banner-remove').hidden = false; $('#btn-banner').textContent = '⇄ Replace banner'; }
  else { img.removeAttribute('src'); img.hidden = true; $('#btn-banner-remove').hidden = true; $('#btn-banner').textContent = '＋ Banner image'; }
}

async function saveArticle(){
  saveCurrentLangToBuf();
  const msg = $('#save-msg');
  const filled = LANGS.filter(l=>state.buf[l].headline.trim());
  if(!filled.length){ msg.textContent = 'Write a headline in at least one language.'; return; }
  msg.textContent = 'Saving…';
  $('#btn-save').disabled = true;
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
    };
    if(state.editing){
      const existing = state.articles.find(a=>a.path===state.editing.path);
      if(existing) article.date = existing.data.date;  // keep the original publish date
    }

    // 3) commit
    const path = state.editing?.path || `content/articles/${slug}.json`;
    await putFile(path, JSON.stringify(article, null, 2), `panel: ${state.editing?'update':'create'} ${slug}`, state.editing?.sha);
    state.banner = banner;

    // 4) kick the site build (unless it's a draft or scheduled for later)
    const willGoLive = statusSel === 'published' || (statusSel==='scheduled' && publishAtLocal && Date.parse(publishAtLocal) <= Date.now());
    if(willGoLive) await triggerBuild();
    msg.textContent = statusSel==='draft' ? 'Draft saved.' :
      statusSel==='scheduled' ? `Scheduled — goes live ${publishAtLocal.replace('T',' ')}.` :
      'Saved & deploying — live in ~2 minutes.';
    await loadArticles(); renderDashboard(); renderArticles();
    const saved = state.articles.find(a=>a.path===path);
    if(saved) state.editing = { path, sha: saved.sha };
  }catch(e){
    msg.textContent = `Save failed: ${e.message}`;
  }finally{
    $('#btn-save').disabled = false;
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
  sidebar:     'Sidebar unit',
  advertorial: 'Advertorial strip (homepage)',
};
function adCard(key, ad, isPopup){
  const label = isPopup ? 'Popup (overlay on visit)' : (SLOT_LABELS[key] || key);
  return `<div class="ad-card" data-slot="${key}" data-popup="${isPopup?1:0}">
    <h3>${esc(label)}
      <span class="switch"><input type="checkbox" class="a-enabled" ${ad.enabled?'checked':''}> live</span></h3>
    <div class="preview">${ad.image?`<img src="${esc(ad.image)}" alt="">`:'NO CREATIVE'}</div>
    <label class="mono">Image / GIF URL <input class="a-image" value="${esc(ad.image||'')}"></label>
    <button class="ghost mono a-upload">⬆ Upload image / GIF</button>
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
  const keys = ['leaderboard','sponsored','newsletter','sidebar','advertorial'];
  $('#ads-list').innerHTML =
    keys.map(k=>adCard(k, slots[k]||{}, false)).join('') +
    adCard('popup', state.ads.popup||{}, true);
  $$('#ads-list .a-upload').forEach(b=>b.addEventListener('click', async ()=>{
    const picked = await pickImage(); if(!picked) return;
    const card = b.closest('.ad-card');
    card.querySelector('.preview').innerHTML = `<img src="${picked.dataUrl}" alt="">`;
    card.querySelector('.a-image').value = picked.dataUrl;  // uploaded on save
  }));
}
async function saveAds(){
  const msg = $('#ads-msg');
  msg.textContent = 'Saving…';
  $('#btn-ads-save').disabled = true;
  try{
    const ads = { updated: new Date().toISOString(), slots: {}, popup: {} };
    for(const card of $$('#ads-list .ad-card')){
      let image = card.querySelector('.a-image').value.trim();
      if(image.startsWith('data:')) image = await uploadDataUrl(image, `ad-${card.dataset.slot}`);
      const entry = {
        enabled: card.querySelector('.a-enabled').checked,
        image,
        link: card.querySelector('.a-link').value.trim(),
        alt: card.querySelector('.a-alt').value.trim(),
      };
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
    $('#btn-ads-save').disabled = false;
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
  $('#login-btn').addEventListener('click', login);
  $('#login-token').addEventListener('keydown', e=>{ if(e.key==='Enter') login(); });
  $('#btn-logout').addEventListener('click', logout);
  $$('.mainnav button, #btn-new').forEach(b=>b.addEventListener('click', ()=>{
    const v = b.dataset.view;
    if(v === 'editor') newArticle();
    else { show(v); if(v==='dashboard'||v==='articles') refreshAll(); }
  }));
  $('#f-status').addEventListener('change', ()=>{
    $('#schedule-row').hidden = $('#f-status').value !== 'scheduled';
  });
  $('#f-headline').addEventListener('input', ()=>{
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

  // auto-login from saved config
  const saved = localStorage.getItem('mw_cfg');
  if(saved){
    try{
      state.cfg = JSON.parse(saved);
      gh('/user').then(me=>{ $('#who').textContent = me.login; enterApp(); })
        .catch(()=>{ state.cfg=null; localStorage.removeItem('mw_cfg'); });
    }catch(e){ localStorage.removeItem('mw_cfg'); }
  }
});
