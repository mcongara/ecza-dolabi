import {test} from 'node:test';
import assert from 'node:assert/strict';
import {otcSummary,pendingMedicines,parseBackup,type Evaluation} from '../lib/queue';
import {decide,type Medicine} from '../lib/analysis';
const first:Medicine={id:'first',name:'Parol 500 mg',notes:'',expiry:'',condition:'unknown',confirmed:true};
const second={...first,id:'second'};
const evaluated:Evaluation={result:decide(first,'pain',1),model:'typesafe-ai/jev',elapsedMs:200,usage:{},answer:{choice:'pain'}};
test('completed records are not sent again; failed records stay pending',()=>{assert.deepEqual(pendingMedicines([first,second],{first:evaluated}).map(m=>m.id),['second'])});
test('new records are queued without invalidating previous results',()=>{const third={...first,id:'third'};assert.deepEqual(pendingMedicines([first,third],{first:evaluated}).map(m=>m.id),['third'])});
test('a captured batch does not gain records added during evaluation',()=>{const medicines=[first];const captured=pendingMedicines(medicines,{});medicines.push(second);assert.deepEqual(captured.map(m=>m.id),['first'])});
test('valid backup restores medicines and matching evaluations',()=>{const data=parseBackup({medicines:[first],evaluations:{first:evaluated}});assert.deepEqual(data.medicines.map(m=>m.id),['first']);assert.ok(data.evaluations.first)});
test('backup drops evaluations without a matching medicine and accepts bare arrays',()=>{const data=parseBackup({medicines:[first],evaluations:{first:evaluated,nope:{...evaluated,result:{...evaluated.result,id:'nope'}}}});assert.deepEqual(Object.keys(data.evaluations),['first']);assert.equal(parseBackup([first]).medicines.length,1)});
test('invalid backup files are rejected',()=>{for(const bad of [{}, {medicines:[]}, {medicines:[{...first,confirmed:false}]}, 'metin', null])assert.throws(()=>parseBackup(bad))});

test('OTC model answers retain their probability through backup export and import',()=>{
 const ev={...evaluated,otcAnswer:{type:'boolean' as const,probability:.9}};
 const restored=parseBackup(JSON.parse(JSON.stringify({medicines:[first],evaluations:{first:ev}})));
 assert.deepEqual(restored.evaluations.first.otcAnswer,ev.otcAnswer);
 assert.match(otcSummary(ev.otcAnswer),/^Evet/);
 assert.match(otcSummary({type:'boolean',probability:.1}),/^Hayır/);
 assert.match(otcSummary({type:'boolean',probability:.5}),/^Belirsiz/);
 assert.equal(otcSummary(),'Henüz değerlendirilmedi');
});
