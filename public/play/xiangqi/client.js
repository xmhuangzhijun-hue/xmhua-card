(function(root){
'use strict';
const E=typeof module!=='undefined'?require('./engine'):root.XQ;
const title={undo:'悔棋',draw:'和棋',rematch:'再来一局'};
class ChessClient{
 constructor(platform){
  this.p=platform;this.ctx=platform.canvas.getContext('2d');this.mode='lobby';this.room=null;
  this.board=E.initial();this.turn='r';this.selected=null;this.legal=[];this.hits=[];
  this.note='建一个棋房，邀请朋友来下棋';this.busy=false;this.hidden=false;this.pollTimer=null;
  this.pendingWrite=null;this.errorCount=0;this.localHistory=[];this.localResult=null;this.aiTimer=null;this.motion=null;this.frame=null;
  this.lastRoom=platform.load('lastRoom')||'';this.pendingWrite=platform.load('pendingWrite')||null;
  this.resize();
 }
 resize(){const d=this.p.dimensions();this.w=d.width;this.h=d.height;this.top=d.safeTop||18;this.bottom=d.safeBottom||12;this.p.canvas.width=this.w*d.dpr;this.p.canvas.height=this.h*d.dpr;this.ctx.setTransform(d.dpr,0,0,d.dpr,0,0);this.draw();}
 id(){return Date.now().toString(36)+'_'+Math.random().toString(36).slice(2)+'_'+Math.random().toString(36).slice(2);}
 async inform(text){return this.p.modal('楚河象棋',text,false);}
 async confirm(text){return this.p.modal('确认操作',text,true);}
 cloudReady(){if(this.p.ready)return true;this.inform('好友联机需要配置微信 AppID 和云开发环境。现在可以先点「单机练习」体验棋盘。');return false;}
 async send(action,extra={}){
  if(this.busy||!this.cloudReady())return;
  if(this.pendingWrite){await this.inform('上次操作还没有确认结果，请先点「重试同步」。');return;}
  const event={action,...extra,requestId:this.id()};
  if(this.room&&action!=='create'&&action!=='join'){event.code=this.room.code;event.version=this.room.version;}
  this.pendingWrite=event;this.p.save('pendingWrite',event);await this.flush();
 }
 async flush(){
  if(this.busy||!this.pendingWrite||!this.cloudReady())return;
  this.busy=true;this.note='正在同步…';this.draw();
  try{
   const result=await this.p.call(this.pendingWrite);
   if(!result||typeof result.ok!=='boolean')throw Error('BAD_RESPONSE');
   if(!result.ok&&result.code==='UNAVAILABLE')throw Error('UNAVAILABLE');
   const failed=this.pendingWrite;
   this.pendingWrite=null;this.p.save('pendingWrite',null);
   if(!result.ok){this.note=result.message;await this.inform(result.message);if(this.room)await this.poll(true);else if(failed.action==='join')this.note='检查房间码，或让朋友重新发送邀请';}
   else this.accept(result.room);
  }catch{this.note='网络暂时中断，点「重试同步」确认结果';}
  finally{this.busy=false;this.draw();this.schedule();}
 }
 accept(room){
  if(this.room&&this.room.code===room.code&&room.version<this.room.version)return;
  const changed=!this.room||this.room.code!==room.code||this.room.version!==room.version;
  if(changed&&this.room&&room.game===this.room.game&&room.history.length===this.room.history.length+1&&room.lastMove){this.motion={move:room.lastMove,piece:room.board[room.lastMove.tr][room.lastMove.tc],start:Date.now()};}
  this.room=room;this.board=room.board;this.turn=room.turn;this.mode='online';this.lastRoom=room.code;
  this.p.save('lastRoom',room.code);this.errorCount=0;this.note='已同步';
  if(changed){this.selected=null;this.legal=[];}
  this.draw();
 }
 async poll(force=false){
  if(!this.room||this.hidden||(!force&&this.busy))return;
  const expected=this.room.code;
  try{const result=await this.p.call({action:'get',code:expected});if(!this.room||this.room.code!==expected)return;
   if(result.ok)this.accept(result.room);
   else if(['EXPIRED','NOT_FOUND','FORBIDDEN'].includes(result.code)){this.note=result.message;this.room=null;this.mode='lobby';this.lastRoom='';this.p.save('lastRoom','');this.board=E.initial();this.draw();}
   else throw Error('UNAVAILABLE');
  }catch{this.errorCount++;this.note='连接中断，正在重连…';this.draw();}
 }
 schedule(){clearTimeout(this.pollTimer);if(this.mode!=='online'||this.hidden)return;const delay=this.errorCount?Math.min(30000,2500*Math.pow(2,Math.min(this.errorCount,4))):this.room.status==='playing'?1800:3500;this.pollTimer=setTimeout(async()=>{if(!this.pendingWrite)await this.poll();this.schedule();},delay);}
 async open(code){
  code=String(code||'').replace(/[\s-]/g,'').toUpperCase();
  if(!/^[A-F0-9]{10}$/.test(code)){await this.inform('房间码是 10 位字母或数字，请检查后重试。');return;}
  if(this.mode==='online'&&this.room&&this.room.code===code){await this.poll();return;}
  if(this.mode==='online'&&this.room&&this.room.status==='playing'&&!await this.confirm('进入其他棋房？当前对局会保留，你可以稍后回来。'))return;
  await this.send('join',{code});
 }
 async join(){if(!this.cloudReady())return;const code=await this.p.prompt('加入棋房','请输入朋友的 10 位房间码');if(code)await this.open(code);}
 async action(name){
  if(this.busy&&name!=='share')return;
  if(name==='create'){await this.send('create');return;}
  if(name==='join'){await this.join();return;}
  if(name==='resume'){await this.open(this.lastRoom);return;}
  if(name==='retry'){await this.flush();return;}
  if(name==='practice'){
   if(this.pendingWrite){await this.inform('请先重试同步，确认上次操作的结果。');return;}
   this.mode='practice';this.board=E.initial();this.turn='r';this.localHistory=[];this.localResult=null;this.selected=null;this.legal=[];this.note='你执红，电脑执黑';this.draw();return;
  }
  if(name==='home'){
   if(this.pendingWrite){await this.inform('请先重试同步，确认上次操作的结果。');return;}
   if(this.mode==='online'&&this.room.status==='playing'&&!await this.confirm('暂时回到首页？棋房会保留，可通过「回到棋房」继续。'))return;
   clearTimeout(this.aiTimer);clearTimeout(this.pollTimer);this.mode='lobby';this.room=null;this.board=E.initial();this.turn='r';this.selected=null;this.legal=[];this.motion=null;this.note='建一个棋房，邀请朋友来下棋';this.draw();return;
  }
  if(name==='share'){if(this.room)this.p.share(this.room.code);return;}
  if(name==='copy'){if(this.room)this.p.clipboard(this.room.code);return;}
  if(name==='rules'){await this.inform('红方先行。点棋子，再点可走的位置。车走直线，马走日，相走田，炮隔一个子吃棋。将帅不能照面。\n\n联机悔棋、和棋和再来一局都需要双方同意。房间保留 48 小时。三次重复或连续 120 步无吃子判和，不使用赛事长将长捉裁定。');return;}
  if(this.mode==='practice'){
   if(name==='undo'){clearTimeout(this.aiTimer);let n=this.turn==='r'?2:1;while(n--&&this.localHistory.length){const h=this.localHistory.pop();this.board=h.board;this.turn=h.turn;}this.localResult=null;this.selected=null;this.legal=[];this.motion=null;this.draw();}
   if(name==='rematch'&&await this.confirm('重新开始练习？'))this.action('practice');return;
  }
  if(name==='agree'||name==='decline'){await this.send('respond',{accept:name==='agree'});return;}
  if(name==='resign'){if(await this.confirm('确定认输这一局？'))await this.send('resign');return;}
  if(['undo','draw','rematch'].includes(name)){await this.send('request',{kind:name});}
 }
 canMove(){return !this.busy&&!this.pendingWrite&&(this.mode==='practice'?this.turn==='r'&&!this.localResult:this.mode==='online'&&this.room.status==='playing'&&this.turn===this.room.you&&!this.activePending());}
 activePending(){return this.room&&this.room.pending&&this.room.pending.expiresAt>Date.now()?this.room.pending:null;}
 async tap(x,y){
  const hit=this.hits.find(z=>x>=z.x&&x<=z.x+z.w&&y>=z.y&&y<=z.y+z.h);
  if(hit){await this.action(hit.action);return;}
  if(!this.canMove())return;
  const cell=this.points.reduce((best,p)=>{const d=Math.hypot(x-p.x,y-p.y);return d<best.d?{...p,d}:best;},{d:Infinity});
  if(cell.d>this.spacing*.55)return;
  const {r,c}=cell,p=this.board[r][c];
  if(p&&p[0]===this.turn){if(this.selected&&this.selected[0]===r&&this.selected[1]===c){this.selected=null;this.legal=[];}else{this.selected=[r,c];this.legal=E.legal(this.board,this.turn).filter(m=>m.fr===r&&m.fc===c);}this.draw();return;}
  const move=this.legal.find(m=>m.tr===r&&m.tc===c);
  if(move){if(this.mode==='online')await this.send('move',{move});else this.localMove(move);}
  else {this.selected=null;this.legal=[];this.draw();}
 }
 localMove(move){
  this.localHistory.push({board:this.board,turn:this.turn});this.board=E.apply(this.board,move);this.turn=E.other(this.turn);this.selected=null;this.legal=[];
  this.motion={move,piece:this.board[move.tr][move.tc],start:Date.now()};
  if(!E.legal(this.board,this.turn).length)this.localResult=(this.turn==='b'?'你':'电脑')+'获胜';
  this.draw();
  if(this.turn==='b'&&!this.localResult)this.aiTimer=setTimeout(()=>{if(this.mode!=='practice'||this.turn!=='b')return;const m=E.bestMove(this.board,'b',2);if(m)this.localMove(m);},420);
 }
 hide(){this.hidden=true;clearTimeout(this.pollTimer);if(this.frame)this.p.cancelFrame(this.frame);this.frame=null;}
 show(query){this.hidden=false;if(query&&query.room)this.open(query.room);else if(this.room){this.poll().then(()=>this.schedule());}this.draw();}
 shareInfo(){return this.room?{title:'来楚河，和我下一盘象棋',query:'room='+this.room.code}:{title:'楚河象棋 · 约朋友下一局',query:''};}
 rect(x,y,w,h,r,fill,stroke){const c=this.ctx;c.beginPath();c.moveTo(x+r,y);c.arcTo(x+w,y,x+w,y+h,r);c.arcTo(x+w,y+h,x,y+h,r);c.arcTo(x,y+h,x,y,r);c.arcTo(x,y,x+w,y,r);c.closePath();if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=1;c.stroke();}}
 text(s,x,y,size=14,color='#263740',align='left',serif=false){const c=this.ctx;c.font=(serif?'bold ':'')+size+'px '+(serif?'serif':'sans-serif');c.fillStyle=color;c.textAlign=align;c.textBaseline='middle';c.fillText(String(s),x,y);}
 button(label,action,x,y,w,primary=false){this.rect(x,y,w,41,9,primary?'#263d48':'#ffffff',primary?null:'#d5dfe1');this.text(label,x+w/2,y+21,14,primary?'#fff':'#263740','center');this.hits.push({x,y,w,h:41,action});}
 drawPiece(p,x,y,r,lift=0){const c=this.ctx;c.save();c.fillStyle='rgba(64,38,14,.25)';c.beginPath();c.ellipse(x+2,y+5,r*.98,r*.88,0,0,Math.PI*2);c.fill();y-=lift;
  for(let z=6;z>=0;z--){c.beginPath();c.ellipse(x,y+z,r,r*.92,0,0,Math.PI*2);c.fillStyle=z>3?'#85552d':'#bd8c4d';c.fill();}
  const g=c.createRadialGradient(x-r*.3,y-r*.5,0,x,y,r*1.3);g.addColorStop(0,'#fff7dc');g.addColorStop(.6,'#f4d49d');g.addColorStop(1,'#cd9b5c');c.fillStyle=g;c.beginPath();c.ellipse(x,y,r,r*.92,0,0,Math.PI*2);c.fill();
  c.strokeStyle='#fff0c6';c.lineWidth=1.5;c.stroke();c.beginPath();c.ellipse(x,y,r-3,r*.92-3,0,0,Math.PI*2);c.strokeStyle='#bb8548';c.lineWidth=1;c.stroke();
  this.text(E.names[p],x,y+1,r*1.28,p[0]==='r'?'#a4332f':'#293d43','center',true);c.restore();
 }
 draw(){
  if(this.hidden)return;const c=this.ctx,w=this.w,h=this.h;c.clearRect(0,0,w,h);c.fillStyle='#f2f5f5';c.fillRect(0,0,w,h);this.hits=[];
  this.text('楚河',22,this.top+22,27,'#263740','left',true);this.text(this.mode==='online'?'好友棋房':this.mode==='practice'?'单机练习':'好友对弈',80,this.top+23,12,'#74848a');
  const top=this.top+64;const bW=Math.min(w-36,(h-this.top-this.bottom-259)*.91,440),bH=bW*1.07;
  const left=(w-bW)/2,by=top+28;
  const you=this.room?this.room.you:'r',flip=you==='b';this.flipped=flip;
  const opponent=this.mode==='online'?(this.room.opponentJoined?'好友 · '+(you==='r'?'黑方':'红方'):'等待好友加入'):this.mode==='practice'?'电脑 · 黑方':'对面留给你的棋友';
  this.text(opponent,22,top+3,13);if(this.mode==='online')this.text(this.room.code.slice(0,5)+' '+this.room.code.slice(5),w-22,top+3,12,'#74848a','right');
  c.save();c.shadowColor='rgba(25,41,44,.22)';c.shadowBlur=17;c.shadowOffsetY=15;this.rect(left,by+8,bW,bH,8,'#754722');c.restore();
  const wood=c.createLinearGradient(left,by,left+bW,by+bH);wood.addColorStop(0,'#e4b87a');wood.addColorStop(1,'#95602f');this.rect(left,by,bW,bH,8,wood,'#b88d52');
  const inset=13;const panel=c.createLinearGradient(left,by,left+bW,by+bH);panel.addColorStop(0,'#f2d8a8');panel.addColorStop(1,'#dcb47e');this.rect(left+inset,by+inset,bW-inset*2,bH-inset*2,2,panel,'#9e703c');
  const margin=bW*.095,gridY=by+margin,dy=(bH-margin*2)/9,dx=(bW-margin*2)/8;this.spacing=dx;
  const point=(r,col)=>({x:w/2+(col-4)*dx*(.97+r*.0067),y:gridY+r*dy});
  const line=(a,b)=>{c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.strokeStyle='#967043';c.lineWidth=.8;c.stroke();};
  for(let r=0;r<10;r++)line(point(r,0),point(r,8));for(let col=0;col<9;col++){if(col===0||col===8)line(point(0,col),point(9,col));else{line(point(0,col),point(4,col));line(point(5,col),point(9,col));}}
  for(let r of [0,7]){line(point(r,3),point(r+2,5));line(point(r,5),point(r+2,3));}
  this.text('楚 河',w/2-bW*.22,gridY+dy*4.5,bW*.047,'#906b42','center',true);this.text('漢 界',w/2+bW*.22,gridY+dy*4.5,bW*.047,'#906b42','center',true);
  this.points=[];let selectedPoint=null;const last=this.room&&this.room.lastMove;
  for(let r=0;r<10;r++)for(let col=0;col<9;col++){
   const q=point(flip?9-r:r,flip?8-col:col);this.points.push({...q,r,c:col});
   if(last&&((last.fr===r&&last.fc===col)||(last.tr===r&&last.tc===col))){c.strokeStyle='#986048';c.lineWidth=1.5;c.strokeRect(q.x-dx*.42,q.y-dy*.4,dx*.84,dy*.8);}
   if(this.legal.some(m=>m.tr===r&&m.tc===col)){c.beginPath();c.arc(q.x,q.y,dx*.12,0,Math.PI*2);c.fillStyle='#326c6b';c.fill();}
   const p=this.board[r][col];if(!p)continue;
   if(this.selected&&this.selected[0]===r&&this.selected[1]===col){selectedPoint={p,...q};continue;}
   if(this.motion&&Date.now()-this.motion.start<340&&this.motion.move.tr===r&&this.motion.move.tc===col)continue;
   this.drawPiece(p,q.x,q.y-3,dx*.42);
   if(this.legal.some(m=>m.tr===r&&m.tc===col)){c.beginPath();c.arc(q.x,q.y-3,dx*.46,0,Math.PI*2);c.strokeStyle='#326c6b';c.lineWidth=2;c.stroke();}
  }
  if(selectedPoint){this.drawPiece(selectedPoint.p,selectedPoint.x,selectedPoint.y-3,dx*.44,10);c.beginPath();c.ellipse(selectedPoint.x,selectedPoint.y-13,dx*.48,dx*.45,0,0,Math.PI*2);c.strokeStyle='#326c6b';c.lineWidth=2;c.stroke();}
  if(this.motion){const t=Math.min(1,(Date.now()-this.motion.start)/340);if(t<1){const m=this.motion.move,a=point(flip?9-m.fr:m.fr,flip?8-m.fc:m.fc),b=point(flip?9-m.tr:m.tr,flip?8-m.tc:m.tc),v=1-Math.pow(1-t,3);this.drawPiece(this.motion.piece,a.x+(b.x-a.x)*v,a.y+(b.y-a.y)*v-3,dx*.42,Math.sin(t*Math.PI)*14);}else this.motion=null;}
  const below=by+bH+29;this.text(this.mode==='online'?'你 · '+(you==='r'?'红方':'黑方'):this.mode==='practice'?'你 · 红方':'红方先行',22,below,13);let status='等待开局';
  if(this.mode==='practice')status=this.localResult||(this.turn==='r'?'轮到你了':'电脑思考中');
  if(this.mode==='online')status=this.room.result||(this.room.status==='waiting'?'邀请一位好友':this.turn===you?'轮到你了':'等待好友落子');
  const pending=this.activePending();if(pending)status=(pending.by===you?'等待好友回应':'好友申请')+' · '+title[pending.kind];
  if(this.mode!=='lobby'&&!this.localResult&&!this.room?.result&&E.check(this.board,this.turn))status+=' · 将军';
  this.text(status,w-22,below,14,'#9b3a31','right');
  const row=below+24,gap=10,bw=(w-44-gap)/2;this.text(this.busy?'正在同步…':this.note,w/2,row+3,11,'#76858a','center');
  const y=row+20;
  if(this.pendingWrite){this.button('重试同步','retry',22,y,w-44,true);}
  else if(this.mode==='lobby'){
   this.button('创建棋房','create',22,y,bw,true);this.button('加入棋房','join',22+bw+gap,y,bw);
   this.button('单机练习','practice',22,y+51,bw);this.button(this.lastRoom?'回到棋房':'棋局规则',this.lastRoom?'resume':'rules',22+bw+gap,y+51,bw);
  }else if(this.mode==='online'){
   if(pending&&pending.by!==you){this.button('同意','agree',22,y,bw,true);this.button('拒绝','decline',22+bw+gap,y,bw);}
   else if(this.room.status==='waiting'){this.button('邀请朋友','share',22,y,bw,true);this.button('复制邀请链接','copy',22+bw+gap,y,bw);}
   else if(this.room.status==='ended'){this.button('再来一局','rematch',22,y,bw,true);this.button('回到首页','home',22+bw+gap,y,bw);}
   else{this.button('申请悔棋','undo',22,y,bw);this.button('申请和棋','draw',22+bw+gap,y,bw);}
   if(this.room.status!=='ended'){this.button('回到首页','home',22,y+51,bw);this.button(this.room.status==='playing'?'认输':'棋局规则',this.room.status==='playing'?'resign':'rules',22+bw+gap,y+51,bw);}
  }else{this.button('悔棋','undo',22,y,bw);this.button('重新练习','rematch',22+bw+gap,y,bw);this.button('回到首页','home',22,y+51,bw);this.button('棋局规则','rules',22+bw+gap,y+51,bw);}
  if(this.motion&&!this.frame)this.frame=this.p.frame(()=>{this.frame=null;this.draw();});
 }
}
if(typeof module!=='undefined')module.exports=ChessClient;else root.ChessClient=ChessClient;
})(typeof globalThis!=='undefined'?globalThis:this);

