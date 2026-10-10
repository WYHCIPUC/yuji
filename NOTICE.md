# 禹迹内容与版权说明

## 项目代码

本仓库中的原型代码由《禹迹》项目维护者使用。代码仅用于当前项目的开发、测试和部署准备；如需对外开源或商业使用，请由项目负责人另行确定许可证。

## 历史资料和古地图

历史名词、古籍名称、人物信息和地图相关说明不等于本项目拥有对应资料的版权。正式发布前，必须按照 [docs/source-register.md](docs/source-register.md) 逐条确认：

- 收藏机构或原始提供方；
- 图像、文字、字体和音频的许可类型；
- 是否允许修改、配准和公开发布；
- 是否需要署名；
- 是否存在数据集或研究成果的使用限制。

当前原型中的古图层是示意绘制，不代表任何已授权的高清古地图扫描件。没有完成授权核验前，不应把外部图片替换进公开版本。

## 已采用的真实古地图素材（2026-10-06）

以下四幅图像已在维基共享资源逐幅核验许可标签为 **Public domain**（核验记录见 [docs/source-register.md](docs/source-register.md)），并经项目负责人确认采用。本地图层经等比缩放与轻微裁切，未改动原图内容：

| 素材文件 | 原始文件与来源 |
|---|---|
| `public/assets/maps/yujitu-1136-loc.jpg` | [File:Yuji_tu_-_enhanced_contrast.png](https://commons.wikimedia.org/wiki/File:Yuji_tu_-_enhanced_contrast.png)：《禹迹图》拓片（原石刻 1136 年，藏西安碑林），美国国会图书馆藏（g7821c.ct001493），高对比增强版，Public domain |
| `public/assets/maps/huayitu-loc-1903.jpg` | [File:Hua_yi_tu._LOC_2002626771.jpg](https://commons.wikimedia.org/wiki/File:Hua_yi_tu._LOC_2002626771.jpg)：约 1903 年《华夷图》拓片（原石刻 1136 年）；藏美国国会图书馆（2002626771） |
| `public/assets/maps/kunyu-wanguo-1602.jpg` | [File:Kunyu_Wanguo_Quantu_(坤輿萬國全圖).jpg](https://commons.wikimedia.org/wiki/File:Kunyu_Wanguo_Quantu_(%E5%9D%A4%E8%BC%BF%E8%90%AC%E5%9C%8B%E5%85%A8%E5%9C%96).jpg)：17 世纪刊本，日本东北大学附属图书馆狩野文库 |
| `public/assets/maps/maokun-malacca.jpg` | [File:Mao_Kun_map_-_Malacca.png](https://commons.wikimedia.org/wiki/File:Mao_Kun_map_-_Malacca.png)：《武备志》郑和航海图满剌加段，17 世纪 |

上述素材虽属公有领域、无强制署名义务，本项目仍在来源抽屉中如实标注出处与年代。若共享资源页面许可信息日后变更，以页面当前标注为准并重新核验。

## 现代底图数据（2026-10-07）

| 数据 | 来源 |
|---|---|
| `src/content/basemap.json`（海岸线 / 河流 / 湖泊几何，地名定位投影） | Natural Earth 50m 物理地理数据，naturalearthdata.com，**公有领域（无版权）**；经 jsdelivr 镜像获取，由 `scripts/build-basemap.mjs` 投影与抽稀生成 |

地名坐标为各城市公认经纬度（如北京 116.4°E/39.9°N），与底图使用同一投影参数定位，确保相对方位真实。

## 历代图卷素材（2026-10-07 建立，2026-10-08 两轮扩充）

`public/assets/maps/atlas/` 现收录历代图件 45 幅，连同主展示用的 4 幅高清存世图件合计 **49 幅**，逐幅登记于 `src/content/atlas.json`（作者、许可、图源链接）。存世图件 20 幅：错金银铜版兆域图（战国中山）、放马滩纸质地图残片、马王堆帛书地形图/驻军图、《禹迹图》《华夷图》、黄裳《地理图》碑、《静江府城池图》《平江图》碑、敦煌星图、《大明混一图》、《混一疆理历代国都之图》、郑和航海图三段、《广舆图》总图与福建页、《坤舆万国全图》、康熙《皇舆全览图》直隶与四川幅（1718 测绘，1941 福克斯影印）。许可构成：Public domain ×26、CC0 ×2、CC BY 3.0 ×9、CC BY-SA 3.0/4.0 ×12。依 CC 系列许可要求：产品在「历代图卷」界面逐幅展示作者与许可标识，并提供指向共享资源原始文件页的链接；本项目对图片仅作展示与等比缩放，未作内容修改。民国及以后时期之地图暂不收录（避免现当代边界表述），如需扩量由项目负责人另行决定。

## 历史地名数据层与府界示意层（2026-10-10，CHGIS V6 派生）

`public/data/places-dataset.json`（县级/府级治所数据层，9440 条）与 `public/geo/hist-pref/pref-polygons.json`（府级政区示意层）由 `scripts/expand-places.mjs` 从 CHGIS V6 时序数据派生生成，属转换使用而非再分发：仓库与站点均不提供 CHGIS 原始数据文件的下载。

> Citation: "CHGIS, Version 6." (c) Fairbank Center for Chinese Studies and the Institute for Chinese Historical Geography at Fudan University, Dec 2016.

修改说明：本站仅采用其时序县/府级治所点子集（筛选至公元 1602 年前）与府级多边形（Voronoi 邻近分配派生），按名称与位置去重、合并年份区间、简化坐标精度、以 Natural Earth 数据反查今地省级行政区。依据 CHGIS V6 EULA 之保守口径：本站为免费非商业教育用途；**未来任何商业化（广告、付费、赞助挂名）之前必须重新核验并可能取得商业许可**。府界示意层在页面上强制标注「示意重绘（邻近分配），非历史实边界，不代表任何现实主张」。许可确认函草稿见 docs/gate2-letter.md（Gate-2，待项目负责人发送）。

**规定引用格式（EULA 要求）：**

> CHGIS, Version 6. (c) Fairbank Center for Chinese Studies and the Institute for Chinese Historical Geography at Fudan University, Dec 2016.

数据集：时序县级治所点 doi:10.7910/DVN/Q9VOF5；时序府级治所点 doi:10.7910/DVN/WW1PD6；府级政区多边形 doi:10.7910/DVN/I0Q7SM。许可条款以 CHGIS V6 最终用户许可（doi:10.7910/DVN/FDLFJ3）为准（核验记录见 [docs/source-register.md](docs/source-register.md)）：**仅限学术研究与教育目的的非商业使用；商业化（广告、付费、赞助挂名等）之前必须重新核验并可能取得商业许可。**

**修改说明（EULA 要求「清楚说明对原始数据的任何改动」）：** 本项目仅取其中公元前 221 年至公元 1602 年的子集；按名称与治所坐标（0.5° 邻近）合并同一治所的分期存在记录、相接的年份区间并段；坐标取自 shapefile 原值保留四位小数（点位为 CHGIS 概化位置，展示注明「示意精度」）；「今地」一栏以 Natural Earth（公有领域）行政区点包含判定反查，未命中时采用 CHGIS 官方今地注记；府界多边形经 0.03° 抽稀与两位小数圆整，为治所点 Voronoi 邻近分配的**示意重绘，非历史政区实边界，不代表任何现实主张**。生成口径与统计详见 [docs/expand-report.md](docs/expand-report.md)。

## 历史表达

- 示意区域和边界不代表现实边界主张；
- 人物独白是基于史料的产品化整理，不是历史原文；
- 有争议的地名和年代需要保留来源与不确定性；
- 产品内容用于历史地理学习和交互叙事，不替代现代地图、测绘或学术结论。
