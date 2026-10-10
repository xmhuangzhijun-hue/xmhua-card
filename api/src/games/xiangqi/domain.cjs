'use strict';
const E = require('./engine.cjs');
const crypto = require('crypto');
const TTL = 48 * 60 * 60 * 1000;
class Fault extends Error { constructor(code,message){super(message);this.code=code;} }
function fail(code,message){throw new Fault(code,message);}
function identity(openid){if(typeof openid!=='string'||!openid)fail('UNAUTHENTICATED','请从微信打开游戏。');return crypto.createHash('sha256').update(openid).digest('hex');}
function requestId(value){if(typeof value!=='string'||!/^[a-zA-Z0-9_-]{16,80}$/.test(value))fail('BAD_REQUEST','请求标识无效，请重试。');return value;}
function code(value){if(typeof value!=='string'||!/^[A-F0-9]{10}$/.test(value))fail('BAD_CODE','请输入 10 位房间码。');return value;}
function seat(room,who){return room.red===who?'r':room.black===who?'b':null;}
function requireMember(room,who){const s=seat(room,who);if(!s)fail('FORBIDDEN','你不在这个棋房里。');return s;}
function requireLive(room,now){if(room.expiresAt<=now)fail('EXPIRED','棋房已过期，请创建新房间。');}
function fresh(){const board=E.initial();return {board,turn:'r',history:[],positions:[E.key(board,'r')],quiet:0,result:null,pending:null};}
function create(who,id,now){requestId(id);const roomCode=crypto.createHash('sha256').update(who+':'+id).digest('hex').slice(0,10).toUpperCase();return {_id:roomCode,red:who,black:null,...fresh(),version:0,game:1,status:'waiting',createdAt:now,updatedAt:now,expiresAt:now+TTL,receipts:[]};}
function view(room,who,now){requireLive(room,now);const you=requireMember(room,who);return {code:room._id,you,board:room.board,turn:room.turn,version:room.version,game:room.game,status:room.status,result:room.result,opponentJoined:!!room.black,pending:room.pending&&room.pending.expiresAt>now?room.pending:null,history:room.history.map(h=>({side:h.turn,notation:h.notation,captured:h.captured})),lastMove:room.history.length?room.history[room.history.length-1].move:null,expiresAt:room.expiresAt};}
function digest(event){return crypto.createHash('sha256').update(JSON.stringify([event.action,event.version,event.move,event.kind,event.accept])).digest('hex');}
function reduce(original,who,event,now){
  requireLive(original,now);requestId(event.requestId);
  const fingerprint=digest(event),prior=original.receipts.find(r=>r.id===event.requestId&&r.who===who);
  if(prior){if(prior.digest!==fingerprint)fail('ID_REUSE','请求内容发生变化，请刷新棋局。');return original;}
  const room=JSON.parse(JSON.stringify(original));
  if(event.action==='join'){
    if(seat(room,who))return room;
    if(room.status!=='waiting'||room.black)fail('ROOM_FULL','棋房已有两位棋友，请创建新房间。');
    room.black=who;room.status='playing';
  }else{
    const you=requireMember(room,who);
    if(!Number.isInteger(event.version)||event.version!==room.version)fail('STALE','棋局已更新，请查看最新局面后再操作。');
    if(room.pending&&room.pending.expiresAt<=now)room.pending=null;
    if(event.action==='move'){
      if(room.status!=='playing')fail('NOT_PLAYING','请等待好友加入或开始新局。');
      if(room.pending)fail('PENDING_REQUEST','请先处理双方协商。');
      if(room.turn!==you)fail('NOT_YOUR_TURN','还没轮到你走棋。');
      const m=event.move;
      if(!m||!['fr','fc','tr','tc'].every(k=>Number.isInteger(m[k])))fail('ILLEGAL_MOVE','这一步不符合象棋走法。');
      const valid=E.legal(room.board,you).find(x=>['fr','fc','tr','tc'].every(k=>x[k]===m[k]));
      if(!valid)fail('ILLEGAL_MOVE','这一步不符合象棋走法。');
      const captured=room.board[valid.tr][valid.tc];
      room.history.push({board:room.board,turn:room.turn,quiet:room.quiet,move:valid,captured,notation:E.notation(room.board,valid)});
      room.board=E.apply(room.board,valid);room.turn=E.other(you);room.quiet=captured?0:room.quiet+1;room.positions.push(E.key(room.board,room.turn));
      if(!E.legal(room.board,room.turn).length)room.result=(you==='r'?'红方':'黑方')+'获胜';
      else if(room.positions.filter(k=>k===room.positions[room.positions.length-1]).length>=3)room.result='和棋 · 三次重复';
      else if(room.quiet>=120)room.result='和棋 · 久战无吃子';
      else if(room.history.length>=500)room.result='和棋 · 达到本局步数上限';
      if(room.result)room.status='ended';
    }else if(event.action==='request'){
      if(room.pending)fail('PENDING_REQUEST','已有待处理的申请。');
      if(!['undo','draw','rematch'].includes(event.kind))fail('BAD_REQUEST','不支持这个申请。');
      if(event.kind==='rematch'?room.status!=='ended':room.status!=='playing')fail('BAD_STATE','当前棋局无法进行这项操作。');
      const steps=room.turn===you?2:1;
      if(event.kind==='undo'&&room.history.length<steps)fail('NO_UNDO','还没有可以撤回的走棋。');
      room.pending={kind:event.kind,by:you,steps:event.kind==='undo'?steps:0,expiresAt:now+45000};
    }else if(event.action==='respond'){
      const pending=room.pending;
      if(!pending)fail('NO_REQUEST','申请已失效。');
      if(pending.by===you)fail('SELF_ACCEPT','请等待对方决定。');
      if(typeof event.accept!=='boolean')fail('BAD_REQUEST','请选择同意或拒绝。');
      if(event.accept){
        if(pending.kind==='draw'){room.result='和棋 · 双方同意';room.status='ended';}
        if(pending.kind==='undo'){
          const before=room.history[room.history.length-pending.steps];
          room.board=before.board;room.turn=before.turn;room.quiet=before.quiet;
          room.history.splice(room.history.length-pending.steps);room.positions.splice(room.history.length+1);room.result=null;
        }
        if(pending.kind==='rematch'){
          [room.red,room.black]=[room.black,room.red];Object.assign(room,fresh());room.status='playing';room.game++;
        }
      }
      room.pending=null;
    }else if(event.action==='resign'){
      if(room.status!=='playing')fail('BAD_STATE','当前无法认输。');
      room.result=(you==='r'?'黑方':'红方')+'获胜 · 对方认输';room.status='ended';room.pending=null;
    }else fail('BAD_REQUEST','不支持这项操作。');
  }
  room.version++;room.updatedAt=now;
  room.receipts.push({id:event.requestId,who,digest:fingerprint});room.receipts=room.receipts.slice(-128);
  return room;
}
module.exports={Fault,identity,requestId,code,seat,create,view,reduce,TTL};

