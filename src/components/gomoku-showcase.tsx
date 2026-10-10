import { ArrowUpRight } from "lucide-react";
import Link from "next/link";

export function GomokuShowcase() {
  return <section className="gomoku-showcase" id="gomoku" aria-labelledby="gomoku-showcase-title">
    <div className="gomoku-showcase__copy">
      <p className="work-eyebrow">可直接玩的作品 · 双人联机</p>
      <h2 id="gomoku-showcase-title">落一子，<br />和朋友下一局。</h2>
      <p>一张棋盘，两个浏览器。创建房间，把链接发给朋友，就能一起下五子棋。</p>
      <Link className="work-button work-button--primary" href="/play/gomoku">开始对弈 <ArrowUpRight size={17} /></Link>
      <small>免登录 · 手机也能玩 · 支持同屏练习</small>
    </div>
    <div className="gomoku-showcase__preview" aria-hidden="true">
      <svg viewBox="0 0 280 280" fill="none">
        <defs><radialGradient id="gomoku-black"><stop stopColor="#51586a"/><stop offset="1" stopColor="#151923"/></radialGradient><radialGradient id="gomoku-white"><stop stopColor="#fff"/><stop offset="1" stopColor="#dbe1ed"/></radialGradient></defs>
        {Array.from({ length: 9 }, (_, index) => <g key={index}><path d={`M28 ${28 + index * 28}H252 M${28 + index * 28} 28V252`} stroke="currentColor" strokeOpacity=".22" /></g>)}
        {[84,140,196].flatMap(x=>[84,140,196].map(y=><circle key={`${x}-${y}`} cx={x} cy={y} r="2.5" fill="currentColor" opacity=".4" />))}
        {[[112,140],[140,140],[168,140],[196,140]].map(([x,y])=><circle key={`b-${x}`} cx={x} cy={y} r="11.5" fill="url(#gomoku-black)"/>)}
        {[[112,112],[140,168],[168,112],[196,168]].map(([x,y])=><circle key={`w-${x}`} cx={x} cy={y} r="11.5" fill="url(#gomoku-white)" stroke="#c5ccdb" strokeWidth=".5"/>)}
        <circle cx="224" cy="140" r="11.5" stroke="currentColor" strokeWidth="1.2" strokeDasharray="3 3" opacity=".55" />
      </svg>
      <span>下一步，轮到你。</span>
    </div>
  </section>;
}
