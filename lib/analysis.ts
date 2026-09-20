import { z } from 'zod';
export const medicineSchema = z.object({
  id: z.string().min(1).max(80), name: z.string().trim().min(2).max(200),
  notes: z.string().max(1200), expiry: z.string().regex(/^(|20\d{2}-(0[1-9]|1[0-2]))$/),
  condition: z.enum(['unknown','intact','damaged']), confirmed: z.literal(true),
});
export const requestSchema = z.object({ medicines: z.array(medicineSchema).min(1).max(12) });
export type Medicine = Omit<z.infer<typeof medicineSchema>, 'confirmed'> & {confirmed: boolean};
/** Serbest metin tarih girişini (AA/YY) API formatına (YYYY-AA) çevirir. Boş giriş '' döner, çözülemeyen giriş null döner. */
export function normalizeExpiry(input: string): string | null {
  const raw = input.trim();
  if (!raw) return '';
  const parts = raw.split(/[/\-. \t]+/).filter(Boolean);
  let mm = '', yy = '';
  if (parts.length === 2) [mm, yy] = parts;
  else if (parts.length === 1 && /^\d+$/.test(parts[0])) {
    const d = parts[0];
    if (d.length === 4) { mm = d.slice(0, 2); yy = d.slice(2); }
    else if (d.length === 6) { mm = d.slice(0, 2); yy = d.slice(2); }
    else return null;
  } else return null;
  if (!/^\d{1,2}$/.test(mm) || !/^\d{2}(\d{2})?$/.test(yy)) return null;
  const month = Number(mm);
  if (month < 1 || month > 12) return null;
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  if (year < 2000 || year > 2099) return null;
  return `${year}-${String(month).padStart(2, '0')}`;
}
export const categories = {
  pain: 'Ağrı kesici / ateş düşürücü', antibiotic: 'Antibiyotik', allergy: 'Alerji ilacı',
  stomach: 'Mide / sindirim', chronic: 'Düzenli tedavi ilacı', topical: 'Cilde uygulanan ürün', supplement: 'Vitamin / takviye', unknown: 'Grup doğrulanamadı',
} as const;
export type Category = keyof typeof categories;
export type Result = { id: string; name: string; category: Category; action: 'check'|'consult'|'dispose'; reason: string; prescription: string; expiry: string };
export const CATEGORY_CONFIDENCE_THRESHOLD = .65;
export function decide(m: Medicine, category: Category, probability: number, now: Date = new Date()): Result {
  const reliable = Number.isFinite(probability) && probability >= CATEGORY_CONFIDENCE_THRESHOLD;
  const group = reliable ? category : 'unknown';
  const parts = new Intl.DateTimeFormat('en-CA',{year:'numeric',month:'2-digit',timeZone:'Europe/Istanbul'}).formatToParts(now);
  const year = Number(parts.find(p => p.type === 'year')!.value);
  const month = Number(parts.find(p => p.type === 'month')!.value);
  const currentMonth = year * 12 + month - 1;
  const expiryMonth = m.expiry ? Number(m.expiry.slice(0,4)) * 12 + Number(m.expiry.slice(5)) - 1 : null;
  const expired = expiryMonth !== null && expiryMonth < currentMonth;
  const expiresSoon = expiryMonth !== null && expiryMonth >= currentMonth && expiryMonth <= currentMonth + 3;
  let action: Result['action'] = 'consult';
  let reason = 'İlacın kimliğini, reçete durumunu ve sana uygunluğunu eczacıyla doğrula. Bu değerlendirme kullanım onayı değildir.';
  if (expired || expiresSoon || m.condition === 'damaged') {
    action = 'dispose'; reason = expired ? 'Girdiğin son kullanma tarihi geçmiş. Kullanım için ayırma; atık ilaç toplama noktasına teslim etmek üzere ayrı tut.' : expiresSoon ? 'Girdiğin son kullanma tarihi bu ay veya önümüzdeki 3 ay içinde doluyor. Envanter kuralına göre bertaraf için ayrı tut.' : 'Ambalajı veya ürünü bozulmuş olarak işaretledin. Kullanma; bertaraf yöntemini eczacıyla doğrula.';
  } else if (group !== 'unknown' && !['antibiotic','chronic'].includes(group)) {
    action = 'check'; reason = 'Saklamadan önce son kullanma tarihini, açılma süresini ve saklama koşullarını doğrula. Reçetesiz olsa bile kişisel kullanım uygunluğu ayrıca değerlendirilmelidir.';
  }
  if (!m.expiry && action !== 'dispose') reason += ' Son kullanma tarihi girilmedi.';
  return {id:m.id,name:m.name,category:group,action,reason,prescription:'Doğrulanmadı · eczacıya danış',expiry:m.expiry};
}
export const actionLabels = {check:'Saklama koşullarını kontrol et',consult:'Eczacı / doktora danış',dispose:'Bertaraf için ayır'};

/** Reçetesiz temin yanıtını kişisel envanterin ayırma kuralına uygular. */
export function applyOtcDisposition(result: Result, probability?: number): Result {
  if (probability === undefined || !Number.isFinite(probability) || probability < 0 || probability >= .5 || result.action === 'dispose') return result;
  return {...result, action:'dispose', reason:'Reçetesiz temin tahmini Hayır olduğu için envanter kuralına göre bertaraf grubuna ayrıldı. Bu, ilacın bozuk olduğu anlamına gelmez; bertaraf etmeden önce eczacıyla doğrula ve düzenli tedavini bu sonuca göre bırakma.'};
}
