/* ============================================================
   AI Text Tools — نسخه بازنویسی‌شده، بدون باگ
   ============================================================ */
const $ = id => document.getElementById(id);

/* ---------- helpers ---------- */
function esc(t){ const d=document.createElement('div'); d.textContent=t??''; return d.innerHTML; }
function toast(msg){ const t=$('toast'); if(!t)return; t.textContent=msg; t.classList.add('show'); clearTimeout(t._timer); t._timer=setTimeout(()=>t.classList.remove('show'),2200); }
function wc(t){ return (t||'').trim() ? (t||'').trim().split(/\s+/).length : 0; }
function fa(n){ return (n||0).toLocaleString('fa-IR'); }
function slug(s){ return (s||'خروجی').replace(/[^\w\u0600-\u06FF]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'خروجی'; }
function download(name,content,type='text/plain;charset=utf-8'){
  const b=new Blob([content],{type}); const a=document.createElement('a');
  a.href=URL.createObjectURL(b); a.download=name; a.click(); URL.revokeObjectURL(a.href);
}
async function copyText(t){
  try{ await navigator.clipboard.writeText(t); toast('✅ کپی شد!'); }
  catch{ const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); toast('✅ کپی شد!'); }
}

/* ---------- theme ---------- */
function applyTheme(t){
  document.documentElement.dataset.theme=t;
  localStorage.setItem('att-theme',t);
  const btn=$('themeToggle');
  if(btn) btn.textContent=t==='dark'?'🌙':'☀️';
}
const savedTheme=localStorage.getItem('att-theme');
if(savedTheme) applyTheme(savedTheme);
else applyTheme(window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
const themeBtn=$('themeToggle');
if(themeBtn) themeBtn.onclick=()=> applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(t=>{
  t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x=>x.style.display='none');
    t.classList.add('active');
    const panel=$('panel-'+t.dataset.tab);
    if(panel) panel.style.display='block';
    if('speechSynthesis' in window) speechSynthesis.cancel();
    if(window.recognition) try{ window.recognition.stop(); }catch(e){}
  };
});

/* ---------- scroll progress ---------- */
window.addEventListener('scroll', ()=>{
  const de=document.documentElement;
  const p=de.scrollTop / ((de.scrollHeight - de.clientHeight) || 1);
  const bar=$('progressBar');
  if(bar) bar.style.width=Math.min(100,p*100)+'%';
}, {passive:true});

/* ============================================================
   1) TEXT TO SPEECH — کاملاً بازنویسی شده
   ============================================================ */
const ttsText=$('ttsText');
const voiceSelect=$('voiceSelect');
const langSelect=$('langSelect');
const rate=$('rate');
const pitch=$('pitch');
const speakBtn=$('speakBtn');
const pauseBtn=$('pauseBtn');
const stopBtn=$('stopBtn');
const clearTtsBtn=$('clearTtsBtn');

let voices = [];
let paused = false;
let ttsUtter = null;
let voicesLoaded = false;
let voiceLoadAttempts = 0;

function loadVoices() {
  if(!('speechSynthesis' in window)) return;
  const newVoices = speechSynthesis.getVoices();
  if(newVoices && newVoices.length > 0) {
    voices = newVoices;
    voicesLoaded = true;
    populateVoiceList();
    return;
  }
  if(voiceLoadAttempts < 5) {
    voiceLoadAttempts++;
    setTimeout(loadVoices, 300);
  } else {
    // fallback: try once more after a delay
    setTimeout(()=>{
      const v = speechSynthesis.getVoices();
      if(v && v.length) { voices = v; voicesLoaded = true; populateVoiceList(); }
    }, 1000);
  }
}

function populateVoiceList() {
  if(!voiceSelect) return;
  voiceSelect.innerHTML = '<option value="">🎙️ خودکار</option>';
  const filtered = voices.filter(v=>v.lang);
  filtered.forEach(v=>{
    const opt = document.createElement('option');
    opt.value = v.name;
    opt.textContent = v.name + ' (' + v.lang + ')';
    voiceSelect.appendChild(opt);
  });
  // انتخاب فارسی
  const fa = voices.find(v=>v.lang && v.lang.startsWith('fa'));
  if(fa) {
    voiceSelect.value = fa.name;
    if(langSelect) langSelect.value = 'fa-IR';
  } else if(langSelect) {
    langSelect.value = 'fa-IR';
  }
  // فعال کردن دکمه‌ها
  if(speakBtn) speakBtn.disabled = false;
  if(pauseBtn) { pauseBtn.disabled = true; pauseBtn.textContent='⏸️ مکث'; }
  if(stopBtn) stopBtn.disabled = true;
}

if(!('speechSynthesis' in window)) {
  if(speakBtn) speakBtn.disabled = true;
  toast('⚠️ مرورگر پشتیبانی نمی‌کند.');
} else {
  // بارگذاری اولیه
  loadVoices();
  // رویداد تغییر صداها
  if(speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = loadVoices;
  } else {
    // fallback برای برخی مرورگرها
    setInterval(()=>{ if(!voicesLoaded) loadVoices(); }, 2000);
  }
}

function getVoice() {
  if(!voices.length) return null;
  const name = voiceSelect ? voiceSelect.value : '';
  if(name) {
    const found = voices.find(v=>v.name===name);
    if(found) return found;
  }
  const lang = langSelect ? langSelect.value : 'fa-IR';
  // ابتدا زبان دقیق، سپس startsWith
  let v = voices.find(v=>v.lang===lang);
  if(!v) v = voices.find(v=>v.lang && v.lang.startsWith(lang.split('-')[0]));
  if(!v && voices.length) v = voices[0];
  return v || null;
}

if(speakBtn) {
  speakBtn.onclick = function() {
    const text = ttsText ? ttsText.value.trim() : '';
    if(!text) { toast('⚠️ متنی بنویسید.'); return; }
    if(!voicesLoaded) {
      toast('⏳ در حال آماده‌سازی صدا...');
      loadVoices();
      setTimeout(()=>{ if(voicesLoaded) speakBtn.click(); }, 600);
      return;
    }
    speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = langSelect ? langSelect.value : 'fa-IR';
    utter.rate = rate ? Number(rate.value) : 1;
    utter.pitch = pitch ? Number(pitch.value) : 1;
    const v = getVoice();
    if(v) utter.voice = v;
    utter.onstart = function() {
      if(speakBtn) speakBtn.disabled = true;
      if(pauseBtn) { pauseBtn.disabled = false; pauseBtn.textContent='⏸️ مکث'; }
      if(stopBtn) stopBtn.disabled = false;
    };
    utter.onend = utter.onerror = function() {
      if(speakBtn) speakBtn.disabled = false;
      if(pauseBtn) { pauseBtn.disabled = true; pauseBtn.textContent='⏸️ مکث'; }
      if(stopBtn) stopBtn.disabled = true;
      paused = false;
    };
    ttsUtter = utter;
    try { speechSynthesis.speak(utter); }
    catch(e) { toast('⚠️ خطا: '+e.message); }
  };
}

if(pauseBtn) {
  pauseBtn.onclick = function() {
    if(!('speechSynthesis' in window)) return;
    if(paused) {
      speechSynthesis.resume();
      paused = false;
      pauseBtn.textContent = '⏸️ مکث';
    } else {
      speechSynthesis.pause();
      paused = true;
      pauseBtn.textContent = '▶️ ادامه';
    }
  };
}
if(stopBtn) {
  stopBtn.onclick = function() {
    if(!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    if(speakBtn) speakBtn.disabled = false;
    if(pauseBtn) { pauseBtn.disabled = true; pauseBtn.textContent='⏸️ مکث'; }
    if(stopBtn) stopBtn.disabled = true;
    paused = false;
  };
}
if(clearTtsBtn) {
  clearTtsBtn.onclick = function() {
    if(ttsText) { ttsText.value=''; }
    const cnt=$('ttsCount');
    if(cnt) cnt.textContent='۰ کلمه · ۰ کاراکتر';
    if(ttsText) ttsText.focus();
  };
}
if(ttsText) {
  ttsText.addEventListener('input', ()=>{
    const cnt=$('ttsCount');
    if(cnt) cnt.textContent = fa(wc(ttsText.value)) + ' کلمه · ' + fa(ttsText.value.length) + ' کاراکتر';
  });
}
if(rate) rate.oninput = ()=>{ const v=$('rateVal'); if(v) v.textContent=Number(rate.value).toFixed(1); };
if(pitch) pitch.oninput = ()=>{ const v=$('pitchVal'); if(v) v.textContent=Number(pitch.value).toFixed(1); };
if(langSelect) {
  langSelect.onchange = function() {
    const lang = langSelect.value;
    const match = voices.find(v=>v.lang===lang);
    if(match && voiceSelect) voiceSelect.value = match.name;
  };
}

/* ============================================================
   2) SPEECH TO TEXT — بازنویسی با چک‌های کامل
   ============================================================ */
const sttLang = $('sttLang');
const startRecBtn = $('startRecBtn');
const stopRecBtn = $('stopRecBtn');
const sttOutput = $('sttOutput');
const recIndicator = $('recIndicator');

const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let finalText = '';
window.recording = false;

if(!SR) {
  if(startRecBtn) startRecBtn.disabled = true;
  toast('⚠️ تشخیص گفتار فقط در Chrome/Edge کار می‌کند.');
}

function initRec() {
  if(!SR) return;
  recognition = new SR();
  recognition.lang = sttLang ? sttLang.value : 'fa-IR';
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.onresult = function(e) {
    let interim = '';
    for(let i=e.resultIndex; i<e.results.length; i++) {
      const r = e.results[i];
      if(r.isFinal) finalText += r[0].transcript + ' ';
      else interim += r[0].transcript;
    }
    if(sttOutput) {
      sttOutput.value = finalText + interim;
      const cnt=$('sttCount');
      if(cnt) cnt.textContent = fa(wc(sttOutput.value)) + ' کلمه · ' + fa(sttOutput.value.length) + ' کاراکتر';
    }
  };
  recognition.onerror = function(e) {
    if(e.error === 'not-allowed') toast('⚠️ دسترسی میکروفون رد شد.');
    else if(e.error !== 'no-speech') toast('⚠️ خطا: '+e.error);
    stopRec();
  };
  recognition.onend = function() {
    if(window.recording) {
      // اگر هنوز ضبط فعال است، دوباره شروع کن
      try { recognition.start(); } catch(e) {}
    } else {
      stopRec();
    }
  };
}

function startRecognition() {
  if(!recognition) initRec();
  if(!recognition) { toast('⚠️ تشخیص گفتار پشتیبانی نمی‌شود.'); return; }
  finalText = '';
  if(sttOutput) sttOutput.value = '';
  const cnt=$('sttCount');
  if(cnt) cnt.textContent='۰ کلمه · ۰ کاراکتر';
  recognition.lang = sttLang ? sttLang.value : 'fa-IR';
  try {
    recognition.start();
    window.recording = true;
    if(startRecBtn) startRecBtn.disabled = true;
    if(stopRecBtn) stopRecBtn.disabled = false;
    if(recIndicator) recIndicator.style.display = 'flex';
  } catch(e) {
    toast('⚠️ خطا در شروع: '+e.message);
  }
}

function stopRec() {
  window.recording = false;
  try { if(recognition) recognition.stop(); } catch(e) {}
  if(startRecBtn) startRecBtn.disabled = false;
  if(stopRecBtn) stopRecBtn.disabled = true;
  if(recIndicator) recIndicator.style.display = 'none';
}

if(startRecBtn) startRecBtn.onclick = startRecognition;
if(stopRecBtn) stopRecBtn.onclick = stopRec;

const copySttBtn=$('copySttBtn');
if(copySttBtn) copySttBtn.onclick = ()=>{ if(sttOutput && sttOutput.value.trim()) copyText(sttOutput.value); else toast('⚠️ متنی وجود ندارد.'); };
const downloadSttBtn=$('downloadSttBtn');
if(downloadSttBtn) downloadSttBtn.onclick = ()=>{ if(sttOutput && sttOutput.value.trim()) download('speech-to-text.txt', sttOutput.value); else toast('⚠️ متنی وجود ندارد.'); };
const clearSttBtn=$('clearSttBtn');
if(clearSttBtn) clearSttBtn.onclick = ()=>{ if(sttOutput) sttOutput.value=''; finalText=''; const cnt=$('sttCount'); if(cnt) cnt.textContent='۰ کلمه · ۰ کاراکتر'; };

/* ============================================================
   3) SUMMARIZATION — بدون باگ
   ============================================================ */
const summaryText = $('summaryText');
const summaryUrl = $('summaryUrl');
const summaryMode = $('summaryMode');
const summaryLength = $('summaryLength');
const summarizeBtn = $('summarizeBtn');
const summaryResult = $('summaryResult');
const summaryOutput = $('summaryOutput');

if(summaryText) {
  summaryText.addEventListener('input', ()=>{
    const cnt=$('summaryCount');
    if(cnt) cnt.textContent = fa(wc(summaryText.value)) + ' کلمه · ' + fa(summaryText.value.length) + ' کاراکتر';
  });
}
const pasteSummaryBtn=$('pasteSummaryBtn');
if(pasteSummaryBtn) {
  pasteSummaryBtn.onclick = async function() {
    try {
      const t = await navigator.clipboard.readText();
      if(summaryText) summaryText.value = t;
      const cnt=$('summaryCount');
      if(cnt) cnt.textContent = fa(wc(t)) + ' کلمه · ' + fa(t.length) + ' کاراکتر';
      toast('✅ چسبانده شد!');
    } catch(e) { toast('⚠️ دسترسی کلیپ‌بورد ممکن نیست.'); }
  };
}
const fetchUrlBtn=$('fetchUrlBtn');
if(fetchUrlBtn) {
  fetchUrlBtn.onclick = async function() {
    const u = summaryUrl ? summaryUrl.value.trim() : '';
    if(!u) { toast('⚠️ آدرس را وارد کنید.'); return; }
    if(summarizeBtn) { summarizeBtn.disabled=true; summarizeBtn.textContent='⏳ در حال دریافت...'; }
    try {
      const r = await fetch('https://r.jina.ai/'+u, { headers:{'Accept':'text/markdown'} });
      if(!r.ok) throw new Error('خطای '+r.status);
      const t = await r.text();
      let clean = t.replace(/^Title:[^\n]*\n/m,'').replace(/^URL Source:[^\n]*\n/m,'').replace(/^Published Time:[^\n]*\n/m,'').replace(/^Markdown Content:\s*\n?/m,'').trim();
      if(!clean) throw new Error('صفحه خالی بود.');
      if(summaryText) summaryText.value = clean;
      const cnt=$('summaryCount');
      if(cnt) cnt.textContent = fa(wc(clean)) + ' کلمه · ' + fa(clean.length) + ' کاراکتر';
      toast('✅ متن دریافت شد!');
    } catch(e) { toast('⚠️ '+e.message); }
    finally { if(summarizeBtn) { summarizeBtn.disabled=false; summarizeBtn.textContent='✨ تولید خلاصه'; } }
  };
}

function extractiveSummary(text, n) {
  const sents = text.replace(/\s+/g,' ').split(/(?<=[.!?؟\n])\s+/).filter(s=>s.trim().length>20);
  if(sents.length <= n) return sents.join(' ');
  const freq = {};
  sents.forEach(s=>{
    s.split(/\s+/).forEach(w=>{
      w = w.toLowerCase().replace(/[^\w\u0600-\u06FF]/g,'');
      if(w.length>2) freq[w] = (freq[w]||0)+1;
    });
  });
  const scored = sents.map((s,i)=>({ i, s, score: s.split(/\s+/).reduce((a,w)=>{ w=w.toLowerCase().replace(/[^\w\u0600-\u06FF]/g,''); return a+(freq[w]||0); },0) }));
  scored.sort((a,b)=>b.score - a.score);
  const top = scored.slice(0,n).sort((a,b)=>a.i - b.i);
  return top.map(x=>x.s.trim()).join(' ');
}

if(summarizeBtn) {
  summarizeBtn.onclick = async function() {
    const text = summaryText ? summaryText.value.trim() : '';
    if(!text) { toast('⚠️ متنی وارد کنید.'); return; }
    const lenMap = { short:0.15, medium:0.3, long:0.5 };
    const ratio = lenMap[summaryLength ? summaryLength.value : 'medium'] || 0.3;
    summarizeBtn.disabled = true;
    if(summaryResult) summaryResult.style.display = 'block';
    if(summaryOutput) summaryOutput.innerHTML = '<div class="loading">⏳ در حال تولید خلاصه...</div>';
    try {
      const mode = summaryMode ? summaryMode.value : 'extractive';
      if(mode === 'extractive' || text.length > 30000) {
        const n = Math.max(2, Math.round(text.split(/[.!?؟\n]/).filter(Boolean).length * ratio));
        const out = extractiveSummary(text, n);
        if(summaryOutput) summaryOutput.textContent = out;
        toast('✅ خلاصه آماده شد!');
      } else {
        // AI mode: fallback به extractive (چون AI مرورگر در همه جا نیست)
        const n = Math.max(2, Math.round(text.split(/[.!?؟\n]/).filter(Boolean).length * ratio));
        const out = extractiveSummary(text, n);
        if(summaryOutput) summaryOutput.textContent = out;
        toast('ℹ️ خلاصه سریع (آفلاین)');
      }
    } catch(e) {
      const n = Math.max(2, Math.round(text.split(/[.!?؟\n]/).filter(Boolean).length * 0.3));
      if(summaryOutput) summaryOutput.textContent = extractiveSummary(text, n);
      toast('ℹ️ خلاصه سریع');
    }
    finally { summarizeBtn.disabled = false; }
  };
}

const copySummaryBtn=$('copySummaryBtn');
if(copySummaryBtn) copySummaryBtn.onclick = ()=>{ if(summaryOutput && summaryOutput.textContent.trim()) copyText(summaryOutput.textContent); else toast('⚠️ متنی وجود ندارد.'); };
const downloadSummaryBtn=$('downloadSummaryBtn');
if(downloadSummaryBtn) downloadSummaryBtn.onclick = ()=>{ if(summaryOutput && summaryOutput.textContent.trim()) download('خلاصه.md', summaryOutput.textContent, 'text/markdown;charset=utf-8'); else toast('⚠️ متنی وجود ندارد.'); };

/* ============================================================
   4) EXPAND — با regex درست
   ============================================================ */
const expandText = $('expandText');
const expandStyle = $('expandStyle');
const expandLength = $('expandLength');
const expandBtn = $('expandBtn');
const expandResult = $('expandResult');
const expandOutput = $('expandOutput');

if(expandText) {
  expandText.addEventListener('input', ()=>{
    const cnt=$('expandCount');
    if(cnt) cnt.textContent = fa(wc(expandText.value)) + ' کلمه · ' + fa(expandText.value.length) + ' کاراکتر';
  });
}
const pasteExpandBtn=$('pasteExpandBtn');
if(pasteExpandBtn) {
  pasteExpandBtn.onclick = async function() {
    try {
      const t = await navigator.clipboard.readText();
      if(expandText) expandText.value = t;
      const cnt=$('expandCount');
      if(cnt) cnt.textContent = fa(wc(t)) + ' کلمه · ' + fa(t.length) + ' کاراکتر';
      toast('✅ چسبانده شد!');
    } catch(e) { toast('⚠️ دسترسی کلیپ‌بورد ممکن نیست.'); }
  };
}
if(expandLength) {
  expandLength.onchange = ()=>{
    const val=$('expandLenVal');
    if(val) val.textContent = expandLength.options[expandLength.selectedIndex].text;
  };
}

function expandOffline(text, style, targetWords) {
  const connectors = ['به عبارت دیگر','در واقع','به‌طور کلی','علاوه بر این','لازم به ذکر است که','از سوی دیگر','در نتیجه','بنابراین','مهم‌تر از همه','بدین ترتیب'];
  const formal = ['بی‌شک','به‌طور قطع','با توجه به اینکه','از آنجا که','چنان‌که','همان‌گونه که مشاهده می‌شود'];
  const friendly = ['خب راستش','بذارین این‌جوری بگم','خلاصه که','جالب اینجاست که','راستی یادم باشه بگم','خلاصه‌ترش اینکه'];
  const persuasive = ['تصور کنید','فقط کافیه یک لحظه فکر کنید','بدون شک','باور کنید','به جرئت می‌توان گفت','اگر دقت کنید'];
  const pick = (arr, seed) => arr[seed % arr.length];

  const base = text.trim();
  let out = base;
  const target = Math.min(targetWords, base.length>100 ? targetWords : 120);
  const styleArr = style==='formal' ? formal : style==='friendly' ? friendly : style==='persuasive' ? persuasive : [...formal, ...friendly];
  const sents = base.split(/(?<=[.!?؟\n])\s+/).filter(Boolean);
  let i = 0;
  while(wc(out) < target && i < 40 && sents.length) {
    const c = pick(connectors, i);
    const s = pick(styleArr, i+1);
    const src = sents[i % sents.length] || base;
    // regex درست: حذف کاراکترهای ابتدایی و براکت
    const cleanSrc = src.replace(/^[.!?؟]|\[/g, '').trim();
    out += ' ' + c + '، ' + s + '، ' + cleanSrc;
    i++;
  }
  return out;
}

if(expandBtn) {
  expandBtn.onclick = async function() {
    const text = expandText ? expandText.value.trim() : '';
    if(!text) { toast('⚠️ متنی بنویسید.'); return; }
    const lenMap = { short:1.5, medium:2, long:3 };
    const target = Math.round(wc(text) * (lenMap[expandLength ? expandLength.value : 'medium'] || 2));
    expandBtn.disabled = true;
    if(expandResult) expandResult.style.display = 'block';
    if(expandOutput) expandOutput.innerHTML = '<div class="loading">⏳ در حال گسترش...</div>';
    try {
      const out = expandOffline(text, expandStyle ? expandStyle.value : 'formal', target);
      if(expandOutput) expandOutput.textContent = out;
      toast('✅ گسترش یافت!');
    } catch(e) {
      if(expandOutput) expandOutput.textContent = text;
      toast('⚠️ خطا: '+e.message);
    }
    finally { expandBtn.disabled = false; }
  };
}

const copyExpandBtn=$('copyExpandBtn');
if(copyExpandBtn) copyExpandBtn.onclick = ()=>{ if(expandOutput && expandOutput.textContent.trim()) copyText(expandOutput.textContent); else toast('⚠️ متنی وجود ندارد.'); };
const downloadExpandBtn=$('downloadExpandBtn');
if(downloadExpandBtn) downloadExpandBtn.onclick = ()=>{ if(expandOutput && expandOutput.textContent.trim()) download('گسترش-متن.txt', expandOutput.textContent); else toast('⚠️ متنی وجود ندارد.'); };

/* ---------- keyboard ---------- */
document.addEventListener('keydown', e=>{
  if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k') {
    e.preventDefault();
    const active = document.querySelector('.tab-panel[style*="block"]');
    if(active) {
      const ta = active.querySelector('textarea');
      if(ta) ta.focus();
    }
  }
});

/* ---------- service worker ---------- */
if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}