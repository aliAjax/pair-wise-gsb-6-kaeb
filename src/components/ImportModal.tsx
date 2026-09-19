import {useState} from 'react';
import {AlertTriangle, ArrowRight, CheckCircle2, FileSpreadsheet, X} from 'lucide-react';
import {
  ImportReport,
  MergeResult,
  SAMPLE_BACKUP,
  SAMPLE_INVALID_BACKUP,
  formatRelative,
} from '../lib/pairStore';

type Props = {
  onClose: () => void;
  onMerge: (text: string) => MergeResult;
  report: ImportReport | null;
};

export default function ImportModal({onClose, onMerge, report}: Props) {
  const [text, setText] = useState('');
  const [result, setResult] = useState<MergeResult | null>(null);

  const run = () => {
    const r = onMerge(text);
    setResult(r);
    if (r.ok) setText('');
  };

  return (
    <div className="backdrop" onClick={onClose}>
      <div className="modal import-modal" onClick={(e) => e.stopPropagation()}>
        <div className="import-head">
          <div>
            <h2>
              <FileSpreadsheet size={18} /> 导入并合并备份
            </h2>
            <p>粘贴 JSON 备份数组。编号相同按更新时间覆盖；同名不同编号会追加“副本”并存。</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="关闭">
            <X size={16} />
          </button>
        </div>

        {report && !result && (
          <div className="import-banner ok">
            <CheckCircle2 size={15} />
            <span>
              上次导入（{formatRelative(report.at)}）：新增 {report.added}，覆盖 {report.updated}，
              保留 {report.unchanged}
              {report.renamed.length > 0 && `，副本命名 ${report.renamed.length} 项`}
            </span>
          </div>
        )}

        <textarea
          className="import-input"
          spellCheck={false}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setResult(null);
          }}
          placeholder={'[\n  {\n    "id": 1,\n    "title": "Editorial calm",\n    "updatedAt": "2026-09-15T10:00:00.000Z",\n    ...\n  }\n]'}
        />

        {result && !result.ok && (
          <div className="import-banner error">
            <AlertTriangle size={15} />
            <span>{result.error} 原有配对与当前选择均未改变。</span>
          </div>
        )}

        {result && result.ok && (
          <div className="import-result">
            <div className="import-banner ok">
              <CheckCircle2 size={15} />
              <span>
                导入完成：共 {result.total} 条 —— 新增 {result.added}，覆盖 {result.updated}，
                时间较旧/相同保留 {result.unchanged}。
              </span>
            </div>
            {result.renamed.length > 0 && (
              <div className="rename-list">
                <span>冲突命名（已有标题保持不变）</span>
                {result.renamed.map((r, i) => (
                  <div key={i} className="rename-row">
                    <b>{r.from}</b>
                    <ArrowRight size={12} />
                    <em>{r.to}</em>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="import-samples">
          <button
            type="button"
            onClick={() => {
              setText(SAMPLE_BACKUP);
              setResult(null);
            }}
          >
            填入示例备份
          </button>
          <button
            type="button"
            onClick={() => {
              setText(SAMPLE_INVALID_BACKUP);
              setResult(null);
            }}
          >
            填入缺字段反例
          </button>
        </div>

        <div className="modal-actions">
          <button className="outline" onClick={onClose}>
            关闭
          </button>
          <button className="primary" onClick={run} disabled={!text.trim()}>
            检查并合并
          </button>
        </div>
      </div>
    </div>
  );
}
