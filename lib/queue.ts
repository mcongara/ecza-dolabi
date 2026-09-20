import { z } from 'zod';
import { categories, CATEGORY_CONFIDENCE_THRESHOLD, medicineSchema, type Medicine, type Result } from './analysis';
export type OtcAnswer = {type:'boolean';probability:number};
export type Evaluation = { otcAnswer?: OtcAnswer; result: Result; model: string; elapsedMs: number; usage: {inputTokens?:number;outputTokens?:number}; answer: {choice:string;probabilities?:Record<string,number>} };
export function otcSummary(answer?: OtcAnswer): string {
 if(!answer)return 'Henüz değerlendirilmedi';
 const p=answer.probability;
 const verdict=p>.5?'Evet':p<.5?'Hayır':'Belirsiz';
 return `${verdict} · %${(p*100).toLocaleString('tr-TR',{maximumFractionDigits:1})}`;
}
/** Model tahminini gösterir; yerel kararın unknown olması tahmini gizlemez. */
export function classificationSummary(answer: Evaluation['answer']): string {
 const choice = answer.choice;
 if (!Object.hasOwn(categories, choice) || choice === 'unknown') return categories.unknown;
 const label = categories[choice as keyof typeof categories];
 const probability = answer.probabilities?.[choice];
 if (probability === undefined || !Number.isFinite(probability) || probability < 0 || probability > 1) return `${label} · olasılık belirtilmedi`;
 const percent = (probability * 100).toLocaleString('tr-TR', { maximumFractionDigits: 1 });
 return `${label} · %${percent}${probability < CATEGORY_CONFIDENCE_THRESHOLD ? ` · %${CATEGORY_CONFIDENCE_THRESHOLD * 100} eşiğinin altında` : ''}`;
}
export function pendingMedicines(medicines: Medicine[], evaluations: Record<string,Evaluation>): Medicine[] {
 return medicines.filter(m=>!evaluations[m.id]);
}
/** Give every returned result its own visible turn, including the last in a batch. */
export async function presentInOrder<T>(items: readonly T[], show: (item: T, index: number) => void, signal: AbortSignal, durationMs = 150): Promise<void> {
 for (const [index, item] of items.entries()) {
  if (signal.aborted) return;
  show(item, index);
  await new Promise<void>(resolve => {
   const finish = () => {
    clearTimeout(timer);
    signal.removeEventListener('abort', finish);
    resolve();
   };
   const timer = setTimeout(finish, durationMs);
   signal.addEventListener('abort', finish, { once: true });
   if (signal.aborted) finish();
  });
 }
}
const resultSchema = z.object({
 id: z.string(), name: z.string(),
 category: z.enum(['pain','antibiotic','allergy','stomach','chronic','topical','supplement','unknown']),
 action: z.enum(['check','consult','dispose']),
 reason: z.string(), prescription: z.string(), expiry: z.string(),
});
const evaluationSchema = z.object({
 otcAnswer: z.object({type:z.literal('boolean'),probability:z.number().min(0).max(1)}).optional(),
 result: resultSchema, model: z.string(), elapsedMs: z.number(),
 usage: z.object({ inputTokens: z.number().optional(), outputTokens: z.number().optional() }),
 answer: z.object({ choice: z.string(), probabilities: z.record(z.string(), z.number()).optional() }),
});
const backupSchema = z.object({
 medicines: z.array(medicineSchema).min(1).max(60),
 evaluations: z.record(z.string(), evaluationSchema).optional(),
});
/** JSON yedeği doğrular; bozuk dosyada Türkçe hata fırlatır. Eşleşmeyen sonuçlar elenir. */
export function parseBackup(input: unknown): { medicines: Medicine[]; evaluations: Record<string, Evaluation> } {
 const raw = Array.isArray(input) ? { medicines: input } : input;
 const parsed = backupSchema.safeParse(raw);
 if (!parsed.success) throw Error('Bu dosya ilaç listesi olarak okunamadı. Bu uygulamadan indirilmiş bir JSON seç.');
 const evaluations = { ...(parsed.data.evaluations ?? {}) };
 const ids = new Set(parsed.data.medicines.map(m => m.id));
 for (const key of Object.keys(evaluations)) {
  if (!ids.has(key) || evaluations[key].result.id !== key) delete evaluations[key];
 }
 return { medicines: parsed.data.medicines.map(m => ({ ...m, confirmed: true })), evaluations };
}
