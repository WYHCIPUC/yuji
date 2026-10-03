import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const dist = join(root, 'dist');
const indexPath = join(dist, 'index.html');
const failures = [];

function check(condition, message) {
  if (condition) {
    console.log(`✓ ${message}`);
  } else {
    failures.push(message);
    console.error(`✗ ${message}`);
  }
}

check(existsSync(indexPath), 'dist/index.html 存在');

if (existsSync(indexPath)) {
  const html = readFileSync(indexPath, 'utf8');
  check(html.includes('<div id="app"></div>'), '入口页面保留应用挂载点');

  const resources = [...html.matchAll(/(?:src|href)="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((resource) => resource.startsWith('./') || resource.startsWith('assets/'));

  resources.forEach((resource) => {
    const relativePath = resource.replace(/^\.\//, '');
    check(existsSync(join(dist, relativePath)), `构建资源存在：${relativePath}`);
  });
}

check(existsSync(join(root, 'src/content/eras.json')), '时代数据存在');
check(existsSync(join(root, 'src/content/places.json')), '地名数据存在');
check(existsSync(join(root, 'src/content/sources.json')), '来源数据存在');

if (failures.length) {
  console.error(`\n验证失败：${failures.length} 项`);
  process.exit(1);
}

console.log('\n原型发布前检查通过。');
