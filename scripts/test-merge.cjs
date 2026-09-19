// mergeBackup 规则验证：编译 src/lib/pairStore.ts 后运行
const assert = require('node:assert');
const {mergeBackup, seed} = require('../.tmp-pairstore/pairStore.cjs');

let pass = 0;
const ok = (name, fn) => {
  fn();
  pass++;
  console.log(`  ✓ ${name}`);
};

// 备份：1 更新覆盖、2 时间较旧、3 时间相同、10/11/12 新增且含同名冲突
const backup = [
  {id: 1, title: 'Editorial calm', heading: 'H-NEW', body: 'B-NEW', category: 'Editorial', favorite: false, updatedAt: '2026-09-15T10:00:00.000Z'},
  {id: 2, title: 'Studio notes', heading: 'H-OLDER', body: 'B-OLDER', category: 'X', favorite: true, updatedAt: '2026-08-01T00:00:00.000Z'},
  {id: 3, title: 'Field guide', heading: 'H-EQUAL', body: 'B-EQUAL', category: 'Y', favorite: true, updatedAt: '2026-09-03T09:00:00.000Z'},
  {id: 10, title: 'Field guide', heading: 'H10', body: 'B10', category: 'Brand', favorite: false, updatedAt: '2026-09-16T08:30:00.000Z'},
  {id: 11, title: 'Night shift', heading: 'H11', body: 'B11', category: 'Editorial', favorite: false, updatedAt: '2026-09-17T09:00:00.000Z'},
  {id: 12, title: 'Night shift', heading: 'H12', body: 'B12', category: 'Editorial', favorite: false, updatedAt: '2026-09-17T10:00:00.000Z'},
];

const result = mergeBackup(seed, JSON.stringify(backup));
assert.strictEqual(result.ok, true);
ok('有效备份合并成功', () => assert.strictEqual(result.ok, true));
ok('统计：新增 3 / 覆盖 1 / 保留 2', () => {
  assert.strictEqual(result.added, 3);
  assert.strictEqual(result.updated, 1);
  assert.strictEqual(result.unchanged, 2);
  assert.strictEqual(result.merged.length, 6);
});
ok('同编号且较新：整记录覆盖（heading/body/category/favorite 全部更新）', () => {
  const p1 = result.merged.find((p) => p.id === 1);
  assert.strictEqual(p1.heading, 'H-NEW');
  assert.strictEqual(p1.body, 'B-NEW');
  assert.strictEqual(p1.favorite, false);
});
ok('同编号但较旧：保留现有值', () => {
  const p2 = result.merged.find((p) => p.id === 2);
  assert.strictEqual(p2.heading, seed.find((p) => p.id === 2).heading);
  assert.strictEqual(p2.favorite, false);
});
ok('同编号且时间相同：保留现有值', () => {
  const p3 = result.merged.find((p) => p.id === 3);
  assert.strictEqual(p3.heading, seed.find((p) => p.id === 3).heading);
  assert.strictEqual(p3.favorite, false);
});
ok('已有标题保持不变，首个同名新编号追加“副本”', () => {
  const old3 = result.merged.find((p) => p.id === 3);
  assert.strictEqual(old3.title, 'Field guide');
  const p10 = result.merged.find((p) => p.id === 10);
  assert.strictEqual(p10.title, 'Field guide 副本');
});
ok('同批内重复标题：先占原名，后续依次“副本”“副本 2”', () => {
  assert.strictEqual(result.merged.find((p) => p.id === 11).title, 'Night shift');
  assert.strictEqual(result.merged.find((p) => p.id === 12).title, 'Night shift 副本');
});
ok('冲突命名记录在 renamed 中', () => {
  assert.deepStrictEqual(result.renamed, [
    {from: 'Field guide', to: 'Field guide 副本'},
    {from: 'Night shift', to: 'Night shift 副本'},
  ]);
});

// “副本 N”继续避让
const withDup = mergeBackup(
  result.merged,
  JSON.stringify([{id: 99, title: 'Field guide', heading: 'h', body: 'b', category: 'c', favorite: false, updatedAt: '2026-09-18T00:00:00.000Z'}]),
);
ok('再次导入同名：自动避开已存在的“副本”得到“副本 2”', () => {
  assert.strictEqual(withDup.merged.find((p) => p.id === 99).title, 'Field guide 副本 2');
});

// 整批拒绝的各种情形
const base = {title: 'T', heading: 'h', body: 'b', category: 'c', favorite: false, updatedAt: '2026-09-18T00:00:00.000Z'};
const reject = (name, records) =>
  ok(name, () => {
    const r = mergeBackup(seed, JSON.stringify(records));
    assert.strictEqual(r.ok, false);
  });
reject('缺少 id：整批不导入', [{...base}, {...base, id: 5}]);
reject('空标题：整批不导入', [{...base, id: 5, title: '   '}]);
reject('缺少 updatedAt：整批不导入', [{...base, id: 5, updatedAt: undefined}]);
reject('时间字符串无法解析：整批不导入', [{...base, id: 5, updatedAt: 'not-a-date'}]);
reject('非法 JSON：整批不导入（字符串本身）', '[{');
reject('最外层不是数组：整批不导入', JSON.stringify({...base, id: 5}));
reject('空数组：拒绝', '[]');
reject('空白内容：拒绝', '   ');

ok('拒绝时原数组引用内容不变（仅校验未修改传入数据）', () => {
  const snapshot = JSON.stringify(seed);
  mergeBackup(seed, JSON.stringify([{id: 1, title: 'x'}]));
  assert.strictEqual(JSON.stringify(seed), snapshot);
});

// 备份内同编号去重：较新者胜
const dupId = mergeBackup(seed, JSON.stringify([
  {id: 40, title: 'Dup', heading: 'older', body: '', category: 'c', favorite: false, updatedAt: '2026-09-01T00:00:00.000Z'},
  {id: 40, title: 'Dup', heading: 'newer', body: '', category: 'c', favorite: false, updatedAt: '2026-09-02T00:00:00.000Z'},
]));
ok('备份内同编号：只导入一条且取较新者', () => {
  assert.strictEqual(dupId.added, 1);
  assert.strictEqual(dupId.merged.filter((p) => p.id === 40).length, 1);
  assert.strictEqual(dupId.merged.find((p) => p.id === 40).heading, 'newer');
});
const dupIdEqual = mergeBackup(seed, JSON.stringify([
  {id: 41, title: 'Dup2', heading: 'first', body: '', category: 'c', favorite: false, updatedAt: '2026-09-01T00:00:00.000Z'},
  {id: 41, title: 'Dup2', heading: 'second', body: '', category: 'c', favorite: false, updatedAt: '2026-09-01T00:00:00.000Z'},
]));
ok('备份内同编号且时间相同：保留先出现的一条', () => {
  assert.strictEqual(dupIdEqual.merged.find((p) => p.id === 41).heading, 'first');
});

// 更新覆盖时，新标题与他人同名 → 已有标题不动，覆盖项改名副本
const existing = [
  {id: 1, title: 'Alpha', heading: 'a1', body: '', category: 'c', favorite: false, updatedAt: 1000},
  {id: 2, title: 'Beta', heading: 'a2', body: '', category: 'c', favorite: false, updatedAt: 1000},
];
const upd = mergeBackup(existing, JSON.stringify([
  {id: 1, title: 'Beta', heading: 'a1-new', body: '', category: 'c', favorite: false, updatedAt: 2000},
]));
ok('覆盖项的新标题与已有标题冲突：已有项不变，覆盖项改名为“Beta 副本”', () => {
  assert.strictEqual(upd.updated, 1);
  assert.strictEqual(upd.merged.find((p) => p.id === 2).title, 'Beta');
  const p1 = upd.merged.find((p) => p.id === 1);
  assert.strictEqual(p1.title, 'Beta 副本');
  assert.strictEqual(p1.heading, 'a1-new');
});

console.log(`\n${pass} 项检查全部通过`);
