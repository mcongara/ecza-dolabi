import {test} from 'node:test';
import assert from 'node:assert/strict';
import {applyOtcDisposition,decide,normalizeExpiry,requestSchema,type Medicine} from '../lib/analysis';
const m:Medicine={id:'1',name:'Örnek ürün',notes:'',expiry:'',condition:'unknown',confirmed:true};
test('low probability and absent probability never approve a drug',()=>{assert.equal(decide(m,'pain',.3).action,'consult');assert.equal(decide(m,'pain',NaN).category,'unknown')});
test('expired or damaged medicine is separated regardless of model category',()=>{assert.equal(decide({...m,expiry:'2020-01'},'pain',.99).action,'dispose');assert.equal(decide({...m,condition:'damaged'},'unknown',0).action,'dispose')});
test('antibiotics and chronic treatment require professional review',()=>{for(const group of ['antibiotic','chronic'] as const)assert.equal(decide(m,group,1).action,'consult')});
test('pain classification never verifies prescription or personal safety',()=>{const r=decide(m,'pain',1);assert.equal(r.action,'check');assert.match(r.prescription,/Doğrulanmadı/)});
test('unconfirmed records, invalid dates and oversized lists rejected',()=>{assert.equal(requestSchema.safeParse({medicines:[{...m,confirmed:false}]}).success,false);assert.equal(requestSchema.safeParse({medicines:[{...m,expiry:'2026-13'}]}).success,false);assert.equal(requestSchema.safeParse({medicines:Array(13).fill(m)}).success,false)});
test('free-text expiry accepts AA/YY variants and rejects invalid input',()=>{for(const v of ['09/26','09-26','09.26','0926','9/26','09/2026',' 09/26 '])assert.equal(normalizeExpiry(v),'2026-09');assert.equal(normalizeExpiry(''),'');for(const v of ['13/26','00/26','ab','09/2','092','09/202','2026-13','09/26/01'])assert.equal(normalizeExpiry(v),null)});
test('expiry disposal includes the current month through three calendar months ahead',()=>{
 const now=new Date('2026-09-20T12:00:00Z');
 for(const expiry of ['2026-08','2026-09','2026-10','2026-11','2026-12'])assert.equal(decide({...m,expiry},'pain',1,now).action,'dispose',expiry);
 assert.equal(decide({...m,expiry:'2027-01'},'pain',1,now).action,'check');
 assert.equal(decide(m,'pain',1,now).action,'check');
 assert.match(decide({...m,expiry:'2026-12'},'pain',1,now).reason,/3 ay/);
});
test('expiry window handles year rollover and Istanbul month boundaries',()=>{
 const now=new Date('2026-10-31T21:30:00Z'); // November in Istanbul
 assert.equal(decide({...m,expiry:'2027-02'},'unknown',0,now).action,'dispose');
 assert.equal(decide({...m,expiry:'2027-03'},'pain',1,now).action,'check');
});

test('classification accepts 65 percent inclusively and keeps lower scores unknown',()=>{
 assert.equal(decide(m,'stomach',.65).category,'stomach');
 assert.equal(decide(m,'stomach',.649).category,'unknown');
 assert.equal(decide(m,'stomach',.9).category,'stomach');
});

test('negative OTC answer sends records to disposal without overriding model category',()=>{
 const result=decide(m,'pain',1);
 const updated=applyOtcDisposition(result,.1);
 assert.equal(updated.action,'dispose');
 assert.equal(updated.category,'pain');
 assert.match(updated.reason,/Reçetesiz temin tahmini Hayır/);
 for(const p of [.5,.8,undefined,NaN,-.1])assert.equal(applyOtcDisposition(result,p),result);
 const expired=decide({...m,expiry:'2020-01'},'pain',1);
 assert.equal(applyOtcDisposition(expired,.1),expired);
});
