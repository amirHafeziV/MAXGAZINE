/* ============================================================
   MAXGAZINE — shared i18n (chrome) + language engine
   Page-specific strings: set window.PAGE_I = {en:{...},fa:{...},...}
   before this script runs; they are merged per language.
   ============================================================ */
window.I = {
  en:{
    nav_stories:"Stories",nav_topmarkets:"Top Markets",nav_prices:"Prices",nav_exchanges:"Crypto Exchanges",nav_brokers:"Brokers",nav_future:"Future",nav_about:"About",
    nav_crypto:"Crypto",nav_forex:"Forex",nav_tech:"Tech",nav_cars:"Cars",nav_analysis:"Market Analysis",nav_contact:"Contact Us",m_close:"Close",
    cta_advertise:"Advertise with us",cta_all:"All stories →",cta_view:"View all →",cta_read:"Read →",cta_more:"Load more",cta_buy:"Go premium",cta_visit:"Visit",
    foot_explore:"Explore",foot_markets:"Markets",foot_company:"Company",foot_lang:"Languages",
    f_stories:"Stories",f_chart:"Chart",f_future:"Future",f_prices:"Prices",f_exchanges:"Top Exchanges",f_brokers:"Top Brokers",f_about:"About Us",f_contact:"Contact Us",
    f_copy:"© 2026 MAXGAZINE — CRYPTO · FOREX · TECH · CARS",f_built:"MULTILINGUAL MARKET MEDIA"
  },
  fa:{
    nav_stories:"مطالب",nav_topmarkets:"بازارهای برتر",nav_prices:"قیمت‌ها",nav_exchanges:"صرافی‌های کریپتو",nav_brokers:"بروکرها",nav_future:"آینده",nav_about:"درباره",
    nav_crypto:"کریپتو",nav_forex:"فارکس",nav_tech:"تکنولوژی",nav_cars:"خودرو",nav_analysis:"تحلیل بازار",nav_contact:"تماس با ما",m_close:"بستن",
    cta_advertise:"تبلیغ با ما",cta_all:"همه مطالب ←",cta_view:"مشاهده همه ←",cta_read:"خواندن ←",cta_more:"بیشتر",cta_buy:"نسخه ویژه",cta_visit:"مشاهده",
    foot_explore:"کاوش",foot_markets:"بازارها",foot_company:"شرکت",foot_lang:"زبان‌ها",
    f_stories:"مطالب",f_chart:"نمودار",f_future:"آینده",f_prices:"قیمت‌ها",f_exchanges:"برترین صرافی‌ها",f_brokers:"برترین بروکرها",f_about:"درباره ما",f_contact:"تماس با ما",
    f_copy:"© ۲۰۲۶ مکس‌گزین — کریپتو · فارکس · تکنولوژی · خودرو",f_built:"رسانه چندزبانه بازار"
  },
  ar:{
    nav_stories:"المقالات",nav_topmarkets:"أبرز الأسواق",nav_prices:"الأسعار",nav_exchanges:"منصّات الكريبتو",nav_brokers:"الوسطاء",nav_future:"المستقبل",nav_about:"حول",
    nav_crypto:"كريبتو",nav_forex:"فوركس",nav_tech:"تقنية",nav_cars:"سيارات",nav_analysis:"تحليل السوق",nav_contact:"تواصل معنا",m_close:"إغلاق",
    cta_advertise:"أعلن معنا",cta_all:"كل المقالات ←",cta_view:"عرض الكل ←",cta_read:"اقرأ ←",cta_more:"المزيد",cta_buy:"النسخة المميّزة",cta_visit:"زيارة",
    foot_explore:"استكشف",foot_markets:"الأسواق",foot_company:"الشركة",foot_lang:"اللغات",
    f_stories:"المقالات",f_chart:"الرسم البياني",f_future:"المستقبل",f_prices:"الأسعار",f_exchanges:"أفضل المنصّات",f_brokers:"أفضل الوسطاء",f_about:"حول",f_contact:"تواصل معنا",
    f_copy:"© ٢٠٢٦ ماكسغازين — كريبتو · فوركس · تقنية · سيارات",f_built:"إعلام أسواق متعدّد اللغات"
  },
  tr:{
    nav_stories:"Haberler",nav_topmarkets:"Öne Çıkan Piyasalar",nav_prices:"Fiyatlar",nav_exchanges:"Kripto Borsaları",nav_brokers:"Aracılar",nav_future:"Gelecek",nav_about:"Hakkında",
    nav_crypto:"Kripto",nav_forex:"Forex",nav_tech:"Teknoloji",nav_cars:"Otomobil",nav_analysis:"Piyasa Analizi",nav_contact:"İletişim",m_close:"Kapat",
    cta_advertise:"Bizimle reklam verin",cta_all:"Tüm haberler →",cta_view:"Tümünü gör →",cta_read:"Oku →",cta_more:"Daha fazla",cta_buy:"Premium’a geç",cta_visit:"Ziyaret et",
    foot_explore:"Keşfet",foot_markets:"Piyasalar",foot_company:"Şirket",foot_lang:"Diller",
    f_stories:"Haberler",f_chart:"Grafik",f_future:"Gelecek",f_prices:"Fiyatlar",f_exchanges:"En İyi Borsalar",f_brokers:"En İyi Aracılar",f_about:"Hakkımızda",f_contact:"İletişim",
    f_copy:"© 2026 MAXGAZINE — KRİPTO · FOREX · TEKNOLOJİ · OTOMOBİL",f_built:"ÇOK DİLLİ PİYASA MEDYASI"
  }
};

const RTL_LANGS = ['fa','ar'];
const OG_LOCALE = {en:'en_US',fa:'fa_IR',ar:'ar_AR',tr:'tr_TR'};

function _merge(lang){
  const base = Object.assign({}, window.I[lang]);
  if(window.PAGE_I && window.PAGE_I[lang]) Object.assign(base, window.PAGE_I[lang]);
  return base;
}
function _setMeta(sel, val){ const el=document.querySelector(sel); if(el) el.setAttribute('content', val); }

function setLang(l){
  if(!window.I[l]) l='en';
  const dict = _merge(l);
  document.querySelectorAll('[data-i]').forEach(el=>{
    const k = el.getAttribute('data-i');
    if(dict[k]!==undefined) el.textContent = dict[k];
  });
  const dir = RTL_LANGS.includes(l) ? 'rtl' : 'ltr';
  document.documentElement.dir = dir;
  document.documentElement.lang = l;
  if(document.body) document.body.dir = dir;
  // localized title/description via per-page meta keys (pm_title / pm_desc)
  if(dict.pm_title){ document.title = dict.pm_title; _setMeta('meta[property="og:title"]',dict.pm_title); _setMeta('meta[name="twitter:title"]',dict.pm_title); }
  if(dict.pm_desc){ _setMeta('meta[name="description"]',dict.pm_desc); _setMeta('meta[property="og:description"]',dict.pm_desc); _setMeta('meta[name="twitter:description"]',dict.pm_desc); }
  _setMeta('meta[property="og:locale"]', OG_LOCALE[l]||'en_US');
  document.querySelectorAll('.lang button').forEach(b=>{
    const on = b.dataset.lang===l; b.classList.toggle('active',on); b.setAttribute('aria-pressed',on);
  });
  const url = new URL(location.href);
  if(l==='en') url.searchParams.delete('lang'); else url.searchParams.set('lang',l);
  history.replaceState(null,'',url);
  try{ localStorage.setItem('mg_lang', l); }catch(e){}
}
window.setLang = setLang;

function initLang(){
  const fromUrl = new URLSearchParams(location.search).get('lang');
  let stored=null; try{ stored=localStorage.getItem('mg_lang'); }catch(e){}
  setLang(window.I[fromUrl] ? fromUrl : (window.I[stored] ? stored : 'en'));
}
window.initLang = initLang;
