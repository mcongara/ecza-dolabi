import {otcSummary,type Evaluation} from '@/lib/queue';
export function OtcResult({answer}:{answer:Evaluation['otcAnswer']}){
 const text=otcSummary(answer);
 return <>Reçetesiz temin: {answer&&answer.probability<.5?<><strong className="otc-no">Hayır</strong>{text.slice('Hayır'.length)}</>:text}</>;
}
