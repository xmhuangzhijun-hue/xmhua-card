import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowUpRight,
  Bot,
  Braces,
  CheckCircle2,
  Database,
  FileCode2,
  Gauge,
  Network,
  NotebookTabs,
  ShieldCheck,
} from "lucide-react";

const cases = [
  {
    id: "hermes",
    index: "A",
    icon: Bot,
    type: "AI Agent 工程",
    title: "把 Hermes 从开源框架变成可运行的 Agent",
    intro: "围绕真实消息入口搭建独立 Agent，处理模型路由、渠道适配、工具调用、记忆、权限、生产发布与故障恢复。",
    role: "Agent 架构、渠道接入、MCP 工具契约、生产诊断与验收",
    stack: ["Hermes", "MCP", "Python", "SQLite", "systemd", "QQ Bot / 消息渠道"],
    actions: [
      "按 Agent 隔离 Profile、会话、权限、凭据和运行服务，避免身份与记忆串扰。",
      "接入腾讯 QQ Bot API v2，并修复 Adapter 重连签名与 Gateway 契约漂移。",
      "为业务写入设计幂等、软删除、异步同步与终态回执，不把 queued 或 pending 误报为失败。",
      "定位 225 条消息、约 16.3 万 tokens 引发的同步压缩超时循环，并提出有界上下文与会话滚动方案。",
    ],
    proof: "当前进程日志确认 WebSocket connected、qqbot connected 与 Ready；组件验收和自然用户验收分层记录。",
    boundary: "服务与渠道基础链路已有证据；未完成的自然对话体验不包装成最终产品成功。",
  },
  {
    id: "obsidian",
    index: "B",
    icon: NotebookTabs,
    type: "个人知识与自动化",
    title: "把 Obsidian 做成长期可运行的个人数字系统",
    intro: "不是堆笔记，而是把项目、日志、知识、日记与结构化生活数据组织成有权威、有来源、有权限边界的长期资产。",
    role: "信息架构、自动化脚本、证据链、隐私边界与可恢复性",
    stack: ["Obsidian", "Markdown", "Python", "SQLite", "Git", "OneDrive / restic"],
    actions: [
      "建立项目日志、当前状态、知识资产与个人记录的职责分层，避免同一事实被多处随意覆盖。",
      "用本地脚本整理每日记录：先聚合授权来源，再校验候选内容，最后原子写入，已有日记默认不覆盖。",
      "把来源缺失设计成失败关闭：没有原生对话或速记证据时不生成、不填空、不猜测。",
      "结合 Git、加密备份与 SQLite 快照验证，区分同步、备份和可恢复性，不以文件存在冒充恢复成功。",
    ],
    proof: "自动化任务以最终 JSON 回执区分 created、filled_empty、skipped_existing 与无证据失败；写入后再做结构校验。",
    boundary: "对外只展示方法与脱敏结构，不公开私人日记、消费明细、联系人和原始会话。",
  },
  {
    id: "coding-agents",
    index: "C",
    icon: FileCode2,
    type: "AI 编程协作",
    title: "让 Codex 与 Claude Code 参与真实工程，而不是只生成代码",
    intro: "把 AI 编程 Agent 纳入需求理解、代码实现、故障定位、测试、文档、发布和复盘，同时保留权限与责任边界。",
    role: "任务编排、上下文治理、验证门禁、精确 Git 交付",
    stack: ["Codex", "Claude Code", "Git", "Skills", "MCP", "CI"],
    actions: [
      "先定位端到端首个断点，再修改代码；复发问题停止叠补丁，转为证据化 Incident 分析。",
      "只暂存本任务精确文件，保留并发工作；测试、服务健康和真实用户路径分别记录。",
      "把确定性的权限、状态、副作用、校验与回执交给代码，把语义理解和方案取舍保留给模型。",
      "将项目接续、文档制作、浏览器验收和工程归档沉淀为可复用 Skill，而非一次性提示词。",
    ],
    proof: "每个持久变更都有变更前后、验证命令、回执和未验证边界；用户可见结果才是最终完成标准。",
    boundary: "不以 Agent 数量、Token 消耗或代码行数作为能力证明，重点展示真实任务闭环。",
  },
  {
    id: "ad-workbench",
    index: "D",
    icon: Gauge,
    type: "AI + 数据产品",
    title: "把广告数据报表升级为可执行工作台",
    intro: "面向投放运营，把多平台数据采集、指标口径、权限、自动报告与异常处理连接到真实业务流程。",
    role: "产品设计、数据链路、自动化、生产发布与业务验收",
    stack: ["Python", "Streamlit", "OAuth", "RBAC", "Feishu", "Browser Automation"],
    actions: [
      "统一广告平台字段与报表消费口径，使用不同数据批次验证稳定性，而不是比较表面更新时间。",
      "建立租户与账户权限隔离，并把同步、历史补发、异常和最终业务回执分开呈现。",
      "自动生成小时级运营报告，通过飞书投递，并对缺数、重复数据和历史重发做显式标记。",
      "生产修复采用预检、最小发布、真实数据库回读和服务回执，避免把 API 接受当作业务成功。",
    ],
    proof: "一次联盟数据恢复完成 1,924 个采集结果同步；相关稳定性改动通过 42 项测试并完成生产回读。",
    boundary: "公开页面不展示客户名称、账户、消耗金额、内部接口或生产地址。",
  },
  {
    id: "xmhua-card",
    index: "E",
    icon: Braces,
    type: "AI 产品与全栈",
    title: "把个人主页做成可管理的多租户内容产品",
    intro: "当前网站不仅是前端页面，也是 API 驱动的博客与公开名片系统，支持内容管理、租户隔离和独立部署。",
    role: "产品定义、前后端实现、安全加固、开源协作与发布治理",
    stack: ["Next.js 16", "React 19", "PostgreSQL", "Drizzle", "Zod", "Vercel"],
    actions: [
      "将身份、文章、产品、资源和社交链接迁入内容 API，前端只负责渲染接口返回的数据。",
      "实现租户自助创建、独立管理凭据、事务保存与默认拒绝的管理接口。",
      "修复 Host 信任、SSRF、DNS 重绑定、IPv4-mapped IPv6 与注册限流等公开安全问题。",
      "建立 Issue、PR、CI、CODEOWNERS、版本与 Release 的开源协作流程。",
    ],
    proof: "v0.5.1 的安全回归、类型检查、生产构建与 CI 均有记录；公开仓库持续维护。",
    boundary: "网站仍保留原有博客内容与管理能力，本页只是新增的对外案例入口。",
  },
];

const capabilities = [
  { icon: Network, title: "Agent 产品化", text: "模型、渠道、工具、记忆、权限与回执的完整组合" },
  { icon: Database, title: "数据与自动化", text: "从采集、口径和状态到真实业务结果的可追溯链路" },
  { icon: ShieldCheck, title: "生产工程", text: "最小发布、幂等副作用、隐私边界、回滚与真实验收" },
];

export function WorkShowcase() {
  return (
    <main className="work-page">
      <header className="work-nav">
        <Link className="work-brand" href="/" aria-label="返回 XMHUA 首页">
          <Image src="/xmhua-mark.svg" alt="" width={27} height={27} priority />
          <strong>XMHUA</strong>
        </Link>
        <nav aria-label="作品页导航">
          <a href="#cases">案例</a>
          <a href="#method">方法</a>
          <a href="https://github.com/xmhuangzhijun-hue" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={14} /></a>
        </nav>
      </header>

      <section className="work-hero" aria-labelledby="work-title">
        <div className="work-hero__copy">
          <p className="work-eyebrow">AI PRODUCT BUILDER · SELECTED WORK</p>
          <h1 id="work-title">我做的不是 AI Demo，<br />而是能进入真实流程的产品。</h1>
          <p className="work-hero__lead">从 Hermes Agent、Obsidian 个人数字系统，到广告数据工作台和 AI 编程协作。这里展示我如何理解问题、完成工程实现，并用真实回执确认结果。</p>
          <div className="work-hero__actions">
            <a className="work-button work-button--primary" href="#cases">查看案例</a>
            <a className="work-button" href="https://github.com/xmhuangzhijun-hue/ai-product-builder-portfolio" target="_blank" rel="noreferrer">查看公开资料 <ArrowUpRight size={16} /></a>
          </div>
        </div>
        <aside className="work-manifesto" aria-label="工作原则">
          <span>完成标准</span>
          <strong>用户可见结果</strong>
          <p>测试、退出码和服务健康是证据。真实页面、消息渠道与业务回读才是完成。</p>
        </aside>
      </section>

      <section className="work-capabilities" aria-label="核心能力">
        {capabilities.map(({ icon: Icon, title, text }) => (
          <article key={title}>
            <Icon size={20} aria-hidden="true" />
            <div><strong>{title}</strong><p>{text}</p></div>
          </article>
        ))}
      </section>

      <section className="work-ledger" id="cases" aria-labelledby="cases-title">
        <div className="work-section-heading">
          <p>SELECTED CASES</p>
          <h2 id="cases-title">五个案例，一条完整能力链。</h2>
          <span>每个案例都保留场景、职责、实现、证据与边界。</span>
        </div>
        <div className="work-ledger__list">
          {cases.map(({ icon: Icon, ...item }) => (
            <article className="case-study" id={item.id} key={item.id}>
              <div className="case-study__rail" aria-hidden="true">
                <span>{item.index}</span>
                <Icon size={22} />
              </div>
              <div className="case-study__body">
                <p className="case-study__type">{item.type}</p>
                <h3>{item.title}</h3>
                <p className="case-study__intro">{item.intro}</p>
                <dl className="case-study__meta">
                  <div><dt>负责</dt><dd>{item.role}</dd></div>
                  <div><dt>技术</dt><dd>{item.stack.map(tech => <span key={tech}>{tech}</span>)}</dd></div>
                </dl>
                <div className="case-study__actions">
                  <h4>我具体做了什么</h4>
                  <ul>{item.actions.map(action => <li key={action}><CheckCircle2 size={17} aria-hidden="true" /><span>{action}</span></li>)}</ul>
                </div>
                <div className="case-study__proof">
                  <div><span>验证证据</span><p>{item.proof}</p></div>
                  <div><span>诚实边界</span><p>{item.boundary}</p></div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="work-method" id="method" aria-labelledby="method-title">
        <div>
          <p className="work-eyebrow">HOW I WORK</p>
          <h2 id="method-title">先找到首个断点，再写最小修复。</h2>
        </div>
        <ol>
          <li><span>01</span><strong>定义结果</strong><p>先写清用户看得见的完成标准与不可越过的边界。</p></li>
          <li><span>02</span><strong>沿链路取证</strong><p>从入口、模型、工具、数据到回执，定位第一个有证据的断点。</p></li>
          <li><span>03</span><strong>最小可逆实现</strong><p>优先复用成熟能力，只增加必要适配，并保留回滚路径。</p></li>
          <li><span>04</span><strong>同尺验收</strong><p>修改前后用同一条真实用户路径验证，不用低层测试代替体验。</p></li>
        </ol>
      </section>

      <section className="work-contact">
        <p>正在寻找 AI Agent、AI 应用开发、AI 产品工程相关机会。</p>
        <a href="mailto:xmhuangzhijun-hue@users.noreply.github.com">聊聊我能解决的问题 <ArrowUpRight size={18} /></a>
      </section>

      <footer className="work-footer">
        <Link href="/"><ArrowLeft size={15} /> 返回博客首页</Link>
        <span>© 2026 XMHUA · 公开内容已脱敏</span>
      </footer>
    </main>
  );
}
