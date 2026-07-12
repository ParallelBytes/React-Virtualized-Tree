export interface NodeData<T = any> {
  id: number;
  x: number;
  y: number;
  level: number;
  index: number;
  hasChildren: boolean;
  isExpanded: boolean;
  nodeInfo: T;
  children?: NodeData<T>[];
}

export interface VirtualizedTreeProps<T> {
  data: NodeData<T>;
  canvasWidth?: number;
  canvasHeight?: number;
  zoom?: boolean;
  pan?: boolean;
  onNodeClick?: (node: NodeData<T>) => void;
  NodeElement?: React.ComponentType<{ node: NodeData<T> }>;
  horizontalMargin?: number;
  verticalMargin?: number;
  nodeWidth?: number;
  nodeHeight?: number;
  extraItems?: number;
}

export interface StagePosition {
  x: number;
  y: number;
}

export interface StageSize {
  width: number;
  height: number;
}

export interface ViewportBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LineData {
  points: number[];
  key: string;
}
