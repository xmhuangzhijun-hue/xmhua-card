(function(root){
'use strict';
const other=s=>s==='r'?'b':'r',side=p=>p&&p[0],inside=(r,c)=>r>=0&&r<10&&c>=0&&c<9;
function initial(){let b=Array.from({length:10},()=>Array(9).fill(null));const row=['R','N','B','A','K','A','B','N','R'];for(let c=0;c<9;c++){b[0][c]='b'+row[c];b[9][c]='r'+row[c];}for(let c of [1,7]){b[2][c]='bC';b[7][c]='rC';}for(let c of [0,2,4,6,8]){b[3][c]='bP';b[6][c]='rP';}return b;}
const clone=b=>b.map(row=>row.slice());
function palace(r,c,s){return c>=3&&c<=5&&(s==='r'?r>=7&&r<=9:r>=0&&r<=2);}
function pseudo(b,r,c){const p=b[r][c];if(!p)return[];const s=side(p),type=p[1],out=[];const add=(y,x)=>{if(inside(y,x)&&side(b[y][x])!==s)out.push({fr:r,fc:c,tr:y,tc:x});};
if(type==='R'||type==='C'){for(const[dy,dx]of [[1,0],[-1,0],[0,1],[0,-1]]){let screen=false;for(let y=r+dy,x=c+dx;inside(y,x);y+=dy,x+=dx){if(!screen){if(!b[y][x])add(y,x);else{if(type==='R'){add(y,x);break;}screen=true;}}else if(b[y][x]){add(y,x);break;}}}}
if(type==='N'){for(const[dy,dx]of [[2,1],[2,-1],[-2,1],[-2,-1],[1,2],[-1,2],[1,-2],[-1,-2]]){const ly=r+(Math.abs(dy)===2?Math.sign(dy):0),lx=c+(Math.abs(dx)===2?Math.sign(dx):0);if(inside(ly,lx)&&!b[ly][lx])add(r+dy,c+dx);}}
if(type==='B'){for(const[dy,dx]of [[2,2],[2,-2],[-2,2],[-2,-2]]){let y=r+dy,x=c+dx;if(inside(y,x)&&(s==='r'?y>=5:y<=4)&&!b[r+dy/2][c+dx/2])add(y,x);}}
if(type==='A'){for(const[dy,dx]of [[1,1],[1,-1],[-1,1],[-1,-1]])if(palace(r+dy,c+dx,s))add(r+dy,c+dx);}
if(type==='K'){for(const[dy,dx]of [[1,0],[-1,0],[0,1],[0,-1]])if(palace(r+dy,c+dx,s))add(r+dy,c+dx);for(let dy of [-1,1])for(let y=r+dy;inside(y,c);y+=dy){if(b[y][c]){if(b[y][c]===other(s)+'K')add(y,c);break;}}}
if(type==='P'){add(r+(s==='r'?-1:1),c);if(s==='r'?r<=4:r>=5){add(r,c-1);add(r,c+1);}}
return out;}
function apply(b,m){const n=clone(b);n[m.tr][m.tc]=n[m.fr][m.fc];n[m.fr][m.fc]=null;return n;}
function king(b,s){for(let r=0;r<10;r++)for(let c=0;c<9;c++)if(b[r][c]===s+'K')return[r,c];return null;}
function check(b,s){const k=king(b,s);if(!k)return true;for(let r=0;r<10;r++)for(let c=0;c<9;c++)if(side(b[r][c])===other(s)&&pseudo(b,r,c).some(m=>m.tr===k[0]&&m.tc===k[1]))return true;return false;}
function legal(b,s){let out=[];if(!king(b,s))return out;for(let r=0;r<10;r++)for(let c=0;c<9;c++)if(side(b[r][c])===s)for(const m of pseudo(b,r,c))if(!check(apply(b,m),s))out.push(m);return out;}
const values={K:100000,R:900,C:450,N:400,B:200,A:200,P:100};
function evaluate(b,s){let v=0;for(let r=0;r<10;r++)for(let c=0;c<9;c++){let p=b[r][c];if(!p)continue;let progress=p[0]==='r'?9-r:r;let bonus=p[1]==='P'?progress*9+(progress>=5?80:0):p[1]==='N'?(4-Math.abs(4-c))*8:0;v+=(p[0]===s?1:-1)*(values[p[1]]+bonus);}return v;}
function ordered(b,moves){return moves.sort((a,z)=>((b[z.tr][z.tc]?values[b[z.tr][z.tc][1]]:0)-(b[a.tr][a.tc]?values[b[a.tr][a.tc][1]]:0)));}
function bestMove(b,s,level=2){const depth=Number(level),start=Date.now(),limit=depth===3?1500:depth===2?650:100;let nodes=0,aborted=false;
function search(pos,turn,d,alpha,beta,ply){nodes++;if(nodes%96===0&&Date.now()-start>limit){aborted=true;return evaluate(pos,turn);}const ms=ordered(pos,legal(pos,turn));if(!ms.length)return -1000000+ply;if(d===0)return evaluate(pos,turn);let best=-Infinity;for(const m of ms){let score=-search(apply(pos,m),other(turn),d-1,-beta,-alpha,ply+1);best=Math.max(best,score);alpha=Math.max(alpha,score);if(alpha>=beta||aborted)break;}return best;}
const ms=ordered(b,legal(b,s));if(!ms.length)return null;let chosen=ms[0];for(let d=1;d<=depth;d++){let best=-Infinity,candidate=chosen;let alpha=-Infinity;for(const m of ms){const score=-search(apply(b,m),other(s),d-1,-Infinity,-alpha,1);if(aborted)break;if(score>best){best=score;candidate=m;}alpha=Math.max(alpha,score);}if(aborted)break;chosen=candidate;ms.splice(ms.indexOf(chosen),1);ms.unshift(chosen);}return chosen;}
const names={rK:'帥',rA:'仕',rB:'相',rN:'馬',rR:'車',rC:'炮',rP:'兵',bK:'將',bA:'士',bB:'象',bN:'馬',bR:'車',bC:'砲',bP:'卒'};
function notation(b,m){const p=b[m.fr][m.fc],red=p[0]==='r',nums=red?'〇一二三四五六七八九':'0123456789',file=c=>nums[red?9-c:c+1];let dir=m.tr===m.fr?'平':((m.tr-m.fr)*(red?-1:1)>0?'进':'退');let dest=dir==='平'||['N','B','A'].includes(p[1])?file(m.tc):nums[Math.abs(m.tr-m.fr)];return names[p]+file(m.fc)+dir+dest;}
const key=(b,s)=>b.map(r=>r.map(p=>p||'..').join('')).join('')+s;
root.XQ={initial,clone,side,other,pseudo,apply,check,legal,bestMove,names,notation,key,king};
if(typeof module!=='undefined')module.exports=root.XQ;
})(typeof globalThis!=='undefined'?globalThis:this);
