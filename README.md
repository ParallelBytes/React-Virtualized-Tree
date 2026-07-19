# React Virtualized Tree

A high-performance virtualized tree view component using React and Konva, designed for displaying large tree structures efficiently.

## Installation

```bash
npm install react-virtualized-tree

or

yarn add react-virtualized-tree
```

## Usage

```tsx
import React from "react";
import { VirtualizedTree, NodeData } from "react-virtualized-tree";

const data: NodeData = {
  id: 1,
  x: 0,
  y: 0,
  level: 0,
  index: 0,
  hasChildren: true,
  isExpanded: true,
  nodeInfo: { name: "CEO" },
  children: [
    {
      id: 2,
      x: 0,
      y: 0,
      level: 1,
      index: 0,
      hasChildren: false,
      isExpanded: false,
      nodeInfo: { name: "CTO" },
      children: [],
    },
  ],
};

function App() {
  return (
    <div style={{ width: "100vw", height: "100vh" }}>
      <VirtualizedTree
        data={data}
        zoom={true}
        pan={true}
        onNodeClick={(node) => console.log("Clicked:", node)}
      />
    </div>
  );
}

export default App;
```

## Props

| Prop               | Type                                         | Default              | Description                                     |
| ------------------ | -------------------------------------------- | -------------------- | ----------------------------------------------- |
| `data`             | `NodeData<T>`                                | Required             | The root node of the tree data.                 |
| `canvasWidth`      | `number`                                     | `window.innerWidth`  | Width of the canvas stage.                      |
| `canvasHeight`     | `number`                                     | `window.innerHeight` | Height of the canvas stage.                     |
| `zoom`             | `boolean`                                    | `true`               | Enable or disable zoom controls.                |
| `pan`              | `boolean`                                    | `true`               | Enable or disable panning.                      |
| `onNodeClick`      | `(node: NodeData<T>) => void`                | `undefined`          | Callback function when a node is clicked.       |
| `NodeElement`      | `React.ComponentType<{ node: NodeData<T> }>` | `DefaultNodeElement` | Custom component to render for each node.       |
| `horizontalMargin` | `number`                                     | `150`                | Horizontal spacing between nodes.               |
| `verticalMargin`   | `number`                                     | `100`                | Vertical spacing between levels.                |
| `nodeWidth`        | `number`                                     | `40`                 | Width of the node (used for line calculation).  |
| `nodeHeight`       | `number`                                     | `40`                 | Height of the node (used for line calculation). |

## Types

### NodeData<T>

```typescript
interface NodeData<T = any> {
  id: number;
  x: number; // Position on X axis
  y: number; // Position on Y axis
  level: number; // Level of the node
  index: number; // Index of the node
  hasChildren: boolean;
  isExpanded: boolean;
  nodeInfo: T; // Your custom data here
  children?: NodeData<T>[];
}
```

## Custom Node Element

You can provide a custom component to render nodes using the `NodeElement` prop.

```tsx
import { NodeData } from "react-virtualized-tree";

const CustomNode = ({
  node,
}: {
  node: NodeData<{ name: string; role: string }>;
}) => {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        padding: "10px",
        background: "white",
        borderRadius: "5px",
        textAlign: "center",
      }}
    >
      <strong>{node.nodeInfo.name}</strong>
      <div>{node.nodeInfo.role}</div>
    </div>
  );
};

// Usage
<VirtualizedTree data={data} NodeElement={CustomNode} />;
```

## License

MIT
