import test from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";

const BASE=(process.env.CONNECT_BASE_URL||"http://localhost:3001/api/connect").replace(/\/+$/,"");
const HOST=process.env.CONNECT_HOST_TOKEN;
const A=process.env.CONNECT_PARTICIPANT_TOKEN;
const B=process.env.CONNECT_STRANGER_TOKEN;
const RUN=`group-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;
const auth=t=>({Authorization:`Bearer ${t}`});
async function req(path,{token,method="GET",body,expected=200}={}) {
  const r=await fetch(`${BASE}${path}`,{method,headers:{Accept:"application/json",...(token?auth(token):{}),...(body?{"Content-Type":"application/json"}:{})},body:body?JSON.stringify(body):undefined});
  const raw=await r.text(); let data; try{data=raw?JSON.parse(raw):null}catch{data=raw}
  assert.equal(r.status,expected,`${method} ${path}: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
const future=h=>new Date(Date.now()+h*3600000).toISOString();

test("Connect group flow: two participants share room and group conversation",{
  skip: !(HOST&&A&&B)
},async()=>{
  let activityId;
  try {
    const created=await req("/activities",{token:HOST,method:"POST",expected:201,body:{
      title:`Group workshop ${RUN}`,
      description:`Automated group workshop test ${RUN} with multiple participants.`,
      category:"Career",format:"online",deliveryMode:"online",sessionType:"group",
      startAt:future(72),durationMinutes:45,timezone:"Asia/Kolkata",
      maxSeats:2,registrationDeadline:future(48),bookingType:"instant",
      priceType:"free",priceCredits:0,agenda:[],faqs:[]
    }});
    activityId=created.id;
    await req(`/activities/${activityId}/publish`,{token:HOST,method:"POST"});
    const one=await req(`/activities/${activityId}/bookings`,{token:A,method:"POST",expected:201,body:{seats:1}});
    const two=await req(`/activities/${activityId}/bookings`,{token:B,method:"POST",expected:201,body:{seats:1}});
    assert.equal(one.status,"confirmed"); assert.equal(two.status,"confirmed");

    const [roomA,roomB]=await Promise.all([
      req(`/bookings/${one.id}/meeting`,{token:A}),
      req(`/bookings/${two.id}/meeting`,{token:B})
    ]);
    assert.ok(roomA.roomName); assert.equal(roomA.roomName,roomB.roomName);

    const [convsA,convsB]=await Promise.all([
      req("/me/conversations",{token:A}),
      req("/me/conversations",{token:B})
    ]);
    const ca=convsA.items.find(x=>x.activity_id===activityId);
    const cb=convsB.items.find(x=>x.activity_id===activityId);
    assert.ok(ca&&cb,"both group participants must see the group conversation");
    assert.equal(ca.id,cb.id);

    await req(`/conversations/${ca.id}/messages`,{token:A,method:"POST",expected:201,body:{body:`hello-${RUN}`}});
    const seen=await req(`/conversations/${ca.id}/messages`,{token:B});
    const message=seen.items.find(x=>x.body===`hello-${RUN}`);
    assert.ok(message);
    assert.ok(message.receipts.some(x=>x.readAt),"receiver read receipt should be recorded");
  } finally {
    if(activityId) {
      try { await req(`/activities/${activityId}/cancel`,{token:HOST,method:"POST"}); } catch {}
    }
  }
});
