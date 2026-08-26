# Frontend and backend versioning

前端和后端共用一个仓库，但按两个独立发布单元维护：

- 前端版本：`versions/frontend.json`，范围为 `src/app` 页面、`src/components`、视觉资源和 API 客户端。
- 后端版本：`versions/backend.json`，范围为 `src/app/api`、`src/server`、Drizzle schema/migrations 和 HTTP 契约。
- 共享契约：`src/lib/content-schema.ts`、`src/lib/admin-schema.ts`、`docs/API.md`。修改共享契约时同时评估两侧兼容性。

只改一侧时，只提升对应版本并提交相关文件，例如：

```bash
git add src/components versions/frontend.json
git commit -m "frontend: release 1.0.1"

git add src/app/api src/server versions/backend.json
git commit -m "backend: release 1.0.1"
```

不要使用 `git add -A`。每次发布前运行 `npm run check`。API 主版本保持兼容时，前端和后端可以独立升级；不兼容的契约变更必须先发布可兼容后端，再升级前端，最后才能移除旧契约。
