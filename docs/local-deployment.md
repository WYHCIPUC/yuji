# 本地部署说明

## 最简单的方式

1. 打开项目目录 `D:\禹迹`。
2. 在这个目录打开 PowerShell。
3. 执行：

```bash
npm install
npm run build
npm run verify
npm run serve:local
```

4. 浏览器打开：

```text
http://127.0.0.1:4173/
```

## 这些命令分别做什么

- `npm install`：安装项目需要的开发工具；
- `npm run build`：把源代码打包成可以发布的网页；
- `npm run verify`：检查网页入口、脚本、样式和内容数据是否齐全；
- `npm run serve:local`：在本机启动一个网页服务器，模拟正式发布后的访问方式。

## 直接打开核心交互

如果只想检查时间轴、古今对照和地名查询，可以打开：

```text
http://127.0.0.1:4173/?stage=experience
```

## 停止服务

回到运行服务的 PowerShell 窗口，按 `Ctrl + C`。这只会停止本地预览，不会删除项目文件。
