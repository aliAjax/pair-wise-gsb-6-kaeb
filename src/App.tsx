import {useEffect, useState} from 'react';
import {
  BookOpen,
  ChevronDown,
  Download,
  Grid3X3,
  Heart,
  Plus,
  Settings2,
  SlidersHorizontal,
  Star,
  Trash2,
  Type,
  Upload,
  X,
} from 'lucide-react';
import ImportModal from './components/ImportModal';
import {
  ImportReport,
  MergeResult,
  Pair,
  REPORT_DISMISS_KEY,
  REPORT_KEY,
  SELECTED_KEY,
  formatDateTime,
  loadPairs,
  loadReport,
  mergeBackup,
  STORAGE_KEY,
} from './lib/pairStore';

const fonts = ['Fraunces', 'DM Sans', 'Space Grotesk', 'Newsreader', 'IBM Plex Sans', 'Playfair Display'];

export default function App() {
  const [pairs, setPairs] = useState<Pair[]>(() => loadPairs());
  const [selected, setSelected] = useState<number>(() => {
    const stored = Number(localStorage.getItem(SELECTED_KEY));
    return Number.isFinite(stored) && stored ? stored : 1;
  });
  const [headingFont, setHeadingFont] = useState('Fraunces');
  const [bodyFont, setBodyFont] = useState('DM Sans');
  const [size, setSize] = useState(46);
  const [weight, setWeight] = useState(600);
  const [leading, setLeading] = useState(1.25);
  const [tracking, setTracking] = useState(0);
  const [showAdd, setShowAdd] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [report, setReport] = useState<ImportReport | null>(() => loadReport());
  const [reportDismissed, setReportDismissed] = useState<boolean>(
    () => localStorage.getItem(REPORT_DISMISS_KEY) === REPORT_KEY,
  );

  // 当前选择失效（如删除/导入不影响删除）时回落到第一条
  const current = pairs.find((p) => p.id === selected) ?? pairs[0];

  // 配对与当前选择都持久化：刷新页面后状态一致
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pairs));
  }, [pairs]);
  useEffect(() => {
    if (current) localStorage.setItem(SELECTED_KEY, String(current.id));
  }, [current?.id]);

  const create = () => {
    if (!newTitle.trim()) return;
    const id = Date.now();
    setPairs((ps) => [
      ...ps,
      {
        id,
        title: newTitle.trim(),
        heading: 'Your new headline',
        body: 'Start with a sentence that lets your type pairing show its character.',
        category: 'Untitled',
        favorite: false,
        updatedAt: Date.now(),
      },
    ]);
    setSelected(id);
    setNewTitle('');
    setShowAdd(false);
  };

  const toggleFav = () =>
    setPairs((ps) =>
      ps.map((p) =>
        p.id === current.id ? {...p, favorite: !p.favorite, updatedAt: Date.now()} : p,
      ),
    );

  const removeCurrent = () => {
    const rest = pairs.filter((p) => p.id !== current.id);
    setPairs(rest);
    setSelected(rest[0]?.id ?? 0);
  };

  const handleMerge = (text: string): MergeResult => {
    const result = mergeBackup(pairs, text);
    if (result.ok) {
      setPairs(result.merged);
      // 覆盖的是当前项时仍指向同一编号；新增不改选择。当前项被数据异常影响时回落
      if (!result.merged.some((p) => p.id === selected)) setSelected(result.merged[0]?.id ?? 0);
      const nextReport: ImportReport = {
        at: Date.now(),
        total: result.total,
        added: result.added,
        updated: result.updated,
        unchanged: result.unchanged,
        renamed: result.renamed,
      };
      setReport(nextReport);
      setReportDismissed(false);
      localStorage.setItem(REPORT_KEY, JSON.stringify(nextReport));
      localStorage.removeItem(REPORT_DISMISS_KEY);
    }
    return result;
  };

  const dismissReport = () => {
    setReportDismissed(true);
    localStorage.setItem(REPORT_DISMISS_KEY, REPORT_KEY);
  };

  const exportCss = () => {
    const css = `/* ${current.title} */\n.heading { font-family: '${headingFont}'; font-size: ${size}px; font-weight: ${weight}; }\n.body { font-family: '${bodyFont}'; line-height: ${leading}; letter-spacing: ${tracking}px; }`;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([css], {type: 'text/css'}));
    a.download = 'type-pair.css';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const exportBackup = () => {
    const blob = new Blob([JSON.stringify(pairs, null, 2)], {type: 'application/json'});
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'type-pairs-backup.json';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="app">
      <aside>
        <div className="brand">
          <div className="brand-mark">
            <Type size={18} />
          </div>
          <div>
            <b>Type Pairer</b>
            <small>FIND YOUR VOICE</small>
          </div>
        </div>
        <div className="nav-section">
          <span>LIBRARY</span>
          <button className="nav active">
            <Grid3X3 size={16} />
            All pairings <b>{pairs.length}</b>
          </button>
          <button className="nav">
            <Heart size={16} />
            Favorites <b>{pairs.filter((p) => p.favorite).length}</b>
          </button>
        </div>
        <div className="saved">
          <div className="saved-head">
            <span>COLLECTIONS</span>
            <button onClick={() => setShowAdd(true)}>
              <Plus size={14} />
            </button>
          </div>
          <button className="collection">
            <i style={{background: '#e8b7a0'}} />
            Editorial <b>4</b>
          </button>
          <button className="collection">
            <i style={{background: '#9fc9be'}} />
            Portfolio <b>3</b>
          </button>
          <button className="collection">
            <i style={{background: '#b4add8'}} />
            Brand voice <b>5</b>
          </button>
        </div>
        <div className="aside-foot">
          <button className="nav">
            <Settings2 size={16} />
            Preferences
          </button>
          <div className="profile">
            <div className="avatar">YL</div>
            <div>
              <b>Yuki Lin</b>
              <small>Design workspace</small>
            </div>
            <ChevronDown size={14} />
          </div>
        </div>
      </aside>

      <main>
        <header>
          <div>
            <div className="crumb">
              TYPE LIBRARY / <b>PAIRING STUDIO</b>
            </div>
            <h1>Find the right conversation.</h1>
            <p>Explore combinations, tune the details, and save what feels like you.</p>
          </div>
          <div className="actions">
            <button className="outline" onClick={() => setShowImport(true)}>
              <Upload size={15} />
              导入合并
            </button>
            <button className="outline" onClick={exportBackup}>
              <Download size={15} />
              备份 JSON
            </button>
            <button className="outline" onClick={exportCss}>
              <Download size={15} />
              Copy CSS
            </button>
            <button className="primary" onClick={() => setShowAdd(true)}>
              <Plus size={16} />
              New pairing
            </button>
          </div>
        </header>

        {report && !reportDismissed && (
          <div className="report-bar">
            <b>
              最近导入 · {formatDateTime(report.at)}：共 {report.total} 条，新增 {report.added}，
              覆盖 {report.updated}，保留 {report.unchanged}
            </b>
            {report.renamed.length > 0 && (
              <span>
                副本命名：
                {report.renamed.map((r) => `${r.from} → ${r.to}`).join('；')}
              </span>
            )}
            <button onClick={dismissReport} aria-label="关闭提示">
              <X size={13} />
            </button>
          </div>
        )}

        <div className="layout">
          <section className="gallery">
            <div className="gallery-head">
              <div>
                <h2>Saved pairings</h2>
                <span>{pairs.length} compositions</span>
              </div>
              <div className="view-toggle">
                <button className="on">
                  <Grid3X3 size={14} />
                </button>
                <button>
                  <BookOpen size={14} />
                </button>
              </div>
            </div>
            <div className="pair-list">
              {pairs.map((p) => (
                <button
                  key={p.id}
                  className={current?.id === p.id ? 'pair selected' : 'pair'}
                  onClick={() => setSelected(p.id)}
                >
                  <div className="pair-top">
                    <span>{p.category}</span>
                    <Heart
                      size={15}
                      fill={p.favorite ? '#e88769' : 'none'}
                      color={p.favorite ? '#e88769' : '#aeb5b7'}
                    />
                  </div>
                  <strong style={{fontFamily: p.id === 1 ? 'Fraunces' : 'Georgia'}}>
                    {p.heading}
                  </strong>
                  <p style={{fontFamily: p.id === 1 ? 'DM Sans' : 'Arial'}}>{p.body}</p>
                  <div className="pair-foot">
                    <span>{p.title}</span>
                    <small>{p.updatedAt ? formatDateTime(p.updatedAt) : 'Open canvas →'}</small>
                  </div>
                </button>
              ))}
              {pairs.length === 0 && (
                <div className="empty-hint">还没有配对，点击右上角“导入合并”粘贴一份备份开始。</div>
              )}
            </div>
          </section>

          {current ? (
            <section className="studio">
              <div className="studio-head">
                <div>
                  <span>PAIRING CANVAS</span>
                  <h2>{current.title}</h2>
                </div>
                <button className="favorite" onClick={toggleFav}>
                  <Star
                    size={16}
                    fill={current.favorite ? '#e5a35e' : 'none'}
                    color={current.favorite ? '#e5a35e' : '#98a4a7'}
                  />
                </button>
              </div>
              <div className="canvas">
                <div className="canvas-bar">
                  <span>PREVIEW</span>
                  <div>
                    <button>Desktop</button>
                    <button>Tablet</button>
                    <button>Mobile</button>
                  </div>
                </div>
                <div className="preview">
                  <span className="preview-kicker">A NOTE ON TYPE</span>
                  <h3
                    style={{
                      fontFamily: headingFont,
                      fontSize: `${size}px`,
                      fontWeight: weight,
                      letterSpacing: `${tracking}px`,
                      lineHeight: 1.05,
                    }}
                  >
                    {current.heading}
                  </h3>
                  <p style={{fontFamily: bodyFont, lineHeight, letterSpacing: `${tracking / 2}px`}}>
                    {current.body}
                  </p>
                  <div className="preview-rule" />
                  <span className="preview-meta">
                    PAIRING {String(current.id).slice(-3)} · {current.category.toUpperCase()} ·
                    UPDATED {formatDateTime(current.updatedAt)}
                  </span>
                </div>
              </div>
              <div className="controls">
                <div className="control-head">
                  <div>
                    <span>TYPE CONTROLS</span>
                    <h3>Fine tune your pairing</h3>
                  </div>
                  <SlidersHorizontal size={17} />
                </div>
                <div className="font-row">
                  <label>
                    Heading font
                    <select value={headingFont} onChange={(e) => setHeadingFont(e.target.value)}>
                      {fonts.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Body font
                    <select value={bodyFont} onChange={(e) => setBodyFont(e.target.value)}>
                      {fonts.map((f) => (
                        <option key={f}>{f}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="range-row">
                  <label>
                    Size <b>{size}px</b>
                    <input
                      type="range"
                      min="28"
                      max="76"
                      value={size}
                      onChange={(e) => setSize(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Weight <b>{weight}</b>
                    <input
                      type="range"
                      min="300"
                      max="800"
                      step="100"
                      value={weight}
                      onChange={(e) => setWeight(Number(e.target.value))}
                    />
                  </label>
                </div>
                <div className="range-row">
                  <label>
                    Line height <b>{leading.toFixed(2)}</b>
                    <input
                      type="range"
                      min="1"
                      max="1.8"
                      step=".05"
                      value={leading}
                      onChange={(e) => setLeading(Number(e.target.value))}
                    />
                  </label>
                  <label>
                    Letter spacing <b>{tracking}px</b>
                    <input
                      type="range"
                      min="-1"
                      max="3"
                      step=".5"
                      value={tracking}
                      onChange={(e) => setTracking(Number(e.target.value))}
                    />
                  </label>
                </div>
              </div>
              <div className="studio-foot">
                <button className="delete" onClick={removeCurrent}>
                  <Trash2 size={15} />
                  Delete pairing
                </button>
                <span className="save-badge">
                  <CheckIcon />
                  自动保存到本地
                </span>
              </div>
            </section>
          ) : (
            <section className="studio empty-studio">
              <p>列表为空。导入一份备份或新建配对后即可继续。</p>
            </section>
          )}
        </div>
      </main>

      {showAdd && (
        <div className="backdrop" onClick={() => setShowAdd(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>New pairing</h2>
            <label>
              Pairing name
              <input
                autoFocus
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Quiet confidence"
              />
            </label>
            <div className="modal-actions">
              <button className="outline" onClick={() => setShowAdd(false)}>
                Cancel
              </button>
              <button className="primary" onClick={create}>
                Create pairing
              </button>
            </div>
          </div>
        </div>
      )}

      {showImport && (
        <ImportModal
          onClose={() => setShowImport(false)}
          onMerge={handleMerge}
          report={reportDismissed ? null : report}
        />
      )}
    </div>
  );
}

function CheckIcon() {
  return <span className="check">✓</span>;
}
