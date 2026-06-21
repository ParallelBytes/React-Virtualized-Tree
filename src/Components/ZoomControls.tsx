import React from 'react';

interface ZoomControlsProps {
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  handleShiftToCenter: () => void;
  disableZoomIn: boolean;
  disableZoomOut: boolean;
}

export function ZoomControls({
  handleZoomIn,
  handleZoomOut,
  handleShiftToCenter,
  disableZoomIn,
  disableZoomOut,
}: ZoomControlsProps) {
  const buttonStyle: React.CSSProperties = {
    width: '32px',
    height: '32px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'white',
    border: '1px solid #ccc',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px',
    userSelect: 'none',
    color: '#333',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  };

  const disabledStyle: React.CSSProperties = {
    ...buttonStyle,
    opacity: 0.5,
    cursor: 'not-allowed',
  };

  return (
    <div
      style={{
        position: 'absolute',
        top: '20px',
        right: '20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        zIndex: 1000,
      }}
    >
      <button
        onClick={handleZoomIn}
        disabled={disableZoomIn}
        style={disableZoomIn ? disabledStyle : buttonStyle}
        title="Zoom In"
      >
        +
      </button>
      <button
        onClick={handleZoomOut}
        disabled={disableZoomOut}
        style={disableZoomOut ? disabledStyle : buttonStyle}
        title="Zoom Out"
      >
        -
      </button>
      <button
        onClick={handleShiftToCenter}
        style={buttonStyle}
        title="Center View"
      >
        ⌖
      </button>
    </div>
  );
}
