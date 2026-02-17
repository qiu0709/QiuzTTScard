import { useCallback } from 'react';

/**
 * 設計模式 Hook
 * 提供快速包裝元素為可編輯的工具函數
 */
export const useDesignMode = (designMode, selectedElement, setSelectedElement, customStyles, setCustomStyles) => {

  // 包裝元素使其可編輯
  const wrapEditable = useCallback((elementId, element, defaultStyle = {}) => {
    if (!designMode) {
      // 非設計模式,直接返回元素加上自定義樣式
      return {
        ...element,
        props: {
          ...element.props,
          style: {
            ...element.props?.style,
            ...(customStyles[elementId] || {})
          }
        }
      };
    }

    const isSelected = selectedElement?.id === elementId;

    return {
      ...element,
      props: {
        ...element.props,
        'data-element-id': elementId,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setSelectedElement({
            id: elementId,
            element: e.currentTarget,
            style: customStyles[elementId] || defaultStyle
          });
        },
        style: {
          ...element.props?.style,
          ...(customStyles[elementId] || {}),
          position: 'relative',
          cursor: 'pointer',
          outline: isSelected ? '3px solid var(--accent)' : '1px dashed rgba(79, 70, 229, 0.3)',
          outlineOffset: '2px',
          transition: 'outline 0.2s'
        }
      }
    };
  }, [designMode, selectedElement, setSelectedElement, customStyles]);

  // 批量為元素添加可編輯樣式
  const getEditableStyle = useCallback((elementId, baseStyle = {}) => {
    const isSelected = selectedElement?.id === elementId;

    if (!designMode) {
      return {
        ...baseStyle,
        ...(customStyles[elementId] || {})
      };
    }

    return {
      ...baseStyle,
      ...(customStyles[elementId] || {}),
      position: 'relative',
      outline: isSelected ? '3px solid var(--accent)' : '1px dashed rgba(79, 70, 229, 0.3)',
      outlineOffset: '2px',
      transition: 'outline 0.2s',
      cursor: 'pointer'
    };
  }, [designMode, selectedElement, customStyles]);

  // 處理元素點擊
  const handleEditableClick = useCallback((elementId, defaultStyle = {}) => (e) => {
    if (!designMode) return;

    e.preventDefault();
    e.stopPropagation();

    setSelectedElement({
      id: elementId,
      element: e.currentTarget,
      style: customStyles[elementId] || defaultStyle
    });
  }, [designMode, setSelectedElement, customStyles]);

  // 應用主題
  const applyTheme = useCallback((themeName) => {
    const themes = {
      default: {
        primaryColor: 'var(--accent)',
        buttonRadius: '8px',
        fontSize: '14px'
      },
      orange: {
        primaryColor: '#f59e0b',
        buttonRadius: '12px',
        fontSize: '14px'
      },
      green: {
        primaryColor: 'var(--success)',
        buttonRadius: '6px',
        fontSize: '13px'
      }
    };

    const theme = themes[themeName] || themes.default;

    // 為所有按鈕應用主題
    const newStyles = {};
    Object.keys(customStyles).forEach(key => {
      if (key.includes('button')) {
        newStyles[key] = {
          ...customStyles[key],
          backgroundColor: theme.primaryColor,
          borderRadius: theme.buttonRadius,
          fontSize: theme.fontSize
        };
      }
    });

    setCustomStyles({ ...customStyles, ...newStyles });
  }, [customStyles, setCustomStyles]);

  return {
    getEditableStyle,
    handleEditableClick,
    applyTheme
  };
};
