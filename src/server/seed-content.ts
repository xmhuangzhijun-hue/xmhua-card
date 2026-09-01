import type { HomepageContent } from "@/lib/content-schema";

const mark = "/xmhua-mark.svg";

export const seedHomepageContent: HomepageContent = {
  site: {
    brandName: "XMHUA", brandImage: mark,
    announcement: "这里持续记录 AI 产品、Agent 与独立开发实践。",
    announcementLink: { label: "查看最新项目", href: "#products" }, announcementCode: "", announcementSuffix: "",
    navigation: [{ label: "文章", href: "#articles" }, { label: "产品", href: "#products" }, { label: "资源", href: "#ai-navigation" }, { label: "关于", href: "#about" }, { label: "创建博客", href: "/start" }],
  },
  hero: {
    kicker: "AI 产品 / Agent / 独立开发", title: "把想法做成产品。",
    description: "我是 XMHUA，持续构建 AI 产品、Agent 与数据工具。\n这里记录真实开发过程、产品判断和能够反复使用的方法。",
    primaryAction: { label: "看开发记录", href: "#articles" }, secondaryAction: { label: "查看产品", href: "#products" },
    tags: ["AI 产品", "Agent", "独立开发", "数据产品", "个人数字系统", "长期构建"],
  },
  sections: {
    articles: { eyebrow: "开发记录", title: "记录产品如何真正落地。", description: "从需求判断、架构取舍到验证与复盘，保留真实构建过程。", action: { label: "查看全部笔记", href: "/notes" } },
    products: { eyebrow: "代表项目", title: "产品是判断的最终证据。", description: "展示正在持续构建的 Agent、数据产品和个人数字系统。", action: { label: "查看全部项目", href: "#products" } },
    directory: { eyebrow: "能力与资源", title: "把可复用能力连接起来。", description: "整理产品开发、Agent 工程、数据系统和长期学习入口。" },
  },
  articles: [
    [1, "Agent 产品", "Organic：把 Agent 能力做成可迁移产品", "围绕上下文、权限、工具、状态和回执，构建能够持续工作的 Agent 产品。", "2026-08-25", "organic-agent-product", "Agent 产品不只是一层聊天界面。它要知道当前任务、允许调用什么、已经改变了什么，以及用户最终能看到什么。\n\n我在 Organic 中把上下文、权限、工具、状态和回执拆成可验证的边界。模型负责理解和判断，系统负责权限、事实与副作用。\n\n真正可迁移的不是某段提示词，而是一套能在不同项目里继续工作的产品机制。"],
    [2, "产品架构", "从页面原型到多租户内容平台", "保留视觉基线，同时把内容、租户隔离和管理能力迁入服务端。", "2026-08-25", "prototype-to-content-platform", "页面原型只能说明视觉方向，不能承担长期运营。博客需要内容存储、编辑入口、发布状态和稳定的公开地址。\n\n多租户不是为了堆架构，而是把每个站点的数据和管理权限隔离清楚。公开页面只读取已发布内容，站点主人通过自己的密钥进入工作台。\n\n判断是否完成的标准，是主人能独立写、改、预览和发布，而不是代码里存在一组看起来像内容的数据。"],
    [3, "数据产品", "广告投放数据如何成为可执行工作台", "统一指标口径、权限和业务回执，让数据不只停留在报表。", "2026-08-20", "ad-data-workbench", "广告数据的难点通常不在画图，而在数据从哪里来、口径是否一致，以及异常发生后谁来处理。\n\n一个可执行工作台要把采集、指标、权限、报告和业务回执连接起来。看到异常后，使用者能继续定位账户、计划和素材，而不是停在一张截图。\n\n报表是结果的一部分，真实运营闭环才是产品。"],
    [4, "个人系统", "把零散记录变成长期可用的个人数字资产", "用权威数据源、受控归档和可追溯更新保持个人系统连续。", "2026-08-15", "personal-digital-assets", "长期记录最怕的不是少，而是来源混乱、重复覆盖和无法追溯。\n\n我把事实来源、有效时间、权限和变更记录放在内容之前。笔记可以不断整理，但原始证据和权威数据不能被一次生成随意改写。\n\n这样做的目的，是让个人系统几年后仍然能读、能迁移，也能被 Agent 安全使用。"],
    [5, "工程方法", "用户可见结果才是完成", "测试和服务健康是证据，真实页面与业务路径才是最终验收。", "2026-08-10", "user-visible-done", "测试通过、进程在线、接口返回 200，都只是完成的证据，不是完成本身。\n\n如果用户点不开文章、无法保存内容，产品就没有完成。验证必须沿着真实入口走到最终结果，并检查失败时是否给出清楚反馈。\n\n工程验收最后要回到一句话：用户现在能不能完成他原本要做的事。"],
    [6, "独立开发", "小步发布、强归因和可逆迭代", "让每次产品变化都能被验证、解释和安全回退。", "2026-08-05", "reversible-iterations", "独立开发资源有限，更需要控制每次变化的范围。一次发布只解决一组明确问题，并保留修改前后的同尺证据。\n\n强归因意味着出了问题能找到第一处断点，可逆意味着上线前就知道怎样退回上一版本。\n\n速度不是少做验证，而是让每一步都更小、更清楚、更容易恢复。"],
  ].map(([id, category, title, excerpt, publishedAt, slug, body]) => ({ id: id as number, category: String(category), title: String(title), excerpt: String(excerpt), publishedAt: String(publishedAt), slug: String(slug), body: String(body), published: true, href: `/notes/${slug}` })),
  products: [
    { id: 1, image: mark, name: "Organic", subtitle: "可迁移 Agent 产品系统", summary: "把模型、工具、权限、状态与记忆组织成能够持续演进的 Agent 产品。", platform: "Agent / SaaS", href: "#" },
    { id: 2, image: mark, name: "投放数据工作台", subtitle: "多平台广告数据产品", summary: "面向真实运营流程的数据汇总、权限隔离、自动报告与业务验收。", platform: "Data / Web", href: "#" },
    { id: 3, image: mark, name: "个人数字系统", subtitle: "本地优先的长期记录系统", summary: "连接记录、知识、项目与 Agent，让个人数据保持可控、可追溯和可迁移。", platform: "Local / Agent", href: "#" },
  ],
  directory: {
    kicker: "能力地图", title: "产品、Agent、数据与长期系统。", description: "围绕真实产品交付形成的能力入口，持续补充可公开的案例、工具和方法。",
    primaryAction: { label: "查看项目", href: "#products" }, secondaryAction: { label: "联系合作", href: "#about" },
    links: [
      { id: 1, icon: "search", title: "产品研究", description: "从用户问题、竞品和真实反馈判断产品机会。", href: "#" },
      { id: 2, icon: "code", title: "Agent 工程", description: "上下文、工具、权限、状态、回执和自然任务验收。", href: "#" },
      { id: 3, icon: "layers", title: "数据系统", description: "多租户数据、指标口径、自动化与可视化工作台。", href: "#" },
      { id: 4, icon: "shield", title: "长期资产", description: "隐私优先、可追溯、可迁移的个人数字基础设施。", href: "#" },
    ],
  },
  author: { kicker: "关于 XMHUA", title: "一个持续把 AI 能力做成真实产品的人。", paragraphs: ["我关注 AI 产品、Agent 工程、数据工具和个人数字系统，习惯从真实用户路径出发，把想法做成可以运行、可以验证的产品。", "这个网站用于公开记录项目、方法和阶段性成果。所有展示内容都由后端内容系统管理，并会随着实践持续更新。"] },
  socials: [
    { id: 1, icon: mark, label: "GitHub", handle: "xmhuangzhijun-hue", href: "https://github.com/xmhuangzhijun-hue" },
    { id: 2, icon: mark, label: "X", handle: "XMHUA", href: "#" },
    { id: 3, icon: mark, label: "YouTube", handle: "XMHUA", href: "#" },
    { id: 4, icon: mark, label: "TikTok", handle: "XMHUA", href: "#" },
    { id: 5, icon: mark, label: "Telegram", handle: "XMHUA", href: "#" },
    { id: 6, icon: mark, label: "抖音", handle: "XMHUA", href: "#" },
    { id: 7, icon: mark, label: "快手", handle: "XMHUA", href: "#" },
    { id: 8, icon: mark, label: "小红书", handle: "XMHUA", href: "#" },
    { id: 9, icon: mark, label: "B站", handle: "XMHUA", href: "#" },
  ],
  footer: { description: "AI 产品、Agent、数据工具与长期构建记录。", legalLinks: [{ label: "隐私政策", href: "#" }, { label: "服务条款", href: "#" }], note: "公开内容以当前页面为准。", copyright: "© 2026 XMHUA." },
  ui: {
    pageTitle: "XMHUA | AI 产品与 Agent", languageLabel: "EN", moreLabel: "更多", moreLinks: [{ label: "创建自己的博客", href: "/start" }],
    productStoreLabel: "查看项目", productNotesLabel: "开发记录", emailLink: { label: "Email", href: "#" },
    analytics: { enabled: false, title: "网站统计选择", description: "只有在你同意后才会加载访问统计。", privacyLink: { label: "隐私政策", href: "#" }, cookieLink: { label: "Cookie 说明", href: "#" }, rejectLabel: "拒绝", acceptLabel: "同意统计" },
  },
};
