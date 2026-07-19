import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { DefaultNodeElement } from "../Components/DefaultNodeElement";
import { ZoomControls } from "../Components/ZoomControls";
import { VirtualizedTreeProps, NodeData } from "../types";
import { flattenTree, getChildrenIds } from "../utils";

const ListItem = React.memo(({ node, NodeElement, onClick, nodeWidth, horizontalMargin }: { node: NodeData<any>, level: number, NodeElement: React.ComponentType<{ node: NodeData<any> }>, onClick?: (node: NodeData<any>) => void, nodeWidth: number, horizontalMargin: number }) => {
  return (
    <div
      onClick={() => onClick && onClick(node)}
      style={{
        width: nodeWidth,
        display: "inline-block",
        boxSizing: "border-box",
        marginRight: horizontalMargin,
        cursor: "pointer",
      }}
    >
      <NodeElement node={node} />
    </div>
  );
});

const HorizontalList = React.memo(function HorizontalList({
  scrollLeft,
  nodes,
  treeData,
  scrollXValue = 0,
  NodeElement,
  level,
  onNodeClick,
  nodeWidth,
  horizontalMargin,
  extraItems,
  verticalMargin,
  nodeHeight,
  parentX,
  nodeCenterX,
  zoom = 1,
}: {
  scrollLeft: number;
  nodes: number[];
  treeData: Record<number, NodeData<any>>;
  scrollXValue?: number;
  NodeElement: React.ComponentType<{ node: NodeData<any> }>;
  level: number;
  onNodeClick?: (node: NodeData<any>, levelIndex: number) => void;
  nodeWidth: number;
  horizontalMargin: number;
  extraItems: number;
  verticalMargin: number;
  nodeHeight: number;
  parentX?: number;
  nodeCenterX: number;
  zoom?: number;
}) {
  const TOTAL_ITEM_WIDTH = horizontalMargin;
  const CONTAINER_WIDTH = (typeof window !== 'undefined' ? window.innerWidth : 1920) / zoom;
  
  const numberOfNodes = nodes.length;
  const startIndex = Math.floor((scrollLeft - scrollXValue) / TOTAL_ITEM_WIDTH);
  const newStartIndex = Math.max(0, startIndex - extraItems);
  const renderedNodesCount = Math.min(
    Math.floor(CONTAINER_WIDTH / TOTAL_ITEM_WIDTH) + 2 * extraItems,
    numberOfNodes - newStartIndex
  );

  const isVisible =
    scrollLeft + CONTAINER_WIDTH >=
    scrollXValue - extraItems * TOTAL_ITEM_WIDTH &&
    scrollLeft <= scrollXValue + numberOfNodes * TOTAL_ITEM_WIDTH;

  if (!isVisible) {
    return null;
  }

  const items = [];
  const lines = [];
  for (let i = 0; i < renderedNodesCount; i++) {
    const index = i + newStartIndex;
    const nodeId = nodes[index];
    const node = treeData[nodeId];
    if (node) {
      items.push(
        <ListItem
          key={nodeId ?? index}
          node={node}
          level={level}
          NodeElement={NodeElement}
          onClick={(node) => onNodeClick && onNodeClick(node, level)}
          nodeWidth={nodeWidth}
          horizontalMargin={horizontalMargin - nodeWidth}
        />
      );

      if (parentX !== undefined) {
        const currentOffset = scrollXValue + newStartIndex * TOTAL_ITEM_WIDTH;
        const localChildX = (index - newStartIndex) * TOTAL_ITEM_WIDTH + nodeCenterX;
        const localParentX = parentX - currentOffset;

        const startY = 0;
        const endY = verticalMargin;
        const halfY = verticalMargin - 20;

        const d = `M ${localChildX} ${endY} L ${localChildX} ${halfY} L ${localParentX} ${halfY} L ${localParentX} ${startY}`;

        lines.push(
          <path
            key={`line-${nodeId}`}
            d={d}
            stroke="#666"
            strokeWidth={2}
            fill="none"
            shapeRendering="crispEdges"
          />
        );
      }
    }
  }

  return (
    <div
      style={{
        width: CONTAINER_WIDTH,
        height: nodeHeight + verticalMargin,
      }}
    >
      <div
        style={{
          transform: `translateX(${scrollXValue + newStartIndex * TOTAL_ITEM_WIDTH}px)`,
          willChange: "transform",
          position: "relative",
          height: "100%",
        }}
      >
        {parentX !== undefined && lines.length > 0 && (
          <svg
            style={{
              position: "absolute",
              top: -verticalMargin,
              left: 0,
              width: 1,
              height: verticalMargin,
              overflow: "visible",
              pointerEvents: "none",
            }}
          >
            {lines}
          </svg>
        )}
        {items}
      </div>
    </div>
  );
});

export function VirtualizedTree<T>(props: VirtualizedTreeProps<T>) {
  const {
    nodeWidth = 40,
    nodeHeight = 40,
    horizontalMargin = 150,
    verticalMargin = 50,
    extraItems = 5,
    nodeCenterX = 20,
  } = props;

  const TOTAL_ITEM_WIDTH = horizontalMargin;

  const treeData = useMemo(() => flattenTree(props.data), [props.data]);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);
  const [levelsData, setLevelsData] = useState<number[][]>(
    props.data ? [[props.data.id]] : []
  );
  const [expandedNodes, setExpandedNodes] = useState<Record<number, number>>({});
  const [zoom, setZoom] = useState(1);

  const handleZoomIn = useCallback(() => {
    setZoom((z) => Math.min(z + 0.2, 2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom((z) => Math.max(z - 0.2, 0.2));
  }, []);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0, moved: false });

  const NodeElement = props.NodeElement || DefaultNodeElement;

  const scrollToTheCenter = useCallback((e?: any) => {
    const behavior = typeof e === "string" ? e : "smooth";
    const node = scrollContainerRef.current;
    if (node) {
      node.scrollTo({
        left: (node.scrollWidth - node.clientWidth) / 2,
        top: (node.scrollHeight - node.clientHeight) / 2,
        behavior: behavior as ScrollBehavior,
      });
    }
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      setScrollLeft(scrollContainerRef.current.scrollLeft);
      setScrollTop(scrollContainerRef.current.scrollTop);
    };

    const container = scrollContainerRef.current;
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    scrollToTheCenter("auto");
  }, [scrollToTheCenter]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: scrollContainerRef.current.scrollLeft,
      scrollTop: scrollContainerRef.current.scrollTop,
      moved: false,
    };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      dragStart.current.moved = true;
    }

    scrollContainerRef.current.scrollLeft = dragStart.current.scrollLeft - dx;
    scrollContainerRef.current.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleCaptureClick = (e: React.MouseEvent) => {
    if (dragStart.current.moved) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const maxNodesCount = Math.max(0, ...levelsData.map((levelNodes) => levelNodes.length));
  const largestListWidth = maxNodesCount * TOTAL_ITEM_WIDTH;
  const largestLevelMid = largestListWidth / 2;

  const prevLargestLevelMidRef = useRef<number>(largestLevelMid);

  useLayoutEffect(() => {
    if (scrollContainerRef.current) {
      const diff = largestLevelMid - prevLargestLevelMidRef.current;
      if (diff !== 0) {
        scrollContainerRef.current.scrollLeft += diff * zoom;
        setScrollLeft(scrollContainerRef.current.scrollLeft);
      }
    }
    prevLargestLevelMidRef.current = largestLevelMid;
  }, [largestLevelMid, zoom]);

  const prevZoomRef = useRef(zoom);

  useLayoutEffect(() => {
    if (scrollContainerRef.current && prevZoomRef.current !== zoom) {
      const container = scrollContainerRef.current;
      const oldZoom = prevZoomRef.current;
      const halfClientWidth = container.clientWidth/2;
      const halfClientHeight = container.clientHeight/2;

      // Find the unscaled coordinate of the exact center of the current viewport
      const previousZoomCenterX = (container.scrollLeft + halfClientWidth) / oldZoom;
      const previousZoomCenterY = (container.scrollTop + halfClientHeight) / oldZoom;

      // Re-center the viewport onto that exact unscaled coordinate using the new zoom
      container.scrollLeft = previousZoomCenterX * zoom - halfClientWidth;
      container.scrollTop = previousZoomCenterY * zoom - halfClientHeight;

      setScrollLeft(container.scrollLeft);
      setScrollTop(container.scrollTop);
      prevZoomRef.current = zoom;
    }
  }, [zoom]);

  const handleNodeClick = useCallback((node: NodeData<any>, levelIndex: number) => {
    setLevelsData((prev) => {
      const childrenIds = getChildrenIds(treeData[node.id]);
      const nextLevel = prev[levelIndex + 1];
      const isAlreadyExpanded = nextLevel && nextLevel.length === childrenIds.length && nextLevel[0] === childrenIds[0];

      const newLevels = prev.slice(0, levelIndex + 1);
      
      if (!isAlreadyExpanded && childrenIds && childrenIds.length > 0) {
        newLevels.push(childrenIds);
      }
      return newLevels;
    });

    setExpandedNodes(prev => {
      const isAlreadyExpanded = prev[levelIndex] === node.id;
      const newExpanded = { ...prev };
      Object.keys(newExpanded).forEach(key => {
        if (Number(key) >= levelIndex) {
          delete newExpanded[Number(key)];
        }
      });
      if (!isAlreadyExpanded) {
        newExpanded[levelIndex] = node.id;
      }
      return newExpanded;
    });

    if (props.onNodeClick) {
      props.onNodeClick(node);
    }
  }, [treeData, props.onNodeClick]);

  const levelPositions = useMemo(() => {
    const positions: { scrollXValue: number; parentX?: number }[] = [];
    for (let index = 0; index < levelsData.length; index++) {
      const levelNodes = levelsData[index];
      const numberOfNodes = levelNodes.length;

      let parentX: number | undefined;
      let scrollXValue: number;

      if (index === 0) {
        // Center root perfectly at largestLevelMid
        scrollXValue = largestLevelMid - ((numberOfNodes - 1) / 2) * TOTAL_ITEM_WIDTH - nodeCenterX;
      } else {
        const parentId = expandedNodes[index - 1];
        if (parentId !== undefined) {
          const parentLevelNodes = levelsData[index - 1];
          const parentIndex = parentLevelNodes.indexOf(parentId);
          if (parentIndex !== -1) {
            const parentScrollXValue = positions[index - 1].scrollXValue;
            parentX = parentScrollXValue + parentIndex * TOTAL_ITEM_WIDTH + nodeCenterX;
          }
        }
        
        if (parentX !== undefined) {
          // Center this level's anchors perfectly around the parent anchor
          scrollXValue = parentX - ((numberOfNodes - 1) / 2) * TOTAL_ITEM_WIDTH - nodeCenterX;
        } else {
          // Fallback
          scrollXValue = largestLevelMid - ((numberOfNodes - 1) / 2) * TOTAL_ITEM_WIDTH - nodeCenterX;
        }
      }
      positions.push({ scrollXValue, parentX });
    }
    return positions;
  }, [levelsData, expandedNodes, TOTAL_ITEM_WIDTH, largestLevelMid, nodeCenterX]);

  const localScrollTop = scrollTop / zoom - 1000;
  const TOTAL_ITEM_HEIGHT = nodeHeight + verticalMargin;
  const CONTAINER_HEIGHT = (typeof window !== 'undefined' ? window.innerHeight : 1080) / zoom;
  
  const startLevelIndex = Math.max(0, Math.floor(localScrollTop / TOTAL_ITEM_HEIGHT) - extraItems);
  const endLevelIndex = Math.min(
    levelsData.length - 1,
    Math.floor((localScrollTop + CONTAINER_HEIGHT) / TOTAL_ITEM_HEIGHT) + extraItems
  );

  return (
    <div style={{ position: "relative", width: "100%", height: 1000 }}>
      <ZoomControls
        handleZoomIn={handleZoomIn}
        handleZoomOut={handleZoomOut}
        handleShiftToCenter={scrollToTheCenter}
        disableZoomIn={zoom >= 2}
        disableZoomOut={zoom <= 0.2}
      />
      <div
        ref={scrollContainerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClickCapture={handleCaptureClick}
        style={{
          overflow: "auto",
          whiteSpace: "nowrap",
          width: "100%",
          height: "100%",
          position: "relative",
          cursor: isDragging ? "grabbing" : "grab",
          userSelect: "none",
        }}
      >
      <div
        style={{
          width: (largestListWidth + 2000) * zoom,
          height: (levelsData.length * (nodeHeight + verticalMargin) + 2000) * zoom,
          position: "relative",
        }}
      >
        <div
          style={{
            transform: `scale(${zoom})`,
            transformOrigin: "0 0",
            position: "absolute",
            top: 0,
            left: 0,
            width: largestListWidth + 2000,
            height: levelsData.length * (nodeHeight + verticalMargin) + 2000,
          }}
        >
          <div
            style={{
              width: largestListWidth,
              position: "absolute",
              top: 1000,
              left: 1000,
            }}
          >
          {levelsData.map((levelNodes, index) => {
            if (index < startLevelIndex || index > endLevelIndex) {
              return null;
            }

            const { scrollXValue, parentX } = levelPositions[index];

            return (
              <div
                key={index}
                style={{
                  width: largestListWidth,
                  height: TOTAL_ITEM_HEIGHT,
                  position: "absolute",
                  top: index * TOTAL_ITEM_HEIGHT,
                }}
              >
                <HorizontalList
                  scrollLeft={scrollLeft / zoom - 1000}
                  nodes={levelNodes}
                  treeData={treeData}
                  scrollXValue={scrollXValue}
                  parentX={parentX}
                  NodeElement={NodeElement}
                  level={index}
                  onNodeClick={handleNodeClick}
                  nodeWidth={nodeWidth}
                  nodeHeight={nodeHeight}
                  horizontalMargin={horizontalMargin}
                  verticalMargin={verticalMargin}
                  extraItems={extraItems}
                  nodeCenterX={nodeCenterX}
                  zoom={zoom}
                />
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
    </div>
  );
}