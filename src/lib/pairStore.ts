// 字体配对的导入 / 合并核心逻辑（纯函数，便于测试与持久化）

export type Pair = {
  id: number;
  title: string;
  heading: string;
  body: string;
  category: string;
  favorite: boolean;
  /** 更新时间，epoch 毫秒 */
  updatedAt: number;
};

export type Rename = { from: string; to: string };

export type ImportReport = {
  at: number;
  total: number;
  added: number;
  updated: number;
  unchanged: number;
  renamed: Rename[];
};

export type MergeResult =
  | {
      ok: true;
      merged: Pair[];
      total: number;
      added: number;
      updated: number;
      unchanged: number;
      renamed: Rename[];
    }
  | { ok: false; error: string };

export const STORAGE_KEY = 'type-pairs';
export const SELECTED_KEY = 'type-pairs-selected';
export const REPORT_KEY = 'type-pairs-last-import';
export const REPORT_DISMISS_KEY = 'type-pairs-report-dismissed';

export const seed: Pair[] = [
  {
    id: 1,
    title: 'Editorial calm',
    heading: 'A slower way to see',
    body: 'Good typography creates space for ideas to breathe. Pair a confident display face with a quiet, generous text face.',
    category: 'Editorial',
    favorite: true,
    updatedAt: Date.parse('2026-09-01T09:00:00.000Z'),
  },
  {
    id: 2,
    title: 'Studio notes',
    heading: 'Make room for the unexpected',
    body: 'A thoughtful pairing can add rhythm to even the simplest interface. Try contrast in shape, not just size.',
    category: 'Portfolio',
    favorite: false,
    updatedAt: Date.parse('2026-08-20T09:00:00.000Z'),
  },
  {
    id: 3,
    title: 'Field guide',
    heading: 'Small details, lasting impressions',
    body: 'Typography is the voice of a page. Find a combination that feels clear, warm and distinctly yours.',
    category: 'Brand',
    favorite: false,
    updatedAt: Date.parse('2026-09-03T09:00:00.000Z'),
  },
];

/** 示例备份：覆盖 1 条、时间较旧/相同保留 2 条、新增 3 条，其中 2 条触发“副本”命名 */
export const SAMPLE_BACKUP = JSON.stringify(
  [
    {
      id: 1,
      title: 'Editorial calm',
      heading: 'A slower way to see (revised)',
      body: 'Freshly edited copy for the editorial pairing, arriving with a newer timestamp.',
      category: 'Editorial',
      favorite: false,
      updatedAt: '2026-09-15T10:00:00.000Z',
    },
    {
      id: 2,
      title: 'Studio notes',
      heading: 'Make room for the unexpected',
      body: 'This copy is older than what is already saved, so it must be ignored.',
      category: 'Portfolio',
      favorite: true,
      updatedAt: '2026-08-01T00:00:00.000Z',
    },
    {
      id: 3,
      title: 'Field guide',
      heading: 'Small details, lasting impressions',
      body: 'Identical timestamp: the existing record wins and nothing changes.',
      category: 'Brand',
      favorite: true,
      updatedAt: '2026-09-03T09:00:00.000Z',
    },
    {
      id: 10,
      title: 'Field guide',
      heading: 'Same title, different number',
      body: 'A new pairing that borrows an existing title — it lands as a 副本.',
      category: 'Brand',
      favorite: false,
      updatedAt: '2026-09-16T08:30:00.000Z',
    },
    {
      id: 11,
      title: 'Night shift',
      heading: 'Type after dark',
      body: 'A brand new pairing with a fresh title.',
      category: 'Editorial',
      favorite: false,
      updatedAt: '2026-09-17T09:00:00.000Z',
    },
    {
      id: 12,
      title: 'Night shift',
      heading: 'Type after dark, too',
      body: 'Same title again inside the same batch — also renamed to coexist.',
      category: 'Editorial',
      favorite: false,
      updatedAt: '2026-09-17T10:00:00.000Z',
    },
  ],
  null,
  2,
);

/** 反例：最后一条缺少 updatedAt，整批都会被拒绝 */
export const SAMPLE_INVALID_BACKUP = JSON.stringify(
  [
    {
      id: 20,
      title: 'Quiet confidence',
      heading: 'Looks fine',
      body: 'But the batch is rejected because another record is incomplete.',
      category: 'Brand',
      favorite: false,
      updatedAt: '2026-09-18T09:00:00.000Z',
    },
    { id: 21, title: 'Missing timestamp', heading: 'No updatedAt here' },
  ],
  null,
  2,
);

const DEFAULT_HEADING = 'Your new headline';
const DEFAULT_BODY = 'Start with a sentence that lets your type pairing show its character.';

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function parseId(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (s !== '' && Number.isFinite(Number(s))) return Number(s);
  }
  return undefined;
}

function parseTime(v: unknown): number | undefined {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string' && v.trim() !== '' && !Number.isNaN(Date.parse(v))) {
    return Date.parse(v);
  }
  return undefined;
}

function validateRecord(raw: unknown, index: number): { pair?: Pair; error?: string } {
  const where = `第 ${index + 1} 条`;
  if (!isRecord(raw)) return { error: `${where}：不是有效的记录对象` };

  const id = parseId(raw.id);
  if (id === undefined) return { error: `${where}：缺少编号 id` };
  if (!Number.isInteger(id)) return { error: `${where}：编号 id 必须是整数` };

  if (typeof raw.title !== 'string' || raw.title.trim() === '') {
    return { error: `${where}：缺少标题 title` };
  }

  const updatedAt = parseTime(raw.updatedAt);
  if (updatedAt === undefined) return { error: `${where}：缺少更新时间 updatedAt` };

  const asString = (v: unknown, fallback: string) => (typeof v === 'string' ? v : fallback);

  return {
    pair: {
      id,
      title: raw.title.trim(),
      heading: asString(raw.heading, DEFAULT_HEADING),
      body: asString(raw.body, DEFAULT_BODY),
      category: asString(raw.category, 'Untitled'),
      favorite: typeof raw.favorite === 'boolean' ? raw.favorite : false,
      updatedAt,
    },
  };
}

/**
 * 合并规则：
 * 1. 任一条缺少编号 / 标题 / 更新时间，整批拒绝，原有数据不变；
 * 2. 编号相同：更新时间较新的整记录覆盖，时间相同或更旧则保留现有值；
 * 3. 标题相同但编号不同：已有标题保持不变，导入项追加“副本”（再次冲突继续编号）并存；
 * 4. 同一备份内编号重复时，同样按更新时间取较新者，时间相同保留先出现的一条。
 */
export function mergeBackup(existing: Pair[], text: string): MergeResult {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: '请先粘贴备份内容。' };

  let data: unknown;
  try {
    data = JSON.parse(trimmed);
  } catch (e) {
    return { ok: false, error: `JSON 解析失败：${(e as Error).message}` };
  }
  if (!Array.isArray(data)) {
    return { ok: false, error: '备份格式无效：最外层必须是记录数组（[…]）。' };
  }
  if (data.length === 0) return { ok: false, error: '备份为空，没有可导入的记录。' };

  // —— 第一阶段：逐条校验，任何一条失败，整批不导入 ——
  const incoming: Pair[] = [];
  const errors: string[] = [];
  data.forEach((raw, i) => {
    const { pair, error } = validateRecord(raw, i);
    if (error) errors.push(error);
    else if (pair) incoming.push(pair);
  });
  if (errors.length > 0) {
    const shown = errors.slice(0, 3).join('；');
    return {
      ok: false,
      error: errors.length > 3 ? `${shown}；等共 ${errors.length} 处问题，整批未导入。` : `${shown}；整批未导入。`,
    };
  }

  // —— 第二阶段：备份内同编号去重，较新者胜，时间相同保留先出现的 ——
  const winner = new Map<number, Pair>();
  for (const rec of incoming) {
    const prev = winner.get(rec.id);
    if (!prev) winner.set(rec.id, rec);
    else if (rec.updatedAt > prev.updatedAt) winner.set(rec.id, rec);
  }
  const batch: Pair[] = [];
  const handled = new Set<number>();
  for (const rec of incoming) {
    if (handled.has(rec.id)) continue;
    handled.add(rec.id);
    batch.push(winner.get(rec.id)!);
  }

  // —— 第三阶段：与现有配对合并 ——
  const existingById = new Map(existing.map((p) => [p.id, p]));
  // 标题计数：允许历史数据里存在同名标题，引用计数避免误释放
  const titleCount = new Map<string, number>();
  for (const p of existing) titleCount.set(p.title, (titleCount.get(p.title) ?? 0) + 1);

  const takeTitle = (base: string): string => {
    if (!titleCount.has(base)) {
      titleCount.set(base, 1);
      return base;
    }
    let candidate = `${base} 副本`;
    let n = 1;
    while (titleCount.has(candidate)) {
      n += 1;
      candidate = `${base} 副本 ${n}`;
    }
    titleCount.set(candidate, 1);
    return candidate;
  };
  const releaseTitle = (title: string) => {
    const n = (titleCount.get(title) ?? 0) - 1;
    if (n <= 0) titleCount.delete(title);
    else titleCount.set(title, n);
  };

  let added = 0;
  let updated = 0;
  let unchanged = 0;
  const renamed: Rename[] = [];
  const replacements = new Map<number, Pair>();
  const adds: Pair[] = [];

  for (const rec of batch) {
    const old = existingById.get(rec.id);
    if (!old) {
      const title = takeTitle(rec.title);
      if (title !== rec.title) renamed.push({ from: rec.title, to: title });
      adds.push({ ...rec, title });
      added += 1;
    } else if (rec.updatedAt > old.updatedAt) {
      // 整记录覆盖；先释放旧标题占用，再按新标题判重
      releaseTitle(old.title);
      const title = takeTitle(rec.title);
      if (title !== rec.title) renamed.push({ from: rec.title, to: title });
      replacements.set(rec.id, { ...rec, title });
      updated += 1;
    } else {
      // 时间相同或更旧：保留现有值
      unchanged += 1;
    }
  }

  const merged: Pair[] = existing.map((p) => replacements.get(p.id) ?? p);
  merged.push(...adds);

  return { ok: true, merged, total: batch.length, added, updated, unchanged, renamed };
}

/** 兼容旧版本数据（没有 updatedAt 的记录补 0） */
export function migratePair(raw: unknown): Pair | null {
  if (!isRecord(raw)) return null;
  const id = parseId(raw.id);
  if (id === undefined || !Number.isInteger(id)) return null;
  if (typeof raw.title !== 'string' || raw.title.trim() === '') return null;
  const updatedAt = parseTime(raw.updatedAt) ?? 0;
  return {
    id,
    title: raw.title.trim(),
    heading: typeof raw.heading === 'string' ? raw.heading : DEFAULT_HEADING,
    body: typeof raw.body === 'string' ? raw.body : DEFAULT_BODY,
    category: typeof raw.category === 'string' ? raw.category : 'Untitled',
    favorite: typeof raw.favorite === 'boolean' ? raw.favorite : false,
    updatedAt,
  };
}

export function loadPairs(): Pair[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return seed;
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return seed;
    return data.map(migratePair).filter((p): p is Pair => p !== null);
  } catch {
    return seed;
  }
}

export function loadReport(): ImportReport | null {
  try {
    const raw = localStorage.getItem(REPORT_KEY);
    return raw ? (JSON.parse(raw) as ImportReport) : null;
  } catch {
    return null;
  }
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDateTime(ts: number): string {
  if (!ts) return '未记录更新时间';
  const d = new Date(ts);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function formatRelative(ts: number, now: number = Date.now()): string {
  if (!ts) return '未记录时间';
  const diff = now - ts;
  if (diff < 0) return formatDateTime(ts);
  if (diff < 60_000) return '刚刚';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)} 分钟前`;
  const d = new Date(ts);
  const n = new Date(now);
  if (diff < 24 * 3_600_000 && d.toDateString() === n.toDateString()) {
    return `${Math.floor(diff / 3_600_000)} 小时前`;
  }
  if (d.getFullYear() === n.getFullYear()) return `${d.getMonth() + 1}月${d.getDate()}日`;
  return `${d.getFullYear()}年${d.getMonth() + 1}月`;
}
