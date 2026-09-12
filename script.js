// CITY PULSE - COMPLETE JS - FIXED REFRESH SPAM
const CONFIG = {
  PUBLIC_KEY: "9KWB-Ya0sqTOHEjy5",
  SERVICE_ID: "service_vz5tdkf",
  TEMPLATE_ID: "template_xh1myji",
  ADMIN_EMAIL: "ritikparida16@gmail.com",
  THRESHOLD: 10
};

let model=null, stream=null, isDetecting=false, count=0;
const video=document.getElementById('video'), canvas=document.getElementById('canvas'), ctx=canvas.getContext('2d');
let ESTIMATION=2.5, MIN_SCORE=0.4;

// FIXED - ANTI SPAM VARIABLES
let lastAlertTime = JSON.parse(localStorage.getItem('cp_lastAlertTime') || '{}');
let previousEstimated = 0;
let cameraStartedTime = 0;
let totalEmailsSent = parseInt(localStorage.getItem('cp_emailCount')||'0');

// Sliders
document.getElementById('factor')?.addEventListener('input', e=>{ ESTIMATION=parseFloat(e.target.value); document.getElementById('factorVal').textContent='x'+ESTIMATION; });
document.getElementById('minScore')?.addEventListener('input', e=>{ MIN_SCORE=parseFloat(e.target.value); document.getElementById('scoreVal').textContent=MIN_SCORE; });
if(document.getElementById('emailCount')) document.getElementById('emailCount').textContent = totalEmailsSent + ' Sent';

function loadSettings(){
 let adminEmailsEl = document.getElementById('adminEmails');
 let thresholdEl = document.getElementById('alertThreshold');
 if(adminEmailsEl) adminEmailsEl.value=localStorage.getItem('cp_admin_emails')||CONFIG.ADMIN_EMAIL;
 if(thresholdEl) thresholdEl.value=localStorage.getItem('cp_threshold')||CONFIG.THRESHOLD;
 try{ emailjs.init(CONFIG.PUBLIC_KEY); addLog('✅ EmailJS Ready - Service: '+CONFIG.SERVICE_ID); }catch(e){}
}
function saveSettings(){
 localStorage.setItem('cp_admin_emails', document.getElementById('adminEmails').value);
 localStorage.setItem('cp_threshold', document.getElementById('alertThreshold').value);
 addLog('Settings saved - Threshold: '+document.getElementById('alertThreshold').value);
}
function addLog(msg){
 let log=document.getElementById('alertLog');
 if(!log) return;
 log.innerHTML=`<div>[${new Date().toLocaleTimeString()}] ${msg}</div>`+log.innerHTML;
}

async function listCams(){
 try{
  let tmp=await navigator.mediaDevices.getUserMedia({video:true}); tmp.getTracks().forEach(t=>t.stop());
  let devs=await navigator.mediaDevices.enumerateDevices();
  let cams=devs.filter(d=>d.kind==='videoinput');
  let sel=document.getElementById('camSelect'); if(!sel) return; sel.innerHTML='';
  cams.forEach((d,i)=>{ sel.innerHTML+=`<option value="${d.deviceId}">${d.label||'Camera '+(i+1)}</option>`; });
 }catch(e){ console.log(e); }
}
async function loadAI(){
 try{
  await tf.ready();
  model=await cocoSsd.load({base:'lite_mobilenet_v2'});
  document.getElementById('loading').style.display='none';
  document.getElementById('modelStatus').textContent='AI Ready';
  document.getElementById('modelStatus').style.color='#2ee66c';
 }catch(e){ document.getElementById('loading').innerHTML=`Failed: ${e.message}`; }
}
async function startCam(){
 let deviceId=document.getElementById('camSelect').value;
 try{
  if(stream) stream.getTracks().forEach(t=>t.stop());
  let constraints = deviceId && deviceId!=='Select Camera'? {video:{deviceId:{exact:deviceId}}} : {video:true};
  stream=await navigator.mediaDevices.getUserMedia(constraints);
  video.srcObject=stream;
  document.getElementById('liveBadge').textContent='LIVE - MONITORING';
  video.onloadedmetadata=()=>{
   canvas.width=video.videoWidth; canvas.height=video.videoHeight;
   isDetecting=true;
   cameraStartedTime = Date.now();
   previousEstimated = 0;
   addLog('Camera started - Anti-spam protection active for 10 seconds');
   detect();
  };
 }catch(e){ alert("Camera Error: "+e.message); }
}
function stopCam(){ isDetecting=false; if(stream) stream.getTracks().forEach(t=>t.stop()); document.getElementById('liveBadge').textContent='OFFLINE'; }

// FIXED EMAIL - NO SPAM ON REFRESH
function sendEmailAlert(placeId, placeName, est, detected, level, time){
 let emails=document.getElementById('adminEmails').value || CONFIG.ADMIN_EMAIL;
 let threshold=parseInt(document.getElementById('alertThreshold').value||CONFIG.THRESHOLD);

 if(Date.now() - cameraStartedTime < 10000) return; // 10 sec protection after start/refresh

 if(previousEstimated <= threshold && est <= threshold) return; // both below

 if(previousEstimated > threshold && est > threshold){
  let now=Date.now();
  if(lastAlertTime[placeId] && now-lastAlertTime[placeId] < 5*60*1000) return;
 }

 let now=Date.now();
 if(lastAlertTime[placeId] && now-lastAlertTime[placeId] < 5*60*1000){
  let remaining = Math.ceil((5*60*1000 - (now-lastAlertTime[placeId]))/1000/60);
  addLog(`⏳ Cooldown for ${placeName} - ${remaining} min left`);
  return;
 }

 lastAlertTime[placeId]=now;
 localStorage.setItem('cp_lastAlertTime', JSON.stringify(lastAlertTime));
 let emailList=emails.split(',').map(e=>e.trim()).filter(e=>e);
 addLog(`🚨 CROSSED: ${previousEstimated} -> ${est} (Limit ${threshold}) at ${placeName}`);
 emailList.forEach(email=>{
  let params={ to_email: email, location_name: placeName, count: est, detected: detected, level: level, time: time, date: new Date().toLocaleString(), location_id: placeId };
  emailjs.send(CONFIG.SERVICE_ID, CONFIG.TEMPLATE_ID, params).then(()=>{
   totalEmailsSent++; localStorage.setItem('cp_emailCount', totalEmailsSent);
   document.getElementById('emailCount').textContent=totalEmailsSent+' Sent';
   document.getElementById('emailStatus').textContent=`Sent at ${new Date().toLocaleTimeString()}`;
   addLog(`✅ SENT to ${email} - Count:${est}`);
  }).catch(err=>{ addLog(`❌ Failed ${email}: ${err.text||err.message}`); });
 });
}

function testEmail(){
 let emails=document.getElementById('adminEmails').value || CONFIG.ADMIN_EMAIL;
 addLog('Test to '+emails);
 emails.split(',').forEach(email=>{
  email=email.trim(); if(!email) return;
  let params={ to_email: email, location_name: "Phagwara Main Market (TEST)", count: 15, detected: 6, level: "CRITICAL", time: "Approx. 60+ mins - Avoid", date: new Date().toLocaleString(), location_id: "phagwara-main-market" };
  emailjs.send(CONFIG.SERVICE_ID, CONFIG.TEMPLATE_ID, params).then(()=>{ addLog(`✅ TEST SENT to ${email}`); }).catch(err=>{ addLog(`❌ TEST FAILED: ${err.text}`); });
 });
 alert('Test triggered! Check inbox of '+emails);
}

async function detect(){
 if(!isDetecting ||!model){ requestAnimationFrame(detect); return; }
 if(video.readyState===4){
  let preds=await model.detect(video);
  let persons=preds.filter(p=>p.class==='person' && p.score>=MIN_SCORE);
  count=persons.length;
  ctx.clearRect(0,0,canvas.width,canvas.height);
  persons.forEach(p=>{ let [x,y,w,h]=p.bbox; ctx.strokeStyle="#2ee66c"; ctx.lineWidth=2; ctx.strokeRect(x,y,w,h); });
  document.getElementById('detected').textContent=count;
  let estimated=Math.round(count*ESTIMATION); if(count>=1) estimated=Math.max(estimated, count+2); if(count>=3) estimated+=3; if(count==0) estimated=0;
  document.getElementById('estimated').textContent=estimated;
  let level,time,color;
  if(estimated<=2){level="LOW";time="No congestion";color="#2ee66c";}
  else if(estimated<=6){level="MODERATE";time="Approx. 10 mins waiting";color="#5a86ff";}
  else if(estimated<=12){level="HIGH";time="Approx. 30 mins heavy rush";color="#ffaa00";}
  else{level="CRITICAL";time="Approx. 60+ mins - Avoid";color="#ff4d4d";}
  document.getElementById('level').textContent=level; document.getElementById('level').style.color=color; document.getElementById('time').textContent=time;
  let place=document.getElementById('placeSelect').value;
  let placeName=document.getElementById('placeSelect').options[document.getElementById('placeSelect').selectedIndex].text;
  let threshold=parseInt(document.getElementById('alertThreshold').value||CONFIG.THRESHOLD);
  if(estimated>threshold){ sendEmailAlert(place, placeName, estimated, count, level, time); }
  let data=JSON.parse(localStorage.getItem('cityPulseData')||'{}');
  data[place]={count:estimated, detected:count, level:level, time:time, placeName:placeName, updated:Date.now()};
  localStorage.setItem('cityPulseData', JSON.stringify(data));
  try{ const bc=new BroadcastChannel('citypulse_channel'); bc.postMessage({type:'crowd_update', data:data}); }catch(e){}
  previousEstimated = estimated;
 }
 setTimeout(()=>requestAnimationFrame(detect), 300);
}

document.getElementById('startBtn').onclick=startCam;
document.getElementById('stopBtn').onclick=stopCam;
listCams(); loadAI(); loadSettings();