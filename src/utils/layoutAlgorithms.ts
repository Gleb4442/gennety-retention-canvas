import type { BoardNode, StrategyEdge, LayoutMode } from '../types';

const NODE_WIDTH = 340;
const NODE_HEIGHT = 220;

export async function getDagreLayout<T extends BoardNode>(
  nodes: T[],
  edges: StrategyEdge[],
  direction: 'TB' | 'LR' = 'TB'
): Promise<T[]> {
  const dagre = (await import('dagre')).default;
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));

  dagreGraph.setGraph({
    rankdir: direction,
    nodesep: 90,
    ranksep: 120,
    marginx: 80,
    marginy: 80,
  });

  nodes.forEach((node) => {
    const w = (node.type === 'imageNode' || node.type === 'textNode') && 'width' in node.data && typeof node.data.width === 'number' 
      ? node.data.width 
      : NODE_WIDTH;
    dagreGraph.setNode(node.id, { width: w, height: NODE_HEIGHT });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  return nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    const w = (node.type === 'imageNode' || node.type === 'textNode') && 'width' in node.data && typeof node.data.width === 'number' 
      ? node.data.width 
      : NODE_WIDTH;
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - w / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
    };
  });
}

export function getFlywheelLayout<T extends BoardNode>(
  nodes: T[],
  centerX: number = 800,
  centerY: number = 550,
  radiusX: number = 520,
  radiusY: number = 380
): T[] {
  const total = nodes.length;
  if (total === 0) return [];

  // Determine strategic order if known initial IDs are present
  const strategicOrder = [
    'shift_core',
    'emotion_status',
    'hardware_beacon',
    'event_duality',
    'gym_model',
    'anti_churn',
    'goal_retention',
  ];

  const sortedNodes = [...nodes].sort((a, b) => {
    const idxA = strategicOrder.indexOf(a.id);
    const idxB = strategicOrder.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.id.localeCompare(b.id);
  });

  return sortedNodes.map((node, index) => {
    const w = (node.type === 'imageNode' || node.type === 'textNode') && 'width' in node.data && typeof node.data.width === 'number' 
      ? node.data.width 
      : NODE_WIDTH;
    // Start at top (-PI/2) and rotate clockwise
    const angle = (2 * Math.PI * index) / total - Math.PI / 2;
    const x = centerX + radiusX * Math.cos(angle) - w / 2;
    const y = centerY + radiusY * Math.sin(angle) - NODE_HEIGHT / 2;

    return {
      ...node,
      position: {
        x: Math.round(x),
        y: Math.round(y),
      },
    };
  });
}

export async function computeLayout(
  nodes: BoardNode[],
  edges: StrategyEdge[],
  mode: LayoutMode
): Promise<BoardNode[]> {
  switch (mode) {
    case 'pyramid':
      // Hierarchical upward / downward pyramid (TB direction)
      return await getDagreLayout(nodes, edges, 'TB');
    case 'flywheel':
      // Circular / elliptical flywheel arrangement
      return getFlywheelLayout(nodes);
    case 'freeform':
    default:
      return nodes;
  }
}
