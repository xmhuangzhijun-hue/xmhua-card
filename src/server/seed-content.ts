import type { HomepageContent } from "@/lib/content-schema";

const root = "/sites/hooosberg-com-db2980a2/root-8a5edab2";

export const seedHomepageContent: HomepageContent = {
  site: {
    brandName: "湖森堡AI_hooosberg",
    brandImage: "/sites/hooosberg-com-db2980a2/shared/brand/hooosberg-ai-icon.png",
    announcement: "给大家搞来一个福利：如果你对海外顶级模型感兴趣，推荐试试 Cola，访问",
    announcementLink: { label: "colaos.ai", href: "https://colaos.ai" },
    announcementCode: "HU-U7DSEXZJ",
    navigation: [
      { label: "笔记", href: "#articles" }, { label: "产品", href: "#products" },
      { label: "AI导航", href: "#ai-navigation" }, { label: "联系", href: "#about" },
      { label: "定制服务", href: "/start" },
    ],
  },
  hero: {
    kicker: "我的开发笔记 / AI 工具导航", title: "哲学 艺术 AI",
    description: "这里记录我用 AI 做真实产品的过程，也整理实际用过和调研过的 AI 工具。\n你可以从这里看产品怎么从想法走到发布，也可以快速判断当下该用哪个 AI 工具。",
    primaryAction: { label: "看笔记", href: "#articles" }, secondaryAction: { label: "打开 AI 导航", href: "#ai-navigation" },
    tags: ["Codex App 开发", "苹果商店上架流程", "Mac/iOS App 开发", "AI 入门", "Claude Code", "Gemini", "AI 导航", "开发笔记"],
  },
  sections: {
    articles: { eyebrow: "开发笔记", title: "先看真实产品怎么被做出来。", description: "这里不是概念教程，而是需求、提示词、代码修改、上架、失败和复盘的连续记录。" },
    products: { eyebrow: "产品", title: "产品是笔记的事实来源。", description: "保留少量代表项目入口，更多产品和隐私政策放在产品页里统一查看。" },
    directory: { eyebrow: "AI 导航", title: "先选对工具。", description: "主流工具、国内平替、开发资源和学习资料都放进一页，按场景快速跳转。" },
  },
  articles: [
    [1,"架构实现","WitNote 智简笔记 · 08 · 2.0.1 重构：Swift 原生工作台与本地 MLX 架构","这次不是重新做一个 App，而是在原有 App Store 产品上完成一次 Swift 原生、端侧 AI 和工作台结构的系统重构。","2026-08-05"],
    [2,"产品复盘","WitNote 智简笔记 · 01 · 立项：为什么做本地优先 AI 写作工具","WitNote 的起点不是再做一个笔记本，而是给写作者一个本地可控的 AI 工作台。","2026-06-20"],
    [3,"产品复盘","DrowseBook 入梦书 · 01 · 立项调研：为什么做一个睡前听书阅读器","从头部听书产品的差评、移动场景和买断机会，判断 DrowseBook 为什么值得做。","2026-06-20"],
    [4,"产品复盘","Sumi Mahjong 禅艺麻将 · 01 · 立项调研：为什么从麻将消除开始做游戏矩阵","从关键词、头部产品、差评密度、能力匹配和商业模型判断一个小游戏是否值得做。","2026-06-20"],
    [5,"产品复盘","WitNote 智简笔记 · 02 · 开发哲学：从认真写作者的本能出发","写作者需要的是可回到原稿、可掌控上下文、可长期维护的工作流。","2026-06-19"],
    [6,"产品复盘","DrowseBook 入梦书 · 02 · 开发哲学：安静工具类 iOS App 如何表达价值","睡前听书、文件导入、TTS 和隐私边界，如何构成一个清晰的生活工具产品。","2026-06-19"],
  ].map(([id,category,title,excerpt,publishedAt]) => ({ id:id as number, category:String(category), title:String(title), excerpt:String(excerpt), publishedAt:String(publishedAt), href:"#" })),
  products: [
    { id:1,image:`${root}/images/mood-button.png`,name:"Mood Button",subtitle:"本地 AI 情绪日记",summary:"基于 Apple MLX 和 Qwen3 的 iPhone 本地 AI 语音情绪日记。",platform:"iPhone / iPad",href:"#" },
    { id:2,image:`${root}/images/sumi-mahjong.png`,name:"Sumi Mahjong 禅艺麻将",subtitle:"安静解谜游戏",summary:"安静的 iPhone 与 iPad 麻将连连看，使用手调水墨牌面，支持离线配对，可选一次买断解锁主题。",platform:"iPhone / iPad",href:"#" },
    { id:3,image:`${root}/images/drowsebook.png`,name:"DrowseBook 入梦书",subtitle:"睡前听书阅读器",summary:"iPhone 上的睡前听书和本地阅读工具，支持 EPUB、PDF、TXT、MOBI、AZW3、Apple TTS、环境音和睡眠计时。",platform:"iPhone / iOS",href:"#" },
  ],
  directory: {
    kicker:"快速入口", title:"排行榜、平替、资源入口。", description:"导航页会持续整理我实际使用或完整调研过的工具：AI 编程、模型接口、产品原型、设计创作、开发托管、分发推广和免费学习资源，方便你按场景直接跳转。",
    primaryAction:{label:"进入 AI 导航",href:"#"}, secondaryAction:{label:"看顶级产品榜",href:"#"},
    links:[
      {id:1,icon:"search",title:"AI 工具排行榜",description:"从 ChatGPT、Claude、Gemini 到国内主流工具，先看最值得反复使用的入口。",href:"#"},
      {id:2,icon:"code",title:"开发者工具链",description:"模型接口、开发托管、原型设计和分发推广，适合做产品前快速选型。",href:"#"},
      {id:3,icon:"layers",title:"国内平替对照",description:"把国际主流产品和国内可用工具放在一起，方便判断该用哪个替代。",href:"#"},
      {id:4,icon:"shield",title:"长期学习资源",description:"只放值得长期看的免费课程和一线资料，给后续课程与项目打基础。",href:"#"},
    ],
  },
  author:{kicker:"关于湖森堡AI_hooosberg",title:"一个在艺术、建筑和技术之间做产品的独立开发者。",paragraphs:["我毕业于美术学院，本身学的是建筑设计，也长期喜欢研究技术和编程。过去做过 3D 打印，拍过户外纪录片，也一直在把空间、影像、工具和产品开发放在同一个系统里思考。","现在我正在 all in AI。2026 上半年已经开发并发布了十多个产品，目标是今年完成 20 个，慢慢形成稳定的海外收入。这是我的梦想，这个网站会记录路上的产品、课程、核心文件、AI 对话和复盘，也希望把这场历险一路分享给你。"]},
  socials:[["github.svg","GitHub","hooosberg"],["x.svg","X","@hooosberg"],["youtube.svg","YouTube","@hooosberg"],["tiktok.svg","TikTok","@hooosberg"],["telegram.svg","Telegram","@hooosberg"],["douyin.svg","抖音","湖森堡AI_hooosberg"],["kuaishou.svg","快手","湖森堡AI_hooosberg"],["xiaohongshu.svg","小红书","湖森堡AI_hooosberg"],["bilibili.svg","B站","湖森堡AI_hooosberg"]].map((s,i)=>({id:i+1,icon:`${root}/icons/${s[0]}`,label:s[1],handle:s[2],href:"#"})),
  footer:{description:"真实项目教程、独立 App、AI 工具和长期产品记录。",legalLinks:[{label:"隐私政策",href:"#"},{label:"服务条款",href:"#"},{label:"Cookie 说明",href:"#"}],note:"这里记录公开项目、AI 教程和产品页面。隐私、服务条款与网站统计说明以底部对应页面为准。",copyright:"© 2026 Hooosberg."},
};
