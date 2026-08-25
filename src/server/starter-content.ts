import type { HomepageContent } from "@/lib/content-schema";

export function createStarterContent(name: string): HomepageContent {
  return {
    site: {
      brandName: name,
      brandImage: "/xmhua-mark.svg",
      announcement: `欢迎来到 ${name}。`,
      announcementLink: { label: "了解更多", href: "#about" },
      announcementCode: "",
      announcementSuffix: "",
      navigation: [
        { label: "文章", href: "#articles" },
        { label: "作品", href: "#products" },
        { label: "导航", href: "#ai-navigation" },
        { label: "关于", href: "#about" },
      ],
    },
    hero: {
      kicker: "个人博客 / 作品主页",
      title: name,
      description: "在这里分享你的文章、作品与长期思考。\n登录工作台即可修改全部内容，不需要编写代码。",
      primaryAction: { label: "阅读文章", href: "#articles" },
      secondaryAction: { label: "了解我", href: "#about" },
      tags: ["个人博客", "作品", "思考", "生活"],
    },
    sections: {
      articles: { eyebrow: "最新文章", title: "从这里开始记录。", description: "发布你的第一篇文章，让访客认识你的想法。", action: { label: "查看全部文章", href: "#articles" } },
      products: { eyebrow: "代表作品", title: "展示你正在做的事。", description: "项目、服务、产品或任何值得被看见的作品。", action: { label: "查看全部作品", href: "#products" } },
      directory: { eyebrow: "常用入口", title: "把重要链接放在一起。", description: "整理你的推荐、资源和长期关注方向。" },
    },
    articles: [{ id: 1, category: "开始", title: `欢迎来到 ${name}`, excerpt: "这是你的第一篇示例文章。进入工作台，把它替换成自己的内容。", publishedAt: new Date().toISOString().slice(0, 10), href: "#" }],
    products: [{ id: 1, image: "/xmhua-mark.svg", name: "我的第一个作品", subtitle: "作品简介", summary: "用一句话说明它为谁解决了什么问题。", platform: "Web", href: "#" }],
    directory: {
      kicker: "快速入口", title: "我的链接", description: "把常用资源和推荐入口集中展示。",
      primaryAction: { label: "查看全部", href: "#" }, secondaryAction: { label: "联系我", href: "#about" },
      links: [{ id: 1, icon: "search", title: "推荐资源", description: "在工作台中替换为你真正推荐的内容。", href: "#" }],
    },
    author: { kicker: `关于 ${name}`, title: "用几句话介绍你自己。", paragraphs: ["这里可以写你的经历、关注方向和正在做的事情。", "所有文字都能在工作台直接编辑和保存。"] },
    socials: [{ id: 1, icon: "/xmhua-mark.svg", label: "GitHub", handle: "your-name", href: "#" }],
    footer: { description: `${name} 的个人博客与作品主页。`, legalLinks: [], note: "内容由站点所有者维护。", copyright: `© ${new Date().getFullYear()} ${name}` },
    ui: {
      pageTitle: name, languageLabel: "EN", moreLabel: "更多", moreLinks: [], productStoreLabel: "查看作品", productNotesLabel: "相关记录", emailLink: { label: "Email", href: "#" },
      analytics: { enabled: false, title: "网站统计选择", description: "只有在你同意后才会加载访问统计。", privacyLink: { label: "隐私政策", href: "#" }, cookieLink: { label: "Cookie 说明", href: "#" }, rejectLabel: "拒绝", acceptLabel: "同意统计" },
    },
  };
}
