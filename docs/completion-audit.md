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
