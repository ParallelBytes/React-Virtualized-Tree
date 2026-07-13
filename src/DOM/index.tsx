import React, { useState, useEffect, useLayoutEffect, useRef, useMemo, useCallback } from "react";
import { DefaultNodeElement } from "../Components/DefaultNodeElement";
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
}) {
  const TOTAL_ITEM_WIDTH = nodeWidth + horizontalMargin;
  const CONTAINER_WIDTH = typeof window !== 'undefined' ? window.innerWidth : 1920;
  
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
          horizontalMargin={horizontalMargin}
        />
      );

      if (parentX !== undefined) {
        const currentOffset = scrollXValue + newStartIndex * TOTAL_ITEM_WIDTH;
        const localChildX = (index - newStartIndex) * TOTAL_ITEM_WIDTH + nodeCenterX;
        const localParentX = parentX - currentOffset;

        const startY = 0;
        const endY = verticalMargin;
        const halfY = verticalMargin / 2;

        const d = `M ${localChildX} ${endY} L ${localChildX} ${halfY} L ${localParentX} ${halfY} L ${localParentX} ${startY}`;

        lines.push(
          <path
            key={`line-${nodeId}`}
            d={d}
            stroke="#666"
            strokeWidth={2}
            fill="none"
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
    nodeWidth = 120,
    nodeHeight = 40,
    horizontalMargin = 70,
    verticalMargin = 100,
    extraItems = 5,
    nodeCenterX = 20,
  } = props;

  const TOTAL_ITEM_WIDTH = nodeWidth + horizontalMargin;

  const treeData = useMemo(() => flattenTree(props.data), [props.data]);

  const [scrollLeft, setScrollLeft] = useState(0);
  const [levelsData, setLevelsData] = useState<number[][]>(
    props.data ? [[props.data.id]] : []
  );
  const [expandedNodes, setExpandedNodes] = useState<Record<number, number>>({});
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0, moved: false });

  const NodeElement = props.NodeElement || DefaultNodeElement;

  const scrollToTheCenter = () => {
    const node = scrollContainerRef.current;
    if (node) {
      node.scrollTo({
        left: (node.scrollWidth - node.clientWidth) / 2,
        top: (node.scrollHeight - node.clientHeight) / 2,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    const handleScroll = () => {
      if (!scrollContainerRef.current) return;
      setScrollLeft(scrollContainerRef.current.scrollLeft);
    };

    const container = scrollContainerRef.current;
    container?.addEventListener("scroll", handleScroll);
    return () => container?.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    scrollToTheCenter();
  }, []);

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
        scrollContainerRef.current.scrollLeft += diff;
        setScrollLeft(scrollContainerRef.current.scrollLeft);
      }
    }
    prevLargestLevelMidRef.current = largestLevelMid;
  }, [largestLevelMid]);

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

  return (
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
        height: 1000,
        position: "relative",
        cursor: isDragging ? "grabbing" : "grab",
        userSelect: "none",
      }}
    >
      <button
        style={{
          position: "fixed",
          top: 10,
          right: 10,
          zIndex: 10,
          padding: "8px 16px",
        }}
        onClick={() => scrollToTheCenter()}
      >
        Center
      </button>
      <div
        style={{
          width: largestListWidth + 2000,
          height: levelsData.length * (nodeHeight + verticalMargin) + 2000,
          position: "relative",
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
            const numberOfNodes = levelNodes.length;
            const levelMid = (numberOfNodes * TOTAL_ITEM_WIDTH) / 2;
            const scrollXValue = largestLevelMid - levelMid;

            let parentX: number | undefined;
            if (index > 0) {
              const parentId = expandedNodes[index - 1];
              if (parentId !== undefined) {
                const parentLevelNodes = levelsData[index - 1];
                const parentIndex = parentLevelNodes.indexOf(parentId);
                if (parentIndex !== -1) {
                  const parentNumberOfNodes = parentLevelNodes.length;
                  const parentLevelMid = (parentNumberOfNodes * TOTAL_ITEM_WIDTH) / 2;
                  const parentScrollXValue = largestLevelMid - parentLevelMid;
                  parentX = parentScrollXValue + parentIndex * TOTAL_ITEM_WIDTH + nodeCenterX;
                }
              }
            }

            return (
              <div
                key={index}
                style={{
                  width: largestListWidth,
                  height: nodeHeight + verticalMargin,
                }}
              >
                <HorizontalList
                  scrollLeft={scrollLeft - 1000}
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
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}