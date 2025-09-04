import React, { useState, useEffect, useCallback } from 'react';
import { Play, Square, Plus, Trash2, ChevronLeft, BookOpen, Brain, Volume2, Grid3x3, Eye, EyeOff } from 'lucide-react';

const FlashcardApp = () => {
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
    </div>
  );
};

export default FlashcardApp;