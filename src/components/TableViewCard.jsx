import React from 'react';

/**
 * 表格視圖組件 - 將卡片欄位以表格形式顯示
 */
const TableViewCard = ({ card, fields, showFurigana = true }) => {
  // 按順序排序欄位
  const sortedFields = Object.entries(fields)
    .filter(([key]) => card.fields[key]) // 只顯示有值的欄位
    .sort(([, a], [, b]) => (a.order || 0) - (b.order || 0));

  const styles = {
    table: {
      width: '100%',
      borderCollapse: 'collapse',
      backgroundColor: 'var(--paper)',
      borderRadius: '14px',
      overflow: 'hidden',
      boxShadow: '0 10px 30px rgba(43, 39, 34, 0.12)'
    },
    th: {
      padding: '15px 20px',
      textAlign: 'left',
      backgroundColor: 'var(--accent)',
      color: 'white',
      fontWeight: '600',
      fontSize: '14px',
      borderBottom: '2px solid var(--accent-dark)'
    },
    td: {
      padding: '15px 20px',
      borderBottom: '1px solid var(--border)',
      fontSize: '16px',
      color: 'var(--ink)'
    },
    row: {
      transition: 'background-color 0.2s',
      cursor: 'pointer'
    },
    fieldLabel: {
      fontWeight: '600',
      color: 'var(--accent)',
      minWidth: '120px',
      backgroundColor: 'var(--paper)'
    }
  };

  // 解析漢字注音格式
  const parseKanjiText = (text) => {
    if (!text) return [];
    const regex = /([^[\]]+)\[([^\]]+)\]|([^[\]]+)/g;
    const parts = [];
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match[1] && match[2]) {
        parts.push({ text: match[1], furigana: match[2], type: 'kanji' });
      } else if (match[3]) {
        parts.push({ text: match[3], type: 'text' });
      }
    }
    return parts;
  };

  const renderFieldValue = (value, fieldType) => {
    if (fieldType === 'kanji' && showFurigana) {
      const parts = parseKanjiText(value);
      return (
        <span style={{ lineHeight: '2.5' }}>
          {parts.map((part, idx) => (
            <span key={idx} style={{ position: 'relative', display: 'inline-block' }}>
              {part.type === 'kanji' && part.furigana ? (
                <>
                  <span style={{
                    position: 'absolute',
                    top: '-1.2em',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.6em',
                    color: 'var(--muted)',
                    whiteSpace: 'nowrap'
                  }}>
                    {part.furigana}
                  </span>
                  <span>{part.text}</span>
                </>
              ) : (
                <span>{part.text}</span>
              )}
            </span>
          ))}
        </span>
      );
    }
    return value;
  };

  return (
    <table style={styles.table}>
      <thead>
        <tr>
          <th style={styles.th}>欄位</th>
          <th style={styles.th}>內容</th>
        </tr>
      </thead>
      <tbody>
        {sortedFields.map(([key, field]) => (
          <tr
            key={key}
            style={styles.row}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--paper)'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
          >
            <td style={{ ...styles.td, ...styles.fieldLabel }}>
              {field.label || key}
            </td>
            <td style={styles.td}>
              {renderFieldValue(card.fields[key], field.type)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default TableViewCard;
