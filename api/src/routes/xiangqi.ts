import {createHash,randomBytes} from 'node:crypto';
import {Hono} from 'hono';
import {getCookie,setCookie} from 'hono/cookie';
import {bodyLimit} from 'hono/body-limit';
import {z} from 'zod';
import {env} from '../env.js';
import {playXiangqi} from '../services/xiangqi.js';
import domain from '../games/xiangqi/domain.cjs';

export const xiangqiRoutes=new Hono();
const cookieName='xmhua_xiangqi_player';
const fail=(code:string,message:string)=>({ok:false as const,code,message});
const move=z.object({fr:z.number().int().min(0).max(9),fc:z.number().int().min(0).max(8),tr:z.number().int().min(0).max(9),tc:z.number().int().min(0).max(8)}).strict();
const eventSchema=z.object({action:z.enum(['create','join','get','move','request','respond','resign']),code:z.string().regex(/^[A-F0-9]{10}$/).optional(),requestId:z.string().regex(/^[A-Za-z0-9_-]{16,80}$/).optional(),version:z.number().int().nonnegative().optional(),move:move.optional(),kind:z.enum(['undo','draw','rematch']).optional(),accept:z.boolean().optional()}).strict();
const windows=new Map<string,{count:number;expires:number}>();
let total={count:0,expires:0};
function limitCreate(who:string){const now=Date.now();for(const [key,value]of windows)if(value.expires<=now)windows.delete(key);if(total.expires<=now)total={count:0,expires:now+600000};const item=windows.get(who)??{count:0,expires:now+600000};if(item.count>=10||total.count>=120)return false;item.count++;total.count++;windows.set(who,item);return true;}
xiangqiRoutes.use('*',bodyLimit({maxSize:4096,onError:c=>c.json(fail('BAD_REQUEST','操作内容过大。'),413)}));
xiangqiRoutes.use('*',async(c,next)=>{c.header('Cache-Control','no-store');c.header('Referrer-Policy','no-referrer');await next();});
xiangqiRoutes.get('/session',c=>{if(!/^[a-f0-9]{64}$/.test(getCookie(c,cookieName)??''))setCookie(c,cookieName,randomBytes(32).toString('hex'),{httpOnly:true,secure:env.secureCookies,sameSite:'Lax',path:'/api/xiangqi',maxAge:2592000});return c.json({ok:true});});
xiangqiRoutes.post('/game',async c=>{
  const origin=c.req.header('origin');
  try{const u=new URL(origin??'');if(u.host!==c.req.header('host')||!['http:','https:'].includes(u.protocol)||(env.secureCookies&&u.protocol!=='https:'))return c.json(fail('ORIGIN','请在游戏页面内操作。'),403);}catch{return c.json(fail('ORIGIN','请在游戏页面内操作。'),403);}
  const token=getCookie(c,cookieName)??'';
  if(!/^[a-f0-9]{64}$/.test(token))return c.json(fail('SESSION','浏览器身份已失效，请刷新游戏。'),401);
  if(!c.req.header('content-type')?.startsWith('application/json'))return c.json(fail('BAD_REQUEST','操作格式无效。'),415);
  let input:unknown;try{input=await c.req.json();}catch{return c.json(fail('BAD_REQUEST','无法读取操作，请重试。'),400);}
  const parsed=eventSchema.safeParse(input);if(!parsed.success)return c.json(fail('BAD_REQUEST','操作内容无效，请刷新后重试。'),400);
  const who=createHash('sha256').update(token).digest('hex');
  if(parsed.data.action==='create'&&!limitCreate(who))return c.json(fail('RATE_LIMITED','创建棋房太频繁，请稍后再试。'),429);
  try{return c.json({ok:true,room:await playXiangqi(who,parsed.data)});}catch(error){if(error instanceof domain.Fault)return c.json(fail(error.code,error.message));console.error('xiangqi_storage_unavailable');return c.json(fail('UNAVAILABLE','棋房暂时连不上，请稍后重试。'),503);}
});
