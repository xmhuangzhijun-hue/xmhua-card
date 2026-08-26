# XMHUA Card HTTP API v1

API 根地址由部署决定，例如 `https://api.example.com`。本文中的路径都相对于根地址。请求与响应使用 UTF-8 JSON；写请求必须发送 `Content-Type: application/json`。

后端响应头 `X-API-Version: 1.0.0`。同一主版本内只做向后兼容扩展；删除字段、改变字段类型或语义需要发布新的 API 主版本。

## 通用约定

- 租户标识 `tenant`：2–48 个字符，只允许小写字母、数字和单个连字符分隔，例如 `xmhua`、`my-blog`。
- 成功响应：`{ "data": ..., "meta"?: ... }`。
- 失败响应：`{ "error": "STABLE_ERROR_CODE" }`。客户端应判断 HTTP 状态和 `error`，不要依赖错误文案。
- 平台管理员使用 `Authorization: Bearer <ADMIN_API_KEY>`。
- 租户拥有者使用创建站点时一次性返回的 `Authorization: Bearer <tenant-token>`。
- API 不使用 Cookie；令牌只应发往可信的 HTTPS 后端。

## 公开内容

### `GET /api/content?tenant=<slug>`

无需鉴权。省略 `tenant` 时读取 `DEFAULT_TENANT_SLUG`。

成功 `200`：

```json
{
  "data": { "site": {}, "hero": {}, "sections": {}, "articles": [], "products": [], "directory": {}, "author": {}, "socials": [], "footer": {}, "ui": {} },
  "meta": { "source": "postgresql", "tenant": "xmhua" }
}
```

`meta.source` 为 `postgresql` 或 `seed`。完整 `data` 文档见下方“内容文档”。不可用时返回 `503 CONTENT_UNAVAILABLE`。

## 自助建站

### `POST /api/signup`

仅当 `SELF_SERVICE_SIGNUP_ENABLED=true` 时可用。

请求：

```json
{ "slug": "my-blog", "name": "我的博客" }
```

成功 `201`：

```json
{
  "data": {
    "tenant": { "slug": "my-blog", "name": "我的博客" },
    "token": "site_<only-returned-once>"
  }
}
```

令牌只返回一次，数据库仅保存 SHA-256 摘要。错误：`400 INVALID_SIGNUP`、`409 TENANT_EXISTS`、`503 DATABASE_REQUIRED`、`503 SIGNUP_DISABLED`。

## 租户工作台

以下接口需要租户 Bearer 令牌。本机开发可用 `LOCAL_OWNER_ACCESS=true` 在 loopback 地址免令牌；公网禁止开启。

### `GET /api/studio/content?tenant=<slug>`

成功 `200`：`{ "data": <ContentDocument>, "meta": { "tenant": "my-blog" } }`。

### `PUT /api/studio/content?tenant=<slug>`

请求体必须是完整 `ContentDocument`。后端在单个 PostgreSQL 事务中替换该租户内容，不支持部分 PATCH。

成功 `200`：`{ "data": <ContentDocument>, "meta": { "tenant": "my-blog", "saved": true } }`。

错误：`400 INVALID_STUDIO_REQUEST`、`401 UNAUTHORIZED`、`404 TENANT_NOT_FOUND`、`503 DATABASE_REQUIRED`。

## 平台管理

以下接口需要平台管理员 Bearer 密钥。

### `GET /api/admin/tenants`

成功 `200`：

```json
{
  "data": [
    { "id": 1, "slug": "xmhua", "name": "XMHUA", "active": true, "updatedAt": "2026-08-25T00:00:00.000Z" }
  ]
}
```

### `POST /api/admin/tenants`

请求：`{ "slug": "my-blog", "name": "我的博客", "seedContent": true }`。`seedContent` 省略时默认为 `true`。成功返回 `201` 和 `{ "data": <Tenant> }`。

### `GET /api/admin/content?tenant=<slug>`

成功 `200`：`{ "data": <ContentDocument>, "meta": { "tenant": "my-blog" } }`。

### `PUT /api/admin/content?tenant=<slug>`

请求体是完整 `ContentDocument`。成功 `200`：`{ "data": <ContentDocument>, "meta": { "tenant": "my-blog", "saved": true } }`。

管理错误包括：`401 ADMIN_KEY_NOT_CONFIGURED`、`401 UNAUTHORIZED`、`404 TENANT_NOT_FOUND`、`409 TENANT_EXISTS`、`503 DATABASE_REQUIRED`、`400 ADMIN_REQUEST_FAILED`、`400 INVALID_ADMIN_CONTENT`。

## 内容文档

`ContentDocument` 的稳定 JSON 结构如下。除标有可选的字段外，所有字段都必填；字符串可为空，数组可为空。

```ts
type Link = { label: string; href: string };
type SectionHeading = {
  eyebrow: string;
  title: string;
  description: string;
  action?: Link;
};

type ContentDocument = {
  site: {
    brandName: string;
    brandImage: string;
    announcement: string;
    announcementLink: Link;
    announcementCode: string;
    announcementSuffix: string;
    navigation: Link[];
  };
  hero: {
    kicker: string;
    title: string;
    description: string;
    primaryAction: Link;
    secondaryAction: Link;
    tags: string[];
  };
  sections: {
    articles: SectionHeading;
    products: SectionHeading;
    directory: SectionHeading;
  };
  articles: Array<{
    id: number;
    category: string;
    title: string;
    excerpt: string;
    publishedAt: string;
    href: string;
  }>;
  products: Array<{
    id: number;
    image: string;
    name: string;
    subtitle: string;
    summary: string;
    platform: string;
    href: string;
  }>;
  directory: {
    kicker: string;
    title: string;
    description: string;
    primaryAction: Link;
    secondaryAction: Link;
    links: Array<{
      id: number;
      icon: "search" | "code" | "layers" | "shield";
      title: string;
      description: string;
      href: string;
    }>;
  };
  author: { kicker: string; title: string; paragraphs: string[] };
  socials: Array<{
    id: number;
    icon: string;
    label: string;
    handle: string;
    href: string;
  }>;
  footer: {
    description: string;
    legalLinks: Link[];
    note: string;
    copyright: string;
  };
  ui: {
    pageTitle: string;
    languageLabel: string;
    moreLabel: string;
    moreLinks: Link[];
    productStoreLabel: string;
    productNotesLabel: string;
    emailLink: Link;
    analytics: {
      enabled: boolean;
      title: string;
      description: string;
      privacyLink: Link;
      cookieLink: Link;
      rejectLabel: string;
      acceptLabel: string;
    };
  };
};
```

运行时权威校验定义在 `src/lib/content-schema.ts` 和 `src/lib/admin-schema.ts`。接口契约变更时必须同步更新这些 schema、本文和后端版本。

## 独立部署前后端

前端设置：

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

后端设置允许访问它的前端源（只能是一个明确 origin，不要带末尾 `/`）：

```dotenv
CORS_ALLOWED_ORIGIN=https://www.example.com
```

同源部署时将两项留空即可。后端允许 `GET, POST, PUT, OPTIONS` 以及 `Content-Type, Authorization` 请求头。
