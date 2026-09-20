import {test} from 'node:test';
import assert from 'node:assert/strict';
import {POST} from '../app/api/analyze/route';

test('one upstream call classifies multiple records without sending condition or expiry',async t=>{
 const oldKey=process.env.AI_GATEWAY_API_KEY;
 process.env.AI_GATEWAY_API_KEY='test-key';
 t.after(()=>{if(oldKey===undefined)delete process.env.AI_GATEWAY_API_KEY;else process.env.AI_GATEWAY_API_KEY=oldKey});
 const medicines=[
  {id:'a',name:'First medicine',notes:'label a',expiry:'2099-01',condition:'unknown',confirmed:true},
  {id:'b',name:'Second medicine',notes:'label b',expiry:'2099-01',condition:'unknown',confirmed:true},
 ];
 const fetchMock=t.mock.method(globalThis,'fetch',async (_url:unknown,init:RequestInit)=>{
  const payload=JSON.parse(init.body as string);
  assert.deepEqual(payload.state,{medicines:[{name:'First medicine',label:'label a'},{name:'Second medicine',label:'label b'}]});
  assert.deepEqual(Object.keys(payload.questions),['medicine_0','otc_0','medicine_1','otc_1']);
  return Response.json({model:'typesafe-ai/jev',answers:{otc_0:{type:'boolean',probability:.1},otc_1:{type:'boolean',probability:.9},medicine_0:{type:'choice',choice:'pain',probabilities:{pain:1}},medicine_1:{type:'choice',choice:'antibiotic',probabilities:{antibiotic:1}}},usage:{inputTokens:100,outputTokens:20}});
 });
 const response=await POST(new Request('http://localhost/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({medicines})}));
 assert.equal(response.status,200);
 const data=await response.json();
 assert.equal(fetchMock.mock.callCount(),1);
 assert.deepEqual(data.results.map((r:{id:string;action:string})=>[r.id,r.action]),[['a','dispose'],['b','consult']]);
 assert.equal(data.otcAnswers.otc_0.probability,.1);
 // Even an antibiotic's positive model answer is preserved, not overridden.
 assert.equal(data.otcAnswers.otc_1.probability,.9);
 assert.deepEqual(data.usage,{inputTokens:100,outputTokens:20});
});
