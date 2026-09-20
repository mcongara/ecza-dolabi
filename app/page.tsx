'use client';
import Link from 'next/link';
import {useInventory} from './components/inventory-provider';
import {OtcResult} from './components/otc-result';
import {useEffect,useRef,useState,type FormEvent} from 'react';
import {Pill,Plus,X,ArrowRight,ShieldCheck,Info,LoaderCircle,Activity,Check,Clock,ChevronRight,RotateCcw,Download,Upload} from 'lucide-react';
import {actionLabels,categories,type Medicine,type Result} from '@/lib/analysis';
import {normalizeExpiry} from '@/lib/analysis';
import {classificationSummary,pendingMedicines,parseBackup,type Evaluation} from '@/lib/queue';
type Draft = Omit<Medicine,'id'>;
const emptyDraft:Draft={name:'',notes:'',expiry:'',condition:'unknown',confirmed:true};
type Report={results:Result[];model:string;elapsedMs:number;usage:Evaluation['usage'];answers:Record<string,Evaluation['answer']>;otcAnswers:Record<string,NonNullable<Evaluation['otcAnswer']>>};
export default function Home(){
 const [draft,setDraft]=useState<Draft>(emptyDraft);
 const {medicines,setMedicines,evaluations,setEvaluations}=useInventory();
 const [failures,setFailures]=useState<Record<string,string>>({});
 const [running,setRunning]=useState(false);
 const [activeId,setActiveId]=useState<string|null>(null);
 const [selectedId,setSelectedId]=useState<string|null>(null);
 const [error,setError]=useState('');
 const [elapsed,setElapsed]=useState(0);
 const [batch,setBatch]=useState({done:0,total:0});
  const lock=useRef(false);const nameInput=useRef<HTMLInputElement>(null);const fileInput=useRef<HTMLInputElement>(null);
 const mounted=useRef(true);const abort=useRef<AbortController|null>(null);
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;abort.current?.abort()}},[]);
 useEffect(()=>{if(!running)return;const start=performance.now();const timer=setInterval(()=>setElapsed((performance.now()-start)/1000),100);return()=>clearInterval(timer)},[running]);
 const pending=pendingMedicines(medicines,evaluations);
 const completed=medicines.filter(m=>evaluations[m.id]);
 const active=medicines.find(m=>m.id===(activeId??selectedId));
 const selected=active?evaluations[active.id]:undefined;
 const totalTokens=Object.values(evaluations).reduce((n,e)=>n+(e.usage.inputTokens??0)+(e.usage.outputTokens??0),0);
  function add(e:FormEvent){e.preventDefault();const name=draft.name.trim();if(name.length<2)return;const expiry=normalizeExpiry(draft.expiry);if(expiry===null){setError('Son kullanma tarihini AA/YY olarak yaz (örn. 09/26) veya boş bırak.');return}setMedicines(m=>[...m,{...draft,name,expiry,id:crypto.randomUUID(),confirmed:true}]);setDraft(emptyDraft);nameInput.current?.focus();setError('')}
  function remove(id:string){if(running)return;setMedicines(m=>m.filter(x=>x.id!==id));setFailures(f=>{const next={...f};delete next[id];return next})}
  function exportJSON(){if(!medicines.length)return;const payload={app:'ecza-envanter',version:1,exportedAt:new Date().toISOString(),medicines,evaluations};const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`ecza-ilaclar-${new Date().toISOString().slice(0,10)}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000)}
  async function importFile(file:File){try{const data=parseBackup(JSON.parse(await file.text()));const seen=new Set(medicines.map(m=>m.id));const fresh:Medicine[]=[];const evals:Record<string,Evaluation>={};for(const m of data.medicines){const id=seen.has(m.id)?crypto.randomUUID():m.id;seen.add(id);fresh.push({...m,id});const ev=data.evaluations[m.id];if(ev)evals[id]={...ev,result:{...ev.result,id}}}setMedicines(prev=>[...prev,...fresh]);setEvaluations(prev=>({...prev,...evals}));setError('')}catch(e){setError(e instanceof Error?e.message:'Dosya okunamadı.')}}
 async function analyze(){
  if(lock.current||!pending.length)return;
  lock.current=true;setRunning(true);setElapsed(0);setError('');
  const queue=[...pending];setBatch({done:0,total:queue.length});
  try{
   for(let offset=0;offset<queue.length;offset+=12){
    if(!mounted.current)break;
    const chunk=queue.slice(offset,offset+12);
    setActiveId(chunk[0].id);setSelectedId(chunk[0].id);
    setFailures(f=>{const next={...f};for(const m of chunk)delete next[m.id];return next});
    const controller=new AbortController();abort.current=controller;
    const timeout=setTimeout(()=>controller.abort(),55000);
    let data:Report;
    try{
     const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({medicines:chunk}),signal:controller.signal});
     const report:Report & {error?:string}=await response.json();
     if(!response.ok)throw Error(report.error||'Jev isteği tamamlanamadı.');
     if(report.results?.length!==chunk.length||chunk.some((m,i)=>report.results[i]?.id!==m.id||!report.answers?.[`medicine_${i}`]||!report.otcAnswers?.[`otc_${i}`]))throw Error('Jev yanıtı kayıtlarla eşleştirilemedi.');
     data=report;
    }catch(e){
     if(!mounted.current)break;
     const message=e instanceof Error&&e.name==='AbortError'?'İstek zaman aşımına uğradı. Yeniden deneyebilirsin.':e instanceof Error?e.message:'Bağlantı hatası.';
     setFailures(prev=>({...prev,...Object.fromEntries(chunk.map(m=>[m.id,message]))}));
     setError('Bazı kayıtlar tamamlanamadı. Başarılı sonuçlar korundu; tekrar değerlendirdiğinde yalnızca bekleyenler gönderilecek.');
     setBatch({done:offset+chunk.length,total:queue.length});
     continue;
    }finally{clearTimeout(timeout)}
    if(!mounted.current)break;
    const completedBatch=Object.fromEntries(chunk.map((m,i)=>[m.id,{
     result:data.results[i],model:data.model,elapsedMs:data.elapsedMs,
     // Usage belongs to the entire request; count it once across its results.
     usage:i===0?data.usage:{},answer:data.answers[`medicine_${i}`],otcAnswer:data.otcAnswers[`otc_${i}`],
    }]));
    setEvaluations(prev=>({...prev,...completedBatch}));
    const last=chunk[chunk.length-1];setActiveId(last.id);setSelectedId(last.id);
    setBatch({done:offset+chunk.length,total:queue.length});
   }
  }finally{lock.current=false;if(mounted.current){setRunning(false);setActiveId(null)}}
 }
 return <><header><div className="brand"><Pill/>ecza dolabı<span>İLAÇ ENVANTERİ / 02</span></div><div className="connection"><span className={'dot'+(running?' live':'')}/>typesafe-ai/jev</div></header><main className="queue-main">
 <div className="intro"><div><p className="eyebrow">EVDE BİRİKEN İLAÇLAR İÇİN</p><h1>Ecza dolabına düzen getir.</h1><p className="muted">Evde biriken ilaçlarını listele. Türlerini ve son kullanma tarihlerini gözden geçir, ayıracaklarını tek yerde gör.</p></div><span className="session-label">BU OTURUMDA · KAYITLAR YEREL BELLEKTE</span></div>
 <div className="dashboard-stats"><div><span>LİSTEDEKİ İLAÇ</span><strong>{medicines.length.toString().padStart(2,'0')}</strong></div><div><span>DEĞERLENDİRİLEN</span><strong>{completed.length.toString().padStart(2,'0')}</strong></div><div><span>BEKLEYEN</span><strong>{pending.length.toString().padStart(2,'0')}</strong></div><div><span>TOPLAM TOKEN</span><strong>{totalTokens.toLocaleString('tr-TR')}</strong></div><div><span>SON ÇALIŞMA</span><strong>{elapsed.toFixed(1)}<small> sn</small></strong></div></div>
 <div className="queue-workspace"><div className="entry-column"><section className="panel"><div className="panel-head"><div className="panel-title"><Plus/><h2>İlaç ekle</h2></div><span className="count">ELLE GİRİŞ</span></div>
 <form onSubmit={add} className="entry-form"><div className="field"><label htmlFor="medicine-name">İlaç adı ve dozu</label><input ref={nameInput} id="medicine-name" required minLength={2} maxLength={200} value={draft.name} placeholder="Örn. Parol 500 mg" onChange={e=>setDraft(d=>({...d,name:e.target.value}))}/></div><div className="field"><label htmlFor="medicine-notes">Etken madde / kutudaki ek bilgi</label><textarea id="medicine-notes" maxLength={1200} value={draft.notes} placeholder="Okunuyorsa yaz; kişisel bilgi ekleme." onChange={e=>setDraft(d=>({...d,notes:e.target.value}))}/></div><div className="field"><label htmlFor="medicine-expiry">Son kullanma tarihi (isteğe bağlı)</label><input id="medicine-expiry" type="text" inputMode="numeric" autoComplete="off" placeholder="AAYY · örn. 0926" value={draft.expiry} onChange={e=>setDraft(d=>({...d,expiry:e.target.value}))}/></div><div className="entry-bottom"><span className="small muted">Enter ile ekle, sıradaki kutuya geç.</span><button className="primary" type="submit" disabled={draft.name.trim().length<2}><Plus/>Listeye ekle</button></div></form></section>
 <section className="panel queue-panel"><div className="panel-head"><div className="panel-title"><Pill/><h2>Eklenen ilaçlar</h2></div><span className="count">{medicines.length} KAYIT</span></div><div className="queue-list">{!medicines.length?<div className="compact-empty"><Pill/><p>Eklediğin ilaçlar burada birikecek.</p></div>:medicines.map((m,i)=><div className={'queue-item'+(activeId===m.id?' current':'')} key={m.id}><span className="number">{String(i+1).padStart(2,'0')}</span><div className="queue-item-name"><strong>{m.name}</strong><span>{m.notes||'Ek kutu bilgisi yok'}{m.expiry?` · SKT ${m.expiry.slice(5)}/${m.expiry.slice(2,4)}`:''}</span></div><span className={'queue-state '+(evaluations[m.id]?'done':failures[m.id]?'failed':'')}>{evaluations[m.id]?<><Check/>Tamamlandı</>:activeId===m.id?<><LoaderCircle className="spin"/>İşleniyor</>:failures[m.id]?<><RotateCcw/>Tekrar dene</>:<><Clock/>Bekliyor</>}</span>{!evaluations[m.id]&&<button className="icon-button" aria-label={`${m.name} kaydını kaldır`} disabled={running} onClick={()=>remove(m.id)}><X/></button>}</div>)}</div>
   <div className="queue-controls"><button className="primary analysis-button" onClick={analyze} disabled={running||!pending.length}>{running?<LoaderCircle className="spin"/>:<Activity/>}{running?`Değerlendiriliyor · ${batch.done}/${batch.total}`:pending.length?`Jev ile değerlendir (${pending.length})`:'Jev ile değerlendir'}{!running&&<ArrowRight/>}</button><div className="backup-row"><button type="button" onClick={exportJSON} disabled={running||!medicines.length}><Download/>JSON indir</button><button type="button" onClick={()=>fileInput.current?.click()} disabled={running}><Upload/>JSON yükle</button><input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={e=>{const f=e.target.files?.[0];if(f)void importFile(f);e.target.value=''}}/></div><p className="hint">{running?'Yeni eklediklerin bir sonraki çalışmada işlenir.':'Bekleyen kayıtlar en fazla 12’şer toplu gönderilir; sonuçlar yanıt gelir gelmez gösterilir.'}</p></div></section>
 {error&&<div className="notice error" role="alert"><Info/>{error}</div>}<p className="hint"><ShieldCheck/>Girdiğin metinler Vercel AI Gateway’e gönderilir. Standart veri politikası geçerlidir. Sayfa yenilenince bu oturum temizlenir; saklamak için JSON indir.</p></div>
 <aside className="evaluation-column"><section className="panel live-panel" aria-label="Jev canlı değerlendirme"><div className="panel-head"><div className="panel-title"><Activity/><h2>Canlı değerlendirme</h2></div><span className="count">{activeId&&!selected?'JEV YANITI BEKLENİYOR':selected?`${selected.elapsedMs} MS`:'HAZIR'}</span></div>
 <div className="live-content" aria-live="polite">{!active?<div className="live-empty"><div className="live-orbit"><Activity/></div><h3>Jev’in sıradaki kararı burada.</h3><p>Soldan ilaç ekle, değerlendirmeyi başlat.<br/>Her sonuç burada açılır ve aşağıda birikir.</p><span className="count">METİN → JEV → SINIF DAĞILIMI</span></div>:<div className="current-result" key={active.id}><div className="active-title"><div className="active-icon"><Pill/></div><div><p className="eyebrow">{selected?'JEV YANITI ALINDI':'ŞİMDİ DEĞERLENDİRİLİYOR'}</p><h3>{active.name}</h3><p className="small muted">{active.notes||'Ek kutu bilgisi yok'}</p></div></div>{selected?<><div className="live-bars">{Object.entries(selected.answer.probabilities??{}).sort((a,b)=>b[1]-a[1]).map(([key,p])=><div className={'live-bar-row'+(key===selected.answer.choice?' chosen':'')} key={key}><span>{categories[key as keyof typeof categories]??key}</span><div className="bar-track"><div style={{width:`${Math.max(0,Math.min(100,p*100))}%`}}/></div><code>{(p*100).toFixed(1)}%</code></div>)}</div><div className="decision-block"><span className={'badge '+selected.result.action}>{actionLabels[selected.result.action]}</span><p>{classificationSummary(selected.answer)}</p><p>{selected.result.reason}</p><p><OtcResult answer={selected.otcAnswer}/></p><p className="small muted">Resmi reçete durumu: {selected.result.prescription}. Model tahmini kişisel kullanım onayı değildir.</p></div><div className="result-foot"><span>{selected.model}</span><span>{selected.usage.inputTokens!==undefined||selected.usage.outputTokens!==undefined?`Toplu istek: ${selected.usage.inputTokens??'—'} giriş / ${selected.usage.outputTokens??'—'} çıkış token`:'Token kullanımı toplu istekte sayıldı'}</span></div><details><summary>Gönderilen metin ve ham Jev yanıtı</summary><pre>{JSON.stringify({sent:{name:active.name,label:active.notes},answer:selected.answer,otcAnswer:selected.otcAnswer},null,2)}</pre></details></>:failures[active.id]?<div className="notice error"><Info/>{failures[active.id]}</div>:<div className="waiting-result"><div className="waiting-status"><LoaderCircle className="spin"/><span>Gerçek Jev isteği gönderildi. Sınıflandırma bekleniyor.</span></div>{Array.from({length:6},(_,i)=><div className="skeleton-row" key={i}><span/><span/></div>)}<p className="small muted">Olasılıklar yanıt geldiğinde gösterilecek.</p></div>}</div>}</div><div className="live-caption"><Info/>Jev’in olasılıkları kullanım güvenliği yüzdesi değildir. Tarih ve hasar yönlendirmesini uygulama kuralları belirler.</div></section>
 <section className="panel completed-panel"><div className="panel-head"><div className="panel-title"><Check/><h2>{running?'Tamamlanan sonuçlar':<Link href="/sonuclar">Tamamlanan sonuçlar</Link>}</h2></div><div className="completed-links"><span className="count">{completed.length} / {medicines.length}</span>{!running&&<Link className="results-link" href="/sonuclar">Tümünü gör<ArrowRight/></Link>}</div></div><div className="completed-stack">{!completed.length?<p className="stack-placeholder">Sonuçlar geldikçe burada birikecek.</p>:[...completed].reverse().map(m=>{const e=evaluations[m.id];return <button className={'completed-card'+(active?.id===m.id?' selected':'')} key={m.id} disabled={running} onClick={()=>setSelectedId(m.id)}><div><strong>{m.name}</strong><span>{classificationSummary(e.answer)}</span><span><OtcResult answer={e.otcAnswer}/></span><span className={'badge '+e.result.action}>{actionLabels[e.result.action]}</span></div><div className="completed-timing"><code>{e.elapsedMs} ms</code><ChevronRight/></div></button>})}</div></section></aside></div>
 <div className="notice"><ShieldCheck/><p><strong>Envanter ön değerlendirmesi.</strong> Reçete durumu resmi ilaç kaynağından doğrulanmaz. Bu sonuçlara göre ilaç kullanmaya başlama veya düzenli tedavini bırakma. Bertaraf için ayrılan ilaçları ev çöpüne atma; eczacına veya belediyene atık ilaç toplama noktasını sor.</p></div></main><footer><span>ecza dolabı / evdeki ilaçların bir arada</span><span>listele → grupla → ayır</span></footer></>;
}
