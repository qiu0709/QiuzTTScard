import React, { useState } from 'react';

/**
 * 視覺化設計編輯器
 * 允許使用者點擊選擇元素並即時調整樣式
 */
const DesignEditor = ({ selectedElement, onStyleChange, onClose }) => {
  const [activeTab, setActiveTab] = useState('layout'); // 'layout' | 'typography' | 'colors'

  const defaultStyle = {
    fontSize: '14px',
    fontWeight: 'normal',
    padding: '10px',
    margin: '0px',
    width: 'auto',
    height: 'auto',
    backgroundColor: 'transparent',
    color: '#333',
    borderRadius: '0px',
    display: 'block',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
    gap: '0px',
    ...selectedElement?.style
  };

  const [currentStyle, setCurrentStyle] = useState(defaultStyle);

  const updateStyle = (property, value) => {
    const newStyle = { ...currentStyle, [property]: value };
    setCurrentStyle(newStyle);
    onStyleChange(newStyle);
  };

  const styles = {
    panel: {
      position: 'fixed',
      right: 0,
      top: 0,
      bottom: 0,
      width: '350px',
      backgroundColor: 'white',
      boxShadow: '-2px 0 10px rgba(0,0,0,0.1)',
      zIndex: 10001,
      display: 'flex',
      flexDirection: 'column',
      overflowY: 'auto'
    },
    header: {
      padding: '20px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: '#f9fafb'
    },
    tabs: {
      display: 'flex',
      gap: '5px',
      padding: '10px 20px',
      borderBottom: '1px solid #e5e7eb',
      backgroundColor: 'white'
    },
    tab: (active) => ({
      padding: '8px 16px',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '13px',
      fontWeight: active ? '600' : '400',
      backgroundColor: active ? '#4F46E5' : 'transparent',
      color: active ? 'white' : '#6b7280',
      border: 'none',
      transition: 'all 0.2s'
    }),
    content: {
      padding: '20px',
      flex: 1
    },
    group: {
      marginBottom: '25px'
    },
    label: {
      display: 'block',
      fontSize: '12px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px',
      textTransform: 'uppercase',
      letterSpacing: '0.5px'
    },
    input: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      fontFamily: 'monospace'
    },
    select: {
      width: '100%',
      padding: '8px 12px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer'
    },
    colorInput: {
      width: '100%',
      height: '40px',
      border: '1px solid #d1d5db',
      borderRadius: '6px',
      cursor: 'pointer'
    },
    row: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '10px',
      marginBottom: '15px'
    },
    closeButton: {
      position: 'absolute',
      top: '20px',
      right: '20px',
      padding: '8px 12px',
      backgroundColor: '#ef4444',
      color: 'white',
      border: 'none',
      borderRadius: '6px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: '600'
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '700' }}>
          🎨 設計編輯器
        </h3>
        <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#6b7280' }}>
          {selectedElement ? `編輯: ${selectedElement.id}` : '點擊元素來編輯'}
        </p>
        <button style={styles.closeButton} onClick={onClose}>
          關閉
        </button>
      </div>

      {selectedElement && (
        <>
          <div style={styles.tabs}>
            <button
              style={styles.tab(activeTab === 'layout')}
              onClick={() => setActiveTab('layout')}
            >
              📐 佈局
            </button>
            <button
              style={styles.tab(activeTab === 'typography')}
              onClick={() => setActiveTab('typography')}
            >
              🔤 文字
            </button>
            <button
              style={styles.tab(activeTab === 'colors')}
              onClick={() => setActiveTab('colors')}
            >
              🎨 顏色
            </button>
          </div>

          <div style={styles.content}>
            {/* 佈局標籤 */}
            {activeTab === 'layout' && (
              <>
                <div style={styles.group}>
                  <label style={styles.label}>寬度 / 高度</label>
                  <div style={styles.row}>
                    <div>
                      <input
                        type="text"
                        style={styles.input}
                        value={currentStyle.width}
                        onChange={(e) => updateStyle('width', e.target.value)}
                        placeholder="auto"
                      />
                      <small style={{ color: '#6b7280', fontSize: '11px' }}>寬度</small>
                    </div>
                    <div>
                      <input
                        type="text"
                        style={styles.input}
                        value={currentStyle.height}
                        onChange={(e) => updateStyle('height', e.target.value)}
                        placeholder="auto"
                      />
                      <small style={{ color: '#6b7280', fontSize: '11px' }}>高度</small>
                    </div>
                  </div>
                </div>

                <div style={styles.group}>
                  <label style={styles.label}>內距 (Padding)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={currentStyle.padding}
                    onChange={(e) => updateStyle('padding', e.target.value)}
                    placeholder="10px"
                  />
                  <small style={{ color: '#6b7280', fontSize: '11px' }}>
                    例如: 10px 或 10px 20px
                  </small>
                </div>

                <div style={styles.group}>
                  <label style={styles.label}>外距 (Margin)</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={currentStyle.margin}
                    onChange={(e) => updateStyle('margin', e.target.value)}
                    placeholder="0px"
                  />
                </div>

                <div style={styles.group}>
                  <label style={styles.label}>圓角</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={currentStyle.borderRadius}
                    onChange={(e) => updateStyle('borderRadius', e.target.value)}
                    placeholder="0px"
                  />
                </div>

                <div style={styles.group}>
                  <label style={styles.label}>顯示方式</label>
                  <select
                    style={styles.select}
                    value={currentStyle.display}
                    onChange={(e) => updateStyle('display', e.target.value)}
                  >
                    <option value="block">Block</option>
                    <option value="flex">Flex</option>
                    <option value="inline-block">Inline Block</option>
                    <option value="grid">Grid</option>
                    <option value="none">Hidden</option>
                  </select>
                </div>

                {currentStyle.display === 'flex' && (
                  <>
                    <div style={styles.group}>
                      <label style={styles.label}>對齊</label>
                      <div style={styles.row}>
                        <select
                          style={styles.select}
                          value={currentStyle.justifyContent}
                          onChange={(e) => updateStyle('justifyContent', e.target.value)}
                        >
                          <option value="flex-start">靠左</option>
                          <option value="center">置中</option>
                          <option value="flex-end">靠右</option>
                          <option value="space-between">分散</option>
                        </select>
                        <select
                          style={styles.select}
                          value={currentStyle.alignItems}
                          onChange={(e) => updateStyle('alignItems', e.target.value)}
                        >
                          <option value="flex-start">靠上</option>
                          <option value="center">垂直置中</option>
                          <option value="flex-end">靠下</option>
                        </select>
                      </div>
                    </div>

                    <div style={styles.group}>
                      <label style={styles.label}>間距 (Gap)</label>
                      <input
                        type="text"
                        style={styles.input}
                        value={currentStyle.gap}
                        onChange={(e) => updateStyle('gap', e.target.value)}
                        placeholder="0px"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {/* 文字標籤 */}
            {activeTab === 'typography' && (
              <>
                <div style={styles.group}>
                  <label style={styles.label}>字體大小</label>
                  <input
                    type="text"
                    style={styles.input}
                    value={currentStyle.fontSize}
                    onChange={(e) => updateStyle('fontSize', e.target.value)}
                    placeholder="14px"
                  />
                </div>

                <div style={styles.group}>
                  <label style={styles.label}>字體粗細</label>
                  <select
                    style={styles.select}
                    value={currentStyle.fontWeight}
                    onChange={(e) => updateStyle('fontWeight', e.target.value)}
                  >
                    <option value="300">細體 (300)</option>
                    <option value="normal">一般 (400)</option>
                    <option value="500">中粗 (500)</option>
                    <option value="600">粗體 (600)</option>
                    <option value="700">特粗 (700)</option>
                    <option value="bold">加粗</option>
                  </select>
                </div>
              </>
            )}

            {/* 顏色標籤 */}
            {activeTab === 'colors' && (
              <>
                <div style={styles.group}>
                  <label style={styles.label}>文字顏色</label>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={currentStyle.color}
                    onChange={(e) => updateStyle('color', e.target.value)}
                  />
                  <input
                    type="text"
                    style={{ ...styles.input, marginTop: '5px' }}
                    value={currentStyle.color}
                    onChange={(e) => updateStyle('color', e.target.value)}
                  />
                </div>

                <div style={styles.group}>
                  <label style={styles.label}>背景顏色</label>
                  <input
                    type="color"
                    style={styles.colorInput}
                    value={currentStyle.backgroundColor === 'transparent' ? '#ffffff' : currentStyle.backgroundColor}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                  />
                  <input
                    type="text"
                    style={{ ...styles.input, marginTop: '5px' }}
                    value={currentStyle.backgroundColor}
                    onChange={(e) => updateStyle('backgroundColor', e.target.value)}
                    placeholder="transparent"
                  />
                </div>
              </>
            )}

            {/* 快速操作 */}
            <div style={{ ...styles.group, borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
              <label style={styles.label}>快速操作</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button
                  onClick={() => {
                    setCurrentStyle(defaultStyle);
                    onStyleChange(defaultStyle);
                  }}
                  style={{
                    padding: '10px',
                    backgroundColor: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px'
                  }}
                >
                  🔄 重置為預設
                </button>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(currentStyle, null, 2));
                    alert('樣式已複製到剪貼簿!');
                  }}
                  style={{
                    padding: '10px',
                    backgroundColor: '#eff6ff',
                    border: '1px solid #3b82f6',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '13px',
                    color: '#1e40af'
                  }}
                >
                  📋 複製樣式代碼
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {!selectedElement && (
        <div style={{ ...styles.content, textAlign: 'center', color: '#9ca3af', padding: '40px 20px' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>👆</div>
          <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginBottom: '10px' }}>
            設計模式已啟用
          </h4>
          <p style={{ fontSize: '14px', lineHeight: '1.6', margin: '0 0 15px 0' }}>
            點擊播放設定頁面中帶有虛線框的元素來編輯樣式
          </p>
          <div style={{
            backgroundColor: '#eff6ff',
            padding: '15px',
            borderRadius: '8px',
            border: '1px solid #bfdbfe',
            textAlign: 'left',
            fontSize: '13px',
            color: '#1e40af'
          }}>
            <div style={{ fontWeight: '600', marginBottom: '8px' }}>💡 提示:</div>
            <ul style={{ margin: 0, paddingLeft: '20px', lineHeight: '1.8' }}>
              <li>虛線框表示可編輯元素</li>
              <li>Hover 時會變成實線藍框</li>
              <li>點擊後這裡會顯示編輯選項</li>
              <li>在設計模式下,元素的原本功能會被停用</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DesignEditor;
