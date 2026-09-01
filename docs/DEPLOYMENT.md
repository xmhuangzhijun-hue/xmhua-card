# 部署

两个进程：`xmhua-api`（后端）和 `xmhua-card`（前端）。它们各自独立启动、独立重启、独立回滚。

## 目标机现状

博客与清禾等服务共用一台阿里云 ECS。该机内存 1.8 GiB，**在机器上跑 Next.js 构建会被内核 OOM kill**，所以构建必须在本地或 WSL 的 Linux x86_64 环境完成，只上传产物。

目录约定：

```
/opt/xmhua-card/
├── releases/<时间戳>-<提交>/     每次发布一个只读目录
│   ├── api/                      后端产物
│   └── web/                      前端 standalone 产物
└── current -> releases/…         原子切换的软链接
```

## 一次发布

1. **本地构建两份产物**（Linux x86_64）

   ```bash
   npm ci --prefix api && npm run build --prefix api
   npm ci && API_INTERNAL_BASE_URL=http://127.0.0.1:39300 npm run build
   ```

   前端构建期间需要能连上一个后端来预渲染笔记和独立页面。可以临时连到生产后端的只读接口，或在本地起一份指向生产库副本的后端。

2. **上传并校验哈希**，在服务器上核对 `sha256sum` 与本地一致后再解包到新的 `releases/` 目录。

3. **先迁移数据库**（本次新增三张表，全部是 `CREATE TABLE`，不改动既有表）：

   ```bash
   DATABASE_URL=... node --experimental-strip-types api/src/db/migrate.ts
   ```

4. **创建后台账号**（只需一次；换密码时重复执行会重置并吊销全部会话）：

   ```bash
   DATABASE_URL=... ADMIN_USERNAME=... ADMIN_PASSWORD=... npm run admin:create --prefix api
   ```

   密码从 `XiaomoSecrets` 取，不写进任何文件、命令历史或日志。

5. **切换软链接并按顺序重启**：先 `xmhua-api`，等它的 `/api/health` 返回 200，再重启 `xmhua-card`。反过来会让前端在后端就绪前对外返回错误页。

6. **每次重启后做有界的就绪轮询再探活**。上一次回滚演练中观察到重启后有两次 502，直接探活会误判为失败。

## systemd

后端 `xmhua-api.service`：

```ini
[Service]
User=xmhua-card
WorkingDirectory=/opt/xmhua-card/current/api
Environment=NODE_ENV=production
EnvironmentFile=/etc/xmhua-card/api.env
ExecStart=/opt/xmhua-card/runtime/bin/node dist/index.js
Restart=on-failure
```

`api.env` 至少包含 `DATABASE_URL`、`API_PORT=39300`、`ADMIN_SESSION_TTL_HOURS`。文件权限 `0600`，属主为运行用户。

前端沿用现有的 `xmhua-card.service`，追加 `Environment=API_INTERNAL_BASE_URL=http://127.0.0.1:39300`。

## Nginx

`/api/` 直接转发给后端，其余给 Next.js。这样后台会话 Cookie 是同源的，不需要 CORS，也不用让 API 流量多绕一层 Next。

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:39300;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location / {
    proxy_pass http://127.0.0.1:39218;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

改完先 `nginx -t` 再 `reload`，不要 restart，避免影响同机其他 vhost。

## 回滚

把 `current` 指回上一个 release 目录，然后按同样顺序重启两个服务。数据库迁移是纯新增表，旧版本代码不读这三张表，因此回滚不需要回退数据库。

## 验收标准

只有下面几条同时成立才算发布完成：

- 公网 `/`、`/notes`、任意一篇 `/notes/<slug>`、`/work`、`/privacy` 均返回 200 并渲染出内容
- 在浏览器里用真实账号登录 `/admin`，改一条内容并保存，一分钟内在公开页面上看到这条改动
- `xmhua-api`、`xmhua-card`、`nginx` 与同机的清禾网关均为 active
- 首页不存在 `href="#"` 的链接

进程 active、端口可连、接口 200，都只是证据，不是完成。
