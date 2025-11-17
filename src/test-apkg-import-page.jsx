import React, { useState } from 'react';
import { parseApkgFile, convertToAppFormat } from './utils/apkgImporter.js';

export default function TestApkgImportPage() {
  const [output, setOutput] = useState('請選擇 .apkg 檔案,然後點擊「開始測試」按鈕。');
  const [selectedFile, setSelectedFile] = useState(null);

  const log = (msg) => {
    setOutput(prev => prev + '\n' + msg);
    console.log(msg);
  };

  const clearLog = () => {
    setOutput('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    if (file) {
      setOutput(`已選擇: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
    }
  };

  const testImport = async () => {
    if (!selectedFile) {
      setOutput('❌ 請先選擇檔案!');
      return;
    }

    clearLog();
    log('=== 開始測試 ===');
    log(`檔案名稱: ${selectedFile.name}`);
    log(`檔案大小: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`);
    log('');

    try {
      // 使用我們的 parseApkgFile 函數
      log('開始解析 .apkg 檔案...');
      const ankiCards = await parseApkgFile(selectedFile);

      log('');
      log(`✅ 成功提取 ${ankiCards.length} 張卡片`);

      // 顯示前3張卡片
      log('');
      log('前3張卡片內容:');
      ankiCards.slice(0, 3).forEach((card, index) => {
        log('');
        log(`--- 卡片 ${index + 1} (ID: ${card.id}) ---`);
        log(`  欄位數量: ${Object.keys(card.fields).length}`);
        Object.entries(card.fields).forEach(([key, value]) => {
          const preview = value.length > 80 ? value.substring(0, 80) + '...' : value;
          log(`  ${key}: ${preview}`);
        });
      });

      // 測試轉換為應用程式格式
      log('');
      log('測試轉換為應用程式格式...');
      const folderData = convertToAppFormat(ankiCards, '適時適所');

      log('');
      log(`✅ 成功轉換!`);
      log(`資料夾名稱: ${folderData.name}`);
      log(`欄位定義: ${JSON.stringify(folderData.fields, null, 2)}`);
      log(`卡片數量: ${folderData.cards.length}`);

      log('');
      log('前3張轉換後的卡片:');
      folderData.cards.slice(0, 3).forEach((card, index) => {
        log('');
        log(`--- 轉換後卡片 ${index + 1} ---`);
        Object.entries(card.fields).forEach(([key, value]) => {
          const preview = value.length > 60 ? value.substring(0, 60) + '...' : value;
          log(`  ${key}: ${preview}`);
        });
      });

      log('');
      log('=== ✅ 測試完全成功! ===');

    } catch (error) {
      log('');
      log('=== ❌ 錯誤 ===');
      log(`錯誤訊息: ${error.message}`);
      log(`錯誤堆疊:\n${error.stack}`);
      console.error('完整錯誤:', error);
    }
  };

  return (
    <div style={{
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      maxWidth: '1200px',
      margin: '40px auto',
      padding: '20px'
    }}>
      <h1>測試 .apkg 匯入功能</h1>

      <div style={{ marginBottom: '20px' }}>
        <input
          type="file"
          accept=".apkg"
          onChange={handleFileChange}
          style={{ marginRight: '10px' }}
        />
        <button
          onClick={testImport}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            cursor: 'pointer',
            background: '#4F46E5',
            color: 'white',
            border: 'none',
            borderRadius: '6px'
          }}
        >
          開始測試
        </button>
      </div>

      <div style={{
        marginTop: '20px',
        padding: '20px',
        background: '#f5f5f5',
        borderRadius: '8px',
        border: '1px solid #ddd'
      }}>
        <h3>輸出:</h3>
        <pre style={{
          whiteSpace: 'pre-wrap',
          wordWrap: 'break-word',
          fontFamily: 'monospace',
          fontSize: '13px',
          lineHeight: '1.5'
        }}>
          {output}
        </pre>
      </div>
    </div>
  );
}
