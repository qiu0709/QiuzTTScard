import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Plus, Trash2, ChevronLeft, BookOpen, Brain, Volume2, Grid3x3, Eye, EyeOff } from 'lucide-react';

const App = () => {
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentCard, setCurrentCard] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  
  const [settings, setSettings] = useState({
    defaultRate: 1.0,
    showFurigana: true
  });

  // 預設欄位定義
  const DEFAULT_FIELDS = {
    kanji: { label: '漢字', type: 'kanji', order: 1 },
    hiragana: { label: 'ひらがな', type: 'text', order: 2 },
    meaning: { label: '意味', type: 'text', order: 3 },
    example: { label: '例文', type: 'kanji', order: 4 },
    level: { label: 'レベル', type: 'text', order: 5 }
  };

  // 獲取當前欄位定義
  const getCurrentFields = useCallback(() => {
    return currentFolder?.customFields || DEFAULT_FIELDS;
  }, [currentFolder]);

  // 漢字注音顯示組件
  const KanjiWithFurigana = ({ text, showFurigana = true }) => {
    if (!text) return null;
    
    const parts = [];
    const regex = /([一-龯々〆〤ヶ]+)\[([あ-んゃゅょぁぃぅぇぉっー]+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ text: text.slice(lastIndex, match.index), type: 'normal' });
      }
      parts.push({ text: match[1], furigana: match[2], type: 'kanji' });
      lastIndex = regex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push({ text: text.slice(lastIndex), type: 'normal' });
    }
    
    if (parts.length === 0) {
      parts.push({ text: text, type: 'normal' });
    }
    
    return (
      <span className="inline-block">
        {parts.map((part, index) => (
          <span key={index} className="inline-block">
            {part.type === 'kanji' && showFurigana ? (
              <ruby style={{ rubyAlign: 'center' }}>
                {part.text}
                <rt style={{ 
                  fontSize: '0.5em', 
                  color: '#6B7280',
                  fontWeight: 'normal',
                  lineHeight: '1'
                }}>
                  {part.furigana}
                </rt>
              </ruby>
            ) : (
              part.text
            )}
          </span>
        ))}
      </span>
    );
  };

  // Google 試算表匯入對話框
  const ImportDialog = () => {
    const [importUrl, setImportUrl] = useState('');
    const [importText, setImportText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [importMode, setImportMode] = useState('append');

    const parseCSVData = (csvText) => {
      const lines = csvText.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        throw new Error('CSV 數據至少需要標題行和一行數據');
      }

      const parseCSVLine = (line) => {
        const result = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim().replace(/^"(.*)"$/, '$1'));
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim().replace(/^"(.*)"$/, '$1'));
        return result;
      };

      const headers = parseCSVLine(lines[0]);
      const rows = [];

      for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        if (Object.values(row).some(val => val.trim())) {
          rows.push(row);
        }
      }

      return { headers, rows };
    };

    const handleImport = (headers, rows) => {
      const newFields = {};
      headers.forEach((header, index) => {
        const fieldKey = header.toLowerCase()
          .replace(/\s+/g, '_')
          .replace(/[^\w]/g, '')
          .replace(/^(\d)/, 'field_$1');
        
        newFields[fieldKey] = {
          label: header,
          type: (header.includes('漢字') || header.includes('kanji') || 
                 header.includes('例文') || header.includes('example')) ? 'kanji' : 'text',
          order: index + 1
        };
      });

      const newCards = rows.map((row, index) => {
        const fields = {};
        headers.forEach(header => {
          const fieldKey = header.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w]/g, '')
            .replace(/^(\d)/, 'field_$1');
          fields[fieldKey] = row[header] || '';
        });

        return {
          id: Date.now() + index + Math.random(),
          fields,
          pages: [
            {
              id: 'page1',
              name: '基本',
              displayFields: Object.keys(newFields).slice(0, 2),
              script: [
                { type: 'speak', field: Object.keys(newFields)[0], repeat: 2, rate: 0.8 },
                { type: 'pause', duration: 1000 },
                { type: 'speak', field: Object.keys(newFields)[1], repeat: 1, rate: 1.0 }
              ]
            }
          ]
        };
      });

      const updatedFolders = folders.map(folder => {
        if (folder.id === currentFolder.id) {
          if (importMode === 'replace') {
            return {
              ...folder,
              cards: newCards,
              customFields: newFields
            };
          } else {
            const mergedFields = { ...folder.customFields };
            Object.entries(newFields).forEach(([key, field]) => {
              if (!mergedFields[key]) {
                const maxOrder = Math.max(...Object.values(mergedFields).map(f => f.order || 0));
                mergedFields[key] = { ...field, order: maxOrder + 1 };
              }
            });

            return {
              ...folder,
              cards: [...folder.cards, ...newCards],
              customFields: mergedFields
            };
          }
        }
        return folder;
      });

      setFolders(updatedFolders);
      const updatedFolder = updatedFolders.find(f => f.id === currentFolder.id);
      setCurrentFolder(updatedFolder);

      alert(`成功匯入 ${newCards.length} 張卡片！${importMode === 'replace' ? '（已替換原有資料）' : '（已添加到現有資料）'}`);
      setShowImportDialog(false);
      setImportUrl('');
      setImportText('');
    };

    const handleGoogleSheetsImport = async () => {
      if (!importUrl.trim()) {
        alert('請輸入 Google 試算表 URL');
        return;
      }

      setIsLoading(true);
      try {
        let csvUrl = importUrl.trim();
        
        if (csvUrl.includes('/edit')) {
          csvUrl = csvUrl.replace('/edit#gid=', '/export?format=csv&gid=');
          csvUrl = csvUrl.replace('/edit', '/export?format=csv');
        } else if (csvUrl.includes('/d/') && !csvUrl.includes('/export')) {
          const match = csvUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
          if (match) {
            csvUrl = `https://docs.google.com/spreadsheets/d/${match[1]}/export?format=csv`;
          }
        }

        const response = await fetch(csvUrl);
        if (!response.ok) {
          throw new Error(`無法獲取試算表數據 (${response.status})。請確認 URL 正確且試算表已設為公開檢視`);
        }

        const csvText = await response.text();
        if (!csvText || csvText.trim() === '') {
          throw new Error('試算表內容為空');
        }

        const { headers, rows } = parseCSVData(csvText);
        if (rows.length === 0) {
          throw new Error('試算表中沒有有效的數據行');
        }

        handleImport(headers, rows);

      } catch (error) {
        alert('匯入失敗：' + error.message);
      } finally {
        setIsLoading(false);
      }
    };

    const handleCSVTextImport = () => {
      if (!importText.trim()) {
        alert('請貼上 CSV 數據');
        return;
      }

      try {
        const { headers, rows } = parseCSVData(importText);
        handleImport(headers, rows);
      } catch (error) {
        alert('匯入失敗：' + error.message);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-3xl w-full max-h-screen overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">匯入數據</h3>
            <button onClick={() => setShowImportDialog(false)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
              關閉
            </button>
          </div>

          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">匯入模式</h4>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="mr-2"
                />
                <span>附加模式 - 將新數據添加到現有卡片後面</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value)}
                  className="mr-2"
                />
                <span className="text-red-600">替換模式 - 完全替換現有的所有卡片</span>
              </label>
            </div>
          </div>

          <div className="space-y-6">
            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium mb-3">從 Google 試算表匯入</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="貼上 Google 試算表 URL"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
                <button
                  onClick={handleGoogleSheetsImport}
                  disabled={isLoading}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:bg-gray-400"
                >
                  {isLoading ? '匯入中...' : '從 Google 試算表匯入'}
                </button>
              </div>
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
                <p className="text-sm text-blue-800">
                  <strong>設定步驟：</strong><br />
                  1. 開啟 Google 試算表 → 2. 點擊「共用」→ 3. 設為「知道連結的使用者」可檢視 → 4. 複製連結
                </p>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <h4 className="font-medium mb-3">從 CSV 文字匯入</h4>
              <textarea
                placeholder="貼上 CSV 數據，例如：&#10;漢字,ひらがな,意味&#10;学校[がっこう],がっこう,學校"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                rows="4"
              />
              <button
                onClick={handleCSVTextImport}
                className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                從 CSV 文字匯入
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // TTS 語音合成功能
  const speak = useCallback((text, options = {}) => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('不支援語音合成'));
        return;
      }

      const cleanText = text.replace(/\[([あ-んゃゅょぁぃぅぇぉっー]+)\]/g, '');

      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.rate = options.rate || settings.defaultRate;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = speechSynthesis.getVoices();
      const japaneseVoice = voices.find(v => 
        v.lang.includes('ja') || v.name.includes('Japanese')
      );
      if (japaneseVoice) utterance.voice = japaneseVoice;

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      speechSynthesis.speak(utterance);
    });
  }, [settings.defaultRate]);

  // 腳本播放引擎
  const executeScript = useCallback(async (card, pageIndex = 0) => {
    if (!card?.pages?.[pageIndex]) return;
    
    setIsPlaying(true);
    const page = card.pages[pageIndex];

    try {
      for (let i = 0; i < page.script.length; i++) {
        const step = page.script[i];

        switch (step.type) {
          case 'speak':
            const text = card.fields[step.field];
            if (text) {
              const repeatCount = step.repeat || 1;
              for (let r = 0; r < repeatCount; r++) {
                await speak(text, { rate: step.rate || settings.defaultRate });
                if (r < repeatCount - 1) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                }
              }
            }
            break;
          case 'pause':
            await new Promise(resolve => setTimeout(resolve, step.duration || 1000));
            break;
        }

        if (!isPlaying) break;
      }
    } catch (error) {
      console.error('播放錯誤:', error);
    } finally {
      setIsPlaying(false);
    }
  }, [speak, isPlaying]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
  }, []);

  // 初始化
  useEffect(() => {
    const savedData = localStorage.getItem('japanese-vocab-data');
    if (savedData) {
      try {
        const data = JSON.parse(savedData);
        setFolders(data.folders || []);
        setSettings({ ...settings, ...data.settings });
      } catch (e) {
        console.error('載入失敗:', e);
      }
    } else {
      const sampleFolder = {
        id: Date.now(),
        name: '日本語単語',
        icon: '🇯🇵',
        customFields: DEFAULT_FIELDS,
        cards: [
          {
            id: 1,
            fields: {
              kanji: '学校[がっこう]',
              hiragana: 'がっこう',
              meaning: '學校',
              example: '私[わたし]は学校[がっこう]に行[い]きます。',
              level: 'N5'
            },
            pages: [
              {
                id: 'page1',
                name: '基本',
                displayFields: ['kanji', 'meaning'],
                script: [
                  { type: 'speak', field: 'kanji', repeat: 2, rate: 0.8 },
                  { type: 'pause', duration: 1000 },
                  { type: 'speak', field: 'meaning', repeat: 1, rate: 1.0 }
                ]
              }
            ]
          }
        ]
      };
      setFolders([sampleFolder]);
    }
  }, []);

  // 保存數據
  useEffect(() => {
    localStorage.setItem('japanese-vocab-data', JSON.stringify({ folders, settings }));
  }, [folders, settings]);

  // 自定義欄位編輯器
  const FieldEditor = () => {
    const [editingFields, setEditingFields] = useState({});
    const [newFieldKey, setNewFieldKey] = useState('');
    const [newFieldLabel, setNewFieldLabel] = useState('');
    const [newFieldType, setNewFieldType] = useState('text');
    const [draggedItem, setDraggedItem] = useState(null);
    const [dragOverItem, setDragOverItem] = useState(null);

    useEffect(() => {
      setEditingFields({ ...getCurrentFields() });
    }, [getCurrentFields]);

    const addField = () => {
      if (newFieldKey && newFieldLabel) {
        const maxOrder = Math.max(...Object.values(editingFields).map(f => f.order || 0));
        setEditingFields({
          ...editingFields,
          [newFieldKey]: {
            label: newFieldLabel,
            type: newFieldType,
            order: maxOrder + 1
          }
        });
        setNewFieldKey('');
        setNewFieldLabel('');
      }
    };

    const removeField = (fieldKey) => {
      const newFields = { ...editingFields };
      delete newFields[fieldKey];
      setEditingFields(newFields);
    };

    const updateField = (fieldKey, updates) => {
      setEditingFields({
        ...editingFields,
        [fieldKey]: { ...editingFields[fieldKey], ...updates }
      });
    };

    // 拖曳功能
    const handleDragStart = (e, fieldKey) => {
      setDraggedItem(fieldKey);
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e, fieldKey) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverItem(fieldKey);
    };

    const handleDragLeave = () => {
      setDragOverItem(null);
    };

    const handleDrop = (e, targetFieldKey) => {
      e.preventDefault();
      
      if (draggedItem && draggedItem !== targetFieldKey) {
        const fieldsArray = Object.entries(editingFields)
          .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0));
        
        const draggedIndex = fieldsArray.findIndex(([key]) => key === draggedItem);
        const targetIndex = fieldsArray.findIndex(([key]) => key === targetFieldKey);
        
        // 重新排列陣列
        const newFieldsArray = [...fieldsArray];
        const [draggedField] = newFieldsArray.splice(draggedIndex, 1);
        newFieldsArray.splice(targetIndex, 0, draggedField);
        
        // 重新分配 order
        const updatedFields = {};
        newFieldsArray.forEach(([key, field], index) => {
          updatedFields[key] = { ...field, order: index + 1 };
        });
        
        setEditingFields(updatedFields);
      }
      
      setDraggedItem(null);
      setDragOverItem(null);
    };

    const saveFields = () => {
      const updatedFolders = folders.map(folder =>
        folder.id === currentFolder.id
          ? { ...folder, customFields: editingFields }
          : folder
      );
      setFolders(updatedFolders);
      setCurrentFolder({ ...currentFolder, customFields: editingFields });
      setShowFieldEditor(false);
      alert('欄位設定已保存！');
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-4xl w-full max-h-screen overflow-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">自定義欄位編輯器</h3>
            <div className="flex gap-2">
              <button onClick={saveFields} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                保存
              </button>
              <button onClick={() => setShowFieldEditor(false)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
                關閉
              </button>
            </div>
          </div>

          {/* 添加新欄位 */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium mb-3">添加新欄位</h4>
            <div className="grid grid-cols-3 gap-3 mb-3">
              <input
                type="text"
                placeholder="欄位鍵名 (英文)"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <input
                type="text"
                placeholder="顯示名稱"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              >
                <option value="text">純文字</option>
                <option value="kanji">漢字（支援注音）</option>
              </select>
            </div>
            <button onClick={addField} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
              添加欄位
            </button>
          </div>

          {/* 現有欄位列表 - 支援拖曳 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">現有欄位設定</h4>
              <p className="text-sm text-gray-500">💡 可以拖曳調整順序</p>
            </div>
            {Object.entries(editingFields)
              .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
              .map(([key, field]) => (
              <div 
                key={key} 
                draggable
                onDragStart={(e) => handleDragStart(e, key)}
                onDragOver={(e) => handleDragOver(e, key)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, key)}
                className={`flex items-center gap-3 p-4 border rounded-lg bg-white cursor-move transition-all
                  ${draggedItem === key ? 'opacity-50 transform scale-95' : ''}
                  ${dragOverItem === key ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}
                  hover:shadow-md hover:border-gray-300
                `}
              >
                {/* 拖曳手柄 */}
                <div className="text-gray-400 cursor-grab active:cursor-grabbing">
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <circle cx="7" cy="6" r="1"/>
                    <circle cx="7" cy="10" r="1"/>
                    <circle cx="7" cy="14" r="1"/>
                    <circle cx="13" cy="6" r="1"/>
                    <circle cx="13" cy="10" r="1"/>
                    <circle cx="13" cy="14" r="1"/>
                  </svg>
                </div>

                <div className="flex-1 grid grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">欄位鍵名</label>
                    <input
                      type="text"
                      value={key}
                      disabled
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm bg-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">顯示名稱</label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) => updateField(key, { label: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">類型</label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(key, { type: e.target.value })}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="text">純文字</option>
                      <option value="kanji">漢字（支援注音）</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-1">順序</label>
                    <input
                      type="number"
                      value={field.order || 0}
                      onChange={(e) => updateField(key, { order: parseInt(e.target.value) })}
                      className="w-full px-2 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      min="1"
                    />
                  </div>
                </div>

                <button
                  onClick={() => removeField(key)}
                  className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded transition-colors"
                  title="刪除欄位"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              <strong>使用說明：</strong>
              <br />• <strong>拖曳排序：</strong>按住左側手柄圖標拖曳來調整欄位順序
              <br />• <strong>欄位鍵名：</strong>用於程式內部識別，建議使用英文（創建後不可修改）
              <br />• <strong>顯示名稱：</strong>在試算表中顯示的標題
              <br />• <strong>類型：</strong>漢字類型支援注音顯示功能 `漢字[ふりがな]`
              <br />• <strong>順序：</strong>也可以直接修改數字來調整順序
            </p>
          </div>
        </div>
      </div>
    );
  };
  const SpreadsheetEditor = () => {
    const [editData, setEditData] = useState([]);
    const currentFields = getCurrentFields();
    
    useEffect(() => {
      if (currentFolder) {
        setEditData(currentFolder.cards.map(card => ({ id: card.id, ...card.fields })));
      }
    }, [currentFolder]);

    const updateCell = (rowIndex, field, value) => {
      const newData = [...editData];
      newData[rowIndex][field] = value;
      setEditData(newData);
    };

    const addRow = () => {
      const newRow = { id: Date.now() };
      Object.keys(currentFields).forEach(field => {
        newRow[field] = '';
      });
      setEditData([...editData, newRow]);
    };

    const deleteRow = (rowIndex) => {
      setEditData(editData.filter((_, index) => index !== rowIndex));
    };

    const saveSpreadsheet = () => {
      const updatedCards = editData.map(row => {
        const { id, ...fields } = row;
        return {
          id: id || Date.now() + Math.random(),
          fields,
          pages: [
            {
              id: 'page1',
              name: '基本',
              displayFields: Object.keys(currentFields).slice(0, 2),
              script: [
                { type: 'speak', field: Object.keys(currentFields)[0], repeat: 2, rate: 0.8 },
                { type: 'pause', duration: 1000 },
                { type: 'speak', field: Object.keys(currentFields)[1], repeat: 1, rate: 1.0 }
              ]
            }
          ]
        };
      });

      setFolders(folders.map(folder =>
        folder.id === currentFolder.id ? { ...folder, cards: updatedCards } : folder
      ));
      
      setCurrentFolder({ ...currentFolder, cards: updatedCards });
      setShowSpreadsheet(false);
      alert('試算表已保存！');
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-5xl w-full max-h-screen overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">試算表編輯器</h3>
            <div className="flex gap-2">
              <button onClick={() => setShowFieldEditor(true)} className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700">
                自定義欄位
              </button>
              <button onClick={() => setShowImportDialog(true)} className="bg-orange-600 text-white px-3 py-1 rounded text-sm hover:bg-orange-700">
                匯入數據
              </button>
              <button onClick={addRow} className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700">
                添加行
              </button>
              <button onClick={saveSpreadsheet} className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                保存
              </button>
              <button onClick={() => setShowSpreadsheet(false)} className="bg-gray-500 text-white px-3 py-1 rounded text-sm hover:bg-gray-600">
                關閉
              </button>
            </div>
          </div>

          <div className="overflow-auto max-h-96">
            <table className="w-full border-collapse border border-gray-300">
              <thead>
                <tr className="bg-gray-100 sticky top-0">
                  <th className="border border-gray-300 px-2 py-1 text-xs">操作</th>
                  {Object.entries(currentFields)
                    .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
                    .map(([key, field]) => (
                    <th key={key} className="border border-gray-300 px-2 py-1 text-xs min-w-32">
                      {field.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {editData.map((row, rowIndex) => (
                  <tr key={row.id || rowIndex}>
                    <td className="border border-gray-300 px-1 py-1">
                      <button onClick={() => deleteRow(rowIndex)} className="text-red-500 hover:text-red-700 text-xs">
                        <Trash2 size={12} />
                      </button>
                    </td>
                    {Object.entries(currentFields)
                      .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
                      .map(([fieldKey, field]) => (
                      <td key={fieldKey} className="border border-gray-300 px-1 py-1">
                        <textarea
                          value={row[fieldKey] || ''}
                          onChange={(e) => updateCell(rowIndex, fieldKey, e.target.value)}
                          className="w-full min-w-24 text-xs border-none resize-none focus:outline-none"
                          rows="2"
                          placeholder={`輸入${field.label}`}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // 學習模式視圖
  const StudyView = () => {
    const cards = currentFolder?.cards || [];
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const card = cards[currentCardIndex];
    const currentFields = getCurrentFields();
    
    if (!card) return null;
    const currentPage = card.pages[currentPageIndex];

    const nextCard = () => {
      if (currentCardIndex < cards.length - 1) {
        setCurrentCardIndex(currentCardIndex + 1);
        setCurrentPageIndex(0);
      }
    };

    const prevCard = () => {
      if (currentCardIndex > 0) {
        setCurrentCardIndex(currentCardIndex - 1);
        setCurrentPageIndex(0);
      }
    };

    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView('folder')} className="text-gray-600 hover:text-gray-800">
              <ChevronLeft size={24} />
            </button>
            <h1 className="text-xl font-semibold">學習模式 - {currentFolder.name}</h1>
          </div>
          <div className="text-sm text-gray-600">
            卡片 {currentCardIndex + 1}/{cards.length}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-6 text-center min-h-80">
          <h2 className="text-lg text-gray-600 mb-4">{currentPage.name}</h2>
          
          <div className="space-y-6">
            {currentPage.displayFields.map(fieldKey => {
              const field = currentFields[fieldKey];
              const value = card.fields[fieldKey];
              
              if (!value || !field) return null;
              
              return (
                <div key={fieldKey} className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-500">{field.label}</h3>
                  {field.type === 'kanji' ? (
                    <div className="text-3xl font-bold text-gray-800">
                      <KanjiWithFurigana text={value} showFurigana={settings.showFurigana} />
                    </div>
                  ) : (
                    <p className="text-2xl text-gray-800">{value}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex justify-center gap-4 mb-6">
            <button
              onClick={() => executeScript(card, currentPageIndex)}
              disabled={isPlaying}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Play size={18} />
              播放
            </button>
            <button
              onClick={stopPlayback}
              disabled={!isPlaying}
              className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              <Square size={18} />
              停止
            </button>
            <button
              onClick={() => setSettings({ ...settings, showFurigana: !settings.showFurigana })}
              className={`px-4 py-3 rounded-lg flex items-center gap-2 text-white ${
                settings.showFurigana ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-600 hover:bg-gray-700'
              }`}
            >
              {settings.showFurigana ? <Eye size={18} /> : <EyeOff size={18} />}
              注音
            </button>
          </div>

          <div className="flex justify-between">
            <button
              onClick={prevCard}
              disabled={currentCardIndex === 0}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-300 hover:bg-gray-700"
            >
              上一張卡片
            </button>
            <button
              onClick={nextCard}
              disabled={currentCardIndex >= cards.length - 1}
              className="bg-gray-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-300 hover:bg-gray-700"
            >
              下一張卡片
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 資料夾視圖
  const FolderView = () => {
    const currentFields = getCurrentFields();
    
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => setCurrentView('home')} className="text-gray-600 hover:text-gray-800">
              <ChevronLeft size={24} />
            </button>
            <span className="text-2xl">{currentFolder.icon}</span>
            <h1 className="text-2xl font-bold">{currentFolder.name}</h1>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowSpreadsheet(true)}
              className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
            >
              <Grid3x3 size={20} />
              試算表編輯
            </button>
            <button
              onClick={() => {
                if (currentFolder.cards.length > 0) {
                  setCurrentCard(currentFolder.cards[0]);
                  setCurrentView('study');
                }
              }}
              disabled={currentFolder.cards.length === 0}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:bg-gray-300 hover:bg-blue-700 flex items-center gap-2"
            >
              <BookOpen size={20} />
              開始學習
            </button>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {currentFolder.cards.map(card => (
            <div key={card.id} className="bg-white rounded-lg shadow-md p-4 border">
              <div className="mb-3">
                <h3 className="text-lg font-semibold mb-1">
                  <KanjiWithFurigana text={card.fields.kanji || '未命名'} showFurigana={settings.showFurigana} />
                </h3>
                <p className="text-gray-600">{card.fields.meaning}</p>
                <p className="text-sm text-gray-500">{card.fields.level}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setCurrentCard(card);
                    executeScript(card, 0);
                  }}
                  className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2"
                >
                  <Volume2 size={16} />
                  播放
                </button>
                <button
                  onClick={() => {
                    setCurrentCard(card);
                    setCurrentPageIndex(0);
                    setCurrentView('study');
                  }}
                  className="bg-gray-600 text-white py-2 px-3 rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                >
                  <BookOpen size={16} />
                  學習
                </button>
              </div>
            </div>
          ))}
        </div>

        {currentFolder.cards.length === 0 && (
          <div className="text-center py-12">
            <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">這個資料夾還沒有任何卡片</p>
            <p className="text-gray-500">點擊「試算表編輯」開始添加日文單字！</p>
          </div>
        )}

        {showSpreadsheet && <SpreadsheetEditor />}
        {showFieldEditor && <FieldEditor />}
        {showImportDialog && <ImportDialog />}
      </div>
    );
  };

  // 首頁視圖
  const HomeView = () => {
    const [newFolderName, setNewFolderName] = useState('');
    const [showNewFolder, setShowNewFolder] = useState(false);

    const createFolder = () => {
      if (newFolderName.trim()) {
        setFolders([...folders, {
          id: Date.now(),
          name: newFolderName,
          icon: '🇯🇵',
          cards: [],
          customFields: { ...DEFAULT_FIELDS }
        }]);
        setShowNewFolder(false);
        setNewFolderName('');
      }
    };

    const deleteFolder = (folderId) => {
      setFolders(folders.filter(f => f.id !== folderId));
    };

    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="text-blue-600" />
            日本語学習カード
          </h1>
          <button
            onClick={() => setShowNewFolder(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus size={20} />
            新增資料夾
          </button>
        </div>

        {showNewFolder && (
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="資料夾名稱"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="flex-1 px-3 py-2 border rounded-lg"
                onKeyPress={(e) => e.key === 'Enter' && createFolder()}
              />
              <button onClick={createFolder} className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
                創建
              </button>
              <button onClick={() => setShowNewFolder(false)} className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600">
                取消
              </button>
            </div>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {folders.map(folder => (
            <div key={folder.id} className="bg-white rounded-lg shadow-md p-4 border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{folder.icon}</span>
                  <h3 className="text-lg font-semibold">{folder.name}</h3>
                </div>
                <button onClick={() => deleteFolder(folder.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={18} />
                </button>
              </div>
              <p className="text-gray-600 mb-4">{folder.cards.length} 張卡片</p>
              <button
                onClick={() => {
                  setCurrentFolder(folder);
                  setCurrentView('folder');
                }}
                className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
              >
                開啟資料夾
              </button>
            </div>
          ))}
        </div>

        {folders.length === 0 && (
          <div className="text-center py-12">
            <Brain size={48} className="mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600 text-lg">開始創建你的第一個日文學習資料夾！</p>
          </div>
        )}
      </div>
    );
  };

  // 主要渲染
  return (
    <div className="min-h-screen bg-gray-100">
      {currentView === 'home' && <HomeView />}
      {currentView === 'folder' && currentFolder && <FolderView />}
      {currentView === 'study' && currentFolder && <StudyView />}
    </div>
  );
};

export default App;