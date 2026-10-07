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
| 古地图正式版权核验 | **机器核验完成（2026-10-06）**：四幅候选图全部在维基共享资源确认 Public domain，含精确文件页与馆藏数字 ID（见 source-register）；剑桥 CUDL 藏《武备志》经查证为误，已排除 | 核验人人工终审（点开确认 + 截图存档）后采用 |

## 已完成：GitHub 线上发布（2026-10-06）

- 仓库：[github.com/WYHCIPUC/yuji](https://github.com/WYHCIPUC/yuji)（公开），`main` 与 `v0.1.0` 已推送；
- 线上地址：[wyhcipuc.github.io/yuji](https://wyhcipuc.github.io/yuji/)，Pages 构建源为 GitHub Actions，已验证首页与 JS 资源均返回 200；
- 首次部署因「工作流先于 Pages 开启执行」失败一次，重新触发后成功，属时序问题非代码问题。

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

## 增量记录：v0.2.0 真实古图层（2026-10-06）

版权核验完成后（四幅古图在维基共享资源确认 Public domain，见 `docs/source-register.md`），经项目负责人确认采用，真实古图进入产品：

| 增量 | 说明 | 证据 |
|---|---|---|
| 真实古图层 | 1136 年叠加《禹迹图》沙畹摹绘本（1903）、1602 年叠加《坤舆万国全图》；透明度滑杆直接控制原图层；商周时代无古图 | `src/main.ts` 的 `eraOverlayImage`、冒烟测试 4 项新用例 |
| 素材与记录 | 四幅公版素材入 `public/assets/maps/`；NOTICE、来源抽屉、来源登记表同步更新 | `NOTICE.md`、`src/content/sources.json`、`docs/source-register.md` |
| 素材完整性检查 | `lint-content` 新增 `eraOverlayImage` 引用的素材文件存在性校验 | `scripts/lint-content.mjs` |
| 诚实标注 | 叠层面板明确“未做严格配准，仅作视觉叠合”，保留示意底图的“示意重绘”水印 | `src/main.ts`、`src/styles/global.css` |

## 阶段判定：发布准备阶段（2026-10-06 复核；版权一节已于 10-07 更新）

- **本地验收复核**：在只含提交 `f9e9d33` 的隔离构建树中重跑 `npm run check`，28 项冒烟检查与内容校验全部通过。冻结范围（`docs/scope-freeze.md`）十项要求逐项满足，发布红线未触碰。**结论：v0.1.x 本地阶段达标，进入发布准备阶段。**
- **版权核验（已完结）**：四幅古图已于 2026-10-06 在维基共享资源逐幅核验为 Public domain（含精确文件页与馆藏数字 ID），经项目负责人确认采用；详见 `docs/source-register.md` 与 `NOTICE.md`。
- **GitHub 线上发布（已完成）**：[wyhcipuc.github.io/yuji](https://wyhcipuc.github.io/yuji/)，推 main 自动部署。

## 增量记录：v0.3.0 地图可信度重构（2026-10-07）

针对用户反馈「地图资料非常差、历史地图是项目核心不能有错误」的重构。此前底图是 v0.1 的装饰性示意（手绘波浪线当河流、色块当疆域），地理上不真实，已全部移除：

| 事项 | 结果 |
|---|---|
| 真实地理底图 | Natural Earth 50m 公有领域数据（63 段海岸线、135 条河流、60 个湖泊）经等距圆柱投影生成 `basemap.json`；黄河/长江加粗高亮；生成脚本 `scripts/build-basemap.mjs` 可复现 |
| 地名真实定位 | 7 个可点按地名按公认经纬度（如北京 116.4°E/39.9°N）与底图同投影定位；冒烟测试含方位断言（燕京在长安以东、敦煌在洛阳以西、临安在燕京以南） |
| 高清古图 | 禹迹图/坤舆万国全图替换为 2200px 高清版（约 1.2MB/幅），全幅居中主展示 |
| 商周诚实呈现 | 对照面板如实说明「此时代无传世地图」，五服环定位为《禹贡》观念图；滑杆在无图时代禁用 |
| 来源记录 | Natural Earth 条目加入来源抽屉与 NOTICE；「示意」条目改为仅涵盖五服环/网格装饰 |
| 验收 | 内容校验新增 basemap 检查；冒烟新增 7 项（底图渲染 ×2、方位断言 ×3、商周说明、高清图） |

## 增量记录：v0.2.1 设计深化与真实古图合并（2026-10-07）

并行设计会话的迭代（按时代制图者：商周《禹贡》/南宋沈括/明末利玛窦；五服环底图；罗盘与地球弧线；地图灯箱放大；时间轴游标对齐；“地圆”第三模型；移动端适配）与 v0.2.0 真实古图层完成合并：

| 事项 | 结果 |
|---|---|
| 冲突解决 | `src/main.ts` 4 处（叠层图元、对照面板、renderEra、事件监听）与 `global.css` 1 处（灯箱与真实图层样式并存）；保留设计版全部新元素，叠层一律采用真实古图 |
| 自动合并隐患处理 | 移除重复的 `eraOverlayFactor` 定义（保留真实古图参数 0/0.55/0.4）；对照面板文案更新为真实古图的诚实表述；版本号统一 0.2.1 |
| 验收 | `npm run check` 33 项全绿（含 4 项真实古图用例与设计版移动端新用例） |
| 发布 | `release/yuji-prototype-0.2.1-dist.zip`；推送后自动部署 |
