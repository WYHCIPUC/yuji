# 禹迹 MVP 完成度审计

审计版本：`v0.1.0`
审计提交：`2f67105`
审计日期：2026-10-03

## 已完成并有本地证据

| 计划项 | 证据 |
|---|---|
| 三时代时间轴 | `src/content/eras.json`、`npm run smoke` |
| 鼠标、触摸和键盘操作 | `src/main.ts`、浏览器冒烟测试 |
| 时代图层变化 | `src/styles/global.css` 的时代选择器、视觉截图 |
| 古今叠层和透明度反馈 | `#overlay-control`、冒烟测试 |
| 地名查询 | `src/content/places.json`、桌面和移动端冒烟测试 |
| 制图者故事卡 | `src/content/storytellers.json`、页面渲染 |
| 五服 / 郡县模型切换 | 页面交互和冒烟测试 |
| 来源与不确定性说明 | `src/content/sources.json`、来源抽屉 |
| 移动端适配 | 390×844 视觉检查和冒烟测试 |
| 减少动画 | `prefers-reduced-motion` 样式和冒烟测试 |
| 构建和资源检查 | `npm run build`、`npm run verify` |
| 静态发布包 | `release/yuji-prototype-0.1.0-dist.zip` |
| Git 交接版本 | `main` 分支和 `v0.1.0` 标签 |
| GitHub Pages 配置 | `.github/workflows/deploy-pages.yml` |

## 需要外部输入后才能完成

| 计划项 | 当前状态 | 完成条件 |
|---|---|---|
| 真实用户试用 | 未执行 | 至少 3 名非开发用户完成测试脚本 |
| 试用反馈迭代 | 未执行 | 填写结果模板并修复高优先级问题 |
| GitHub 线上发布 | 未执行 | 提供仓库 URL，推送 `main` 和 `v0.1.0` |
| 古地图正式版权核验 | 待核验 | 确认收藏机构、许可和配准成果许可 |

## 暂不进入的范围

- 7 个时代；
- 4 幅正式古地图；
- 200 条以上地名；
- 河流改道、郑和针路和分享卡；
- 账号、社区、支付、后台和外部实时 API。

## 审计结论

本地 MVP 的代码、内容结构、测试和发布准备已经完成。真实用户验证、正式古图版权核验和线上发布仍属于外部步骤，不能用自动化测试替代。

## 增量记录：v0.1.1（2026-10-06）

在不改变冻结范围的前提下完成的迭代，全部有本地验证证据（`npm run check`，28 项冒烟检查通过）：

| 增量 | 说明 | 证据 |
|---|---|---|
| 地图地名点按反查 | 示意地图上的地名变为可交互元素，点按或 Enter 即打开查询抽屉并展示该地考订卡 | `src/main.ts` 的 `mapPlaces` 与 `.map-place` 交互、冒烟测试 3 项新用例 |
| 内容数据校验 | 新增 `scripts/lint-content.mjs`，校验四份内容 JSON 的必填字段、称谓链、确定性分级和地图地名可查性，已接入 `npm run verify` | `scripts/lint-content.mjs`、`package.json` |
| 无障碍小修 | 时间轴 `aria-valuemax` 从时代数据派生，不再硬编码；地图地名带 `role="button"` 和键盘触发 | `src/main.ts` |
| 资源加载修复 | 新增 `favicon.svg`（离线 SVG，无外部依赖），消除每次加载的 `/favicon.ico` 404；`verify` 的资源检查扩展到全部相对路径引用 | `public/favicon.svg`、`index.html`、`scripts/verify-prototype.mjs`、基线截图控制台零错误 |
| 一键验收脚本 | `npm run check` 串起构建、校验、临时预览与浏览器冒烟测试 | `scripts/check.mjs`、`scripts/smoke.mjs`（Edge 持久化上下文） |
| 发布包 | 重新构建 `release/yuji-prototype-0.1.1-dist.zip` | `release/` |

仍待外部输入的事项与上表下方主审计一致：真实用户试用、GitHub 仓库地址、正式古图版权核验。

## 阶段判定：发布准备阶段（2026-10-06 复核）

- **本地验收复核**：在只含提交 `f9e9d33` 的隔离构建树中重跑 `npm run check`，28 项冒烟检查与内容校验全部通过。冻结范围（`docs/scope-freeze.md`）十项要求逐项满足，发布红线未触碰。**结论：v0.1.x 本地阶段达标，进入发布准备阶段。**
- **版权核验进展**：完成四幅古地图候选来源的第一轮文献研究并写入 `docs/source-register.md`（含通用版权结论、逐幅核验要点和人工核验流程）。当日联网核验通道全部不可用（检索配额耗尽至 10-08、机构网站反爬/超时），各条目状态为“已定位、待人工点开确认”。
- **并行工作提示**：仓库中存在另一会话的未提交改动（`src/styles/tokens.css`、`src/content/storytellers.json`、`src/main.ts` 的设计深化、`scripts/baseline-screens.mjs`），内容数据可通过结构校验；本轮验收刻意隔离于此工作之外，待其完成后合并。
