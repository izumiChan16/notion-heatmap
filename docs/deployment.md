# Notion Heatmap 部署与运维指南

Notion Heatmap 是一个个人自部署的年度活动热力图。它从 Notion 数据库读取日期记录，在服务端聚合后，以 GitHub 风格网格嵌入 Notion。

## 前置条件

- Node.js 20 或更新版本。
- 一个 Notion 工作区，以及一个目标数据库。
- Vercel 账号（生产部署时）。

项目不需要数据库、OAuth 或额外的云服务。Notion Token 只在服务器环境变量中使用，不应复制到浏览器、URL、截图或 Git。

## 配置 Notion Integration

1. 在 [Notion Integrations](https://www.notion.so/profile/integrations) 创建 Internal Integration。
2. 复制生成的 Integration secret，稍后填到 `NOTION_TOKEN`。
3. 打开要统计的 Notion database，在右上角的 Connections/连接中添加该 Integration。
4. 数据库至少要有一个 `date` 属性；可选筛选字段支持 `status`、`select`、`multi_select` 和 `checkbox`。

创建 Integration 本身不会给它读取权限，必须在目标数据库中完成连接。

## 本地运行

安装依赖并创建本地环境文件：

```bash
npm install
cp .env.example .env.local
```

填写 `.env.local`：

```plain
NOTION_TOKEN=secret_xxx
CONFIG_SECRET=随机且足够长的密钥
ADMIN_KEY=只供配置页面使用的管理密钥
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_DATA_MODE=api
```

用不同值生成 `CONFIG_SECRET` 和 `ADMIN_KEY`，例如：

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('base64url'))"
```

启动后访问 `http://localhost:3000/setup`：

```bash
npm run dev
```

输入 `ADMIN_KEY`、数据库 URL 或 ID，点击连接，选择日期字段与可选筛选条件；预览成功后生成并复制 embed URL。

在开发 UI 而不连接 Notion 时，可将 `NEXT_PUBLIC_DATA_MODE` 设为 `mock`。切回 `api` 后需重启开发服务器。

## 嵌入 Notion

把 setup 页生成的完整 `/embed?config=…&sig=…` URL 粘贴到 Notion 页面，使用 `/embed` 块嵌入。

配置 URL 公开包含数据库 ID、字段名称与筛选条件，但绝不包含 Notion Token。服务端会用 `CONFIG_SECRET` 的 HMAC-SHA256 签名验证配置；修改 URL 中的 config 后请求会被拒绝。更换 `CONFIG_SECRET` 会使所有旧 embed URL 失效，需要重新生成。

Embed 页面可在“过去一年”与有数据的自然年之间切换。它只接收日期计数、年份和统计信息，不接收原始 Notion page 数据。

Embed 默认通过浏览器的 `prefers-color-scheme` 自动选择浅色或深色主题。由于 Notion 页面与 Widget 是跨域 iframe，Widget 无法直接读取 Notion 父页面的主题；当 Notion 配色与设备配色不一致时，可在生成的 URL 末尾追加主题覆盖参数：

```plain
&appearance=light
&appearance=dark
```

不传参数、使用 `appearance=auto` 或传入其他值时，都会继续跟随系统主题。该参数只影响显示，不参与配置签名，也不会发送到 Notion API。

## Vercel 部署

1. 将仓库导入 Vercel，保持默认 Next.js 构建设置。
2. 在 Vercel Project Settings → Environment Variables 中添加以下全部变量：

   ```plain
   NOTION_TOKEN=secret_xxx
   CONFIG_SECRET=随机且足够长的密钥
   ADMIN_KEY=你的管理密钥
   NEXT_PUBLIC_APP_URL=https://你的项目.vercel.app
   NEXT_PUBLIC_DATA_MODE=api
   ```

3. 部署完成后，访问 `https://你的项目.vercel.app/setup` 生成正式 embed URL。
4. 若变更 `NEXT_PUBLIC_APP_URL` 或 `NEXT_PUBLIC_DATA_MODE`，重新部署以使浏览器端环境变量生效。

不要将 `.env.local`、真实 token、管理员密钥或已签名 URL 提交到 Git。

## 常见问题

| 现象 | 处理方式 |
| --- | --- |
| `The admin key is incorrect.` | 检查输入是否与 `ADMIN_KEY` 完全一致。 |
| `Connect your Notion Integration…` | 在目标 Notion database 的 Connections 中添加该 Integration。 |
| `This database has no date property.` | 在数据库中添加 `date` 属性，或换一个包含日期字段的数据库。 |
| `This embed link is invalid.` | URL 被改动、签名不匹配或 `CONFIG_SECRET` 已更换；从 setup 重新生成。 |
| Embed 一直显示 Demo data | 在环境变量设置 `NEXT_PUBLIC_DATA_MODE=api` 并重启/重新部署。 |
| 选择的字段不再可用 | 重新打开 setup，连接数据库并生成采用现有字段的新 embed URL。 |
| 查询超时或失败 | 检查 Notion 状态、Integration 权限和数据库规模；缩小筛选范围后再试。 |

## 验证与维护

在提交或部署前运行：

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

自动化测试覆盖数据库 ID 解析、配置校验和签名、时区日期转换、聚合、统计、筛选语义、分页及关键 API 安全顺序。真实 Notion 联调需要使用你自己的 `.env.local`，不要将凭据粘贴到测试、日志或 issue。

当前 MVP 限定一个数据库来源，但签名配置保留 `sources` 数组以兼容后续扩展。它不包含多用户、OAuth、持久化配置存储或缓存服务。
