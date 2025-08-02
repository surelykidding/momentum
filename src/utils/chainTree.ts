import { Chain, ChainTreeNode } from '../types';

/**
 * 将扁平的链数组转换为树状结构
 */
export const buildChainTree = (chains: Chain[]): ChainTreeNode[] => {
  // 创建ID到节点的映射
  const nodeMap = new Map<string, ChainTreeNode>();
  
  // 初始化所有节点
  chains.forEach(chain => {
    nodeMap.set(chain.id, {
      ...chain,
      children: [],
      depth: 0,
    });
  });

  const rootNodes: ChainTreeNode[] = [];

  // 构建树结构
  chains.forEach(chain => {
    const node = nodeMap.get(chain.id)!;
    
    if (chain.parentId) {
      const parent = nodeMap.get(chain.parentId);
      if (parent) {
        parent.children.push(node);
        node.depth = parent.depth + 1;
      } else {
        // 父节点不存在，作为根节点处理
        rootNodes.push(node);
      }
    } else {
      rootNodes.push(node);
    }
  });

  // 对每个节点的子节点按 sortOrder 排序
  const sortChildren = (node: ChainTreeNode) => {
    node.children.sort((a, b) => a.sortOrder - b.sortOrder);
    node.children.forEach(sortChildren);
  };

  rootNodes.forEach(sortChildren);
  
  // 对根节点也进行排序
  rootNodes.sort((a, b) => a.sortOrder - b.sortOrder);

  return rootNodes;
};

/**
 * 获取任务群的完成进度
 */
export const getGroupProgress = (group: ChainTreeNode): { completed: number; total: number } => {
  if (group.type === 'unit') {
    return { completed: group.currentStreak > 0 ? 1 : 0, total: 1 };
  }

  let completed = 0;
  let total = 0;

  group.children.forEach(child => {
    const progress = getGroupProgress(child);
    completed += progress.completed;
    total += progress.total;
  });

  return { completed, total };
};

/**
 * 获取任务群中下一个待执行的单元
 */
export const getNextUnitInGroup = (group: ChainTreeNode): ChainTreeNode | null => {
  if (group.type === 'unit') {
    return group;
  }

  for (const child of group.children) {
    const nextUnit = getNextUnitInGroup(child);
    if (nextUnit && nextUnit.currentStreak === 0) {
      return nextUnit;
    }
  }

  return null;
};

/**
 * 获取所有顶层任务（用于仪表盘显示）
 */
export const getTopLevelChains = (chainTree: ChainTreeNode[]): ChainTreeNode[] => {
  return chainTree.filter(node => !node.parentId);
};

/**
 * 根据类型获取对应的图标和颜色
 */
export const getChainTypeConfig = (type: Chain['type']) => {
  const configs = {
    unit: { icon: 'fas fa-link', color: 'text-gray-500', bgColor: 'bg-gray-500/10', name: '基础单元' },
    group: { icon: 'fas fa-layer-group', color: 'text-blue-500', bgColor: 'bg-blue-500/10', name: '任务群' },
    assault: { icon: 'fas fa-sword', color: 'text-red-500', bgColor: 'bg-red-500/10', name: '突击单元' },
    recon: { icon: 'fas fa-search', color: 'text-green-500', bgColor: 'bg-green-500/10', name: '侦查单元' },
    command: { icon: 'fas fa-chess-king', color: 'text-purple-500', bgColor: 'bg-purple-500/10', name: '指挥单元' },
    special_ops: { icon: 'fas fa-tools', color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', name: '特勤单元' },
    engineering: { icon: 'fas fa-dumbbell', color: 'text-orange-500', bgColor: 'bg-orange-500/10', name: '工程单元' },
    quartermaster: { icon: 'fas fa-utensils', color: 'text-pink-500', bgColor: 'bg-pink-500/10', name: '炊事单元' },
  };

  return configs[type] || configs.unit;
};