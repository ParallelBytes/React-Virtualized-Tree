import React from 'react';
import { NodeData } from '../types';

const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  } as React.CSSProperties,
  circle: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    backgroundColor: '#FF69B4', // Hot pink
    border: '2px solid #C71585', // Darker pink border
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '12px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    boxSizing: 'border-box',
  } as React.CSSProperties,
  label: {
    fontSize: '14px',
    fontFamily: 'sans-serif',
    color: '#333',
    fontWeight: 500,
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
};

export function DefaultNodeElement<T>({ node }: { node: NodeData<T> }) {
  const label = (node?.nodeInfo as any)?.label || '';
  return (
    <div style={styles.container}>
      <div style={styles.circle}>
      </div>
      {label && <div style={styles.label}>{label}</div>}
    </div>
  );
}
