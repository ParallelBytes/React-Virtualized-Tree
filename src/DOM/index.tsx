import React, { useState, useEffect, useRef } from "react";
import { DefaultNodeElement } from "../Components/DefaultNodeElement";
import { VirtualizedTreeProps, NodeData } from "../types";

const ITEM_WIDTH = 100;
const CONTAINER_WIDTH = 800;
const EXTRA_ITEMS = 5;
const MARGIN_RIGHT = 50;

const TOTAL_ITEM_WIDTH = ITEM_WIDTH + MARGIN_RIGHT;

const ListItem = React.memo(({ index, level, NodeElement, onClick }: { index: number, level: number, NodeElement: React.ComponentType<{ node: NodeData<any> }>, onClick?: (node: NodeData<any>) => void }) => {
  const dummyNode: NodeData<any> = {
    id: index,
    x: 0,
    y: 0,
    level: level,
    index: index,
    hasChildren: true,
    isExpanded: false,
    nodeInfo: { label: `Item ${index + 1}` },
  };

  return (
    <div
      onClick={() => onClick && onClick(dummyNode)}
      style={{
        width: ITEM_WIDTH,
        display: "inline-block",
        boxSizing: "border-box",
        marginRight: MARGIN_RIGHT,
        cursor: "pointer",
      }}
    >
      <NodeElement node={dummyNode} />
    </div>
  );
});

function HorizontalList({
  scrollLeft,
  numberOfNodes,
  scrollXValue = 0,
  NodeElement,
  level,
  onNodeClick,
}: {
  scrollLeft: number;
  numberOfNodes: number;
  scrollXValue?: number;
  NodeElement: React.ComponentType<{ node: NodeData<any> }>;
  level: number;
  onNodeClick?: (node: NodeData<any>) => void;
}) {
  const startIndex = Math.floor((scrollLeft - scrollXValue) / TOTAL_ITEM_WIDTH);
  const newStartIndex = Math.max(0, startIndex - EXTRA_ITEMS);
  const renderedNodesCount = Math.min(
    Math.floor(CONTAINER_WIDTH / TOTAL_ITEM_WIDTH) + 2 * EXTRA_ITEMS,
    numberOfNodes - newStartIndex
  );

  const isVisible =
    scrollLeft + CONTAINER_WIDTH >=
    scrollXValue - EXTRA_ITEMS * TOTAL_ITEM_WIDTH &&
    scrollLeft <= scrollXValue + numberOfNodes * TOTAL_ITEM_WIDTH;

  if (!isVisible) {
    return null;
  }

  const items = [];
  for (let i = 0; i < renderedNodesCount; i++) {
    const index = i + newStartIndex;
    items.push(
      <ListItem
        key={index}
        index={index}
        level={level}
        NodeElement={NodeElement}
        onClick={onNodeClick}
      />
    );
  }

  return (
    <div
      style={{
        width: CONTAINER_WIDTH,
        height: 120,
      }}
    >
      <div
        style={{
          transform: `translateX(${scrollXValue + newStartIndex * TOTAL_ITEM_WIDTH
            }px)`,
          willChange: "transform",
        }}
      >
        {items}
      </div>
    </div>
  );
}

export function VirtualizedTree<T>(props: VirtualizedTreeProps<T>) {
  const [scrollLeft, setScrollLeft] = useState(0);
  const [levels, setLevels] = useState<number[]>([1]);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const NodeElement = props.NodeElement || DefaultNodeElement;

  const scrollToTheCenter = () => {
    const node = scrollContainerRef.current;
    if (node) {
      node.scrollTo({
        left: (node.scrollWidth - node.clientWidth) / 2,
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

  const largestList = levels[levels.length - 1];
  const largestListWidth = largestList * TOTAL_ITEM_WIDTH;
  const largestLevelMid = largestListWidth / 2;

  const handleNodeClick = (node: NodeData<any>) => {
    setLevels((prev) => [...prev, prev[prev.length - 1] * 2]);
    if (props.onNodeClick) {
      props.onNodeClick(node);
    }
  };

  return (
    <div
      ref={scrollContainerRef}
      style={{
        overflowX: "auto",
        whiteSpace: "nowrap",
        padding: 50,
        height: 1000,
        overflowY: "auto",
        position: "relative",
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
          width: largestListWidth,
          position: "absolute",
          top: "50%",
          transform: "translateY(-50%)",
        }}
      >
        {levels.map((numberOfNodes, index) => {
          const levelMid = (numberOfNodes * TOTAL_ITEM_WIDTH) / 2;
          const scrollXValue = largestLevelMid - levelMid;

          return (
            <div
              key={index}
              style={{
                width: largestListWidth,
                height: 120,
              }}
            >
              <HorizontalList
                scrollLeft={scrollLeft}
                numberOfNodes={numberOfNodes}
                scrollXValue={scrollXValue}
                NodeElement={NodeElement}
                level={index}
                onNodeClick={handleNodeClick}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}