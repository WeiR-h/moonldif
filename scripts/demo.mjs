import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { root } from './moon.mjs';

const cases = [
  ['1. 目录导出检查：中文、折行和二进制属性', ['check', 'examples/01-directory-export.ldif'], 0],
  ['2. 账号变更预检：发现整条记录删除并拦截', ['check', 'examples/02-account-changes.ldif', '--deny-delete'], 1],
  ['3. 迁移计划检查：创建记录与重命名', ['check', 'examples/03-migration-plan.ldif'], 0],
];
for (const [title, args, expected] of cases) {
  console.log(`\n${title}`);
  const result = spawnSync(process.execPath, [resolve(root, 'dist/moonldif.js'), ...args], { cwd: root, encoding: 'utf8' });
  process.stdout.write(result.stdout || '');
  if (result.error || result.status !== expected) throw new Error(`场景未达到预期退出码 ${expected}: ${result.error || result.stderr}`);
  console.log(`符合预期（退出码 ${expected}）`);
}
console.log('\n三个演示全部符合预期。数据为人工构造，不代表真实服务器导入结果。');
