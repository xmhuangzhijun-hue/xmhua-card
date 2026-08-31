import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, ArrowUpRight, BookOpenCheck, Bot, BrainCircuit, Database, GitPullRequest, ShieldCheck } from "lucide-react";

const systems = [
  {
    id: "memory",
    number: "01",
    icon: BrainCircuit,
    label: "CODEX × CLAUDE CODE",
    title: "两个编码 Agent，怎样共享事实而不互相污染记忆。",
    intro: "我维护的不是两份 MEMORY.md，而是一套跨工具的外部记忆协议：项目文件优先、Agent 各自负责、shared 只保存当前有效共识，失败经验在相似任务前强制复核。",
    facts: ["原始证据只登记路径与指纹", "每次变更以 change_id 归档", "Codex / Claude 保留独立观察", "proposal → validate → snapshot", "下一次接手重新校准代码与运行状态"],
    flow: ["项目 + 功能 + 问题", "受控 Retrieval", "有来源 ContextPacket", "执行与验证", "日志 / proposal", "另一端接续"],
    links: [
      ["检查外部记忆实现", "https://github.com/xmhuangzhijun-hue/organic-agent-os"],
    ],
  },
  {
    id: "knowledge",
    number: "02",
    icon: BookOpenCheck,
    label: "输入启发 × 知识库",
    title: "外部材料不是收藏后总结，而是经过消化才有资格进入知识库。",
    intro: "视频、文章、论文和对话先保存发现路径，再回溯一手来源；事实、解释、推断和观点分层处理，完成七层分析与 Gap Analysis 后，仍需真实任务验证才能升级为知识或 Skill。",
    facts: ["二手内容只承担发现路径", "一手来源仍需真实性审查", "七层分析保留隐含假设与限制", "知识编译决定更新哪里", "未经确认不标记已吸收"],
    flow: ["外部输入", "源头回溯", "七层分析", "知识编译", "吸收裁决", "真实任务应用"],
    links: [["查看知识治理实现", "https://github.com/xmhuangzhijun-hue/organic-agent-os"]],
  },
  {
    id: "qinghe",
    number: "03",
    icon: Bot,
    label: "清禾 × HERMES",
    title: "我把 Hermes 部署成一个持续理解、执行和服务我的个人 Agent。",
    intro: "独立云端 Gateway、systemd 服务、Profile 隔离、消息渠道、MCP 工具、长期记忆和终态回执共同组成清禾。它不会把整个 Vault 塞给模型，而是按当前问题读取有来源、有权限、有时效的相关事实。",
    facts: ["隔离 HERMES_HOME / 会话 / 技能 / 凭据", "候选运行时预构建后再切换", "业务写入幂等、软删除、可追踪", "来源不足时失败关闭", "自然消息入口是最终验收层"],
    flow: ["消息入口", "人格与任务上下文", "相关记忆检索", "模型理解", "MCP 执行", "verified 回执"],
    links: [
      ["查看我的 Hermes fork", "https://github.com/xmhuangzhijun-hue/hermes-agent"],
      ["检查上游 PR #97743", "https://github.com/NousResearch/hermes-agent/pull/97743"],
    ],
  },
  {
    id: "upstream",
    number: "04",
    icon: GitPullRequest,
    label: "OPEN SOURCE CONTRIBUTIONS",
    title: "真实实例里遇到的问题，被整理成可审查的 Hermes 上游修复。",
    intro: "这些 PR 不是为了填贡献记录而找的题：它们来自 Mem0 污染、视觉超时重试、微信重投递、会话顺序和管理端本地化等真实运行问题。",
    facts: ["#97156 · Mem0 捕获边界", "#97572 · 视觉满预算超时", "#97581 · 微信无 ID 去重", "#97743 · 同会话预处理顺序", "#98001 · Web 导航本地化"],
    flow: ["生产症状", "首个断点", "检查 upstream", "最小修复", "行为测试", "公开 review"],
    links: [
      ["#97156 · Mem0 捕获边界", "https://github.com/NousResearch/hermes-agent/pull/97156"],
      ["#97572 · 视觉超时重试", "https://github.com/NousResearch/hermes-agent/pull/97572"],
      ["#97581 · 微信消息去重", "https://github.com/NousResearch/hermes-agent/pull/97581"],
      ["#97743 · 会话处理顺序", "https://github.com/NousResearch/hermes-agent/pull/97743"],
      ["#98001 · Web 导航本地化（已关闭）", "https://github.com/NousResearch/hermes-agent/pull/98001"],
    ],
  },
  {
    id: "business",
    number: "05",
    icon: Database,
    label: "IAA 业务中台 · LIVE DEMO",
    title: "给外部评审一个可以自己登录、筛选和操作的脱敏业务中台。",
    intro: "体验环境复用真实产品的信息架构与交互，但只包含固定种子数据，不连接生产后端。可以查看实时统计、推广管理、今日/历史聚合、综合看板、指标说明和时段下钻。",
    facts: ["公开 Demo 租户", "固定种子模拟数据", "刷新后操作重置", "生产域名与生产账号完全隔离", "界面明确标注能力与未实现边界"],
    flow: ["公开账号登录", "选择产品与账户", "多维聚合", "查看异常与趋势", "时段下钻", "理解指标口径"],
    links: [
      ["进入脱敏业务中台", "/demo/iaa/index.html"],
    ],
    credential: "demo@xmhua.dev / AI-Builder-2026",
  },
] as const;

export function WorkShowcase() {
  return <main className="work-page">
    <header className="work-nav"><Link className="work-brand" href="/" aria-label="返回 XMHUA 首页"><Image src="/xmhua-mark.svg" alt="" width={27} height={27} priority/><strong>XMHUA</strong></Link><nav aria-label="作品页导航"><a href="#systems">工程系统</a><a href="#principles">原则</a><a href="https://github.com/xmhuangzhijun-hue" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14}/></a></nav></header>
    <section className="work-hero" aria-labelledby="work-title"><div><p className="work-eyebrow">60 SECOND AI CAPABILITY REVIEW</p><h1 id="work-title">我把 AI 用到了<br/><em>系统层。</em></h1><p className="work-hero__lead">不是只会调用模型。我让 Codex 与 Claude Code 共享外部记忆，把输入编译成可复用知识，部署长期运行的 Hermes Agent，并把业务数据流程做成可操作产品。</p><div className="work-hero__actions"><a className="work-button work-button--primary" href="#systems">按证据判断我的水平</a><a className="work-button" href="https://github.com/xmhuangzhijun-hue" target="_blank" rel="noreferrer">检查 GitHub <ArrowUpRight size={16}/></a></div></div><aside className="hero-index"><p>你会在这里看到</p><div><strong>01</strong><span>跨 Agent 外部记忆</span><small>Codex ↔ Claude Code</small></div><div><strong>02</strong><span>知识编译流水线</span><small>输入启发 → 可复用知识</small></div><div><strong>03</strong><span>生产 Agent 实例</span><small>Hermes 部署、运维与修复</small></div><div><strong>04</strong><span>业务产品与开源贡献</span><small>可登录 Demo + 5 个 PR</small></div></aside></section>
    <section className="capability-line" aria-label="AI 能力链"><p>INPUT</p><span>溯源与分析</span><p>MEMORY</p><span>跨端共享事实</span><p>AGENT</p><span>理解与执行</span><p>BUSINESS</p><span>真实产品验收</span></section>
    <section className="work-ledger" id="systems"><div className="work-section-heading"><p>SYSTEMS, NOT PROMPTS</p><h2>五个系统，回答“具体做到了什么”。</h2><span>公开材料用于核验能力；私人数据、客户账户和生产凭据不进入展示。</span></div>{systems.map(({icon:Icon,...item})=><article className="system-case" id={item.id} key={item.id}><header><span>{item.number}</span><Icon size={24}/><p>{item.label}</p><h3>{item.title}</h3><p className="system-intro">{item.intro}</p></header><div className="system-flow">{item.flow.map((step,index)=><div key={step}><small>{String(index+1).padStart(2,"0")}</small><span>{step}</span>{index<item.flow.length-1&&<ArrowRight size={14}/>}</div>)}</div><div className="system-bottom"><div><p className="system-kicker">可检查的实现细节</p><ul>{item.facts.map(fact=><li key={fact}><ShieldCheck size={15}/>{fact}</li>)}</ul></div><div className="system-links"><p className="system-kicker">公开证据</p>{item.links.map(([label,href])=><a href={href} target={href.startsWith("/")?undefined:"_blank"} rel={href.startsWith("/")?undefined:"noreferrer"} key={href}>{label}<ArrowUpRight size={15}/></a>)}{"credential" in item&&<code><span>公开账号</span>{item.credential}</code>}</div></div></article>)}</section>
    <section className="work-method" id="principles"><div><p className="work-eyebrow">ENGINEERING PRINCIPLES</p><h2>不把“AI 做了”当成完成。</h2><p>模型负责理解和判断，确定性系统负责事实与副作用，真实用户入口负责最终验收。</p></div><ol><li><span>01</span><strong>事实有来源</strong><p>当前代码与运行状态优先，历史用于避免重犯。</p></li><li><span>02</span><strong>记忆有治理</strong><p>候选不能覆盖 shared，吸收必须经验证。</p></li><li><span>03</span><strong>动作有回执</strong><p>queued、committed 和 verified 不能混为一谈。</p></li><li><span>04</span><strong>贡献可审查</strong><p>公开仓库、PR、测试和边界都允许外部质疑。</p></li></ol></section>
    <section className="work-contact"><p>如果你在招聘 AI Agent、AI 应用工程或 FDE，欢迎直接检查我的工作。</p><a href="https://github.com/xmhuangzhijun-hue" target="_blank" rel="noreferrer">查看全部公开仓库 <ArrowUpRight size={18}/></a></section><footer className="work-footer"><Link href="/"><ArrowLeft size={15}/> 返回博客首页</Link><span>© 2026 XMHUA · Public engineering portfolio</span></footer>
  </main>;
}
