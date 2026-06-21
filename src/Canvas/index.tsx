import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Konva from 'konva';
import { Stage, Layer, Line } from 'react-konva';
import { Html } from 'react-konva-utils';
import {
  MIN_ZOOM_SCALE,
  MAX_ZOOM_SCALE,
  ZOOM_SCALE_BY,
  INITIAL_ZOOM_SCALE,
  CENTER_OFFSET_X,
  CENTER_OFFSET_Y,
  TWEEN_DURATION,
} from '../constants';
import { flattenTree, getChildrenIds } from '../utils';
import { DefaultNodeElement } from '../Components/DefaultNodeElement';
import { ZoomControls } from '../Components/ZoomControls';
import type {
  NodeData,
  VirtualizedTreeProps,
  StagePosition,
  StageSize,
  ViewportBounds,
  LineData,
} from '../types';

export function VirtualizedTree<T>({
  data,
  canvasWidth,
  canvasHeight,
  zoom = true,
  pan = true,
  onNodeClick,
  NodeElement = DefaultNodeElement,
  horizontalMargin = 150,
  verticalMargin = 100,
  nodeWidth = 40,
  nodeHeight = 40,
}: VirtualizedTreeProps<T>) {
  const MARGIN_X = horizontalMargin;
  const MARGIN_Y = verticalMargin;
  const HALF_MARGIN_X = MARGIN_X / 2;
  const HALF_MARGIN_Y = MARGIN_Y / 2;
  const LINE_ADJUSTMENT = HALF_MARGIN_X - nodeWidth / 2;
  const Y_ADJUSTMENT_FOR_LINE = -(verticalMargin - nodeHeight) / 2;
  const [stageSize, setStageSize] = useState<StageSize>({
    width: canvasWidth || window.innerWidth,
    height: canvasHeight || window.innerHeight,
  });

  // Flatten data for easy lookup
  const treeData = useMemo(() => flattenTree(data), [data]);

  // State for levels and expansion
  const [levelsData, setLevelsData] = useState<number[][]>([[data.id]]);
  const [toggle, setToggle] = useState<Record<number, number | null>>({});
  const [levelOffset, setLevelOffset] = useState<Record<number, number>>({ 0: 0 });

  const [stagePos, setStagePos] = useState<StagePosition>({
    x: stageSize.width / 2 - HALF_MARGIN_X - CENTER_OFFSET_X,
    y: stageSize.height / 2 - HALF_MARGIN_Y - CENTER_OFFSET_Y,
  });
  const [zoomScale, setZoomScale] = useState<number>(INITIAL_ZOOM_SCALE);
  const [isAnimating, setIsAnimating] = useState<boolean>(false);

  const stageRef = useRef<Konva.Stage>(null);
  const tweenRef = useRef<Konva.Tween | null>(null);
  const wheelAccum = useRef({ x: 0, y: 0 });
  const wheelFrame = useRef<number | null>(null);

  // Update stage size on resize if no fixed dimensions provided
  useEffect(() => {
    if (canvasWidth && canvasHeight) return;

    const handleResize = () => {
      setStageSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [canvasWidth, canvasHeight]);

  // Calculate viewport bounds
  const viewportBounds = useMemo((): ViewportBounds => {
    const posX = stagePos.x;
    const posY = stagePos.y;
    const scale = zoomScale;
    const margin = 100;

    const left = (posX * -1) / scale - margin;
    const top = (posY * -1) / scale - margin;
    const right = left + stageSize.width / scale + margin * 2;
    const bottom = top + stageSize.height / scale + margin * 2;

    return { left, top, right, bottom };
  }, [stagePos, zoomScale, stageSize]);

  // Calculate visible nodes
  const visibleNodes = useMemo((): NodeData<T>[] => {
    const nodes: NodeData<T>[] = [];
    const { left, top, right, bottom } = viewportBounds;

    const startY = Math.max(0, Math.floor(top / MARGIN_Y));
    const endY = Math.min(Math.ceil(bottom / MARGIN_Y), levelsData.length);

    for (let level = startY; level < endY; level += 1) {
      const levelNodes = levelsData[level];
      if (levelNodes) {
        const levelNodesLength = levelNodes.length;
        const levelNodesMid = (levelNodesLength - 1) / 2;
        const parentOffset = level > 0 ? levelOffset[level - 1] || 0 : 0;

        const startX = Math.max(0, Math.floor((left - parentOffset) / MARGIN_X + levelNodesMid));
        const endX = Math.min(
          Math.ceil((right - parentOffset) / MARGIN_X + levelNodesMid),
          levelNodesLength
        );

        for (let nodeIndex = startX; nodeIndex < endX; nodeIndex += 1) {
          const id = levelNodes[nodeIndex];
          const nodeXAdjustment = nodeIndex - levelNodesMid;
          const nodeX = MARGIN_X * nodeXAdjustment + parentOffset;
          const nodeY = level * MARGIN_Y;

          const node = treeData[id];
          if (node) {
            const hasChildren = (node.children?.length ?? 0) > 0;
            const isExpanded = toggle[level] === id;

            nodes.push({
              ...node,
              x: nodeX,
              y: nodeY,
              level,
              index: nodeIndex,
              hasChildren,
              isExpanded,
            });
          }
        }
      }
    }

    return nodes;
  }, [levelsData, levelOffset, viewportBounds, treeData, toggle]);

  // Calculate line points
  const calculateLinePoints = useCallback(
    (
      startX: number,
      endX: number,
      level: number,
      levelMid: number,
      parentOffset: number
    ): { horizontalPoints: number[]; verticalPoints: number[] } => {
      const horizontalPoints: number[] = [];
      const verticalPoints: number[] = [];

      const firstNodeXAdjustment = startX - levelMid;
      const lastNodeXAdjustment = endX - 1 - levelMid;
      const firstNodeX =
        MARGIN_X * firstNodeXAdjustment + parentOffset + (HALF_MARGIN_X - LINE_ADJUSTMENT);
      const lastNodeX =
        MARGIN_X * lastNodeXAdjustment + parentOffset + (HALF_MARGIN_X - LINE_ADJUSTMENT);
      const levelY = level * MARGIN_Y;

      const midNodeX = parentOffset + (HALF_MARGIN_X - LINE_ADJUSTMENT);
      let currentX = firstNodeX;

      while (currentX <= lastNodeX) {
        horizontalPoints.push(currentX, levelY + Y_ADJUSTMENT_FOR_LINE);
        horizontalPoints.push(currentX, levelY, currentX, levelY + Y_ADJUSTMENT_FOR_LINE);
        currentX += MARGIN_X;
      }

      // Add vertical line to parent
      const parentBottomY = (level - 1) * MARGIN_Y + nodeHeight;
      verticalPoints.push(
        midNodeX,
        parentBottomY,
        midNodeX,
        levelY + Y_ADJUSTMENT_FOR_LINE
      );

      return { horizontalPoints, verticalPoints };
    },
    []
  );

  // Calculate visible lines
  const visibleLines = useMemo((): LineData[] => {
    const lines: LineData[] = [];
    const { left, right, top, bottom } = viewportBounds;

    const startY = Math.max(0, Math.floor(top / MARGIN_Y));
    const endY = Math.min(Math.ceil(bottom / MARGIN_Y), levelsData.length);

    for (let level = startY; level < endY; level += 1) {
      const levelNodes = levelsData[level];
      if (levelNodes && level !== 0) {
        const levelNodesLength = levelNodes.length;
        const levelNodesMid = (levelNodesLength - 1) / 2;
        const parentOffset = level > 0 ? levelOffset[level - 1] || 0 : 0;

        const startX = Math.max(0, Math.floor((left - parentOffset) / MARGIN_X + levelNodesMid));
        const endX = Math.min(
          Math.ceil((right - parentOffset) / MARGIN_X + levelNodesMid),
          levelNodesLength
        );

        if (startX < endX) {
          const { horizontalPoints, verticalPoints } = calculateLinePoints(
            startX,
            endX,
            level,
            levelNodesMid,
            parentOffset
          );
          lines.push({
            points: horizontalPoints,
            key: `line-h-${level}-${startX}-${endX}`,
          });
          lines.push({
            points: verticalPoints,
            key: `line-v-${level}-${startX}-${endX}`,
          });
        }
      }
    }

    return lines;
  }, [levelsData, levelOffset, viewportBounds, calculateLinePoints]);

  // Handle node click
  const handleNodeClickInternal = useCallback(
    (node: NodeData<T>) => {
      if (onNodeClick) {
        onNodeClick(node);
      }

      const hasChildren = (node.children?.length ?? 0) > 0;
      if (!hasChildren) return;

      const { level, id, x } = node;
      const newLevelsData: number[][] = [...levelsData];
      newLevelsData.splice(level + 1);

      let newToggle: Record<number, number | null> = {};
      newToggle = Object.entries(toggle).reduce<Record<number, number | null>>(
        (toggles, [key, val]) => {
          const idx = Number(key);
          const newToggles = { ...toggles };
          if (idx < level) {
            newToggles[idx] = val;
          }
          return newToggles;
        },
        {}
      );

      if (toggle[level] !== id) {
        const childrenIds = getChildrenIds(treeData[id]);
        if (childrenIds.length > 0) {
          newLevelsData.push(childrenIds);
        }
        newToggle[level] = id;
      }

      const newOffsets: Record<number, number> = {
        ...levelOffset,
        [level]: x,
      };

      setLevelsData(newLevelsData);
      setToggle(newToggle);
      setLevelOffset(newOffsets);
    },
    [levelsData, toggle, levelOffset, treeData, onNodeClick]
  );

  // Zoom and Pan handlers
  const handleZoomIn = useCallback(() => {
    const newScale = Math.min(zoomScale * ZOOM_SCALE_BY, MAX_ZOOM_SCALE);
    if (newScale !== zoomScale) setZoomScale(newScale);
  }, [zoomScale]);

  const handleZoomOut = useCallback(() => {
    const newScale = Math.max(zoomScale / ZOOM_SCALE_BY, MIN_ZOOM_SCALE);
    if (newScale !== zoomScale) setZoomScale(newScale);
  }, [zoomScale]);

  const handleDragMove = useCallback(() => {
    if (stageRef.current) {
      const konvaStage = stageRef.current.getStage();
      setStagePos({
        x: konvaStage.x(),
        y: konvaStage.y(),
      });
    }
  }, []);

  const handleAnimation = useCallback(
    (centerX: number, centerY: number) => {
      if (!stageRef.current) return;

      if (tweenRef.current) {
        tweenRef.current.destroy();
        tweenRef.current = null;
      }

      tweenRef.current = new Konva.Tween({
        node: stageRef.current,
        duration: TWEEN_DURATION,
        x: centerX,
        y: centerY,
        easing: Konva.Easings.EaseOut,
        onFinish: () => {
          setIsAnimating(false);
          tweenRef.current = null;
          handleDragMove();
        },
      });

      tweenRef.current.play();
    },
    [handleDragMove]
  );

  const handleShiftToCenter = useCallback(() => {
    if (isAnimating) return;
    const firstParentX = 0;
    const firstParentY = 0;
    const centerX = stageSize.width / 2 - firstParentX * zoomScale - HALF_MARGIN_X;
    const centerY = stageSize.height / 2 - firstParentY * zoomScale - HALF_MARGIN_Y;

    if (tweenRef.current) tweenRef.current.destroy();
    setIsAnimating(true);
    handleAnimation(centerX, centerY);
  }, [isAnimating, stageSize, zoomScale, handleAnimation]);

  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    if (!stageRef.current) return;

    let { deltaX, deltaY } = e.evt;
    const { deltaMode } = e.evt;

    if (deltaMode === 1) {
      deltaX *= 16;
      deltaY *= 16;
    } else if (deltaMode === 2) {
      deltaX *= window.innerHeight || 800;
      deltaY *= window.innerHeight || 800;
    }

    wheelAccum.current.x += deltaX;
    wheelAccum.current.y += deltaY;

    if (!wheelFrame.current) {
      wheelFrame.current = requestAnimationFrame(() => {
        const { x, y } = wheelAccum.current;
        setStagePos((prev) => ({
          x: prev.x - x * 0.6,
          y: prev.y - y * 0.6,
        }));
        wheelAccum.current = { x: 0, y: 0 };
        wheelFrame.current = null;
      });
    }
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      <Stage
        ref={stageRef}
        width={stageSize.width}
        height={stageSize.height}
        scale={{ x: zoomScale, y: zoomScale }}
        x={stagePos.x}
        y={stagePos.y}
        onWheel={handleWheel}
        draggable={pan}
        onDragMove={handleDragMove}
        style={{ cursor: pan ? 'grab' : 'default' }}
      >
        <Layer>
          {visibleLines.map((lineData) => (
            <Line
              key={lineData.key}
              points={lineData.points}
              stroke="#666"
              strokeWidth={2}
              lineCap="round"
              lineJoin="round"
            />
          ))}
          {visibleNodes.map((node) => (
            <Html key={`${node.level}-${node.id}`} transform>
              <div
                style={{
                  position: 'absolute',
                  transform: `translate(${node.x}px, ${node.y}px)`,
                  userSelect: 'none',
                  cursor: 'pointer',
                }}
                onClick={() => handleNodeClickInternal(node)}
              >
                <NodeElement node={node} />
              </div>
            </Html>
          ))}
        </Layer>
      </Stage>
      {zoom && (
        <ZoomControls
          handleZoomIn={handleZoomIn}
          handleZoomOut={handleZoomOut}
          handleShiftToCenter={handleShiftToCenter}
          disableZoomIn={zoomScale >= MAX_ZOOM_SCALE}
          disableZoomOut={zoomScale <= MIN_ZOOM_SCALE}
        />
      )}
    </div>
  );
}
