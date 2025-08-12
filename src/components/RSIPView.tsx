import React, { useEffect, useMemo, useState } from 'react';
import { RSIPNode, RSIPTreeNode, RSIPMeta } from '../types';
import { buildRSIPTree, countDescendants, deleteNodeAndDescendants } from '../utils/rsipTree';
import { Plus, Trash2, ArrowLeft, Clock } from 'lucide-react';

interface RSIPViewProps {
  nodes: RSIPNode[];
  meta: RSIPMeta;
  onBack: () => void;
  onSaveNodes: (nodes: RSIPNode[]) => void;
  onSaveMeta: (meta: RSIPMeta) => void;
}

export const RSIPView: React.FC<RSIPViewProps> = ({ nodes, meta, onBack, onSaveNodes, onSaveMeta }) => {
  const tree = useMemo<RSIPTreeNode[]>(() => buildRSIPTree(nodes), [nodes]);
  const [selectedParentId, setSelectedParentId] = useState<string | undefined>(undefined);
  const [title, setTitle] = useState('');
  const [rule, setRule] = useState('');

  const canAddToday = (() => {
    if (meta.allowMultiplePerDay) return true;
    if (!meta.lastAddedAt) return true;
    const last = new Date(meta.lastAddedAt);
    const now = new Date();
    return last.toDateString() !== now.toDateString();
  })();

  const handleAdd = () => {
    if (!canAddToday) return;
    if (!title.trim() || !rule.trim()) return;
    const newNode: RSIPNode = {
      id: crypto.randomUUID(),
      parentId: selectedParentId || undefined,
      title: title.trim(),
      rule: rule.trim(),
      sortOrder: Math.floor(Date.now() / 1000),
      createdAt: new Date(),
      useTimer: createUseTimer,
      timerMinutes: createUseTimer ? createTimerMinutes : undefined,
    };
    const newNodes = [...nodes, newNode];
    onSaveNodes(newNodes);
    onSaveMeta({ ...meta, lastAddedAt: new Date() });
    setTitle('');
    setRule('');
  };

  const [now, setNow] = useState<number>(Date.now());
  const [activeTimers, setActiveTimers] = useState<Record<string, number>>({}); // nodeId -> endsAt ms

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    // check timers
    Object.entries(activeTimers).forEach(([id, endsAt]) => {
      if (now >= endsAt) {
        // notify once and clear
        setActiveTimers(prev => {
          const copy = { ...prev } as Record<string, number>;
          delete copy[id];
          return copy;
        });
        try {
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification('计时完成', { body: 'RSIP 定式计时已结束' });
            } else if (Notification.permission !== 'denied') {
              Notification.requestPermission();
            }
          }
         } catch {
           // ignore
         }
      }
    });
  }, [now, activeTimers]);

  const formatRemaining = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = (s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  };

  const handleFailure = (nodeId: string) => {
    const treeNodes = buildRSIPTree(nodes);
    const find = (arr: RSIPTreeNode[], id: string): RSIPTreeNode | null => {
      for (const n of arr) {
        if (n.id === id) return n;
        const got = find(n.children, id);
        if (got) return got;
      }
      return null;
    };
    const node = find(treeNodes, nodeId);
    if (!node) return;
    const descendants = countDescendants(node);
    if (!confirm(`判定失败：将删除「${node.title}」及其 ${descendants} 个子节点。确认回溯？`)) return;
    const newNodes = deleteNodeAndDescendants(nodes, nodeId);
    onSaveNodes(newNodes);
  };

  const renderNode = (node: RSIPTreeNode) => (
    <div key={node.id} className="border border-gray-200 dark:border-slate-700 rounded-2xl p-4 bg-white/60 dark:bg-slate-800/60">
      <div className="flex items-start justify-between">
        <div>
          <h4 className="text-lg font-bold font-chinese text-gray-900 dark:text-slate-100">{node.title}</h4>
          <p className="text-sm text-gray-600 dark:text-slate-400 font-chinese whitespace-pre-wrap">{node.rule}</p>
          {node.useTimer && (
            <div className="mt-2 flex items-center space-x-2">
              <div className="inline-flex items-center text-xs text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1 rounded-xl">
                <Clock size={14} className="mr-1" /> 计时 {node.timerMinutes} 分钟
              </div>
              {activeTimers[node.id] ? (
                <div className="inline-flex items-center space-x-2">
                  <span className="text-xs font-mono text-emerald-700 dark:text-emerald-300">{formatRemaining(activeTimers[node.id] - now)}</span>
                  <button
                    onClick={() => setActiveTimers(prev => { const c = { ...prev }; delete c[node.id]; return c; })}
                    className="px-2 py-1 text-xs rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/40 dark:text-emerald-300"
                  >
                    完成
                  </button>
                  <button
                    onClick={() => handleFailure(node.id)}
                    className="px-2 py-1 text-xs rounded-lg bg-red-100 hover:bg-red-200 text-red-700 dark:bg-red-900/30 dark:hover:bg-red-900/40 dark:text-red-300"
                  >
                    判定失败
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setActiveTimers(prev => ({ ...prev, [node.id]: Date.now() + (node.timerMinutes || 15) * 60000 }))}
                  className="px-2 py-1 text-xs rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-900/30 dark:hover:bg-emerald-900/40 dark:text-emerald-300"
                >
                  开始计时
                </button>
              )}
            </div>
          )}
        </div>
        <button
          onClick={() => handleFailure(node.id)}
          className="p-2 text-red-500 hover:text-red-600 dark:hover:text-red-400 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20"
          title="判定失败（删除此节点及其所有子节点）"
        >
          <Trash2 size={18} />
        </button>
      </div>

      {node.children.length > 0 && (
        <div className="mt-3 pl-4 border-l-2 border-dashed border-gray-200 dark:border-slate-700 space-y-3">
          {node.children.map(child => renderNode(child))}
        </div>
      )}
    </div>
  );

  const flatForSelect = (arr: RSIPTreeNode[]): RSIPTreeNode[] => {
    const res: RSIPTreeNode[] = [];
    const walk = (n: RSIPTreeNode) => { res.push(n); n.children.forEach(walk); };
    arr.forEach(walk);
    return res;
  };

  // Create form state for timer and daily policy
  const [createUseTimer, setCreateUseTimer] = useState<boolean>(false);
  const [createTimerMinutes, setCreateTimerMinutes] = useState<number>(15);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-3">
            <button onClick={onBack} className="p-3 text-gray-400 hover:text-gray-700 dark:hover:text-slate-200 rounded-2xl hover:bg-white/60 dark:hover:bg-slate-800/60">
              <ArrowLeft size={22} />
            </button>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold font-chinese text-gray-900 dark:text-slate-100">国策树 · RSIP</h1>
              <p className="text-xs font-mono text-gray-600 dark:text-slate-400 tracking-wider uppercase">Recursive Stabilization Iteration Protocol</p>
            </div>
          </div>
          {/* Daily policy toggle */}
          <div className="flex items-center space-x-3">
            <span className="text-xs font-chinese text-gray-600 dark:text-slate-400">一天可多条</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={!!meta.allowMultiplePerDay}
                onChange={(e) => onSaveMeta({ ...meta, allowMultiplePerDay: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </header>

        {/* First-time empty state */}
        {nodes.length === 0 && (
          <div className="bento-card max-w-3xl mx-auto mb-8">
            <h2 className="text-2xl font-bold font-chinese text-gray-900 dark:text-slate-100 mb-3">开始你的第一条国策</h2>
            <p className="text-gray-700 dark:text-slate-300 leading-relaxed font-chinese">
              RSIP 强调通过「每天至多新增一个、失败即回溯」来稳定迭代你的生活定式。选择一个小而稳的起点，建立第一条国策吧。
            </p>
          </div>
        )}

        {/* Add form */}
        <div className="bento-card mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">父节点（可空，表示新分支）</label>
              <select
                value={selectedParentId || ''}
                onChange={e => setSelectedParentId(e.target.value || undefined)}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              >
                <option value="">（无父节点，建立新根）</option>
                {flatForSelect(tree).map(n => (
                  <option key={n.id} value={n.id}>{'— '.repeat(n.depth)}{n.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">国策标题</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="例如：进门15分钟内开始洗澡"
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">精准规则</label>
              <input
                value={rule}
                onChange={e => setRule(e.target.value)}
                placeholder="例如：回家即启动15分钟计时，计时内进浴室"
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 placeholder-gray-400 dark:placeholder-slate-400 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 transition-all duration-300 font-chinese"
              />
            </div>
          </div>
          {/* Timer settings */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between bento-subtle px-4 py-3 rounded-2xl">
              <div className="flex items-center space-x-2">
                <Clock size={16} className="text-emerald-600" />
                <span className="text-sm font-chinese text-gray-700 dark:text-slate-300">启用计时</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={createUseTimer}
                  onChange={(e) => setCreateUseTimer(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 dark:peer-focus:ring-emerald-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-500"></div>
              </label>
            </div>
            <div className={`${createUseTimer ? '' : 'opacity-60'}`}>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-2 font-chinese">计时分钟数</label>
              <input
                type="number"
                min={1}
                max={180}
                disabled={!createUseTimer}
                value={createTimerMinutes}
                onChange={(e) => setCreateTimerMinutes(Math.max(1, Math.min(180, Number(e.target.value) || 1)))}
                className="w-full bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-2xl px-4 py-3 text-gray-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all duration-300 font-chinese"
              />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-sm font-chinese text-gray-600 dark:text-slate-400">
              每天最多新增一个国策。{canAddToday ? '今日可新增。' : '今日已新增，明日继续。'}
            </div>
            <button
              onClick={handleAdd}
              disabled={!canAddToday || !title.trim() || !rule.trim()}
              className={`flex items-center space-x-2 px-6 py-3 rounded-2xl font-medium transition-all duration-300 shadow-lg ${(!canAddToday || !title.trim() || !rule.trim()) ? 'bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-slate-500' : 'gradient-primary text-white hover:shadow-xl hover:scale-105'}`}
            >
              <Plus size={18} />
              <span className="font-chinese">新增国策</span>
            </button>
          </div>
        </div>

        {/* Tree */}
        <div className="space-y-4">
          {tree.length === 0 ? (
            <div className="text-center text-gray-600 dark:text-slate-400 font-chinese">尚无国策，先从上方表单添加一个吧。</div>
          ) : (
            tree.map(n => (
              <div key={n.id} className="bento-card">
                {/* 左侧竖线与连线效果 */}
                <div className="relative">
                  <div className="absolute left-2 top-0 bottom-0 w-px bg-gradient-to-b from-gray-200 to-transparent dark:from-slate-700"></div>
                  <div className="pl-4">{renderNode(n)}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};


