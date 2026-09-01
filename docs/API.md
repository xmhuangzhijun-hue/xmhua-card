# 内容 API

后端是 `api/` 下的独立服务，前端不直接访问数据库。所有响应形如 `{ "data": ... }`，错误形如 `{ "error": "CODE", "detail": ... }`。

除特别说明外，所有接口接受 `?tenant=<slug>` 查询参数，省略时使用 `DEFAULT_TENANT_SLUG`。

## 公开接口（无需鉴权）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/health` | 存活探针，返回版本 |
| GET | `/api/content` | 整站内容文档：站点信息、首屏、板块、笔记、项目、能力卡片、社交账号、独立页面列表、页脚、UI 文案 |
| GET | `/api/notes` | 已发布笔记列表（不含正文），带 `readingMinutes` |
| GET | `/api/notes/:slug` | 单篇笔记，含 Markdown 正文 |
| GET | `/api/pages/:slug` | 单个独立页面，含 Markdown 正文 |

`/api/content` 只返回已发布内容，并且**丢弃地址为空或 `#` 的社交账号**，公开页面因此不会出现点不开的链接。项目和能力卡片保留，但前端在地址为占位符时不渲染成链接。

## 登录

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/auth/login` | `{ username, password }`，成功后下发 HttpOnly 会话 Cookie |
| POST | `/api/auth/logout` | 吊销当前会话 |
| GET | `/api/auth/me` | 返回当前身份，未登录为 401 |
| POST | `/api/auth/password` | `{ currentPassword, nextPassword }`，新密码至少 10 位；成功后吊销该账号全部会话 |

密码用 scrypt 加盐哈希存储。用户名不存在时也会消耗等量计算，避免用响应时间枚举账号。数据库里只有会话 token 的 SHA-256，泄库不能重放会话。

## 管理接口（需要会话 Cookie 或 `Bearer ADMIN_API_KEY`）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/admin/overview` | 各类内容计数，以及未完成项：正文过短的笔记、地址为占位符的项目 / 社交账号 / 能力卡片 |
| GET | `/api/admin/tenants` | 租户列表 |
| POST | `/api/admin/tenants` | 创建租户，可选择写入初始内容 |
| GET / PUT | `/api/admin/settings` | 站点设置文档（站点信息、首屏、板块、能力地图、关于、页脚、UI） |

以下集合都提供同一组操作：

```
GET    /api/admin/<集合>              列表（含草稿）
POST   /api/admin/<集合>              新建
PUT    /api/admin/<集合>/:id          整体更新
DELETE /api/admin/<集合>/:id          删除
POST   /api/admin/<集合>/reorder      按 { ids: [...] } 重排
```

集合：`articles`、`products`、`social-links`、`directory-links`、`pages`（`pages` 无重排）。

写入约束：

- `slug` 必须是小写短横线格式，且在同一租户内唯一，冲突返回 `409 SLUG_TAKEN`
- `publishedAt` 必须是 `YYYY-MM-DD`
- 正文上限 100 000 字符，摘要等长文本上限 10 000 字符
- 校验失败返回 `400 INVALID_BODY`，`detail` 指出具体字段
- 跨租户的 id 一律按不存在处理，不会泄露其他租户的数据

## 多租户自助建站（默认关闭）

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/api/signup` | 需要 `SELF_SERVICE_SIGNUP_ENABLED=true` 与正确邀请码；返回一次性租户令牌 |
| GET / PUT | `/api/studio/content` | 用 `Bearer <租户令牌>` 读写自己站点的设置 |

邀请码先于配额校验，错误邀请码无法消耗共享限流额度。租户令牌只存哈希。公开博客不再链接这些入口。
