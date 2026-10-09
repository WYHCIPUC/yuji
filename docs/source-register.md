# 来源登记表

正式发布前，每条图片、文字、字体和音频都要补齐以下字段：

| 字段 | 说明 |
|---|---|
| 内容名称 | 文件或内容的明确名称 |
| 内容类型 | 图片、文字、字体、音频、数据 |
| 原始链接 | 内容所在的机构或作者页面 |
| 收藏机构/作者 | 资料的实际提供方 |
| 访问日期 | 最近一次查看日期 |
| 许可类型 | 公版、CC许可、机构授权或待核验 |
| 是否可修改 | 是否允许裁切、配准和颜色处理 |
| 是否可公开发布 | 是否可以放到公开网站 |
| 是否需要署名 | 页面需要如何署名 |
| 使用位置 | 具体页面或文件 |
| 核验人 | 谁做了人工确认 |
| 备注 | 争议、限制和后续动作 |

当前原型中的古图和部分文字仍是演示数据，状态为“待核验”或“需人工复核”。

## 古地图候选来源核验清单（机器核验已完成，2026-10-06）

**通用结论：**

1. 四幅原图本体均完成于 17 世纪或以前，著作权已消灭，属公有领域。风险只在现代扫描件的权属与各数据库条款。
2. 维基共享资源上的文件页均带明确许可标签，本次已逐幅打开读取标签原文；四幅全部标注 **Public domain**。
3. 按项目红线，机器核验不等于终审：正式采用前仍需核验人点开确认一次并截图存档（防止文件页日后被改）。

### 机器核验通过（许可标签已读，2026-10-06）

| 内容名称 | 共享资源文件 | 许可 | 来源链与馆藏 | 备注 |
|---|---|---|---|---|
| 《禹迹图》1136（主图源，高对比版） | [File:Yuji_tu_-_enhanced_contrast.png](https://commons.wikimedia.org/wiki/File:Yuji_tu_-_enhanced_contrast.png)（LOC g7821c.ct001493；备用：BEFEO 1903 摹绘本 ct000285） | Public domain | 沙畹（Édouard Chavannes）1903 年摹绘本，载 BEFEO 第 3 卷 214–247 页；扫描出自美国国会图书馆地理与地图部，数字 ID [g7821c.ct000285](https://hdl.loc.gov/loc.gmd/g7821c.ct000285) | 摹绘本非拓片，线条更清晰，适合原型叠层；拓片候选另见 Commons「China1136.png」等 |
| 《华夷图》1136 | [File:Hua_yi_tu._LOC_2002626771.jpg](https://commons.wikimedia.org/wiki/File:Hua_yi_tu._LOC_2002626771.jpg)（另有 .tif 高清版） | Public domain | 1903 年前后拓片，载 BEFEO 1903 第 214 页对面；藏美国国会图书馆，数字 ID **2002626771** | 与禹迹图同石正反两面；拓片照片候选另见「Rubbing_of_Huayi_tu_map.jpg」 |
| 《坤舆万国全图》1602 | [File:Kunyu_Wanguo_Quantu_(坤輿萬國全圖).jpg](https://commons.wikimedia.org/wiki/File:Kunyu_Wanguo_Quantu_(%E5%9D%A4%E8%BC%BF%E8%90%AC%E5%9C%8B%E5%85%A8%E5%9C%96).jpg) | Public domain | 日本东北大学附属图书馆狩野文库图像数据库（17 世纪刊本） | 分面板版本另见「Kunyu_Wanguo_Quantu_by_Matteo_Ricci_*」系列 |
| 《郑和航海图》（《武备志》卷 240） | [File:Mao_Kun_map_-_Singapore.png](https://commons.wikimedia.org/wiki/File:Mao_Kun_map_-_Singapore.png) 等分段系列 | Public domain | 茅元仪《武备志》（17 世纪）；分段扫描经 Wheatley (1961)《金洲研究》转载 | Commons 收录多段（满剌加、苏门答腊、锡兰与非洲等），采用时需逐段核对 |

### 已排除与受阻记录（2026-10-06）

| 目标 | 结果 |
|---|---|
| 剑桥数字图书馆（CUDL）藏《武备志》 | **已排除**：站内检索 "Wubei Zhi" 与 "Mao Kun" 均为 0 结果，CUDL 并未数字化该文献（此前判断有误，特此更正） |
| 美国国会图书馆官网 loc.gov | 受 Cloudflare 拦截无法自动访问；但两件藏品的精确数字 ID 已经由共享资源页取得（见上表），人工或日后可直接点开 |
| 维基共享资源 API / 普通命令行通道 | 超时；改用浏览器通道后成功（本页结果即由此取得） |

**剩余人工动作：** 核验人点开上表四个文件页 → 确认许可标签仍为 Public domain → 截图存档 → 按「来源登记字段」补访问日期与核验人 → 方可进入 `public/assets/` 正式素材。凡未走完此流程的图像一律继续用示意 SVG 替代（当前原型的做法）。

**采用决定（2026-10-06）：** 项目负责人在获知上述机器核验结果后，指示将真实古地图用于产品。四幅素材已下载至 `public/assets/maps/`（详见 [NOTICE.md](../NOTICE.md)），核验流程的许可核验一步由助手读取页面标签原文完成，采用决定由项目负责人作出；建议负责人另行对四个文件页截图存档，完成登记表最后一栏。

## V2 历史地名 / GIS 数据源候选（2026-10-09，项目负责人提供，许可全部待核验）

以下四个数据源服务于创意文档 V2 里程碑「地名库扩至 2000+」与历史地理数据接入评估。**均未做许可核验与联网确认，未补齐原始链接；正式采用任何一项前，必须走完与古地图相同的登记-核验流程。**

| 数据源 | 提供方 | 内容与适用场景 | 许可状态 | 采用前必须确认 |
|---|---|---|---|---|
| CHGIS 时序数据下载 | 复旦大学 | 历代行政区划、治所等时序数据；另有 1820 年、1911 年图层及地形数据，适合 GIS 分析。注意：时序数据与年层数据格式不同，使用前需查看数据说明 | **已核验（机器，2026-10-09）**：CHGIS 为哈佛+复旦联合项目，V6 最终用户许可（EULA）由哈佛 Dataverse 发布，条款见下方核验记录。专站 chgis.fudan.edu.cn 当日维护中，禹贡站旧 CHGIS 页面改版后 404，复旦侧页面待其恢复后复核 | 人工终审签署；建议就「公开教育网站展示经筛选转换之子集」向 CHGIS 管理委员会（chgis@fas.harvard.edu）取得书面确认 |
| China Historical GIS | 哈佛大学 | 历史地名与行政地理数据，覆盖公元前 221 年至 1911 年，适合历史地理研究和时空分析；V2 地名库 2000+ 的主要候选。已定位 V6 时序县级治所点数据集（doi:10.7910/DVN/Q9VOF5，县点 UTF-8 WGS84，公元前 221–1911） | **已核验（机器，2026-10-09）**：数据集元数据标注 CC0 1.0，但随包 README 与独立 EULA 数据集均声明学术非商业条款——存在冲突，本项目按更严格的 EULA 口径执行，详见下方核验记录 | 同上（书面确认 + 人工终审）；另注意本项目叙事止于 1602 年，1911 年全覆盖数据只取 1602 年前子集 |
| 《中国历史地图集》在线浏览 | 出版信息待补 | 按历史时期浏览朝代与重要时期地图，适合快速查阅定位；**与可下载的 GIS 矢量数据不是一回事** | **高风险，待核验** | 图集本体（谭其骧主编）成书于著作权保护期内，在线浏览站点自身授权情况不明。在获得明确授权前，只可作为内部研究参考，**不得截图、描图或以任何形式进入产品素材** |
| 民国地图数字化项目介绍 | 上海交通大学 | 民国时期地图数字化：首期约 4088 幅，部分带地理空间信息 | 待核验 | 民国时段超出本项目叙事红线（止于 1602 年），仅可作为研究参考与未来扩展调研，不进入当前产品内容 |

**登记缺口（待人工补齐）：** 四条均缺原始链接、访问日期截图与核验人签署。CHGIS 两源是 V2 地名扩容的优先核验对象；《中国历史地图集》在线版本建议默认搁置。

### CHGIS 许可核验记录（机器核验，2026-10-09）

核验通道说明：哈佛 Dataverse 网页对爬虫屏蔽（robots.txt 禁抓 dataset.xhtml），本次经由其 robots 明确放行的官方 REST API（`/api/datasets/:persistentId`）读取元数据与许可字段，属合规通道。所有引文为接口返回原文（英文），中文摘要为助手归纳。

#### 1. CHGIS V6 最终用户许可（EULA，权威文本）

- 数据集：**CHGIS V6 EULA**，doi:10.7910/DVN/FDLFJ3，哈佛 Dataverse，2016-12-21 发布
- 读取接口：`https://dataverse.harvard.edu/api/datasets/:persistentId?persistentId=doi:10.7910/DVN/FDLFJ3`（访问日期 2026-10-09）
- Dataverse 元数据许可字段：`"termsOfUse"`（文本见下）；文件为 `CHGIS_Version_6_EULA.pdf`
- 条款要点（原文摘引）：

> "The Official Version of CHGIS is to be obtained by direct download from the authorized distributors: Center for Historical Geographical Studies at Fudan University (CHGSC) for those residing in the People's Republic of China, or Harvard University for all others."
> （官方版本须从授权分发方直接下载取得：中国大陆居民经复旦中国历史地理研究中心，其他地区经哈佛大学。）

> "The terms of use for CHGIS Data are restricted to NON-COMMERCIAL use for academic research and educational purposes."
> （CHGIS 数据仅限学术研究与教育目的之非商业使用；商业使用须另获 CHGIS 商业数据许可。）

> 引用条款要求标注 "CHGIS, Version 6." (c) Fairbank Center for Chinese Studies and the Institute for Chinese Historical Geography at Fudan University, Dec 2016，并清楚说明对原始数据层所做的任何改动。

> "Users may not incorporate the entirety of CHGIS Data Layers in a work intended for public dissemination without express permission."
> （未经明确许可，不得将 CHGIS 数据层之**整体**并入拟公开传播的作品。）"Redistribution of CHGIS Datasets themselves, in electronic or downloadable form, requires express written agreement with CHGIS management."（以电子/可下载形式再分发 CHGIS 数据集本身，须与 CHGIS 管理方签订书面协议。）

> 免责声明：数据按"现状"提供，不担保准确性与适销性；下载数据即视为接受本许可各条款。

#### 2. V6 时序县级治所点数据集（V2 主候选）

- 数据集：**CHGIS V6 Time Series County Points**，doi:10.7910/DVN/Q9VOF5，哈佛 Dataverse，2017-08-21 发布，作者 Lex Berman（哈佛 CGA）
- 读取接口：`https://dataverse.harvard.edu/api/datasets/:persistentId?persistentId=doi:10.7910/DVN/Q9VOF5`（访问日期 2026-10-09）
- 时间/空间覆盖：公元前 221 年 – 1911 年；官方描述原文 "Updated County Points now have mostly complete spatial coverage for the administrative units from 1350 - 1911 CE. Earlier periods, 221 BCE to 1350 CE, still have gaps in spatial coverage."（1350 年后空间覆盖较全，更早时段仍有缺口）
- 主文件：`v6_time_cnty_pts_utf_wgs84.zip`（shapefile，UTF-8 / WGS84，约 545 KB），API 显示 `restricted: false`（无访问限制，无需注册）
- **许可冲突（须人工裁决）**：Dataverse 数据集级许可字段标注 **CC0 1.0**（`"name": "CC0 1.0", "uri": "http://creativecommons.org/publicdomain/zero/1.0"`），但随包 README（`https://dataverse.harvard.edu/api/access/datafile/3048161`，访问日期 2026-10-09）原文为：

> "License: free for academic research, no commercial use, resale, or redistribution permitted."
> "CONSTRAINTS: Agreement to terms of End User License"

> README 引用条款："CHGIS data users should cite as follows: CHGIS, Version 6. Fairbank Center for Chinese Studies, Harvard University and Fudan University's Center for Historical Geographical Studies. (2016). China Historical Geographic Information System. Harvard Dataverse."

  同一数据在数据集级 CC0 标注与内容级学术条款并存，法务口径不明。**本项目按红线取保守读法：以 EULA（学术、非商业、禁再分发原始数据）为准**；若日后取得权利方书面确认 CC0 有效，可放宽。

#### 3. 复旦侧核验状态（2026-10-09）

- 专站 `https://chgis.fudan.edu.cn/`：页面仅显示"网站维护中......"，许可文本当日不可核验
- 禹贡站 `http://yugong.fudan.edu.cn/`（复旦中国历史地理研究所官网）：站点在线，但旧 CHGIS 栏目页（含版权声明页 bqsm.asp）改版后全部 404
- EULA 第 1 条已指明复旦 CHGSC 为中国大陆授权分发方，许可文本以哈佛 Dataverse 发布的联合版权 EULA 为准（© 2016 哈佛费正清中心 + 复旦史地所）；复旦侧页面待其维护结束后补一次复核

#### 4. 对本项目的影响判定（助手归纳，待人工终审）

- 禹迹为免费公开的教育叙事网站，无广告无收费 → 符合 EULA「学术与教育目的、非商业」
- 采用方式为**取子集（≤1602 年）、离线转换成自有 JSON、页面署名引用**，不将 CHGIS 原始 shapefile 放入仓库或提供下载 → 避开「整体并入公开作品」与「电子形式再分发数据集本身」两条禁令
- 遗留不确定点：① CC0/EULA 冲突；② 「子集+转换」是否被视作衍生作品传播仍需权利方表态。**建议正式接入前向 chgis@fas.harvard.edu 发函取得书面确认**；30 天无回复则维持保守合规路径或转向公版正史地理志自建（见 [v2-place-expansion.md](v2-place-expansion.md)）
- 回退方案（许可终审不通过时）：自公版正史地理志（汉书地理志 → 明史地理志，古籍原文已入公有领域）人工/半自动整理，劳动量大但零许可风险

