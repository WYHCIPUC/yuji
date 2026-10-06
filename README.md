# 禹迹 · 时间轴原型

这是《禹迹》项目的第一阶段可运行原型，验证四件事：

1. 用户能否理解“拖动时间轴”；
2. 时代元素能否产生连续变化；
3. 古今地图叠层是否形成核心惊喜；
4. 地名查询是否能把宏大叙事连接到个人经验。

## 本版范围

- 商周、1136 年、1602 年三个时代；
- 一个古图叠层示意；
- 朱思本制图者卡片；
- 20 条地名数据，支持搜索和地图地名点按反查；
- 五服、郡县两个天下模型；
- 来源与说明抽屉；
- 移动端和电脑端响应式布局。

古地图和部分历史内容目前仍标记为“待核验”，不可直接视为正式发布素材。

## 启动

在项目目录打开终端，依次执行：

```bash
npm install
npm run dev
```

浏览器打开终端显示的本地地址，通常是 `http://localhost:5173/`。

如果要直接检查核心交互页面，可以打开 `http://localhost:5173/?stage=experience`，跳过开场。

## 构建

```bash
npm run build
```

构建结果会生成在 `dist/` 文件夹，可上传到 GitHub Pages 等静态托管服务。

## 预览构建结果

```bash
npm run preview
```

## 发布前检查

```bash
npm run verify
```

这个检查会先校验内容数据结构（必填字段、称谓链、确定性分级、地图地名可查询），再确认构建入口、脚本、样式和核心内容数据都已生成。项目已经附带 GitHub Pages 工作流文件：将目录放入 GitHub 仓库并推送到 `main` 分支后，GitHub Actions 会自动构建和发布 `dist/`。

## 浏览器冒烟测试

如果预览服务器已经启动，可以单独执行：

```bash
npm run smoke
```

它会在本机 Edge 中自动完成一次核心流程，不会上传数据或访问外部服务。

如果希望一条命令完成构建、启动临时预览和浏览器测试，可以直接运行：

```bash
npm run check
```

如果 Edge 安装在其他位置，可以临时指定浏览器路径：

```powershell
$env:YUJI_BROWSER = "C:\你的浏览器路径\msedge.exe"
npm run smoke
```

## 目录说明

- `src/content/`：时代、地名、人物和来源数据；
- `src/styles/`：颜色、字体、布局和响应式规则；
- `src/main.ts`：页面结构、状态和交互；
- `public/assets/`：后续放入已确认版权的图片、字体和音频；
- `docs/`：范围冻结、来源核验和用户测试记录。

当前样式不依赖外部字体服务，离线打开时使用系统字体；如果以后加入项目字体，必须先补充许可记录。

本地部署可以直接照着 [docs/local-deployment.md](docs/local-deployment.md) 执行。

构建后的静态发布包位于 [release/yuji-prototype-0.1.1-dist.zip](release/yuji-prototype-0.1.1-dist.zip)，解压后可直接上传到静态托管服务。

## 连接 GitHub 并发布（已完成）

项目已发布：仓库地址 [github.com/WYHCIPUC/yuji](https://github.com/WYHCIPUC/yuji)，线上地址 [wyhcipuc.github.io/yuji](https://wyhcipuc.github.io/yuji/)。`main` 分支和 `v0.1.0` 标签均已推送，GitHub Pages 构建源已设为 GitHub Actions，之后每次推送到 `main` 都会自动构建和发布。

用户测试可以直接照着 [docs/user-test-script.md](docs/user-test-script.md) 执行；公开发布前使用 [docs/release-checklist.md](docs/release-checklist.md) 逐项确认。

测试结果可以填写到 [docs/user-test-results-template.md](docs/user-test-results-template.md)。

完整的当前状态请查看 [docs/completion-audit.md](docs/completion-audit.md)。

发布前请同时阅读 [NOTICE.md](NOTICE.md)，其中说明了代码、历史资料和古地图素材的使用边界。

## 当前不要做

不要在没有确认范围和版权前增加 7 个时代、4 幅古地图、账号、社区、支付、外部地图 API 或用户上传。
