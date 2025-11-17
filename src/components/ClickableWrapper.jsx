import React from 'react';

/**
 * 可點擊包裝器 - 在設計模式下攔截點擊事件
 */
const ClickableWrapper = ({
  children,
  designMode,
  elementId,
  onSelect,
  isSelected = false,
  customStyle = {}
}) => {
  const handleClick = (e) => {
    if (designMode) {
      e.preventDefault();
      e.stopPropagation();
      onSelect && onSelect({
        id: elementId,
        element: e.currentTarget,
        style: customStyle
      });
    }
  };

  const wrapperStyle = designMode ? {
    position: 'relative',
    cursor: 'pointer',
    outline: isSelected ? '3px solid #4F46E5' : '1px dashed rgba(79, 70, 229, 0.3)',
    outlineOffset: '2px',
    transition: 'outline 0.2s',
    ...customStyle
  } : customStyle;

  const hoverStyle = designMode && !isSelected ? {
    outline: '2px solid #818cf8'
  } : {};

  return (
    <div
      data-element-id={elementId}
      onClick={handleClick}
      style={wrapperStyle}
      onMouseEnter={(e) => {
        if (designMode && !isSelected) {
          Object.assign(e.currentTarget.style, hoverStyle);
        }
      }}
      onMouseLeave={(e) => {
        if (designMode && !isSelected) {
          e.currentTarget.style.outline = '1px dashed rgba(79, 70, 229, 0.3)';
        }
      }}
    >
      {children}
      {designMode && isSelected && (
        <div style={{
          position: 'absolute',
          top: '-25px',
          left: '0',
          backgroundColor: '#4F46E5',
          color: 'white',
          padding: '3px 8px',
          borderRadius: '4px',
          fontSize: '11px',
          fontWeight: '600',
          zIndex: 10000,
          whiteSpace: 'nowrap'
        }}>
          ✏️ 編輯中: {elementId}
        </div>
      )}
    </div>
  );
};

export default ClickableWrapper;
