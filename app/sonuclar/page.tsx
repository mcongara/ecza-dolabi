'use client';
import Link from 'next/link';
import {ArrowLeft,Pill,Check} from 'lucide-react';
import {useInventory} from '../components/inventory-provider';
import {OtcResult} from '../components/otc-result';
import {actionLabels} from '@/lib/analysis';
import {classificationSummary} from '@/lib/queue';

export default function ResultsPage(){
 const {medicines,evaluations}=useInventory();
 const completed=medicines.filter(m=>evaluations[m.id]);
 return <>
  <header><div className="brand"><Pill/>ecza dolabı<span>İLAÇ ENVANTERİ / SONUÇLAR</span></div><Link className="results-link" href="/"><ArrowLeft/>Listeye dön</Link></header>
  <main className="results-page">
   <div className="intro"><div><p className="eyebrow">ENVANTERİN GENEL GÖRÜNÜMÜ</p><h1>Tamamlanan sonuçlar</h1><p className="muted">İlaçlarının gruplarını ve ayırma sonuçlarını bir arada gör.</p></div><span className="count">{completed.length} İLAÇ</span></div>
   {!completed.length?<section className="panel empty"><Check/><h2>Henüz tamamlanan sonuç yok.</h2><p>İlaç ekleyip değerlendirmeyi başlat veya JSON yedeğini yükle.</p><Link className="results-link" href="/">İlaç listesine dön</Link></section>:<div className="medicine-card-grid">
    {completed.map(m=>{const e=evaluations[m.id];return <article className="panel medicine-result-card" key={m.id}>
     <div className="medicine-card-heading"><Pill/><h2>{m.name}</h2></div>
     {m.notes&&<p className="small muted">{m.notes}</p>}
     <div className="medicine-card-facts"><p>{classificationSummary(e.answer)}</p><p><OtcResult answer={e.otcAnswer}/></p><p>Son kullanma tarihi: {m.expiry?`${m.expiry.slice(5)}/${m.expiry.slice(0,4)}`:'Girilmedi'}</p></div>
     <span className={'badge '+e.result.action}>{actionLabels[e.result.action]}</span>
     <p className="medicine-card-reason">{e.result.reason}</p>
    </article>})}
   </div>}
   <p className="hint">Sonuçlar envanter ön değerlendirmesidir; kişisel kullanım onayı değildir. Sayfa yenilenince oturum temizlenir. Saklamak için ilaç listesinden JSON indir.</p>
  </main>
 </>;
}
