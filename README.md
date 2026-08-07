# SummerAI Skill 推荐库

通过 GitHub 推送和 Cloudflare Pages 部署好用的 AI agent skill 推荐页面。

## Cloudflare Pages 设置

- Framework preset: None
- Build command: 留空
- Build output directory: `public`
- Root directory: 仓库根目录
- Production branch: `main`

## 正式域名

- Skill 推荐库主入口：`https://skills.summerai.cc/`
- 旧入口 `https://summerai.cc/skills/` 永久跳转到新域名
- Cloudflare Pages 项目：`skill-page`
- Pages 原始域名：`https://skill-page.pages.dev/`
- `functions/index.js` 在子域名根路径内部读取 `/skills/` 静态页面
- `functions/skills/index.js` 负责旧入口与子域名 `/skills/` 的规范化跳转

## 公开文件

- `public/skills/`: Skill 推荐库页面
- `public/skills.json`: 结构化 Skill 数据
- `public/author-rank.json`: 作者来源链接点击量周快照，用于作者仓库排序
- `public/llms.txt`: Agent 读取入口
- `public/robots.txt`: 搜索引擎规则
- `public/sitemap.xml`: 站点地图

## 作者点击排序

作者仓库排序使用“作者名下所有 skill 来源链接点击总数”的周快照。

- 前端点击来源链接时会调用 `/api/track-source-click`
- Cloudflare Pages Function 会把点击写入 D1
- D1 绑定名需要配置为 `DB`
- 建表 SQL 在 `tools/d1-source-clicks.sql`
- 页面构建时读取 `public/author-rank.json`，按 `source_clicks` 排序作者卡片

如果没有绑定 D1，页面仍能正常跳转来源链接，只是不会采集点击数据。
