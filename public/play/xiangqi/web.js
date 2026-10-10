'use strict';
const canvas=document.querySelector('canvas');
function modal(title,content,cancel,prompt=false){return new Promise(resolve=>{const d=document.getElementById('modal'),input=document.getElementById('entry');d.querySelector('h2').textContent=title;d.querySelector('.message').textContent=content;input.hidden=!prompt;input.value='';document.getElementById('cancel').hidden=!cancel;let done=false;const end=v=>{if(done)return;done=true;d.close();resolve(v);};document.getElementById('confirm').onclick=()=>end(prompt?input.value:true);document.getElementById('cancel').onclick=()=>end(prompt?null:false);d.oncancel=e=>{e.preventDefault();end(prompt?null:false);};input.onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();end(input.value);}};d.showModal();if(prompt)input.focus();});}
let session;
function ensureSession(){if(!session)session=fetch('/api/xiangqi/session',{credentials:'same-origin',cache:'no-store'}).then(r=>{if(!r.ok)throw Error('SESSION');return r.json();}).catch(e=>{session=null;throw e;});return session;}
async function invite(code){const url=new URL(location.origin+'/play/xiangqi/');url.searchParams.set('room',code);const link=url.href;const d=document.getElementById('invite');document.getElementById('invite-link').value=link;document.getElementById('copy-status').textContent='';document.getElementById('copy-link').onclick=async()=>{try{await navigator.clipboard.writeText(link);document.getElementById('copy-status').textContent='已复制，去微信发给朋友吧';}catch{const field=document.getElementById('invite-link');field.focus();field.select();document.getElementById('copy-status').textContent='长按上方链接，选择复制，再发给朋友';}};document.getElementById('close-invite').onclick=()=>d.close();d.showModal();}
const p={canvas,ready:true,dimensions:()=>{const r=canvas.getBoundingClientRect();return{width:r.width,height:r.height,dpr:Math.min(devicePixelRatio||1,3),safeTop:18,safeBottom:12};},
call:async event=>{await ensureSession();const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);try{const r=await fetch('/api/xiangqi/game',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(event),signal:controller.signal});return await r.json();}finally{clearTimeout(timer);}},modal,
prompt:async(t,c)=>{let value=await modal(t,c,true,true);if(value&&value.includes('room=')){try{value=new URL(value).searchParams.get('room');}catch{}}return value;},
save:(k,v)=>{try{localStorage.setItem('xmhua-xiangqi-'+k,JSON.stringify(v));}catch{}},load:k=>{try{return JSON.parse(localStorage.getItem('xmhua-xiangqi-'+k));}catch{return null;}},
clipboard:code=>invite(code),share:code=>invite(code),frame:fn=>requestAnimationFrame(fn),cancelFrame:id=>cancelAnimationFrame(id)};
const client=new ChessClient(p);
canvas.addEventListener('pointerup',e=>{const b=canvas.getBoundingClientRect();client.tap(e.clientX-b.left,e.clientY-b.top);});
window.addEventListener('resize',()=>client.resize());document.addEventListener('visibilitychange',()=>document.hidden?client.hide():client.show());
document.getElementById('help').onclick=()=>client.action('rules');
const room=new URLSearchParams(location.search).get('room');
if(room){client.note='正在加入朋友的棋房…';client.draw();client.open(room);}else ensureSession().catch(()=>{client.note='暂时连不上网络，请稍后创建棋房';client.draw();});
