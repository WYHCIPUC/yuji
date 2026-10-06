import { spawn, spawnSync } from 'node:child_process';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const port = 4176;
const previewUrl = `http://127.0.0.1:${port}/`;

function run(command, args, env = process.env) {
  return new Promise((resolve, reject) => {
    const child = process.platform === 'win32'
      ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', [command, ...args].join(' ')], { cwd: process.cwd(), env, stdio: 'inherit' })
      : spawn(command, args, { cwd: process.cwd(), env, stdio: 'inherit' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${command} ${args.join(' ')} 退出码：${code}`)));
  });
}

async function waitForServer(url, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // 服务器还没启动，继续等待。
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`预览服务器在 ${timeout}ms 内没有启动：${url}`);
}

let preview;
try {
  await run(npmCommand, ['run', 'build']);
  await run(npmCommand, ['run', 'verify']);
  preview = process.platform === 'win32'
    ? spawn(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', [npmCommand, 'run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)].join(' ')], { cwd: process.cwd(), env: process.env, stdio: 'inherit' })
    : spawn(npmCommand, ['run', 'preview', '--', '--host', '127.0.0.1', '--port', String(port)], { cwd: process.cwd(), env: process.env, stdio: 'inherit' });
  await waitForServer(previewUrl);
  await run(npmCommand, ['run', 'smoke'], { ...process.env, YUJI_PREVIEW_URL: previewUrl });
  console.log('\n一键验收通过。');
} finally {
  if (preview?.pid) {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(preview.pid), '/T', '/F'], { stdio: 'ignore' });
    } else {
      preview.kill('SIGTERM');
    }
  }
}
