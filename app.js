/* ============ AI Text Tools — app.js ============ */
const $=id=>document.getElementById(id);

/* ---------- helpers ---------- */
function esc(t){const d=document.createElement('div');d.textContent=t??'';return d.innerHTML;}
function toast(msg){const t=$('toast');t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}
function wc(t){return t.trim()?t.trim().split(/\s+/).length:0;}
function fa(n){return n.toLocaleString('fa-IR');}
function slug(s){return (s||'خروجی').replace(/[^\w\u0600-\u06FF]+/g,'-').replace(/^-+|-+$/g,'').slice(0,50)||'خروجی';}
function download(name,content,type='text/plain;charset=utf-8'){
  const b=new Blob([content],{type});const a=document.createElement('a');
  a.href=URL.createObjectURL(b);a.download=name;a.click();URL.revokeObjectURL(a.href);
}
async function copyText(t){
  try{await navigator.clipboard.writeText(t);toast('✅ کپی شد!');}
  catch{const ta=document.createElement('textarea');ta.value=t;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove();toast('✅ کپی شد!');}
}

/* ---------- theme ---------- */
function applyTheme(t){document.documentElement.dataset.theme=t;localStorage.setItem('att-theme',t);$('themeToggle').textContent=t==='dark'?'🌙':'☀️';}
const saved=localStorage.getItem('att-theme');
if(saved)applyTheme(saved);
else applyTheme(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark');
$('themeToggle').onclick=()=>applyTheme(document.documentElement.dataset.theme==='dark'?'light':'dark');

/* ---------- tabs ---------- */
document.querySelectorAll('.tab').forEach(t=>{
  t.onclick=()=>{
    document.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
    document.querySelectorAll('.tab-panel').forEach(x=>x.style.display='none');
    t.classList.add('active');
    $('panel-'+t.dataset.tab).style.display='block';
    if('speechSynthesis' in window)speechSynthesis.cancel();
    if(window.recognition)try{window.recognition.stop();}catch{}
  };
});

/* ---------- scroll progress ---------- */
window.addEventListener('scroll',()=>{
  const de=document.documentElement;
  const p=de.scrollTop/((de.scrollHeight-de.clientHeight)||1);
  $('progressBar').style.width=Math.min(100,p*100)+'%';
},{passive:true});

/* ================================================================
   1) TEXT TO SPEECH
   ================================================================ */
const ttsText=$('ttsText'),voiceSelect=$('voiceSelect'),langSelect=$('langSelect');
const rate=$('rate'),pitch=$('pitch'),speakBtn=$('speakBtn'),pauseBtn=$('pauseBtn'),stopBtn=$('stopBtn'),clearTtsBtn=$('clearTtsBtn');
let voices=[];let paused=false;let ttsUtter=null;

if(!('speechSynthesis' in window)){
  speakBtn.disabled=true;toast('⚠️ مرورگر شما از تبدیل متن به صدا پشتیبانی نمی‌کند.');
}else{
  function loadVoices(){
    voices=speechSynthesis.getVoices();
    if(!voices.length)return;
    voiceSelect.innerHTML='<option value="">🎙️ پیش‌فرض (خودکار)</option>'+voices
      .filter(v=>v.lang)
      .map(v=>`<option value="${esc(v.name)}" data-lang="${esc(v.lang)}">${esc(v.name)} (${esc(v.lang)})</option>`).join('');
    // preselect Persian voice if available
    const faVoice=voices.find(v=>v.lang.startsWith('fa'));
    if(faVoice)voiceSelect.value=faVoice.name;
  }
  loadVoices();
  speechSynthesis.onvoiceschanged=loadVoices;
  langSelect.onchange=()=>{
    const lang=langSelect.value;
    const match=voices.find(v=>v.lang===lang);
    voiceSelect.value=match?match.name:'';
  };
}

function getVoice(){
  const name=voiceSelect.value;
  if(name)return voices.find(v=>v.name===name)||null;
  const lang=langSelect.value;
  return voices.find(v=>v.lang===lang)||voices.find(v=>v.lang.startsWith(lang.split('-')[0]))||null;
}

rate.oninput=()=>$('rateVal').textContent=Number(rate.value).toFixed(1);
pitch.oninput=()=>$('pitchVal').textContent=Number(pitch.value).toFixed(1);

ttsText.addEventListener('input',()=>$('ttsCount').textContent=`${fa(wc(ttsText.value))} کلمه · ${fa(ttsText.value.length)} کاراکتر`);

speakBtn.onclick=()=>{
  const text=ttsText.value.trim();
  if(!text){toast('⚠️ لطفاً متنی بنویسید.');return;}
  speechSynthesis.cancel();
  const u=new SpeechSynthesisUtterance(text);
  u.lang=langSelect.value;
  u.rate=Number(rate.value);
  u.pitch=Number(pitch.value);
  const v=getVoice();if(v)u.voice=v;
  u.onstart=()=>{speakBtn.disabled=true;pauseBtn.disabled=false;stopBtn.disabled=false;};
  u.onend=u.onerror=()=>{speakBtn.disabled=false;pauseBtn.disabled=true;stopBtn.disabled=true;paused=false;pauseBtn.textContent='⏸️ مکث';};
  ttsUtter=u;
  speechSynthesis.speak(u);
};

pauseBtn.onclick=()=>{
  if(paused){speechSynthesis.resume();paused=false;pauseBtn.textContent='⏸️ مکث';}
  else{speechSynthesis.pause();paused=true;pauseBtn.textContent='▶️ ادامه';}
};
stopBtn.onclick=()=>{speechSynthesis.cancel();speakBtn.disabled=false;pauseBtn.disabled=true;stopBtn.disabled=true;paused=false;pauseBtn.textContent='⏸️ مکث';};
clearTtsBtn.onclick=()=>{ttsText.value='';$('ttsCount').textContent='۰ کلمه · ۰ کاراکتر';ttsText.focus();};

/* ================================================================
   2) SPEECH TO TEXT
   ================================================================ */
const sttLang=$('sttLang'),startRecBtn=$('startRecBtn'),stopRecBtn=$('stopRecBtn');
const sttOutput=$('sttOutput'),recIndicator=$('recIndicator');

const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
if(!SR){
  startRecBtn.disabled=true;
  toast('⚠️ تشخیص گفتار در این مرورگر پشتیبانی نمی‌شود (Chrome/Edge لازم است).');
}
let recognition=null;
let finalText='';

function initRec(){
  recognition=new SR();
  recognition.lang=sttLang.value;
  recognition.continuous=true;
  recognition.interimResults=true;
  recognition.onresult=e=>{
    let interim='';
    for(let i=e.resultIndex;i<e.results.length;i++){
      const r=e.results[i];
      if(r.isFinal)finalText+=r[0].transcript+' ';
      else interim+=r[0].transcript;
    }
    sttOutput.value=finalText+interim;
    $('sttCount').textContent=`${fa(wc(sttOutput.value))} کلمه · ${fa(sttOutput.value.length)} کاراکتر`;
  };
  recognition.onerror=e=>{
    if(e.error==='not-allowed')toast('⚠️ دسترسی میکروفون رد شد.');
    else if(e.error!=='no-speech')toast('⚠️ خطای تشخیص: '+e.error);
    stopRec();
  };
  recognition.onend=()=>{
    if(window.recording)startRecognition();
    else stopRec();
  };
}
function startRecognition(){
  finalText='';
  sttOutput.value='';
  $('sttCount').textContent='۰ کلمه · ۰ کاراکتر';
  recognition.lang=sttLang.value;
  recognition.start();
  window.recording=true;
  startRecBtn.disabled=true;stopRecBtn.disabled=false;
  recIndicator.style.display='flex';
}
function stopRec(){
  window.recording=false;
  try{recognition&&recognition.stop();}catch{}
  startRecBtn.disabled=false;stopRecBtn.disabled=true;
  recIndicator.style.display='none';
}
startRecBtn.onclick=()=>{if(!recognition)initRec();startRecognition();};
stopRecBtn.onclick=()=>stopRec();

$('copySttBtn').onclick=()=>{if(sttOutput.value.trim())copyText(sttOutput.value);else toast('⚠️ متنی وجود ندارد.');};
$('downloadSttBtn').onclick=()=>{if(sttOutput.value.trim())download('speech-to-text.txt',sttOutput.value);else toast('⚠️ متنی وجود ندارد.');};
$('clearSttBtn').onclick=()=>{sttOutput.value='';finalText='';$('sttCount').textContent='۰ کلمه · ۰ کاراکتر';};

/* ================================================================
   3) SUMMARIZATION
   ================================================================ */
const summaryText=$('summaryText'),summaryUrl=$('summaryUrl'),summaryMode=$('summaryMode'),summaryLength=$('summaryLength');
const summarizeBtn=$('summarizeBtn'),summaryResult=$('summaryResult'),summaryOutput=$('summaryOutput');

summaryText.addEventListener('input',()=>$('summaryCount').textContent=`${fa(wc(summaryText.value))} کلمه · ${fa(summaryText.value.length)} کاراکتر`);
$('pasteSummaryBtn').onclick=async()=>{
  try{const t=await navigator.clipboard.readText();summaryText.value=t;$('summaryCount').textContent=`${fa(wc(t))} کلمه · ${fa(t.length)} کاراکتر`;toast('✅ چسبانده شد!');}
  catch{toast('⚠️ دسترسی کلیپ‌بورد ممکن نیست.');}
};
$('fetchUrlBtn').onclick=async()=>{
  const u=summaryUrl.value.trim();
  if(!u){toast('⚠️ آدرس را وارد کنید.');return;}
  summarizeBtn.disabled=true;summarizeBtn.textContent='⏳ در حال دریافت متن...';
  try{
    const r=await fetch('https://r.jina.ai/'+u,{headers:{'Accept':'text/markdown'}});
    if(!r.ok)throw new Error('خطای '+r.status);
    const t=await r.text();
    const clean=t.replace(/^Title:[^\n]*\n/m,'').replace(/^URL Source:[^\n]*\n/m,'').replace(/^Published Time:[^\n]*\n/m,'').replace(/^Markdown Content:\s*\n?/m,'').trim();
    if(!clean)throw new Error('صفحه خالی بود.');
    summaryText.value=clean;
    $('summaryCount').textContent=`${fa(wc(clean))} کلمه · ${fa(clean.length)} کاراکتر`;
    toast('✅ متن صفحه دریافت شد!');
  }catch(e){toast('⚠️ '+e.message);}
  finally{summarizeBtn.disabled=false;summarizeBtn.textContent='✨ تولید خلاصه';}
};

/* Extractive (offline) summarizer */
function extractiveSummary(text,n){
  const sents=text.replace(/\s+/g,' ').split(/(?<=[.!?؟\n])\s+/).filter(s=>s.trim().length>20);
  if(sents.length<=n)return sents.join(' ');
  const freq={};
  sents.forEach(s=>s.split(/\s+/).forEach(w=>{w=w.toLowerCase().replace(/[^\w\u0600-\u06FF]/g,'');if(w.length>2)freq[w]=(freq[w]||0)+1;}));
  const scored=sents.map((s,i)=>({
    i,s,
    score:s.split(/\s+/).reduce((a,w)=>{w=w.toLowerCase().replace(/[^\w\u0600-\u06FF]/g,'');return a+(freq[w]||0);},0)
  }));
  scored.sort((a,b)=>b.score-a.score);
  const top=scored.slice(0,n).sort((a,b)=>a.i-b.i);
  return top.map(x=>x.s.trim()).join(' ');
}

summarizeBtn.onclick=async()=>{
  const text=summaryText.value.trim();
  if(!text){toast('⚠️ لطفاً متنی وارد کنید.');return;}
  const lenMap={short:0.15,medium:0.3,long:0.5};
  const ratio=lenMap[summaryLength.value];
  summarizeBtn.disabled=true;
  summaryResult.style.display='block';
  summaryOutput.innerHTML='<div class="loading">⏳ در حال تولید خلاصه...</div>';
  try{
    if(summaryMode.value==='extractive'||text.length>30000){
      const n=Math.max(2,Math.round(text.split(/[.!?؟\n]/).filter(Boolean).length*ratio));
      const out=extractiveSummary(text,n);
      summaryOutput.textContent=out;
      toast('✅ خلاصه آماده شد!');
    }else{
      // AI summary: try browser's built-in AI (Chrome), fallback to extractive
      let aiDone=false;
      try{
        if(self.ai&&self.ai.summarizer){
          const caps=await self.ai.summarizer.capabilities();
          if(caps&&caps.available!=='no'){
            const lenKey=summaryLength.value;
            const opts={type:'tl;dr',format:'plain-text',length:lenKey==='short'?'short':lenKey==='long'?'long':'medium'};
            const summarizer=await self.ai.summarizer.create(opts);
            const out=await summarizer.summarize(text,{context:'خلاصه مفید و دقیق به فارسی'});
            if(out&&out.trim()){
              summaryOutput.textContent=out;
              toast('✅ خلاصه هوشمند (AI مرورگر) آماده شد!');
              aiDone=true;
            }
          }
        }
      }catch{}
      if(!aiDone){
        const n=Math.max(2,Math.round(text.split(/[.!?؟\n]/).filter(Boolean).length*ratio));
        const out=extractiveSummary(text,n);
        summaryOutput.textContent=out;
        toast('ℹ️ AI مرورگر در دسترس نبود؛ خلاصه سریع تولید شد.');
      }
    }
  }catch(e){
    const n=Math.max(2,Math.round(text.split(/[.!?؟\n]/).filter(Boolean).length*ratio));
    summaryOutput.textContent=extractiveSummary(text,n);
    toast('ℹ️ خلاصه سریع (آفلاین) تولید شد.');
  }
  finally{summarizeBtn.disabled=false;}
};

$('copySummaryBtn').onclick=()=>{if(summaryOutput.textContent.trim())copyText(summaryOutput.textContent);};
$('downloadSummaryBtn').onclick=()=>{if(summaryOutput.textContent.trim())download('خلاصه.md',summaryOutput.textContent,'text/markdown;charset=utf-8');};

/* ================================================================
   4) EXPAND
   ================================================================ */
const expandText=$('expandText'),expandStyle=$('expandStyle'),expandLength=$('expandLength');
const expandBtn=$('expandBtn'),expandResult=$('expandResult'),expandOutput=$('expandOutput');

expandText.addEventListener('input',()=>$('expandCount').textContent=`${fa(wc(expandText.value))} کلمه · ${fa(expandText.value.length)} کاراکتر`);
$('pasteExpandBtn').onclick=async()=>{
  try{const t=await navigator.clipboard.readText();expandText.value=t;$('expandCount').textContent=`${fa(wc(t))} کلمه · ${fa(t.length)} کاراکتر`;toast('✅ چسبانده شد!');}
  catch{toast('⚠️ دسترسی کلیپ‌بورد ممکن نیست.');}
};
$('expandLength').onchange=()=>$('expandLenVal').textContent=expandLength.options[expandLength.selectedIndex].text;

/* Rule-based expander: adds connectors, elaborations, examples */
function expandOffline(text,style,targetWords){
  const connectors=['به عبارت دیگر','در واقع','به‌طور کلی','علاوه بر این','لازم به ذکر است که','از سوی دیگر','در نتیجه','بنابراین','مهم‌تر از همه','بدین ترتیب'];
  const formal=['بی‌شک','به‌طور قطع','با توجه به اینکه','از آنجا که','چنان‌که','همان‌گونه که مشاهده می‌شود'];
  const friendly=['خب راستش','بذارین این‌جوری بگم','خلاصه که','جالب اینجاست که','راستی یادم باشه بگم','خلاصه‌ترش اینکه'];
  const persuasive=['تصور کنید','فقط کافیه یک لحظه فکر کنید','بدون شک','باور کنید','به جرئت می‌توان گفت','اگر دقت کنید'];
  const pick=(arr,seed)=>arr[seed%arr.length];

  const base=text.trim();
  let out=base;
  const words=base.split(/\s+/);
  const target=Math.min(targetWords, base.length>100?targetWords:120);

  const styleArr=style==='formal'?formal:style==='friendly'?friendly:style==='persuasive'?persuasive:[...formal,...friendly];
  const sents=base.split(/(?<=[.!?؟\n])\s+/).filter(Boolean);
  let i=0;
  while(wc(out)<target&&i<40){
    const c=pick(connectors,i);
    const s=pick(styleArr,i+1);
    const src=sents[i%sents.length]||base;
    out+=' '+c+', '+s+', '+src.replace(/^[.!?؟]|\[/g,'').trim();
    i++;
  }
  return out;
}

expandBtn.onclick=async()=>{
  const text=expandText.value.trim();
  if(!text){toast('⚠️ لطفاً متنی بنویسید.');return;}
  const lenMap={short:1.5,medium:2,long:3};
  const target=Math.round(wc(text)*lenMap[expandLength.value]);
  expandBtn.disabled=true;
  expandResult.style.display='block';
  expandOutput.innerHTML='<div class="loading">⏳ در حال گسترش متن...</div>';
  try{
    const out=expandOffline(text,expandStyle.value,target);
    expandOutput.textContent=out;
    toast('✅ متن گسترش یافت!');
  }catch(e){
    expandOutput.textContent=text;
    toast('⚠️ خطا: '+e.message);
  }
  finally{expandBtn.disabled=false;}
};

$('copyExpandBtn').onclick=()=>{if(expandOutput.textContent.trim())copyText(expandOutput.textContent);};
$('downloadExpandBtn').onclick=()=>{if(expandOutput.textContent.trim())download('گسترش-متن.txt',expandOutput.textContent);};

/* ---------- keyboard ---------- */
document.addEventListener('keydown',e=>{
  if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){
    e.preventDefault();
    const active=document.querySelector('.tab-panel[style*="block"]');
    if(active){const ta=active.querySelector('textarea');if(ta)ta.focus();}
  }
});

/* ---------- service worker ---------- */
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('sw.js').catch(()=>{});
}