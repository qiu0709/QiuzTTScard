import React, { useState, useEffect, useCallback } from 'react';
import DesignEditor from './components/DesignEditor.jsx';
import TableViewCard from './components/TableViewCard.jsx';
import ClickableWrapper from './components/ClickableWrapper.jsx';
import { parseApkgFile, convertToAppFormat } from './utils/apkgImporter.js';

const FullFlashcardApp = () => {
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentCard, setCurrentCard] = useState(null);
  const [currentView, setCurrentView] = useState('home');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showSpreadsheet, setShowSpreadsheet] = useState(false);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showFieldSelector, setShowFieldSelector] = useState(false);
  const [apkgPreviewData, setApkgPreviewData] = useState(null);
  const [importMode, setImportMode] = useState('replace'); // 匯入模式: 'replace'(建立新資料夾) 或 'append'(附加到現有)
  const [showTTSSettings, setShowTTSSettings] = useState(false);
  const [showVoiceStyleEditor, setShowVoiceStyleEditor] = useState(false);
  const [editingFieldKey, setEditingFieldKey] = useState(null);
  // showGlobalTemplateEditor 已移除，模板編輯整合至播放設定頁面
  const [showAutoPlayEditor, setShowAutoPlayEditor] = useState(false);
  const [currentPlaySettingTab, setCurrentPlaySettingTab] = useState('script'); // 'script' | 'pages'
  const [designMode, setDesignMode] = useState(false); // 設計模式開關
  const [selectedElement, setSelectedElement] = useState(null); // 當前選中的元素
  const [customStyles, setCustomStyles] = useState({}); // 自定義樣式
  const [cardDisplayMode, setCardDisplayMode] = useState('card'); // 'card' | 'table' - 卡片顯示模式
  const [showGroupDialog, setShowGroupDialog] = useState(false); // 顯示分組對話框
  const [selectedSubFolders, setSelectedSubFolders] = useState([]); // 選中要播放的子資料夾
  const [showSyncDialog, setShowSyncDialog] = useState(false); // 顯示同步對話框
  const [syncSettings, setSyncSettings] = useState({
    githubToken: '',
    gistId: '',
    autoSync: false,
    lastSyncTime: null
  }); // 雲端同步設定

  // 檢測是否為手機裝置
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // 語音設定狀態 - 為每個欄位設定Azure語音、速度、風格
  const [fieldVoiceSettings, setFieldVoiceSettings] = useState({
    kanji: {
      voice: 'zh-TW-HsiaoChenNeural',
      rate: 1.0,
      pitch: 1.0,
      style: 'neutral'
    },
    meaning: {
      voice: 'zh-TW-YunJheNeural', 
      rate: 0.9,
      pitch: 1.0,
      style: 'cheerful'
    },
    pos: {
      voice: 'zh-TW-HsiaoChenNeural',
      rate: 1.1,
      pitch: 1.0, 
      style: 'gentle'
    },
    example: {
      voice: 'ja-JP-NanamiNeural',
      rate: 1.0,
      pitch: 1.0,
      style: 'neutral'
    },
    translation: {
      voice: 'zh-TW-YunJheNeural',
      rate: 0.95,
      pitch: 1.0,
      style: 'calm'
    }
  });

  // Azure TTS 語音選項
  const AZURE_VOICES = {
    'zh-TW': [
      { value: 'zh-TW-HsiaoChenNeural', label: '曉臻 (女性, 溫柔)' },
      { value: 'zh-TW-HsiaoYuNeural', label: '曉宇 (女性, 活潑)' },
      { value: 'zh-TW-YunJheNeural', label: '雲哲 (男性, 穩重)' },
      { value: 'zh-TW-YunHsiNeural', label: '雲曦 (男性, 溫和)' }
    ],
    'ja-JP': [
      { value: 'ja-JP-NanamiNeural', label: 'Nanami (女性, 標準)' },
      { value: 'ja-JP-AoiNeural', label: 'Aoi (女性, 溫柔)' },
      { value: 'ja-JP-MayuNeural', label: 'Mayu (女性, 活潑)' },
      { value: 'ja-JP-ShioriNeural', label: 'Shiori (女性, 成熟)' },
      { value: 'ja-JP-KeitaNeural', label: 'Keita (男性, 標準)' },
      { value: 'ja-JP-DaichiNeural', label: 'Daichi (男性, 穩重)' },
      { value: 'ja-JP-NaokiNeural', label: 'Naoki (男性, 活力)' }
    ],
    'en-US': [
      { value: 'en-US-AriaNeural', label: 'Aria (女性, 標準)' },
      { value: 'en-US-JennyNeural', label: 'Jenny (女性, 專業)' },
      { value: 'en-US-GuyNeural', label: 'Guy (男性, 標準)' },
      { value: 'en-US-DavisNeural', label: 'Davis (男性, 穩重)' },
      { value: 'en-US-TonyNeural', label: 'Tony (男性, 成熟)' },
      { value: 'en-US-JasonNeural', label: 'Jason (男性, 活力)' },
      { value: 'en-US-SaraNeural', label: 'Sara (女性, 溫柔)' },
      { value: 'en-US-NancyNeural', label: 'Nancy (女性, 活潑)' }
    ]
  };

  const EMOTION_STYLES = [
    { value: 'neutral', label: '中性' },
    { value: 'cheerful', label: '開朗' },
    { value: 'gentle', label: '溫柔' },
    { value: 'calm', label: '冷靜' },
    { value: 'sad', label: '悲傷' },
    { value: 'angry', label: '憤怒' },
    { value: 'fearful', label: '恐懼' },
    { value: 'disgruntled', label: '不滿' }
  ];

  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [autoPlayMode, setAutoPlayMode] = useState('sequential'); // 'sequential' | 'loop'
  const [currentAutoPlayCard, setCurrentAutoPlayCard] = useState(0);
  const [currentAutoPlayStep, setCurrentAutoPlayStep] = useState(0);
  
  // 自動播放腳本設定 - 混合模板顯示和語音播放
  const [autoPlayScript, setAutoPlayScript] = useState([
    {
      id: '1',
      type: 'display',
      templateId: 'A'
    },
    {
      id: '2', 
      type: 'speak',
      field: 'kanji',
      repeat: 3,
      rate: 0.8,
      pauseAfter: 1000
    },
    {
      id: '3',
      type: 'speak',
      field: 'example',
      repeat: 1,
      rate: 1.0,
      pauseAfter: 1500
    },
    {
      id: '4',
      type: 'display',
      templateId: 'B'
    },
    {
      id: '5',
      type: 'speak',
      field: 'meaning',
      repeat: 1,
      rate: 1.0,
      pauseAfter: 1000
    }
  ]);
  
  const [currentAutoPlayTemplate, setCurrentAutoPlayTemplate] = useState('A');
  const [editingVoiceStyle, setEditingVoiceStyle] = useState(null);
  
  // 拖曳狀態
  const [draggedStepIndex, setDraggedStepIndex] = useState(null);
  
  // 自動播放腳本拖曳處理函數
  const handleAutoPlayStepDragStart = (e, index) => {
    setDraggedStepIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAutoPlayStepDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleAutoPlayStepDrop = (e, dropIndex) => {
    e.preventDefault();
    
    if (draggedStepIndex === null || draggedStepIndex === dropIndex) {
      return;
    }

    const newScript = [...autoPlayScript];
    const draggedStep = newScript[draggedStepIndex];
    
    // 移除拖曳的步驟
    newScript.splice(draggedStepIndex, 1);
    
    // 插入到新位置
    const adjustedDropIndex = draggedStepIndex < dropIndex ? dropIndex - 1 : dropIndex;
    newScript.splice(adjustedDropIndex, 0, draggedStep);
    
    setAutoPlayScript(newScript);
    setDraggedStepIndex(null);
  };

  const handleAutoPlayStepDragEnd = () => {
    setDraggedStepIndex(null);
  };
  
  // 顯示模板管理
  const [displayTemplates, setDisplayTemplates] = useState({
    A: {
      name: '純漢字',
      fields: ['kanji', 'meaning'],
      showFurigana: false,
      fieldStyles: {}, // 欄位樣式設定：{ fieldKey: { fontSize, fontFamily, textAlign } }
      topFields: [] // 頁面頂部顯示的欄位（最多3個）
    },
    B: {
      name: '漢字+注音',
      fields: ['kanji', 'hiragana'],
      showFurigana: true,
      fieldStyles: {},
      topFields: []
    },
    C: {
      name: '例句',
      fields: ['example'],
      showFurigana: true,
      fieldStyles: {},
      topFields: []
    },
    D: {
      name: '詳細信息',
      fields: ['kanji', 'meaning', 'level'],
      showFurigana: false,
      fieldStyles: {},
      topFields: []
    },
    E: {
      name: '完整顯示',
      fields: ['kanji', 'hiragana', 'meaning', 'example'],
      showFurigana: true,
      fieldStyles: {},
      topFields: []
    }
  });
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [currentTemplate, setCurrentTemplate] = useState('A');
  
  const [settings, setSettings] = useState({
    defaultRate: 1.0,
    showFurigana: true,
    azureTTS: {
      enabled: import.meta.env.VITE_AZURE_SPEECH_KEY ? true : false,
      subscriptionKey: import.meta.env.VITE_AZURE_SPEECH_KEY || '',
      region: import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastasia',
      defaultVoice: 'ja-JP-NanamiNeural'
    }
  });

  // 預設欄位定義
  const DEFAULT_FIELDS = {
    kanji: { 
      label: '漢字', 
      type: 'kanji', 
      order: 1, 
      voice: 'ja-JP-NanamiNeural',
      voiceStyle: {
        rate: 'medium',
        pitch: 'medium', 
        style: 'general',
        volume: 1.0
      }
    },
    hiragana: { 
      label: 'ひらがな', 
      type: 'text', 
      order: 2, 
      voice: 'ja-JP-NanamiNeural',
      voiceStyle: {
        rate: 'slow',
        pitch: 'medium',
        style: 'general',
        volume: 1.0
      }
    },
    meaning: { 
      label: '意味', 
      type: 'text', 
      order: 3, 
      voice: 'zh-TW-HsiaoChenNeural',
      voiceStyle: {
        rate: 'medium',
        pitch: 'medium',
        style: 'general',
        volume: 1.0
      }
    },
    example: { 
      label: '例文', 
      type: 'kanji', 
      order: 4, 
      voice: 'ja-JP-KeitaNeural',
      voiceStyle: {
        rate: 'medium',
        pitch: 'medium',
        style: 'newscast',
        volume: 1.0
      }
    },
    level: { 
      label: 'レベル', 
      type: 'text', 
      order: 5, 
      voice: 'ja-JP-NanamiNeural',
      voiceStyle: {
        rate: 'fast',
        pitch: 'medium',
        style: 'general',
        volume: 0.8
      }
    }
  };

  // 創建預設的5個頁面腳本
  const createDefaultPages = () => [
    { 
      id: 'page1', 
      name: '基本', 
      displayFields: ['kanji', 'meaning'], 
      script: [
        { type: 'speak', field: 'kanji', repeat: 2, rate: 0.8 }, 
        { type: 'pause', duration: 1000 }, 
        { type: 'speak', field: 'meaning', repeat: 1, rate: 1.0 }
      ] 
    },
    { 
      id: 'page2', 
      name: '練習', 
      displayFields: ['kanji', 'hiragana', 'meaning'], 
      script: [
        { type: 'speak', field: 'kanji', repeat: 1, rate: 1.0 },
        { type: 'pause', duration: 500 },
        { type: 'speak', field: 'hiragana', repeat: 1, rate: 0.9 }
      ] 
    },
    { 
      id: 'page3', 
      name: '例句', 
      displayFields: ['example'], 
      script: [
        { type: 'speak', field: 'example', repeat: 1, rate: 0.9 }
      ] 
    },
    { 
      id: 'page4', 
      name: '複習', 
      displayFields: ['meaning', 'kanji'], 
      script: [
        { type: 'speak', field: 'meaning', repeat: 1, rate: 1.0 }, 
        { type: 'pause', duration: 2000 }, 
        { type: 'speak', field: 'kanji', repeat: 1, rate: 1.0 }
      ] 
    },
    { 
      id: 'page5', 
      name: '測試', 
      displayFields: ['kanji'], 
      script: [
        { type: 'speak', field: 'kanji', repeat: 1, rate: 1.2 }
      ] 
    }
  ];

  // Azure TTS 可用語音
  const AVAILABLE_VOICES = {
    'Japanese (Japan)': [
      { value: 'ja-JP-NanamiNeural', label: 'Nanami (女性, 標準)' },
      { value: 'ja-JP-KeitaNeural', label: 'Keita (男性, 標準)' },
      { value: 'ja-JP-AoiNeural', label: 'Aoi (女性, 年輕)' },
      { value: 'ja-JP-DaichiNeural', label: 'Daichi (男性, 年輕)' },
      { value: 'ja-JP-MayuNeural', label: 'Mayu (女性, 溫柔)' },
      { value: 'ja-JP-NaokiNeural', label: 'Naoki (男性, 成熟)' },
      { value: 'ja-JP-ShioriNeural', label: 'Shiori (女性, 成熟)' }
    ],
    'Chinese (Taiwan)': [
      { value: 'zh-TW-HsiaoChenNeural', label: 'HsiaoChen (女性)' },
      { value: 'zh-TW-YunJheNeural', label: 'YunJhe (男性)' },
      { value: 'zh-TW-HsiaoYuNeural', label: 'HsiaoYu (女性, 年輕)' }
    ],
    'English (US)': [
      { value: 'en-US-JennyNeural', label: 'Jenny (女性)' },
      { value: 'en-US-GuyNeural', label: 'Guy (男性)' },
      { value: 'en-US-AriaNeural', label: 'Aria (女性, 溫暖)' }
    ]
  };

  // 語音風格選項
  const VOICE_STYLES = {
    rate: [
      { value: 'x-slow', label: '極慢 (0.5x)' },
      { value: 'slow', label: '慢 (0.75x)' },
      { value: 'medium', label: '正常 (1.0x)' },
      { value: 'fast', label: '快 (1.25x)' },
      { value: 'x-fast', label: '極快 (1.5x)' }
    ],
    pitch: [
      { value: 'x-low', label: '極低音' },
      { value: 'low', label: '低音' },
      { value: 'medium', label: '正常' },
      { value: 'high', label: '高音' },
      { value: 'x-high', label: '極高音' }
    ],
    style: [
      { value: 'general', label: '一般' },
      { value: 'cheerful', label: '愉快' },
      { value: 'sad', label: '悲傷' },
      { value: 'angry', label: '憤怒' },
      { value: 'fearful', label: '恐懼' },
      { value: 'disgruntled', label: '不悅' },
      { value: 'serious', label: '嚴肅' },
      { value: 'affectionate', label: '親切' },
      { value: 'gentle', label: '溫柔' },
      { value: 'newscast', label: '新聞播報' },
      { value: 'customerservice', label: '客服' },
      { value: 'assistant', label: '助手' },
      { value: 'whispering', label: '耳語' },
      { value: 'shouting', label: '大聲' }
    ]
  };

  // 樣式定義
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#fafafa',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      color: '#333333',
      padding: isMobile ? '10px' : '20px'
    },
    header: {
      fontSize: isMobile ? '20px' : '28px',
      fontWeight: '600',
      color: '#1a1a1a',
      marginBottom: isMobile ? '16px' : '24px',
      display: 'flex',
      alignItems: 'center',
      gap: isMobile ? '8px' : '12px',
      letterSpacing: '-0.5px'
    },
    button: {
      backgroundColor: '#4F46E5',
      color: 'white',
      border: 'none',
      padding: isMobile ? '12px 16px' : '10px 20px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: isMobile ? '16px' : '14px',
      fontWeight: '500',
      boxShadow: '0 2px 8px rgba(79, 70, 229, 0.2)',
      transition: 'all 0.2s ease',
      minHeight: isMobile ? '48px' : 'auto',
      touchAction: 'manipulation',
      '&:hover': {
        backgroundColor: '#4338CA',
        transform: 'translateY(-1px)',
        boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
      }
    },
    buttonGreen: {
      backgroundColor: '#10B981',
      color: 'white',
      border: 'none',
      padding: isMobile ? '12px 16px' : '10px 20px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: isMobile ? '16px' : '14px',
      fontWeight: '500',
      boxShadow: '0 2px 8px rgba(16, 185, 129, 0.2)',
      transition: 'all 0.2s ease',
      minHeight: isMobile ? '48px' : 'auto',
      touchAction: 'manipulation'
    },
    buttonRed: {
      backgroundColor: '#EF4444',
      color: 'white',
      border: 'none',
      padding: isMobile ? '12px 16px' : '10px 20px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: isMobile ? '16px' : '14px',
      fontWeight: '500',
      boxShadow: '0 2px 8px rgba(239, 68, 68, 0.2)',
      transition: 'all 0.2s ease',
      minHeight: isMobile ? '48px' : 'auto',
      touchAction: 'manipulation'
    },
    buttonGray: {
      backgroundColor: '#6B7280',
      color: 'white',
      border: 'none',
      padding: isMobile ? '12px 16px' : '10px 20px',
      borderRadius: '12px',
      cursor: 'pointer',
      fontSize: isMobile ? '16px' : '14px',
      fontWeight: '500',
      boxShadow: '0 2px 8px rgba(107, 114, 128, 0.2)',
      transition: 'all 0.2s ease',
      minHeight: isMobile ? '48px' : 'auto',
      touchAction: 'manipulation'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 2px 16px rgba(0, 0, 0, 0.08)',
      padding: '24px',
      marginBottom: '20px',
      border: '1px solid #f0f0f0',
      transition: 'all 0.2s ease'
    },
    input: {
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '12px 16px',
      fontSize: '14px',
      width: '100%',
      backgroundColor: 'white',
      transition: 'all 0.2s ease',
      '&:focus': {
        outline: 'none',
        borderColor: '#4F46E5',
        boxShadow: '0 0 0 3px rgba(79, 70, 229, 0.1)'
      }
    },
    grid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
      gap: '24px'
    },
    flexBetween: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    flexCenter: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      gap: '12px'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.4)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 50,
      backdropFilter: 'blur(4px)'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: isMobile ? '12px' : '20px',
      padding: isMobile ? '16px' : '32px',
      maxWidth: isMobile ? '95vw' : '900px',
      width: '95%',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15)',
      maxHeight: isMobile ? '85vh' : '90vh',
      overflow: 'auto'
    }
  };

  // 獲取當前欄位定義
  const getCurrentFields = useCallback(() => {
    return currentFolder?.customFields || DEFAULT_FIELDS;
  }, [currentFolder]);

  // 音檔快取系統
  const audioCache = useCallback(() => {
    const CACHE_PREFIX = 'tts_audio_';
    const CACHE_EXPIRY = 30 * 24 * 60 * 60 * 1000; // 30天

    const generateCacheKey = (text, voice, voiceStyle) => {
      const styleString = JSON.stringify(voiceStyle);
      const hash = btoa(unescape(encodeURIComponent(text + voice + styleString)))
        .replace(/[+/=]/g, ''); // 移除特殊字符
      return `${CACHE_PREFIX}${hash}`;
    };

    const saveToCache = async (cacheKey, audioArrayBuffer) => {
      try {
        const base64Audio = btoa(String.fromCharCode(...new Uint8Array(audioArrayBuffer)));
        const cacheData = {
          audio: base64Audio,
          timestamp: Date.now(),
          expires: Date.now() + CACHE_EXPIRY
        };
        localStorage.setItem(cacheKey, JSON.stringify(cacheData));
        return true;
      } catch (error) {
        console.warn('音檔快取儲存失敗:', error);
        return false;
      }
    };

    const loadFromCache = (cacheKey) => {
      try {
        const cached = localStorage.getItem(cacheKey);
        if (!cached) return null;

        const cacheData = JSON.parse(cached);
        if (Date.now() > cacheData.expires) {
          localStorage.removeItem(cacheKey);
          return null;
        }

        const binaryString = atob(cacheData.audio);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes.buffer;
      } catch (error) {
        console.warn('音檔快取載入失敗:', error);
        return null;
      }
    };

    const getCacheSize = () => {
      let totalSize = 0;
      for (let key in localStorage) {
        if (key.startsWith(CACHE_PREFIX)) {
          try {
            totalSize += localStorage.getItem(key).length;
          } catch (e) {}
        }
      }
      return totalSize;
    };

    const clearCache = () => {
      const keysToDelete = [];
      for (let key in localStorage) {
        if (key.startsWith(CACHE_PREFIX)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => localStorage.removeItem(key));
      return keysToDelete.length;
    };

    const cleanExpiredCache = () => {
      const now = Date.now();
      const keysToDelete = [];
      
      for (let key in localStorage) {
        if (key.startsWith(CACHE_PREFIX)) {
          try {
            const cacheData = JSON.parse(localStorage.getItem(key));
            if (now > cacheData.expires) {
              keysToDelete.push(key);
            }
          } catch (e) {
            keysToDelete.push(key); // 損壞的快取也刪除
          }
        }
      }
      
      keysToDelete.forEach(key => localStorage.removeItem(key));
      return keysToDelete.length;
    };

    return {
      generateCacheKey,
      saveToCache,
      loadFromCache,
      getCacheSize,
      clearCache,
      cleanExpiredCache
    };
  }, []);

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
      <span style={{ display: 'inline-block' }}>
        {parts.map((part, index) => (
          <span key={index} style={{ display: 'inline-block' }}>
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

  // Azure TTS 語音合成功能
  const speakWithAzure = useCallback(async (text, voice, azureSettings, voiceStyle = null) => {
    const cleanText = text.replace(/\[([あ-んゃゅょぁぃぅぇぉっー]+)\]/g, '');
    const cache = audioCache();
    
    // 使用預設風格如果沒有提供
    const style = voiceStyle || {
      rate: 'medium',
      pitch: 'medium',
      style: 'general',
      volume: 1.0
    };

    // 檢查快取
    const cacheKey = cache.generateCacheKey(cleanText, voice, style);
    const cachedAudio = cache.loadFromCache(cacheKey);
    
    if (cachedAudio) {
      console.log('🎵 使用快取音檔');
      // 播放快取的音檔
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const audioBuffer = await audioContext.decodeAudioData(cachedAudio);
      
      const source = audioContext.createBufferSource();
      source.buffer = audioBuffer;
      
      // 音量控制 - 提高到最大音量
      const gainNode = audioContext.createGain();
      const volumeValue = 2.0; // 提高到 200% 音量
      console.log('🔊 設定快取音檔音量:', volumeValue, '(200%)');
      gainNode.gain.setValueAtTime(volumeValue, audioContext.currentTime);
      source.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      return new Promise((resolve, reject) => {
        source.onended = resolve;
        source.onerror = reject;
        source.start(0);
      });
    }
    
    // 建立簡化 SSML (避免 400 錯誤)
    // 使用 Azure 支援的標準格式
    // 如果有 rateMultiplier，將倍速轉換為百分比格式 (Azure 支援 +/-50%)
    let rateValue = style.rate || 'medium';
    if (style.rateMultiplier) {
      // 將 0.5-3.0 倍速轉換為 Azure 的百分比格式
      // 1.0 = 0%, 0.5 = -50%, 2.0 = +100%
      const percentage = Math.round((style.rateMultiplier - 1.0) * 100);
      rateValue = percentage >= 0 ? `+${percentage}%` : `${percentage}%`;
    }

    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
<voice name="${voice}">
<prosody rate="${rateValue}" pitch="${style.pitch}" volume="x-loud">
${cleanText}
</prosody>
</voice>
</speak>`;

    const response = await fetch(`https://${azureSettings.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: {
        'Ocp-Apim-Subscription-Key': azureSettings.subscriptionKey,
        'Content-Type': 'application/ssml+xml',
        'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
      },
      body: ssml
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage = `Azure TTS 錯誤: ${response.status} ${response.statusText}`;
      
      if (response.status === 401) {
        errorMessage += '\n可能原因：\n1. 訂閱金鑰錯誤\n2. 訂閱金鑰已過期\n3. 沒有Speech Services的訪問權限';
      } else if (response.status === 403) {
        errorMessage += '\n可能原因：\n1. 區域設定錯誤\n2. 訂閱沒有在此區域啟用服務';
      } else if (response.status === 400) {
        errorMessage += '\n可能原因：\n1. SSML格式錯誤\n2. 語音名稱不支援';
      }
      
      if (errorText) {
        errorMessage += `\n詳細錯誤：${errorText}`;
      }
      
      throw new Error(errorMessage);
    }

    const audioArrayBuffer = await response.arrayBuffer();
    
    // 儲存到快取
    console.log('▣ 儲存音檔到快取');
    cache.saveToCache(cacheKey, audioArrayBuffer);
    
    // 播放音檔
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // 恢復 AudioContext（如果被暫停）
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
    
    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // 設定音量 - 提高到最大音量
    const gainNode = audioContext.createGain();
    const volumeValue = 2.0; // 提高到 200% 音量
    console.log('🔊 設定新下載音檔音量:', volumeValue, '(200%)');
    gainNode.gain.setValueAtTime(volumeValue, audioContext.currentTime);
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    return new Promise((resolve, reject) => {
      source.onended = () => {
        console.log('▣ Azure TTS 音檔播放完成');
        resolve();
      };
      source.onerror = (error) => {
        console.error('▣ Azure TTS 音檔播放錯誤:', error);
        reject(error);
      };
      
      console.log('▣ 開始播放 Azure TTS 音檔');
      source.start(0);
    });
  }, [audioCache]);

  // 統一語音合成功能
  const speak = useCallback(async (text, options = {}) => {
    const { fieldKey, voice } = options;
    const currentFields = getCurrentFields();
    const fieldConfig = fieldKey ? currentFields[fieldKey] : null;
    const targetVoice = voice || fieldConfig?.voice || settings.azureTTS.defaultVoice;
    const targetVoiceStyle = fieldConfig?.voiceStyle;

    // 如果啟用 Azure TTS 且有設定金鑰，使用 Azure TTS
    if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey) {
      try {
        await speakWithAzure(text, targetVoice, settings.azureTTS, targetVoiceStyle);
        return;
      } catch (error) {
        console.warn('Azure TTS 失敗，回退到瀏覽器 TTS:', error);
        // 如果 Azure TTS 失敗，回退到瀏覽器內建 TTS
      }
    }

    // 使用瀏覽器內建 TTS
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
  }, [settings.defaultRate, settings.azureTTS, speakWithAzure, getCurrentFields]);

  // 瀏覽器語音合成（支援風格設定）
  const speakWithBrowserVoice = useCallback(async (text, preferredLang = 'ja-JP', voiceStyle = {}) => {
    return new Promise((resolve, reject) => {
      if (!window.speechSynthesis) {
        reject(new Error('不支援語音合成'));
        return;
      }

      const cleanText = text.replace(/\[([あ-んゃゅょぁぃぅぇぉっー]+)\]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);

      // 套用語音風格設定
      const rateMapping = {
        'x-slow': 0.5,
        'slow': 0.75,
        'medium': 1.0,
        'fast': 1.25,
        'x-fast': 1.5
      };
      
      const pitchMapping = {
        'x-low': 0.5,
        'low': 0.75,
        'medium': 1.0,
        'high': 1.25,
        'x-high': 1.5
      };

      utterance.rate = rateMapping[voiceStyle.rate] || 1.0;
      utterance.pitch = pitchMapping[voiceStyle.pitch] || 1.0;
      utterance.volume = voiceStyle.volume || 1.0;

      // 選擇最佳語音
      const voices = speechSynthesis.getVoices();
      console.log('可用語音:', voices.map(v => `${v.name} (${v.lang})`));
      
      // 優先選擇指定語言的語音
      let selectedVoice = voices.find(v => 
        v.lang === preferredLang || v.lang.startsWith(preferredLang.split('-')[0])
      );
      
      // 如果找不到指定語言，嘗試其他日語語音
      if (!selectedVoice && preferredLang.startsWith('ja')) {
        selectedVoice = voices.find(v => 
          v.lang.includes('ja') || v.name.includes('Japanese') || v.name.includes('Japan')
        );
      }
      
      // 如果找不到指定語言，嘗試英語語音
      if (!selectedVoice && preferredLang.startsWith('en')) {
        selectedVoice = voices.find(v => 
          v.lang.includes('en') || v.name.includes('English')
        );
      }
      
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        console.log('選擇語音:', selectedVoice.name, selectedVoice.lang);
      } else {
        console.log('使用預設語音');
      }

      utterance.onend = () => resolve();
      utterance.onerror = (e) => reject(e);

      speechSynthesis.speak(utterance);
    });
  }, []);

  // 腳本播放引擎
  const executeScript = useCallback(async (card, pageIndex = 0) => {
    if (!card?.pages?.[pageIndex]) return;
    
    console.log('開始執行腳本:', card.pages[pageIndex]?.name, '步驟數量:', card.pages[pageIndex]?.script?.length);
    
    setIsPlaying(true);
    const page = card.pages[pageIndex];
    let shouldContinue = true; // 使用本地變數來控制播放狀態

    try {
      let lastAudioDuration = 0; // 記錄上一個音檔的長度
      
      for (let i = 0; i < page.script.length && shouldContinue; i++) {
        const step = page.script[i];
        console.log(`執行步驟 ${i + 1}/${page.script.length}:`, step);

        switch (step.type) {
          case 'speak':
            const text = card.fields[step.field];
            if (text) {
              console.log('播放文本:', text);
              const repeatCount = step.repeat || 1;
              let totalDuration = 0;
              
              for (let r = 0; r < repeatCount && shouldContinue; r++) {
                console.log(`重複播放 ${r + 1}/${repeatCount}`);
                const startTime = Date.now();
                await speak(text, { 
                  rate: step.rate || settings.defaultRate,
                  fieldKey: step.field 
                });
                const duration = Date.now() - startTime;
                totalDuration += duration;
                
                if (r < repeatCount - 1) {
                  await new Promise(resolve => setTimeout(resolve, 300));
                  totalDuration += 300;
                }
              }
              
              lastAudioDuration = totalDuration;
            } else {
              console.log('警告: 找不到欄位內容:', step.field);
            }
            break;
          case 'pause':
            let pauseDuration;
            if (step.intervalType === 'multiplier' && lastAudioDuration > 0) {
              // 使用前一段音檔長度的倍數
              pauseDuration = lastAudioDuration * (step.multiplier || 1.0);
              console.log('使用倍數暫停:', pauseDuration, 'ms');
            } else {
              // 使用固定時間
              pauseDuration = step.duration || 1000;
              console.log('使用固定暫停:', pauseDuration, 'ms');
            }
            await new Promise(resolve => setTimeout(resolve, pauseDuration));
            break;
        }
        
        console.log(`步驟 ${i + 1} 完成`);
      }
      
      console.log('腳本執行完成');
    } catch (error) {
      console.error('播放錯誤:', error);
    } finally {
      console.log('設置 isPlaying 為 false');
      setIsPlaying(false);
    }
  }, [speak, settings.defaultRate]);

  const stopPlayback = useCallback(() => {
    console.log('用戶手動停止播放');
    setIsPlaying(false);
    if (window.speechSynthesis) {
      speechSynthesis.cancel();
    }
  }, []);

  // 初始化
  useEffect(() => {
    console.log('🔄 初始化應用程式...');
    const savedData = localStorage.getItem('japanese-vocab-data');
    if (savedData) {
      console.log('📂 找到已保存的資料');
      try {
        const data = JSON.parse(savedData);
        console.log('📊 載入的資料:', data);
        setFolders(data.folders || []);
        setSettings({ ...settings, ...data.settings });
        if (data.displayTemplates) {
          setDisplayTemplates(data.displayTemplates);
        }
        if (data.currentTemplate) {
          setCurrentTemplate(data.currentTemplate);
        }
        console.log('✅ 資料載入成功');
      } catch (e) {
        console.error('❌ 載入失敗:', e);
      }
    } else {
      console.log('⚠️ 沒有找到已保存的資料,創建範例資料夾...');
      // 創建多個範例資料夾
      const basicVocabFolder = {
        id: Date.now() - 1000,
        name: 'N5 基礎單字',
        icon: '📚',
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
            pages: createDefaultPages()
          },
          {
            id: 2,
            fields: {
              kanji: '先生[せんせい]',
              hiragana: 'せんせい',
              meaning: '老師',
              example: '田中[たなか]先生[せんせい]は優[やさ]しいです。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 3,
            fields: {
              kanji: '友達[ともだち]',
              hiragana: 'ともだち',
              meaning: '朋友',
              example: '友達[ともだち]と映画[えいが]を見[み]ます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 4,
            fields: {
              kanji: '家族[かぞく]',
              hiragana: 'かぞく',
              meaning: '家人',
              example: '家族[かぞく]と旅行[りょこう]します。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 5,
            fields: {
              kanji: '日本[にほん]',
              hiragana: 'にほん',
              meaning: '日本',
              example: '日本[にほん]の文化[ぶんか]は面白[おもしろ]いです。',
              level: 'N5'
            },
            pages: createDefaultPages()
          }
        ]
      };

      const dailyLifeFolder = {
        id: Date.now() - 2000,
        name: '日常生活',
        icon: '🏠',
        customFields: DEFAULT_FIELDS,
        cards: [
          {
            id: 6,
            fields: {
              kanji: '朝[あさ]ご飯[はん]',
              hiragana: 'あさごはん',
              meaning: '早餐',
              example: '朝[あさ]ご飯[はん]を食[た]べます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 7,
            fields: {
              kanji: '買[か]い物[もの]',
              hiragana: 'かいもの',
              meaning: '購物',
              example: 'スーパーで買[か]い物[もの]をします。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 8,
            fields: {
              kanji: '電車[でんしゃ]',
              hiragana: 'でんしゃ',
              meaning: '電車',
              example: '電車[でんしゃ]で会社[かいしゃ]に行[い]きます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 9,
            fields: {
              kanji: '本[ほん]',
              hiragana: 'ほん',
              meaning: '書',
              example: '図書館[としょかん]で本[ほん]を読[よ]みます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 10,
            fields: {
              kanji: '病院[びょういん]',
              hiragana: 'びょういん',
              meaning: '醫院',
              example: '風邪[かぜ]をひいて病院[びょういん]に行[い]きました。',
              level: 'N5'
            },
            pages: createDefaultPages()
          }
        ]
      };

      const foodFolder = {
        id: Date.now() - 3000,
        name: '食べ物',
        icon: '🍱',
        customFields: DEFAULT_FIELDS,
        cards: [
          {
            id: 11,
            fields: {
              kanji: '寿司[すし]',
              hiragana: 'すし',
              meaning: '壽司',
              example: '日本[にほん]の寿司[すし]は美味[おい]しいです。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 12,
            fields: {
              kanji: 'ラーメン',
              hiragana: 'らーめん',
              meaning: '拉麵',
              example: 'ラーメンが大好[だいす]きです。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 13,
            fields: {
              kanji: 'コーヒー',
              hiragana: 'こーひー',
              meaning: '咖啡',
              example: '朝[あさ]はコーヒーを飲[の]みます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 14,
            fields: {
              kanji: '野菜[やさい]',
              hiragana: 'やさい',
              meaning: '蔬菜',
              example: '野菜[やさい]を食[た]べることは健康[けんこう]にいいです。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 15,
            fields: {
              kanji: '果物[くだもの]',
              hiragana: 'くだもの',
              meaning: '水果',
              example: '果物[くだもの]はビタミンが豊富[ほうふ]です。',
              level: 'N5'
            },
            pages: createDefaultPages()
          }
        ]
      };

      const verbFolder = {
        id: Date.now() - 4000,
        name: '動詞',
        icon: '🏃‍♂️',
        customFields: DEFAULT_FIELDS,
        cards: [
          {
            id: 16,
            fields: {
              kanji: '食[た]べる',
              hiragana: 'たべる',
              meaning: '吃',
              example: 'ご飯[はん]を食[た]べます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 17,
            fields: {
              kanji: '飲[の]む',
              hiragana: 'のむ',
              meaning: '喝',
              example: '水[みず]を飲[の]みます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 18,
            fields: {
              kanji: '見[み]る',
              hiragana: 'みる',
              meaning: '看',
              example: 'テレビを見[み]ます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 19,
            fields: {
              kanji: '聞[き]く',
              hiragana: 'きく',
              meaning: '聽',
              example: '音楽[おんがく]を聞[き]きます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 20,
            fields: {
              kanji: '読[よ]む',
              hiragana: 'よむ',
              meaning: '讀',
              example: '新聞[しんぶん]を読[よ]みます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          }
        ]
      };

      const adjectiveFolder = {
        id: Date.now() - 5000,
        name: '形容詞',
        icon: '🌈',
        customFields: DEFAULT_FIELDS,
        cards: [
          {
            id: 21,
            fields: {
              kanji: '大[おお]きい',
              hiragana: 'おおきい',
              meaning: '大的',
              example: 'この家[いえ]は大[おお]きいです。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 22,
            fields: {
              kanji: '小[ちい]さい',
              hiragana: 'ちいさい',
              meaning: '小的',
              example: '小[ちい]さい猫[ねこ]がいます。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 23,
            fields: {
              kanji: '新[あたら]しい',
              hiragana: 'あたらしい',
              meaning: '新的',
              example: '新[あたら]しい車[くるま]を買[か]いました。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 24,
            fields: {
              kanji: '古[ふる]い',
              hiragana: 'ふるい',
              meaning: '舊的',
              example: 'この本[ほん]は古[ふる]いです。',
              level: 'N5'
            },
            pages: createDefaultPages()
          },
          {
            id: 25,
            fields: {
              kanji: '美[うつく]しい',
              hiragana: 'うつくしい',
              meaning: '美麗的',
              example: '桜[さくら]の花[はな]は美[うつく]しいです。',
              level: 'N4'
            },
            pages: createDefaultPages()
          }
        ]
      };

      setFolders([basicVocabFolder, dailyLifeFolder, foodFolder, verbFolder, adjectiveFolder]);
    }
  }, []);

  // 保存數據
  useEffect(() => {
    if (folders.length > 0) {
      const dataToSave = {
        folders,
        settings,
        displayTemplates,
        currentTemplate
      };
      console.log('💾 保存資料到 localStorage:', dataToSave);
      localStorage.setItem('japanese-vocab-data', JSON.stringify(dataToSave));
      console.log('✅ 資料已保存');

      // 自動雲端同步
      if (syncSettings.autoSync && syncSettings.githubToken && syncSettings.gistId) {
        syncToCloud(dataToSave);
      }
    }
  }, [folders, settings, displayTemplates, currentTemplate]);

  // 雲端同步功能
  const syncToCloud = async (data) => {
    if (!syncSettings.githubToken || !syncSettings.gistId) {
      console.warn('⚠️ 雲端同步設定不完整');
      return;
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${syncSettings.gistId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `token ${syncSettings.githubToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          files: {
            'flashcard-data.json': {
              content: JSON.stringify(data, null, 2)
            }
          }
        })
      });

      if (response.ok) {
        console.log('☁️ 資料已同步到雲端');
        setSyncSettings(prev => ({ ...prev, lastSyncTime: new Date().toISOString() }));
      } else {
        console.error('❌ 雲端同步失敗:', response.statusText);
      }
    } catch (error) {
      console.error('❌ 雲端同步錯誤:', error);
    }
  };

  const syncFromCloud = async () => {
    if (!syncSettings.githubToken || !syncSettings.gistId) {
      alert('請先設定 GitHub Token 和 Gist ID');
      return;
    }

    try {
      const response = await fetch(`https://api.github.com/gists/${syncSettings.gistId}`, {
        headers: {
          'Authorization': `token ${syncSettings.githubToken}`,
        }
      });

      if (response.ok) {
        const gist = await response.json();
        const fileContent = gist.files['flashcard-data.json']?.content;

        if (fileContent) {
          const data = JSON.parse(fileContent);
          setFolders(data.folders || []);
          setSettings(data.settings || settings);
          setDisplayTemplates(data.displayTemplates || displayTemplates);
          setCurrentTemplate(data.currentTemplate || currentTemplate);

          console.log('☁️ 從雲端載入資料成功');
          setSyncSettings(prev => ({ ...prev, lastSyncTime: new Date().toISOString() }));
          alert('✅ 從雲端同步成功！');
        } else {
          alert('❌ Gist 中找不到資料檔案');
        }
      } else {
        alert('❌ 無法從雲端讀取資料');
      }
    } catch (error) {
      console.error('❌ 從雲端同步錯誤:', error);
      alert('❌ 同步失敗: ' + error.message);
    }
  };

  // 匯出資料為 JSON 檔案
  const exportData = () => {
    const dataToExport = {
      folders,
      settings,
      displayTemplates,
      currentTemplate,
      exportTime: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `flashcard-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    console.log('📥 資料已匯出');
    alert('✅ 資料已匯出！');
  };

  // 匯入資料從 JSON 檔案
  const importData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);

        if (confirm('確定要匯入資料嗎？這將會覆蓋目前的所有資料！')) {
          setFolders(data.folders || []);
          setSettings(data.settings || settings);
          setDisplayTemplates(data.displayTemplates || displayTemplates);
          setCurrentTemplate(data.currentTemplate || currentTemplate);

          console.log('📤 資料已匯入');
          alert('✅ 資料已匯入成功！');
        }
      } catch (error) {
        console.error('❌ 匯入失敗:', error);
        alert('❌ 匯入失敗: 檔案格式錯誤');
      }
    };
    reader.readAsText(file);
  };

  // 雲端同步對話框
  const SyncDialog = () => {
    const [localSyncSettings, setLocalSyncSettings] = useState(syncSettings);

    const saveSyncSettings = () => {
      setSyncSettings(localSyncSettings);
      localStorage.setItem('sync-settings', JSON.stringify(localSyncSettings));
      setShowSyncDialog(false);
      alert('✅ 同步設定已保存！');
    };

    const createNewGist = async () => {
      if (!localSyncSettings.githubToken) {
        alert('請先輸入 GitHub Token');
        return;
      }

      try {
        const response = await fetch('https://api.github.com/gists', {
          method: 'POST',
          headers: {
            'Authorization': `token ${localSyncSettings.githubToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            description: '單字閃卡資料',
            public: false,
            files: {
              'flashcard-data.json': {
                content: JSON.stringify({ folders: [], settings: {}, displayTemplates: [], currentTemplate: null }, null, 2)
              }
            }
          })
        });

        if (response.ok) {
          const gist = await response.json();
          setLocalSyncSettings(prev => ({ ...prev, gistId: gist.id }));
          alert(`✅ Gist 已建立！\nGist ID: ${gist.id}\n\n請記下這個 ID`);
        } else {
          alert('❌ 建立 Gist 失敗');
        }
      } catch (error) {
        alert('❌ 建立 Gist 錯誤: ' + error.message);
      }
    };

    return (
      <div style={styles.modal}>
        <div style={{ ...styles.modalContent, maxWidth: isMobile ? '95vw' : '600px' }}>
          <h2 style={{ margin: '0 0 20px 0', color: '#1f2937', fontSize: isMobile ? '18px' : '24px' }}>☁️ 雲端同步設定</h2>

          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: isMobile ? '14px' : '16px', marginBottom: '10px' }}>📦 匯出/匯入資料</h3>
            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px' }}>
              <button onClick={exportData} style={{ ...styles.button, flex: 1 }}>
                📥 匯出資料
              </button>
              <label style={{ ...styles.button, flex: 1, textAlign: 'center', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                📤 匯入資料
                <input
                  type="file"
                  accept=".json"
                  onChange={importData}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '20px', marginTop: '20px' }}>
            <h3 style={{ fontSize: isMobile ? '14px' : '16px', marginBottom: '10px' }}>☁️ GitHub Gist 同步</h3>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: isMobile ? '13px' : '14px', fontWeight: '600' }}>
                GitHub Personal Access Token:
              </label>
              <input
                type="password"
                value={localSyncSettings.githubToken}
                onChange={(e) => setLocalSyncSettings(prev => ({ ...prev, githubToken: e.target.value }))}
                style={{ ...styles.input, width: '100%', fontSize: isMobile ? '16px' : '14px' }}
                placeholder="ghp_xxxxxxxxxxxx"
              />
              <p style={{ fontSize: isMobile ? '11px' : '12px', color: '#6b7280', margin: '5px 0 0 0' }}>
                需要 'gist' 權限。
                <a href="https://github.com/settings/tokens/new" target="_blank" rel="noopener noreferrer" style={{ color: '#4F46E5' }}>
                  建立 Token
                </a>
              </p>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: isMobile ? '13px' : '14px', fontWeight: '600' }}>
                Gist ID:
              </label>
              <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px' }}>
                <input
                  type="text"
                  value={localSyncSettings.gistId}
                  onChange={(e) => setLocalSyncSettings(prev => ({ ...prev, gistId: e.target.value }))}
                  style={{ ...styles.input, flex: 1, fontSize: isMobile ? '16px' : '14px' }}
                  placeholder="abc123def456..."
                />
                <button onClick={createNewGist} style={{ ...styles.button, flex: isMobile ? 0 : 'auto' }}>
                  建立新 Gist
                </button>
              </div>
            </div>

            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={localSyncSettings.autoSync}
                  onChange={(e) => setLocalSyncSettings(prev => ({ ...prev, autoSync: e.target.checked }))}
                />
                <span>自動同步（每次儲存時自動上傳到雲端）</span>
              </label>
            </div>

            {localSyncSettings.lastSyncTime && (
              <p style={{ fontSize: '12px', color: '#6b7280' }}>
                上次同步: {new Date(localSyncSettings.lastSyncTime).toLocaleString('zh-TW')}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginTop: '15px' }}>
              <button
                onClick={syncFromCloud}
                style={{ ...styles.button, flex: 1 }}
                disabled={!localSyncSettings.githubToken || !localSyncSettings.gistId}
              >
                ⬇️ 從雲端下載
              </button>
              <button
                onClick={() => {
                  const dataToSave = { folders, settings, displayTemplates, currentTemplate };
                  syncToCloud(dataToSave);
                }}
                style={{ ...styles.button, flex: 1 }}
                disabled={!localSyncSettings.githubToken || !localSyncSettings.gistId}
              >
                ⬆️ 上傳到雲端
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '10px', marginTop: '20px' }}>
            <button onClick={saveSyncSettings} style={{ ...styles.button, flex: 1 }}>
              ✅ 保存設定
            </button>
            <button onClick={() => setShowSyncDialog(false)} style={{ ...styles.buttonRed, flex: 1 }}>
              ✖ 關閉
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Azure TTS設定對話框
  const TTSSettingsDialog = () => {
    const [azureSettings, setAzureSettings] = useState(settings.azureTTS);
    const [testText, setTestText] = useState('こんにちは、世界！');
    const [testVoice, setTestVoice] = useState('ja-JP-NanamiNeural');
    const [isTesting, setIsTesting] = useState(false);

    const saveSettings = () => {
      setSettings({
        ...settings,
        azureTTS: azureSettings
      });
      setShowTTSSettings(false);
      alert('Azure TTS 設定已保存！');
    };

    const testAzureTTS = async () => {
      if (!azureSettings.subscriptionKey || !azureSettings.region) {
        alert('請先填入 Azure 訂閱金鑰和區域');
        return;
      }

      setIsTesting(true);
      try {
        const testVoiceStyle = {
          rate: 'medium',
          pitch: 'medium',
          style: 'general',
          volume: 1.0
        };
        await speakWithAzure(testText, testVoice, azureSettings, testVoiceStyle);
        alert('測試成功！語音播放正常');
      } catch (error) {
        alert('測試失敗：' + error.message);
      } finally {
        setIsTesting(false);
      }
    };

    // 音檔管理功能
    const cache = audioCache();
    const cacheSize = cache.getCacheSize();
    const cacheSizeMB = (cacheSize / (1024 * 1024)).toFixed(2);

    const handleClearCache = () => {
      if (confirm('確定要清除所有快取音檔嗎？這將會刪除所有已儲存的語音檔案。')) {
        const deletedCount = cache.clearCache();
        alert(`已清除 ${deletedCount} 個快取音檔`);
      }
    };

    const handleCleanExpiredCache = () => {
      const deletedCount = cache.cleanExpiredCache();
      alert(`已清除 ${deletedCount} 個過期的快取音檔`);
    };

    // 測試 Azure 連接
    const testAzureConnection = async () => {
      if (!azureSettings.enabled || !azureSettings.subscriptionKey || !azureSettings.region) {
        alert('請先啟用 Azure TTS 並填入訂閱金鑰和區域');
        return;
      }

      setIsTesting(true);
      
      try {
        // 使用簡單的測試文字
        const testText = 'こんにちは';
        const testVoice = 'ja-JP-NanamiNeural';
        
        const ssml = `
          <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
            <voice name="${testVoice}">
              ${testText}
            </voice>
          </speak>
        `;

        const response = await fetch(`https://${azureSettings.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
          method: 'POST',
          headers: {
            'Ocp-Apim-Subscription-Key': azureSettings.subscriptionKey,
            'Content-Type': 'application/ssml+xml',
            'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
          },
          body: ssml
        });

        if (!response.ok) {
          let errorMessage = `連接失敗 (${response.status}): ${response.statusText}\n\n`;
          
          if (response.status === 401) {
            errorMessage += '❌ 原因：訂閱金鑰錯誤或已過期\n';
            errorMessage += '🔧 解決方法：\n';
            errorMessage += '1. 檢查訂閱金鑰是否正確\n';
            errorMessage += '2. 確認 Speech Services 資源是否有效\n';
            errorMessage += '3. 檢查金鑰是否已過期';
          } else if (response.status === 403) {
            errorMessage += '❌ 原因：區域設定錯誤或權限不足\n';
            errorMessage += '🔧 解決方法：\n';
            errorMessage += '1. 確認區域設定正確 (如: eastus, westus2)\n';
            errorMessage += '2. 檢查 Speech Services 是否在此區域啟用';
          } else if (response.status === 400) {
            errorMessage += '❌ 原因：請求格式錯誤\n';
            errorMessage += '🔧 解決方法：檢查語音名稱是否支援';
          }
          
          alert(errorMessage);
          return;
        }

        // 成功連接，嘗試播放音檔
        console.log('▣ Azure TTS 連接成功，準備播放音檔');
        
        const audioArrayBuffer = await response.arrayBuffer();
        
        // 詳細診斷音檔播放
        try {
          console.log('🔍 開始音頻診斷...');
          console.log('📊 音檔大小:', audioArrayBuffer.byteLength, 'bytes');
          
          // 檢查 AudioContext 支援
          if (!window.AudioContext && !window.webkitAudioContext) {
            throw new Error('瀏覽器不支援 AudioContext');
          }
          
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          console.log('🎵 AudioContext 狀態:', audioContext.state);
          console.log('🔊 AudioContext 採樣率:', audioContext.sampleRate);
          
          // 恢復 AudioContext（如果被暫停）
          if (audioContext.state === 'suspended') {
            console.log('⏸️ AudioContext 被暫停，嘗試恢復...');
            await audioContext.resume();
            console.log('▶️ AudioContext 恢復後狀態:', audioContext.state);
          }
          
          // 嘗試解碼音檔
          console.log('🔧 開始解碼音檔...');
          const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
          console.log('✅ 音檔解碼成功');
          console.log('📈 音檔時長:', audioBuffer.duration, '秒');
          console.log('🎼 音檔聲道數:', audioBuffer.numberOfChannels);
          
          // 創建音源
          const source = audioContext.createBufferSource();
          source.buffer = audioBuffer;
          
          // 創建音量控制
          const gainNode = audioContext.createGain();
          gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
          
          // 連接音頻節點
          source.connect(gainNode);
          gainNode.connect(audioContext.destination);
          
          console.log('🔗 音頻節點連接完成');
          
          // 播放結束和錯誤處理
          source.onended = () => {
            console.log('🎉 音檔播放完成');
            alert('✅ Azure TTS 連接和播放測試成功！\n\n您聽到了測試語音「こんにちは」，Azure TTS 工作正常。');
          };
          
          source.onerror = (error) => {
            console.error('❌ 音檔播放錯誤:', error);
            alert('❌ 音檔播放失敗:\n\n' + JSON.stringify(error) + '\n\n請檢查瀏覽器控制台獲取詳細信息。');
          };
          
          // 開始播放
          console.log('🎵 開始播放音檔...');
          source.start(0);
          
          // 設定超時檢查
          setTimeout(() => {
            if (audioContext.state === 'running') {
              console.log('⏰ 播放超時檢查: AudioContext 仍在運行');
            } else {
              console.warn('⚠️ 播放超時檢查: AudioContext 狀態異常:', audioContext.state);
            }
          }, 1000);
          
        } catch (playError) {
          console.error('❌ 音檔播放設置錯誤:', playError);
          console.error('錯誤堆疊:', playError.stack);
          
          let errorDetails = `錯誤類型: ${playError.name}\n`;
          errorDetails += `錯誤訊息: ${playError.message}\n`;
          errorDetails += `瀏覽器: ${navigator.userAgent}\n`;
          errorDetails += `AudioContext 支援: ${!!(window.AudioContext || window.webkitAudioContext)}`;
          
          alert('❌ Azure TTS 連接成功，但音檔播放失敗:\n\n' + errorDetails);
        }
        
      } catch (error) {
        console.error('Azure TTS 連接測試失敗:', error);
        alert(`❌ 連接測試失敗：\n\n${error.message}\n\n請檢查：\n1. 網路連接\n2. 訂閱金鑰和區域設定\n3. Azure Speech Services 是否正常運作`);
      } finally {
        setIsTesting(false);
      }
    };

    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.flexBetween}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>Azure TTS 語音設定</h3>
              {/* 連接狀態指示器 */}
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: azureSettings.enabled && azureSettings.subscriptionKey ? '#dcfce7' : '#fef3c7',
                color: azureSettings.enabled && azureSettings.subscriptionKey ? '#166534' : '#92400e',
                border: `1px solid ${azureSettings.enabled && azureSettings.subscriptionKey ? '#bbf7d0' : '#fde68a'}`
              }}>
                <span style={{ fontSize: '12px' }}>
                  {azureSettings.enabled && azureSettings.subscriptionKey ? '🟢' : '🟡'}
                </span>
                {azureSettings.enabled && azureSettings.subscriptionKey ? '已連接 Azure TTS' : '使用預設 TTS'}
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                style={{ 
                  ...styles.button, 
                  backgroundColor: isTesting ? '#9ca3af' : '#059669',
                  cursor: isTesting ? 'not-allowed' : 'pointer'
                }} 
                onClick={testAzureConnection}
                disabled={!azureSettings.enabled || !azureSettings.subscriptionKey || !azureSettings.region || isTesting}
              >
                {isTesting ? '⏳ 測試中...' : '🔍 測試連接'}
              </button>
              <button style={styles.button} onClick={saveSettings}>保存設定</button>
              <button style={styles.buttonGray} onClick={() => setShowTTSSettings(false)}>關閉</button>
            </div>
          </div>

          {/* 啟用Azure TTS */}
          <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '16px', fontWeight: 'bold' }}>
              <input
                type="checkbox"
                checked={azureSettings.enabled}
                onChange={(e) => setAzureSettings({...azureSettings, enabled: e.target.checked})}
              />
              啟用 Azure Text-to-Speech
            </label>
            <p style={{ fontSize: '14px', color: '#6b7280', margin: '10px 0 0 30px' }}>
              啟用後將使用更高品質的 Azure TTS 語音，否則使用瀏覽器內建 TTS
            </p>
          </div>

          {azureSettings.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* API 設定 */}
              <div style={{ padding: '15px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>🔑 API 設定</h4>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                      訂閱金鑰 (Subscription Key)
                    </label>
                    <input
                      type="password"
                      placeholder="輸入您的 Azure Speech Services 訂閱金鑰"
                      value={azureSettings.subscriptionKey}
                      onChange={(e) => setAzureSettings({...azureSettings, subscriptionKey: e.target.value})}
                      style={styles.input}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                      區域 (Region)
                    </label>
                    <select
                      value={azureSettings.region}
                      onChange={(e) => setAzureSettings({...azureSettings, region: e.target.value})}
                      style={styles.input}
                    >
                      <option value="eastus">East US (eastus)</option>
                      <option value="westus2">West US 2 (westus2)</option>
                      <option value="eastasia">East Asia (eastasia)</option>
                      <option value="southeastasia">Southeast Asia (southeastasia)</option>
                      <option value="japaneast">Japan East (japaneast)</option>
                      <option value="japanwest">Japan West (japanwest)</option>
                      <option value="westeurope">West Europe (westeurope)</option>
                      <option value="northeurope">North Europe (northeurope)</option>
                      <option value="centralus">Central US (centralus)</option>
                      <option value="australiaeast">Australia East (australiaeast)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 語音測試 */}
              <div style={{ padding: '15px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>🎤 語音測試</h4>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                      測試文字
                    </label>
                    <input
                      type="text"
                      value={testText}
                      onChange={(e) => setTestText(e.target.value)}
                      style={styles.input}
                      placeholder="輸入要測試的文字"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>
                      測試語音
                    </label>
                    <select
                      value={testVoice}
                      onChange={(e) => setTestVoice(e.target.value)}
                      style={styles.input}
                    >
                      {Object.entries(AVAILABLE_VOICES).map(([category, voices]) => (
                        <optgroup key={category} label={category}>
                          {voices.map(voice => (
                            <option key={voice.value} value={voice.value}>
                              {voice.label}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={testAzureTTS}
                    disabled={isTesting}
                    style={{ 
                      ...styles.buttonGreen, 
                      backgroundColor: isTesting ? '#9ca3af' : '#16a34a'
                    }}
                  >
{isTesting ? '◐ 測試中...' : '♪ 測試語音'}
                  </button>
                </div>
              </div>

              {/* 音檔快取管理 */}
              <div style={{ padding: '15px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px' }}>▣ 音檔快取管理</h4>
                <div style={{ display: 'grid', gap: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f9fafb', borderRadius: '6px' }}>
                    <span style={{ fontSize: '14px' }}>
                      <strong>快取大小：</strong>{cacheSizeMB} MB
                    </span>
                    <span style={{ fontSize: '12px', color: '#6b7280' }}>
                      自動過期：30天
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button
                      onClick={handleCleanExpiredCache}
                      style={{ ...styles.button, backgroundColor: '#f59e0b' }}
                    >
                      🧹 清理過期快取
                    </button>
                    <button
                      onClick={handleClearCache}
                      style={{ ...styles.buttonRed }}
                    >
    🗑 清除所有快取
                    </button>
                  </div>
                </div>
                <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
                  <p style={{ fontSize: '12px', color: '#0369a1', margin: 0 }}>
                    <strong>💡 快取說明：</strong><br />
                    • 首次播放會調用 Azure API 並儲存音檔<br />
                    • 相同文字+語音+風格的組合會使用快取，節省API費用<br />
                    • 快取檔案會自動在30天後過期<br />
                    • 建議定期清理過期快取以節省儲存空間
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 說明區域 */}
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
            <p style={{ fontSize: '14px', color: '#0369a1', margin: 0 }}>
              <strong>📋 Azure Speech Services 設定說明：</strong><br />
              1. 前往 <strong>Azure Portal (portal.azure.com)</strong><br />
              2. 創建 <strong>Speech Services</strong> 資源（不是 Cognitive Services 多合一資源）<br />
              3. 在資源的 <strong>「金鑰和端點」</strong> 頁面獲取：<br />
              　　• <strong>金鑰1 或 金鑰2</strong>（任選一個）<br />
              　　• <strong>區域</strong>（如 eastasia, japaneast 等）<br />
              4. 確保區域與 Speech Services 資源創建的區域一致<br />
              5. 如果遇到 401 錯誤，請檢查金鑰是否正確複製<br />
              6. 如果遇到 403 錯誤，請檢查區域設定是否正確
            </p>
          </div>

          {/* 故障排除 */}
          <div style={{ marginTop: '15px', padding: '15px', backgroundColor: '#fef2f2', borderRadius: '6px' }}>
            <p style={{ fontSize: '14px', color: '#dc2626', margin: 0 }}>
              <strong>⚠ 常見問題排除：</strong><br />
              • <strong>401 錯誤</strong>：訂閱金鑰錯誤或過期<br />
              • <strong>403 錯誤</strong>：區域設定錯誤或該區域未啟用服務<br />
              • <strong>400 錯誤</strong>：語音名稱不支援或SSML語法錯誤<br />
              • <strong>建議區域</strong>：東亞用戶建議使用 eastasia 或 japaneast
            </p>
          </div>
        </div>
      </div>
    );
  };

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
            order: maxOrder + 1,
            voice: settings.azureTTS.defaultVoice,
            voiceStyle: {
              rate: 'medium',
              pitch: 'medium',
              style: 'general',
              volume: 1.0
            }
          }
        });
        setNewFieldKey('');
        setNewFieldLabel('');
      }
    };

    const removeField = (fieldKey) => {
      if (confirm(`確定要刪除欄位「${editingFields[fieldKey]?.label}」嗎？`)) {
        const newFields = { ...editingFields };
        delete newFields[fieldKey];
        setEditingFields(newFields);
      }
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
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.flexBetween}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>自定義欄位編輯器</h3>
              {/* Azure TTS 設定快速連結 */}
              <button
                onClick={() => {
                  setShowFieldEditor(false);
                  setShowTTSSettings(true);
                }}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '#dcfce7' : '#fef3c7',
                  color: settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '#166534' : '#92400e',
                  border: `1px solid ${settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
                title="前往 Azure TTS 語音設定"
              >
                <span style={{ fontSize: '10px' }}>
                  {settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '🔗' : '⚡'}
                </span>
                語音設定
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={styles.button} onClick={saveFields}>保存</button>
              <button style={styles.buttonGray} onClick={() => setShowFieldEditor(false)}>關閉</button>
            </div>
          </div>

          {/* 添加新欄位 */}
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>添加新欄位</h4>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 120px 80px', gap: '10px', alignItems: 'end' }}>
              <input
                type="text"
                placeholder="欄位鍵名 (英文)"
                value={newFieldKey}
                onChange={(e) => setNewFieldKey(e.target.value)}
                style={styles.input}
              />
              <input
                type="text"
                placeholder="顯示名稱"
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                style={styles.input}
              />
              <select
                value={newFieldType}
                onChange={(e) => setNewFieldType(e.target.value)}
                style={styles.input}
              >
                <option value="text">純文字</option>
                <option value="kanji">漢字注音</option>
              </select>
              <button onClick={addField} style={styles.buttonGreen}>添加</button>
            </div>
          </div>

          {/* 現有欄位列表 */}
          <div style={{ marginTop: '20px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>現有欄位設定</h4>
            <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '10px' }}>💡 提示：拖曳左側手柄可調整欄位順序，最上面的為第一欄</p>
            <div style={{ maxHeight: '500px', overflow: 'auto' }}>
              {Object.entries(editingFields)
                .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
                .map(([key, field]) => {
                  // 取得該欄位在前3張卡片的資料
                  const sampleData = currentFolder && currentFolder.cards
                    ? currentFolder.cards.slice(0, 3).map(card => card.fields[key] || '(無資料)')
                    : [];

                  return (
                    <div
                      key={key}
                      draggable
                      onDragStart={(e) => handleDragStart(e, key)}
                      onDragOver={(e) => handleDragOver(e, key)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, key)}
                      style={{
                        padding: '12px',
                        border: `2px solid ${dragOverItem === key ? '#3b82f6' : '#e5e7eb'}`,
                        borderRadius: '8px',
                        marginBottom: '12px',
                        backgroundColor: draggedItem === key ? '#f1f5f9' : 'white',
                        opacity: draggedItem === key ? 0.7 : 1,
                        transform: draggedItem === key ? 'scale(0.98)' : 'scale(1)',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {/* 欄位設定區 */}
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}>
                        {/* 第一行: 編號、名稱、類型、語音、速度、音調、情感、音量、刪除 */}
                        {/* 第一行：編號、名稱、類型、預覽、刪除 */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '30px 35px 75px 50px 1fr 50px',
                          gap: '6px',
                          alignItems: 'center'
                        }}>
                          {/* 拖曳手柄 */}
                          <div style={{
                            color: '#9ca3af',
                            cursor: 'grab',
                            textAlign: 'center',
                            fontSize: '16px',
                            userSelect: 'none'
                          }}
                            onMouseDown={(e) => e.currentTarget.style.cursor = 'grabbing'}
                            onMouseUp={(e) => e.currentTarget.style.cursor = 'grab'}
                          >
                            ⋮⋮
                          </div>

                          {/* 順序顯示 */}
                          <div style={{
                            fontSize: '10px',
                            fontWeight: '600',
                            color: '#4F46E5',
                            textAlign: 'center',
                            backgroundColor: '#eef2ff',
                            padding: '3px',
                            borderRadius: '4px'
                          }}>
                            #{field.order || 0}
                          </div>

                          {/* 欄位名稱 */}
                          <input
                            type="text"
                            placeholder="名稱"
                            value={field.label}
                            onChange={(e) => updateField(key, { label: e.target.value })}
                            style={{ ...styles.input, margin: 0, fontSize: '11px', fontWeight: '400', padding: '5px 6px' }}
                          />

                          {/* 類型切換 - 用一個字 */}
                          <div style={{ display: 'flex', gap: '3px' }}>
                            <button
                              onClick={() => updateField(key, { type: 'text' })}
                              style={{
                                flex: 1,
                                padding: '5px 3px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                border: field.type === 'text' ? '2px solid #4F46E5' : '1px solid #d1d5db',
                                backgroundColor: field.type === 'text' ? '#4F46E5' : 'white',
                                color: field.type === 'text' ? 'white' : '#6b7280',
                                cursor: 'pointer',
                                fontWeight: field.type === 'text' ? '600' : '400',
                                transition: 'all 0.2s'
                              }}
                            >
                              文
                            </button>
                            <button
                              onClick={() => updateField(key, { type: 'kanji' })}
                              style={{
                                flex: 1,
                                padding: '5px 3px',
                                fontSize: '10px',
                                borderRadius: '4px',
                                border: field.type === 'kanji' ? '2px solid #4F46E5' : '1px solid #d1d5db',
                                backgroundColor: field.type === 'kanji' ? '#4F46E5' : 'white',
                                color: field.type === 'kanji' ? 'white' : '#6b7280',
                                cursor: 'pointer',
                                fontWeight: field.type === 'kanji' ? '600' : '400',
                                transition: 'all 0.2s'
                              }}
                            >
                              注
                            </button>
                          </div>

                          {/* 預覽 */}
                          {sampleData.length > 0 ? (
                            <div style={{
                              fontSize: '12px',
                              color: '#374151',
                              padding: '6px 10px',
                              backgroundColor: '#f9fafb',
                              borderRadius: '4px',
                              border: '1px solid #e5e7eb',
                              borderLeft: '3px solid #3b82f6',
                              minHeight: '30px',
                              display: 'flex',
                              alignItems: 'center',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }}>
                              {field.type === 'kanji' ? (
                                <KanjiWithFurigana text={sampleData[0]} showFurigana={true} />
                              ) : (
                                <span>{sampleData[0]}</span>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize: '10px', color: '#9ca3af' }}>無預覽</div>
                          )}

                          {/* 刪除按鈕 */}
                          <button
                            onClick={() => removeField(key)}
                            style={{ ...styles.buttonRed, padding: '5px 6px', fontSize: '12px' }}
                            title="刪除欄位"
                          >
                            🗑
                          </button>
                        </div>

                        {/* 第二行：試聽按鈕 + 語音選擇 + 語音風格設定 */}
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: '50px 150px 1fr 1fr 1fr 1fr',
                          gap: '6px',
                          alignItems: 'center',
                          marginTop: '6px',
                          paddingLeft: '65px'
                        }}>
                          {/* 試聽按鈕 - 移到最前面 */}
                          <button
                            onClick={async () => {
                              console.log('🔊 點擊試聽按鈕');

                              if (!settings.azureTTS.enabled || !settings.azureTTS.subscriptionKey) {
                                console.error('❌ Azure TTS 未設定');
                                alert('請先在設定中啟用並配置 Azure TTS');
                                return;
                              }

                              // 取得預覽文字
                              const previewText = sampleData.length > 0 ? sampleData[0] : '試聽範例';
                              console.log('📝 試聽文字:', previewText);

                              try {
                                // 準備語音風格參數
                                const voiceStyle = {
                                  pitch: field.voiceStyle?.pitch || 'medium',
                                  style: field.voiceStyle?.style || 'general',
                                  volume: field.voiceStyle?.volume || 1.0,
                                  rateMultiplier: field.voiceStyle?.rateMultiplier || 1.0
                                };

                                const targetVoice = field.voice || settings.azureTTS.defaultVoice;
                                console.log('🎤 使用語音:', targetVoice);
                                console.log('⚙️ 語音風格:', voiceStyle);

                                await speakWithAzure(previewText, targetVoice, settings.azureTTS, voiceStyle);
                                console.log('✅ 試聽完成');
                              } catch (error) {
                                console.error('❌ 試聽失敗:', error);
                                alert('試聽失敗: ' + error.message);
                              }
                            }}
                            style={{
                              padding: '8px',
                              fontSize: '20px',
                              borderRadius: '6px',
                              border: '2px solid #10b981',
                              backgroundColor: '#ecfdf5',
                              color: '#10b981',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#10b981';
                              e.currentTarget.style.color = 'white';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = '#ecfdf5';
                              e.currentTarget.style.color = '#10b981';
                            }}
                            title="試聽語音效果"
                          >
                            🔊
                          </button>

                          {/* 語音選擇 */}
                          <select
                            value={field.voice || settings.azureTTS.defaultVoice}
                            onChange={(e) => updateField(key, { voice: e.target.value })}
                            style={{ ...styles.input, margin: 0, fontSize: '12px', padding: '5px' }}
                          >
                            <optgroup label="🇹🇼 中文">
                              {AZURE_VOICES['zh-TW'].map(voice => (
                                <option key={voice.value} value={voice.value}>
                                  🇹🇼 {voice.label}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="🇯🇵 日文">
                              {AZURE_VOICES['ja-JP'].map(voice => (
                                <option key={voice.value} value={voice.value}>
                                  🇯🇵 {voice.label}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="🇺🇸 英文">
                              {AZURE_VOICES['en-US'].map(voice => (
                                <option key={voice.value} value={voice.value}>
                                  🇺🇸 {voice.label}
                                </option>
                              ))}
                            </optgroup>
                          </select>

                          {/* 速度滑桿 (0.5-3倍速) */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '9px', color: '#9ca3af' }}>
                              速度 {(field.voiceStyle?.rateMultiplier || 1.0).toFixed(1)}x
                            </span>
                            <input
                              type="range"
                              min="0.5"
                              max="3"
                              step="0.1"
                              value={field.voiceStyle?.rateMultiplier || 1.0}
                              onChange={(e) => updateField(key, {
                                voiceStyle: { ...(field.voiceStyle || {}), rateMultiplier: parseFloat(e.target.value) }
                              })}
                              style={{ width: '100%' }}
                            />
                          </div>

                          {/* 音調 */}
                          <select
                            value={field.voiceStyle?.pitch || 'medium'}
                            onChange={(e) => updateField(key, {
                              voiceStyle: { ...(field.voiceStyle || {}), pitch: e.target.value }
                            })}
                            style={{ ...styles.input, margin: 0, fontSize: '12px', padding: '5px' }}
                          >
                            <option value="x-low">極低</option>
                            <option value="low">低</option>
                            <option value="medium">正常</option>
                            <option value="high">高</option>
                            <option value="x-high">極高</option>
                          </select>

                          {/* 情感 */}
                          <select
                            value={field.voiceStyle?.style || 'general'}
                            onChange={(e) => updateField(key, {
                              voiceStyle: { ...(field.voiceStyle || {}), style: e.target.value }
                            })}
                            style={{ ...styles.input, margin: 0, fontSize: '12px', padding: '5px' }}
                          >
                            <option value="general">一般</option>
                            <option value="cheerful">開朗</option>
                            <option value="sad">悲傷</option>
                            <option value="angry">憤怒</option>
                            <option value="fearful">恐懼</option>
                            <option value="gentle">溫柔</option>
                          </select>

                          {/* 音量 */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '9px', color: '#9ca3af' }}>
                              音量 {Math.round((field.voiceStyle?.volume || 1.0) * 100)}%
                            </span>
                            <input
                              type="range"
                              min="0"
                              max="2"
                              step="0.1"
                              value={field.voiceStyle?.volume || 1.0}
                              onChange={(e) => updateField(key, {
                                voiceStyle: { ...(field.voiceStyle || {}), volume: parseFloat(e.target.value) }
                              })}
                              style={{ width: '100%' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
            <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
              <strong>使用說明：</strong><br />
              • <strong>拖曳排序</strong>：按住左側 ⋮⋮ 手柄拖曳來調整欄位順序<br />
              • <strong>欄位鍵名</strong>：用於程式內部識別，建議使用英文（創建後不可修改）<br />
              • <strong>顯示名稱</strong>：在試算表中顯示的標題<br />
              • <strong>類型</strong>：漢字注音類型支援 漢字[ふりがな] 格式<br />
              • <strong>語音</strong>：選擇此欄位使用的 TTS 語音（需先設定 Azure TTS）<br />
              • <strong>⚙ 風格</strong>：點擊設定該欄位的語音風格（速度、音調、情感等）<br />
              • <strong>順序</strong>：也可以直接修改數字來調整順序
            </p>
          </div>
        </div>
      </div>
    );
  };

  // 語音風格編輯器組件
  const VoiceStyleEditor = ({ fieldKey, voiceStyle, onSave, onCancel }) => {
    const [editStyle, setEditStyle] = useState(voiceStyle || {
      rate: 'medium',
      pitch: 'medium',
      style: 'general',
      volume: 1.0
    });
    const [testText, setTestText] = useState('これはテストです。');
    const [isTesting, setIsTesting] = useState(false);

    // 測試語音功能
    const testVoice = async () => {
      if (isTesting) return;
      setIsTesting(true);
      
      try {
        if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey) {
          const field = getCurrentFields()[fieldKey];
          const voiceToUse = field?.voice || settings.azureTTS.defaultVoice || 'ja-JP-NanamiNeural';
          
          // 終極測試：直接調用測試連接的函數
          console.log('🔄 終極測試：直接調用測試連接函數');
          
          // 臨時替換測試文字和設定
          const originalSubscriptionKey = settings.azureTTS.subscriptionKey;
          const originalRegion = settings.azureTTS.region;
          const originalEnabled = settings.azureTTS.enabled;
          
          // 創建臨時的 azureSettings 對象，模擬 TTSSettingsDialog 的狀態
          const tempAzureSettings = {
            enabled: originalEnabled,
            subscriptionKey: originalSubscriptionKey,
            region: originalRegion
          };
          
          // 直接調用和測試連接相同的邏輯
          if (!tempAzureSettings.enabled || !tempAzureSettings.subscriptionKey || !tempAzureSettings.region) {
            alert('請先啟用 Azure TTS 並填入訂閱金鑰和區域');
            return;
          }

          try {
            // 使用簡單的測試文字
            const simpleTestText = 'こんにちは';
            const testVoice = 'ja-JP-NanamiNeural';
            
            const ssml = `
              <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
                <voice name="${testVoice}">
                  ${simpleTestText}
                </voice>
              </speak>
            `;

            const response = await fetch(`https://${tempAzureSettings.region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
              method: 'POST',
              headers: {
                'Ocp-Apim-Subscription-Key': tempAzureSettings.subscriptionKey,
                'Content-Type': 'application/ssml+xml',
                'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
              },
              body: ssml
            });

            if (!response.ok) {
              throw new Error(`連接失敗 (${response.status}): ${response.statusText}`);
            }

            const audioArrayBuffer = await response.arrayBuffer();
            
            // 完全複製測試連接的播放邏輯
            console.log('🔍 開始音頻診斷...');
            console.log('📊 音檔大小:', audioArrayBuffer.byteLength, 'bytes');
            
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            console.log('🎵 AudioContext 狀態:', audioContext.state);
            
            if (audioContext.state === 'suspended') {
              console.log('⏸️ AudioContext 被暫停，嘗試恢復...');
              await audioContext.resume();
              console.log('▶️ AudioContext 恢復後狀態:', audioContext.state);
            }
            
            const audioBuffer = await audioContext.decodeAudioData(audioArrayBuffer);
            console.log('✅ 音檔解碼成功');
            console.log('📈 音檔時長:', audioBuffer.duration, '秒');
            
            const source = audioContext.createBufferSource();
            source.buffer = audioBuffer;
            
            // 創建音量控制
            const gainNode = audioContext.createGain();
            gainNode.gain.setValueAtTime(1.0, audioContext.currentTime);
            
            // 連接音頻節點
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            console.log('🔗 音頻節點連接完成');
            
            return new Promise((resolve, reject) => {
              source.onended = () => {
                console.log('🎉 終極測試音檔播放完成');
                resolve();
              };
              source.onerror = (error) => {
                console.error('❌ 音檔播放錯誤:', error);
                reject(error);
              };
              source.start(0);
            });

          } catch (error) {
            console.error('❌ 終極測試失敗:', error);
            alert(`❌ 終極測試失敗：\n\n${error.message}`);
          }
        } else {
          console.log('Azure TTS 未啟用，使用瀏覽器內建語音');
          // 使用瀏覽器內建語音，但嘗試匹配選中的語音類型
          try {
            const field = getCurrentFields()[fieldKey];
            const selectedVoice = field?.voice || settings.azureTTS.defaultVoice;
            
            // 根據選中的語音類型選擇瀏覽器語音
            let preferredLang = 'ja-JP'; // 預設日語
            if (selectedVoice.includes('en-US')) {
              preferredLang = 'en-US';
            } else if (selectedVoice.includes('ja-JP')) {
              preferredLang = 'ja-JP';
            }
            
            console.log('使用瀏覽器語音，語言:', preferredLang);
            await speakWithBrowserVoice(testText, preferredLang, editStyle);
          } catch (error) {
            console.error('瀏覽器語音失敗:', error);
            alert('語音播放失敗。建議設定 Azure TTS 以獲得更好的語音效果。');
          }
        }
      } catch (error) {
        console.error('❌ 測試語音失敗:', error);
        console.error('錯誤詳情:', error.stack);
        alert('❌ 測試語音失敗:\n\n' + error.message + '\n\n請檢查瀏覽器控制台獲取詳細信息。');
      }
      
      console.log('🔄 測試語音完成，重置狀態');
      setIsTesting(false);
    };

    return (
      <div style={styles.modal}>
        <div style={{ ...styles.modalContent, maxWidth: '500px' }}>
          <div style={styles.flexBetween}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>
                語音風格設定 - {getCurrentFields()[fieldKey]?.label || fieldKey}
              </h3>
              {/* Azure TTS 設定快速連結 */}
              <button
                onClick={() => {
                  onCancel(); // 關閉當前窗口
                  setShowTTSSettings(true); // 開啟 Azure TTS 設定
                }}
                style={{
                  padding: '3px 6px',
                  fontSize: '11px',
                  backgroundColor: settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '#dcfce7' : '#fef3c7',
                  color: settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '#166534' : '#92400e',
                  border: `1px solid ${settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '#bbf7d0' : '#fde68a'}`,
                  borderRadius: '3px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="前往 Azure TTS 語音設定"
              >
                <span style={{ fontSize: '9px' }}>⚙</span>
                設定
              </button>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                style={styles.button} 
                onClick={() => onSave(editStyle)}
              >
✓ 保存
              </button>
              <button 
                style={styles.buttonGray} 
                onClick={onCancel}
              >
× 取消
              </button>
            </div>
          </div>

          <div style={{ marginTop: '20px' }}>
            {/* 測試區域 */}
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <h4 style={{ fontSize: '16px', fontWeight: 'bold', margin: 0 }}>
                  ◉ 語音測試
                </h4>
                {/* 語音狀態指示器 */}
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '6px',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  backgroundColor: settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '#dcfce7' : '#fef3c7',
                  color: settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '#166534' : '#92400e'
                }}>
                  <span style={{ fontSize: '10px' }}>
                    {settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? '●' : '●'}
                  </span>
                  {settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? 'Azure TTS' : '預設 TTS'}
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="text"
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  placeholder="輸入測試文字"
                  style={{ ...styles.input, flex: 1 }}
                />
                <button
                  onClick={testVoice}
                  disabled={isTesting}
                  style={{
                    ...styles.button,
                    backgroundColor: isTesting ? '#d1d5db' : '#10b981',
                    opacity: isTesting ? 0.6 : 1
                  }}
                >
{isTesting ? '◐ 測試中...' : '♪ 試聽'}
                </button>
              </div>
            </div>

            {/* 語音設定 */}
            <div style={{ 
              padding: '15px', 
              backgroundColor: '#f9fafb', 
              borderRadius: '6px',
              marginBottom: '20px'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
                ♪ 語音選擇
              </h4>
              <select
                value={getCurrentFields()[fieldKey]?.voice || settings.azureTTS.defaultVoice}
                onChange={(e) => {
                  // 更新語音選擇
                  const updatedFields = getCurrentFields();
                  updatedFields[fieldKey] = {
                    ...updatedFields[fieldKey],
                    voice: e.target.value
                  };
                  
                  const updatedFolders = folders.map(folder =>
                    folder.id === currentFolder?.id
                      ? { ...folder, customFields: updatedFields }
                      : folder
                  );
                  setFolders(updatedFolders);
                  setCurrentFolder({ ...currentFolder, customFields: updatedFields });
                }}
                style={styles.input}
              >
                {Object.entries(AVAILABLE_VOICES).map(([category, voices]) => (
                  <optgroup key={category} label={category}>
                    {voices.map(voice => (
                      <option key={voice.value} value={voice.value}>
                        {voice.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* 風格控制項 */}
            <div style={{ display: 'grid', gap: '20px' }}>
              {/* 語音速度 */}
              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
⚡ 語音速度
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={editStyle.rate}
                    onChange={(e) => {
                      const newStyle = { ...editStyle, rate: e.target.value };
                      setEditStyle(newStyle);
                      // 自動試聽
                      setTimeout(() => {
                        (async () => {
                          try {
                            const field = getCurrentFields()[fieldKey];
                            if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey && field?.voice) {
                              await speakWithAzure('速度測試', field.voice, settings.azureTTS, newStyle);
                            } else {
                              const selectedVoice = field?.voice || settings.azureTTS.defaultVoice;
                              const preferredLang = selectedVoice.includes('en-US') ? 'en-US' : 'ja-JP';
                              await speakWithBrowserVoice('速度測試', preferredLang, newStyle);
                            }
                          } catch (error) {
                            console.error('自動試聽失敗:', error);
                          }
                        })();
                      }, 100);
                    }}
                    style={{ ...styles.input, flex: 1 }}
                  >
                    {VOICE_STYLES.rate.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const field = getCurrentFields()[fieldKey];
                      if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey && field?.voice) {
                        speakWithAzure('速度測試範例', field.voice, settings.azureTTS, editStyle).catch(console.error);
                      } else {
                        const selectedVoice = field?.voice || settings.azureTTS.defaultVoice;
                        const preferredLang = selectedVoice.includes('en-US') ? 'en-US' : 'ja-JP';
                        speakWithBrowserVoice('速度測試範例', preferredLang, editStyle).catch(console.error);
                      }
                    }}
                    style={{ ...styles.button, padding: '4px 8px', fontSize: '12px', backgroundColor: '#10b981' }}
                    title="試聽此設定"
                  >
  ♪
                  </button>
                </div>
              </div>

              {/* 音調高低 */}
              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
◐ 音調高低
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={editStyle.pitch}
                    onChange={(e) => {
                      const newStyle = { ...editStyle, pitch: e.target.value };
                      setEditStyle(newStyle);
                      // 自動試聽
                      setTimeout(() => {
                        (async () => {
                          try {
                            const field = getCurrentFields()[fieldKey];
                            if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey && field?.voice) {
                              await speakWithAzure('音調測試', field.voice, settings.azureTTS, newStyle);
                            } else {
                              const selectedVoice = field?.voice || settings.azureTTS.defaultVoice;
                              const preferredLang = selectedVoice.includes('en-US') ? 'en-US' : 'ja-JP';
                              await speakWithBrowserVoice('音調測試', preferredLang, newStyle);
                            }
                          } catch (error) {
                            console.error('自動試聽失敗:', error);
                          }
                        })();
                      }, 100);
                    }}
                    style={{ ...styles.input, flex: 1 }}
                  >
                    {VOICE_STYLES.pitch.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const field = getCurrentFields()[fieldKey];
                      if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey && field?.voice) {
                        speakWithAzure('音調測試範例', field.voice, settings.azureTTS, editStyle).catch(console.error);
                      } else {
                        const selectedVoice = field?.voice || settings.azureTTS.defaultVoice;
                        const preferredLang = selectedVoice.includes('en-US') ? 'en-US' : 'ja-JP';
                        speakWithBrowserVoice('音調測試範例', preferredLang, editStyle).catch(console.error);
                      }
                    }}
                    style={{ ...styles.button, padding: '4px 8px', fontSize: '12px', backgroundColor: '#10b981' }}
                    title="試聽此設定"
                  >
  ♪
                  </button>
                </div>
              </div>

              {/* 情感風格 */}
              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
◯ 情感風格
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <select
                    value={editStyle.style}
                    onChange={(e) => {
                      const newStyle = { ...editStyle, style: e.target.value };
                      setEditStyle(newStyle);
                      // 自動試聽
                      setTimeout(() => {
                        (async () => {
                          try {
                            const field = getCurrentFields()[fieldKey];
                            if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey && field?.voice) {
                              await speakWithAzure('こんにちは', field.voice, settings.azureTTS, newStyle);
                            } else {
                              const selectedVoice = field?.voice || settings.azureTTS.defaultVoice;
                              const preferredLang = selectedVoice.includes('en-US') ? 'en-US' : 'ja-JP';
                              await speakWithBrowserVoice('こんにちは', preferredLang, newStyle);
                            }
                          } catch (error) {
                            console.error('自動試聽失敗:', error);
                          }
                        })();
                      }, 100);
                    }}
                    style={{ ...styles.input, flex: 1 }}
                  >
                    {VOICE_STYLES.style.map(option => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      const field = getCurrentFields()[fieldKey];
                      if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey && field?.voice) {
                        speakWithAzure('情感風格測試', field.voice, settings.azureTTS, editStyle).catch(console.error);
                      } else {
                        const selectedVoice = field?.voice || settings.azureTTS.defaultVoice;
                        const preferredLang = selectedVoice.includes('en-US') ? 'en-US' : 'ja-JP';
                        speakWithBrowserVoice('情感風格測試', preferredLang, editStyle).catch(console.error);
                      }
                    }}
                    style={{ ...styles.button, padding: '4px 8px', fontSize: '12px', backgroundColor: '#10b981' }}
                    title="試聽此設定"
                  >
  ♪
                  </button>
                </div>
              </div>

              {/* 音量控制 */}
              <div>
                <label style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', display: 'block' }}>
◑ 音量 ({Math.round(editStyle.volume * 100)}%)
                </label>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <input
                    type="range"
                    min="0.3"
                    max="1.0"
                    step="0.1"
                    value={editStyle.volume}
                    onChange={(e) => {
                      const newStyle = { ...editStyle, volume: parseFloat(e.target.value) };
                      setEditStyle(newStyle);
                      // 音量變化時自動試聽
                      setTimeout(() => {
                        (async () => {
                          try {
                            const field = getCurrentFields()[fieldKey];
                            if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey && field?.voice) {
                              await speakWithAzure('音量測試', field.voice, settings.azureTTS, newStyle);
                            } else {
                              const selectedVoice = field?.voice || settings.azureTTS.defaultVoice;
                              const preferredLang = selectedVoice.includes('en-US') ? 'en-US' : 'ja-JP';
                              await speakWithBrowserVoice('音量測試', preferredLang, newStyle);
                            }
                          } catch (error) {
                            console.error('自動試聽失敗:', error);
                          }
                        })();
                      }, 150);
                    }}
                    style={{ flex: 1 }}
                  />
                  <span style={{ fontSize: '12px', color: '#6b7280', minWidth: '40px' }}>
                    {Math.round(editStyle.volume * 100)}%
                  </span>
                  <button
                    onClick={() => {
                      const field = getCurrentFields()[fieldKey];
                      if (settings.azureTTS.enabled && settings.azureTTS.subscriptionKey && field?.voice) {
                        speakWithAzure('音量測試範例', field.voice, settings.azureTTS, editStyle).catch(console.error);
                      } else {
                        const selectedVoice = field?.voice || settings.azureTTS.defaultVoice;
                        const preferredLang = selectedVoice.includes('en-US') ? 'en-US' : 'ja-JP';
                        speakWithBrowserVoice('音量測試範例', preferredLang, editStyle).catch(console.error);
                      }
                    }}
                    style={{ ...styles.button, padding: '4px 8px', fontSize: '12px', backgroundColor: '#10b981' }}
                    title="試聽此音量"
                  >
  ♪
                  </button>
                </div>
              </div>
            </div>

            {/* 說明文字 */}
            <div style={{ 
              marginTop: '20px', 
              padding: '15px', 
              backgroundColor: '#dbeafe', 
              borderRadius: '6px' 
            }}>
              <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
                <strong>ⓘ 使用提示：</strong><br />
                • ◐ 調整設定時會自動試聽新效果<br />
                • ♪ 每個選項旁都有試聽按鈕可手動測試<br />
                • ◉ 上方測試區域可自定義試聽文字<br />
                • ▦ 設定會套用到該欄位的所有語音播放<br />
                • ▣ 音檔快取會根據風格設定分別儲存
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // 匯入對話框
  const ImportDialog = () => {
    const [importUrl, setImportUrl] = useState('');
    const [importText, setImportText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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
          .replace(/^(\d)/, 'field_$1') || `field_${index}`;
        
        newFields[fieldKey] = {
          label: header,
          type: (header.includes('漢字') || header.includes('kanji') || 
                 header.includes('例文') || header.includes('example')) ? 'kanji' : 'text',
          order: index + 1
        };
      });

      const newCards = rows.map((row, index) => {
        const fields = {};
        headers.forEach((header, headerIndex) => {
          const fieldKey = header.toLowerCase()
            .replace(/\s+/g, '_')
            .replace(/[^\w]/g, '')
            .replace(/^(\d)/, 'field_$1') || `field_${headerIndex}`;
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

    // .apkg 檔案匯入處理
    const handleApkgImport = async (event) => {
      const file = event.target.files?.[0];
      if (!file) return;

      console.log('開始匯入 .apkg 檔案:', file.name);

      if (!file.name.endsWith('.apkg')) {
        alert('請選擇 .apkg 檔案');
        return;
      }

      try {
        // 顯示載入中提示
        console.log('正在解析 .apkg 檔案...');

        // 解析 .apkg 檔案
        const ankiCards = await parseApkgFile(file);
        console.log('parseApkgFile 回傳結果:', ankiCards);
        console.log(`成功提取 ${ankiCards.length} 張卡片`);

        if (!ankiCards || ankiCards.length === 0) {
          console.warn('沒有提取到卡片');
          alert('檔案中沒有找到卡片,請檢查檔案是否有效。');
          return;
        }

        // 分析欄位並準備預覽數據
        const fieldAnalysis = analyzeFields(ankiCards);

        // 保存預覽數據並顯示欄位選擇器
        setApkgPreviewData({
          fileName: file.name.replace('.apkg', ''),
          ankiCards: ankiCards,
          fieldAnalysis: fieldAnalysis
        });

        setShowImportDialog(false);
        setShowFieldSelector(true);

        // 清空 file input
        event.target.value = '';
      } catch (error) {
        console.error('匯入 .apkg 檔案失敗:', error);
        console.error('錯誤堆疊:', error.stack);
        alert(`匯入失敗: ${error.message}\n\n請開啟瀏覽器主控台查看詳細錯誤訊息。`);
      }
    };

    // 分析 Anki 卡片的欄位
    const analyzeFields = (ankiCards) => {
      const fieldContentCount = {};
      const fieldSamples = {};

      ankiCards.forEach(card => {
        Object.entries(card.fields).forEach(([fieldName, value]) => {
          const trimmedValue = value.trim();
          if (trimmedValue) {
            fieldContentCount[fieldName] = (fieldContentCount[fieldName] || 0) + 1;
            if (!fieldSamples[fieldName]) {
              fieldSamples[fieldName] = trimmedValue.substring(0, 100);
            }
          }
        });
      });

      const minCardCount = Math.max(1, Math.floor(ankiCards.length * 0.1));

      // 獲取 Anki 原始欄位順序
      const ankiFieldOrder = window._ankiFieldOrder;
      let fieldOrder = [];

      if (ankiFieldOrder) {
        // 使用第一個模型的欄位順序(通常一個 .apkg 檔案只有一個模型)
        const firstModelOrder = Object.values(ankiFieldOrder)[0];
        if (firstModelOrder) {
          fieldOrder = firstModelOrder;
          console.log('使用 Anki 原始欄位順序:', fieldOrder);
        }
      }

      const usefulFields = Object.keys(fieldContentCount)
        .filter(fieldName => fieldContentCount[fieldName] >= minCardCount)
        .map(fieldName => ({
          name: fieldName,
          count: fieldContentCount[fieldName],
          sample: fieldSamples[fieldName],
          percentage: Math.round((fieldContentCount[fieldName] / ankiCards.length) * 100),
          originalOrder: fieldOrder.indexOf(fieldName)
        }))
        .sort((a, b) => {
          // 如果有原始順序,優先使用原始順序
          if (a.originalOrder !== -1 && b.originalOrder !== -1) {
            return a.originalOrder - b.originalOrder;
          }
          // 否則按照英文字母順序
          return a.name.localeCompare(b.name, 'en');
        });

      return usefulFields;
    };

    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.flexBetween}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>匯入數據</h3>
            <button onClick={() => setShowImportDialog(false)} style={styles.buttonGray}>關閉</button>
          </div>

          <div style={{ margin: '20px 0', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
            <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>匯入模式</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="replace"
                  checked={importMode === 'replace'}
                  onChange={(e) => setImportMode(e.target.value)}
                />
                <span style={{ color: '#10b981', fontWeight: importMode === 'replace' ? '600' : '400' }}>
                  建立新資料夾 - 將匯入的卡片建立為獨立的新資料夾
                </span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="importMode"
                  value="append"
                  checked={importMode === 'append'}
                  onChange={(e) => setImportMode(e.target.value)}
                  disabled={!currentFolder}
                />
                <span style={{
                  color: currentFolder ? '#6b7280' : '#d1d5db',
                  fontWeight: importMode === 'append' ? '600' : '400'
                }}>
                  附加到現有資料夾 - 將新卡片添加到當前資料夾
                  {currentFolder ? `「${currentFolder.name}」` : '(請先選擇資料夾)'}
                </span>
              </label>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ padding: '15px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>從 Google 試算表匯入</h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="貼上 Google 試算表 URL"
                  value={importUrl}
                  onChange={(e) => setImportUrl(e.target.value)}
                  style={styles.input}
                />
                <button
                  onClick={handleGoogleSheetsImport}
                  disabled={isLoading}
                  style={{ 
                    ...styles.buttonGreen, 
                    backgroundColor: isLoading ? '#9ca3af' : '#16a34a'
                  }}
                >
                  {isLoading ? '匯入中...' : '從 Google 試算表匯入'}
                </button>
              </div>
              <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#dbeafe', borderRadius: '6px' }}>
                <p style={{ fontSize: '14px', color: '#1e40af', margin: 0 }}>
                  <strong>設定步驟：</strong><br />
                  1. 開啟 Google 試算表 → 2. 點擊「共用」→ 3. 設為「知道連結的使用者」可檢視 → 4. 複製連結
                </p>
              </div>
            </div>

            <div style={{ padding: '15px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>從 CSV 文字匯入</h4>
              <textarea
                placeholder="貼上 CSV 數據，例如：&#10;漢字,ひらがな,意味&#10;学校[がっこう],がっこう,學校"
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                style={{ ...styles.input, minHeight: '100px', resize: 'vertical' }}
              />
              <button
                onClick={handleCSVTextImport}
                style={{ ...styles.button, marginTop: '10px' }}
              >
                從 CSV 文字匯入
              </button>
            </div>

            <div style={{ padding: '15px', border: '1px solid #d1d5db', borderRadius: '6px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>從 Anki .apkg 檔案匯入</h4>
              <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '10px' }}>
                支援匯入 Anki 卡包檔案 (.apkg),自動提取卡片資料
              </p>
              <input
                id="apkgInput"
                type="file"
                accept=".apkg"
                style={{ display: 'none' }}
                onChange={handleApkgImport}
              />
              <button
                onClick={() => document.getElementById('apkgInput').click()}
                style={{ ...styles.button }}
              >
                📦 選擇 .apkg 檔案
              </button>
            </div>

            <div style={{ padding: '15px', border: '2px solid #10b981', borderRadius: '6px', backgroundColor: '#ecfdf5' }}>
              <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#059669' }}>☁️ 雲端同步</h4>
              <p style={{ fontSize: '13px', color: '#047857', marginBottom: '10px' }}>
                將資料同步到雲端，讓您在電腦和手機都能存取相同的卡片
              </p>
              <button
                onClick={() => setShowSyncDialog(true)}
                style={{ ...styles.button, backgroundColor: '#10b981', borderColor: '#10b981' }}
              >
                ☁️ 開啟雲端同步設定
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Anki 欄位選擇器
  const FieldSelectorDialog = () => {
    if (!apkgPreviewData) return null;

    // 初始化選中的欄位及其類型
    const [selectedFields, setSelectedFields] = useState(
      apkgPreviewData.fieldAnalysis.slice(0, 10).map(f => ({
        name: f.name,
        type: 'text' // 預設為純文字
      }))
    );

    const toggleField = (fieldName) => {
      const isSelected = selectedFields.some(f => f.name === fieldName);
      if (isSelected) {
        setSelectedFields(selectedFields.filter(f => f.name !== fieldName));
      } else {
        setSelectedFields([...selectedFields, { name: fieldName, type: 'text' }]);
      }
    };

    const toggleFieldType = (fieldName) => {
      setSelectedFields(selectedFields.map(f =>
        f.name === fieldName
          ? { ...f, type: f.type === 'text' ? 'kanji' : 'text' }
          : f
      ));
    };

    const selectAll = () => {
      setSelectedFields(apkgPreviewData.fieldAnalysis.map(f => ({
        name: f.name,
        type: 'text'
      })));
    };

    const deselectAll = () => {
      setSelectedFields([]);
    };

    const confirmImport = () => {
      if (selectedFields.length === 0) {
        alert('請至少選擇一個欄位');
        return;
      }

      try {
        // 使用選中的欄位進行轉換
        const folderData = convertToAppFormatWithSelectedFields(
          apkgPreviewData.ankiCards,
          selectedFields,
          apkgPreviewData.fileName
        );

        // 根據匯入模式處理
        if (importMode === 'replace') {
          // 替換模式:建立新資料夾
          const newFolder = {
            id: Date.now(),
            icon: '📚',
            ...folderData
          };
          setFolders([...folders, newFolder]);
          setCurrentFolder(newFolder);
          setCurrentView('folder');
          alert(`成功建立新資料夾「${newFolder.name}」並匯入 ${folderData.cards.length} 張卡片`);
        } else {
          // 附加模式:加到現有資料夾
          if (!currentFolder) {
            alert('請先選擇或創建一個資料夾');
            return;
          }

          const updatedFolder = {
            ...currentFolder,
            cards: [...currentFolder.cards, ...folderData.cards],
            // 合併 customFields,保留舊的並加入新的
            customFields: {
              ...currentFolder.customFields,
              ...folderData.customFields
            }
          };

          setFolders(folders.map(f => f.id === currentFolder.id ? updatedFolder : f));
          setCurrentFolder(updatedFolder);
          alert(`成功附加 ${folderData.cards.length} 張卡片到「${currentFolder.name}」`);
        }

        setShowFieldSelector(false);
        setApkgPreviewData(null);
      } catch (error) {
        console.error('匯入失敗:', error);
        alert('匯入失敗: ' + error.message);
      }
    };

    const convertToAppFormatWithSelectedFields = (ankiCards, selectedFieldsWithTypes, folderName) => {
      const fields = {};
      selectedFieldsWithTypes.forEach((fieldObj, index) => {
        fields[`field${index + 1}`] = {
          label: fieldObj.name,
          type: fieldObj.type,
          order: index
        };
      });

      const cards = ankiCards.map((ankiCard, index) => {
        const convertedCard = {
          id: ankiCard.id || `card-${Date.now()}-${index}`,
          fields: {}
        };

        Object.entries(fields).forEach(([fieldKey, fieldDef]) => {
          convertedCard.fields[fieldKey] = ankiCard.fields[fieldDef.label] || '';
        });

        return convertedCard;
      });

      return {
        name: folderName,
        customFields: fields,  // 使用 customFields 而不是 fields
        cards: cards
      };
    };

    return (
      <div style={styles.modal}>
        <div style={{ ...styles.modalContent, maxWidth: '800px' }}>
          <div style={styles.flexBetween}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>
              選擇要匯入的欄位
            </h3>
            <button onClick={() => setShowFieldSelector(false)} style={styles.buttonGray}>
              取消
            </button>
          </div>

          <div style={{ margin: '15px 0', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
            <p style={{ fontSize: '14px', color: '#0369a1', margin: 0 }}>
              <strong>📊 檔案資訊:</strong> {apkgPreviewData.fileName} <br />
              <strong>📝 總卡片數:</strong> {apkgPreviewData.ankiCards.length} 張<br />
              <strong>📂 發現欄位:</strong> {apkgPreviewData.fieldAnalysis.length} 個<br />
              <strong>✅ 已選擇:</strong> {selectedFields.length} 個欄位
            </p>
          </div>

          <div style={{ margin: '15px 0', display: 'flex', gap: '10px' }}>
            <button onClick={selectAll} style={{ ...styles.button, fontSize: '13px' }}>
              全選
            </button>
            <button onClick={deselectAll} style={{ ...styles.buttonGray, fontSize: '13px' }}>
              全不選
            </button>
          </div>

          <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #d1d5db', borderRadius: '6px' }}>
            {apkgPreviewData.fieldAnalysis.map((field, index) => {
              const isSelected = selectedFields.some(f => f.name === field.name);
              const fieldType = selectedFields.find(f => f.name === field.name)?.type || 'text';

              return (
                <div
                  key={field.name}
                  style={{
                    padding: '16px',
                    borderBottom: index < apkgPreviewData.fieldAnalysis.length - 1 ? '1px solid #e5e7eb' : 'none',
                    backgroundColor: isSelected ? '#eff6ff' : 'white'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleField(field.name)}
                      style={{ width: '20px', height: '20px', cursor: 'pointer', marginTop: '2px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <strong style={{ fontSize: '15px', color: '#1f2937' }}>{field.name}</strong>
                        <span style={{ fontSize: '12px', color: '#6b7280', padding: '2px 8px', backgroundColor: '#f3f4f6', borderRadius: '4px' }}>
                          {field.percentage}% ({field.count}/{apkgPreviewData.ankiCards.length})
                        </span>
                      </div>

                      {/* 類型切換按鈕 */}
                      {isSelected && (
                        <div style={{ marginBottom: '8px' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>
                            欄位類型:
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (fieldType !== 'text') toggleFieldType(field.name);
                              }}
                              style={{
                                padding: '6px 16px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: fieldType === 'text' ? '2px solid #4F46E5' : '1px solid #d1d5db',
                                backgroundColor: fieldType === 'text' ? '#4F46E5' : 'white',
                                color: fieldType === 'text' ? 'white' : '#6b7280',
                                cursor: 'pointer',
                                fontWeight: fieldType === 'text' ? '600' : '400'
                              }}
                            >
                              純文字
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (fieldType !== 'kanji') toggleFieldType(field.name);
                              }}
                              style={{
                                padding: '6px 16px',
                                fontSize: '13px',
                                borderRadius: '6px',
                                border: fieldType === 'kanji' ? '2px solid #4F46E5' : '1px solid #d1d5db',
                                backgroundColor: fieldType === 'kanji' ? '#4F46E5' : 'white',
                                color: fieldType === 'kanji' ? 'white' : '#6b7280',
                                cursor: 'pointer',
                                fontWeight: fieldType === 'kanji' ? '600' : '400'
                              }}
                            >
                              漢字注音
                            </button>
                          </div>
                        </div>
                      )}

                      {/* 預覽內容 */}
                      <div style={{
                        padding: '10px',
                        backgroundColor: '#f9fafb',
                        borderRadius: '6px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '4px' }}>
                          預覽:
                        </div>
                        <div style={{ fontSize: '13px', color: '#374151', lineHeight: '1.5' }}>
                          {isSelected && fieldType === 'kanji' ? (
                            <KanjiWithFurigana text={field.sample} showFurigana={true} />
                          ) : (
                            field.sample
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button onClick={() => setShowFieldSelector(false)} style={styles.buttonGray}>
              取消
            </button>
            <button
              onClick={confirmImport}
              style={styles.button}
              disabled={selectedFields.length === 0}
            >
              確認匯入 ({selectedFields.length} 個欄位)
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 欄位分組對話框
  const GroupByFieldDialog = () => {
    if (!showGroupDialog || !currentFolder) return null;

    const [selectedField, setSelectedField] = useState('');
    const [groupPreview, setGroupPreview] = useState({});

    const currentFields = getCurrentFields();
    const fieldKeys = Object.entries(currentFields)
      .sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))
      .map(([key, field]) => ({ key, label: field.label }));

    // 當選擇欄位時,預覽分組結果
    useEffect(() => {
      if (selectedField && currentFolder.cards) {
        const groups = {};
        currentFolder.cards.forEach(card => {
          const value = card.fields[selectedField] || '(空白)';
          if (!groups[value]) {
            groups[value] = [];
          }
          groups[value].push(card);
        });
        setGroupPreview(groups);
      }
    }, [selectedField]);

    const createSubFolders = () => {
      if (!selectedField || Object.keys(groupPreview).length === 0) {
        alert('請先選擇欄位');
        return;
      }

      // 建立子資料夾
      const subFolders = Object.entries(groupPreview).map(([value, cards]) => ({
        id: `${currentFolder.id}-sub-${Date.now()}-${Math.random()}`,
        name: value,
        cards: cards,
        isSubFolder: true,
        parentId: currentFolder.id
      }));

      // 更新資料夾,加入 subFolders 屬性
      const updatedFolder = {
        ...currentFolder,
        subFolders: subFolders
      };

      setFolders(folders.map(f => f.id === currentFolder.id ? updatedFolder : f));
      setCurrentFolder(updatedFolder);
      setShowGroupDialog(false);
      alert(`成功建立 ${subFolders.length} 個子資料夾!`);
    };

    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10000
      }} onClick={() => setShowGroupDialog(false)}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          maxWidth: '700px',
          width: '90%',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
        }} onClick={(e) => e.stopPropagation()}>

          <h2 style={{
            fontSize: '24px',
            fontWeight: 'bold',
            marginBottom: '24px',
            color: '#1f2937'
          }}>
            依欄位分組建立子資料夾
          </h2>

          <div style={{ marginBottom: '24px' }}>
            <label style={{
              display: 'block',
              marginBottom: '8px',
              fontWeight: '600',
              color: '#374151'
            }}>
              選擇分組欄位:
            </label>
            <select
              value={selectedField}
              onChange={(e) => setSelectedField(e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                outline: 'none'
              }}
            >
              <option value="">-- 請選擇欄位 --</option>
              {fieldKeys.map(({ key, label }) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {selectedField && Object.keys(groupPreview).length > 0 && (
            <div style={{
              marginBottom: '24px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '8px',
              border: '1px solid #e5e7eb'
            }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                marginBottom: '12px',
                color: '#374151'
              }}>
                分組預覽 (共 {Object.keys(groupPreview).length} 個群組):
              </h3>
              <div style={{
                maxHeight: '300px',
                overflow: 'auto',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}>
                {Object.entries(groupPreview)
                  .sort((a, b) => b[1].length - a[1].length) // 按卡片數量排序
                  .map(([value, cards]) => (
                    <div key={value} style={{
                      padding: '12px',
                      backgroundColor: 'white',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}>
                      <span style={{
                        fontWeight: '500',
                        color: '#1f2937',
                        flex: 1
                      }}>
                        {value || '(空白)'}
                      </span>
                      <span style={{
                        padding: '4px 12px',
                        backgroundColor: '#4F46E5',
                        color: 'white',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600'
                      }}>
                        {cards.length} 張
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          <div style={{
            display: 'flex',
            gap: '12px',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={() => setShowGroupDialog(false)}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #e5e7eb',
                backgroundColor: 'white',
                color: '#6b7280',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              取消
            </button>
            <button
              onClick={createSubFolders}
              disabled={!selectedField || Object.keys(groupPreview).length === 0}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: selectedField ? '#4F46E5' : '#9ca3af',
                color: 'white',
                cursor: selectedField ? 'pointer' : 'not-allowed',
                fontWeight: '600'
              }}
            >
              建立子資料夾
            </button>
          </div>
        </div>
      </div>
    );
  };

  // 簡化版試算表編輯器
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
          pages: createDefaultPages()
        };
      });

      setFolders(folders.map(folder =>
        folder.id === currentFolder.id ? { ...folder, cards: updatedCards } : folder
      ));
      
      setCurrentFolder({ ...currentFolder, cards: updatedCards });
      setShowSpreadsheet(false);
      alert('試算表已保存！');
    };

    const exportToCSV = () => {
      const fields = getCurrentFields();
      const headers = Object.entries(fields)
        .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
        .map(([,field]) => field.label);
      
      const csvContent = [
        headers.join(','),
        ...editData.map(row => {
          return Object.entries(fields)
            .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
            .map(([key]) => {
              const value = row[key] || '';
              // 如果內容包含逗號或引號，需要用引號包圍並轉義
              if (value.includes(',') || value.includes('"') || value.includes('\n')) {
                return `"${value.replace(/"/g, '""')}"`;
              }
              return value;
            })
            .join(',');
        })
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `${currentFolder.name}_單字資料.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    };

    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.flexBetween}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>試算表編輯器</h3>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                style={{ ...styles.button, backgroundColor: '#7c3aed' }} 
                onClick={() => setShowFieldEditor(true)}
                title="自定義欄位"
              >
✎ 欄位編輯
              </button>
              <button 
                style={{ ...styles.button, backgroundColor: '#f59e0b' }} 
                onClick={() => setShowImportDialog(true)}
                title="匯入資料"
              >
↓ 匯入
              </button>
              <button 
                style={{ ...styles.button, backgroundColor: '#10b981' }} 
                onClick={exportToCSV}
                title="匯出CSV檔案"
              >
↑ 匯出
              </button>
              <button style={styles.buttonGreen} onClick={addRow}>+ 新增行</button>
              <button style={styles.button} onClick={saveSpreadsheet}>✓ 保存</button>
              <button style={styles.buttonGray} onClick={() => setShowSpreadsheet(false)}>× 關閉</button>
            </div>
          </div>

          <div style={{ marginTop: '20px', overflow: 'auto', maxHeight: isMobile ? '500px' : '400px' }}>
            {isMobile ? (
              /* 手機版：卡片視圖 */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {editData.map((row, rowIndex) => (
                  <div key={row.id || rowIndex} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '12px',
                    backgroundColor: '#ffffff'
                  }}>
                    <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: '#374151' }}>卡片 {rowIndex + 1}</span>
                      <button
                        style={{ ...styles.buttonRed, padding: '6px 12px', fontSize: '13px' }}
                        onClick={() => deleteRow(rowIndex)}
                      >
                        刪除
                      </button>
                    </div>
                    {Object.entries(currentFields)
                      .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
                      .map(([fieldKey, field]) => (
                        <div key={fieldKey} style={{ marginBottom: '10px' }}>
                          <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '4px' }}>
                            {field.label}
                          </label>
                          <textarea
                            value={row[fieldKey] || ''}
                            onChange={(e) => updateCell(rowIndex, fieldKey, e.target.value)}
                            style={{
                              width: '100%',
                              fontSize: '14px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              padding: '8px',
                              resize: 'vertical',
                              outline: 'none'
                            }}
                            rows="2"
                            placeholder={`輸入${field.label}`}
                          />
                        </div>
                      ))}
                  </div>
                ))}
              </div>
            ) : (
              /* 桌面版：表格視圖 */
              <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #d1d5db' }}>
                <thead>
                  <tr style={{ backgroundColor: '#f3f4f6' }}>
                    <th style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '12px' }}>操作</th>
                    {Object.entries(currentFields)
                      .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
                      .map(([key, field]) => (
                      <th key={key} style={{ border: '1px solid #d1d5db', padding: '8px', fontSize: '12px', minWidth: '120px' }}>
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editData.map((row, rowIndex) => (
                    <tr key={row.id || rowIndex}>
                      <td style={{ border: '1px solid #d1d5db', padding: '4px', textAlign: 'center' }}>
                        <button
                          style={{ ...styles.buttonRed, padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => deleteRow(rowIndex)}
                        >
                          刪除
                        </button>
                      </td>
                      {Object.entries(currentFields)
                        .sort(([,a], [,b]) => (a.order || 0) - (b.order || 0))
                        .map(([fieldKey, field]) => (
                        <td key={fieldKey} style={{ border: '1px solid #d1d5db', padding: '4px' }}>
                          <textarea
                            value={row[fieldKey] || ''}
                            onChange={(e) => updateCell(rowIndex, fieldKey, e.target.value)}
                            style={{
                              width: '100%',
                              minWidth: '100px',
                              fontSize: '12px',
                              border: 'none',
                              resize: 'none',
                              outline: 'none'
                            }}
                            rows="2"
                            placeholder={`輸入${field.label}`}
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* 顯示提示資訊 */}
          <div style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f9ff', borderRadius: '6px' }}>
            <p style={{ fontSize: '14px', color: '#0369a1', margin: 0 }}>
              <strong>ⓘ 使用提示：</strong><br />
              • ✎ <strong>欄位編輯</strong>：新增、刪除、修改欄位定義<br />
              • ↓ <strong>匯入</strong>：從Google試算表或CSV文字匯入資料<br />
              • ↑ <strong>匯出</strong>：將目前資料匯出為CSV檔案<br />
              • + <strong>新增行</strong>：添加新的單字卡片<br />
              • ✓ <strong>保存</strong>：儲存所有編輯內容
            </p>
          </div>
        </div>

        {/* 顯示各種對話框 */}
        {showFieldEditor && <FieldEditor />}
        {showImportDialog && <ImportDialog />}
        {showFieldSelector && <FieldSelectorDialog />}
        {showGroupDialog && <GroupByFieldDialog />}
        {/* 語音風格編輯器對話框 */}
        {(console.log('VoiceStyleEditor 狀態檢查:', showVoiceStyleEditor, editingFieldKey), showVoiceStyleEditor) && (
          <VoiceStyleEditor 
            fieldKey={editingFieldKey}
            voiceStyle={editingVoiceStyle}
            onSave={(newStyle) => {
              // 更新編輯中的欄位
              if (editingFieldKey && getCurrentFields()[editingFieldKey]) {
                const updatedFields = folders.find(f => f.id === currentFolder.id)?.customFields || DEFAULT_FIELDS;
                updatedFields[editingFieldKey] = {
                  ...updatedFields[editingFieldKey],
                  voiceStyle: newStyle
                };
                
                const updatedFolders = folders.map(folder =>
                  folder.id === currentFolder.id
                    ? { ...folder, customFields: updatedFields }
                    : folder
                );
                setFolders(updatedFolders);
                setCurrentFolder({ ...currentFolder, customFields: updatedFields });
              }
              setShowVoiceStyleEditor(false);
              setEditingFieldKey(null);
              setEditingVoiceStyle(null);
            }}
            onCancel={() => {
              setShowVoiceStyleEditor(false);
              setEditingFieldKey(null);
              setEditingVoiceStyle(null);
            }}
          />
        )}
      </div>
    );
  };

  // 顯示模板編輯器
  const TemplateEditor = () => {
    const [localTemplates, setLocalTemplates] = useState({ ...displayTemplates });
    
    const updateTemplate = (templateId, field, value) => {
      setLocalTemplates(prev => ({
        ...prev,
        [templateId]: {
          ...prev[templateId],
          [field]: value
        }
      }));
    };
    
    const toggleField = (templateId, fieldKey) => {
      const template = localTemplates[templateId];
      const newFields = template.fields.includes(fieldKey)
        ? template.fields.filter(f => f !== fieldKey)
        : [...template.fields, fieldKey];
      
      updateTemplate(templateId, 'fields', newFields);
    };
    
    const saveTemplates = () => {
      setDisplayTemplates(localTemplates);
      setShowTemplateEditor(false);
    };
    
    return (
      <div style={styles.modal}>
        <div style={styles.modalContent}>
          <div style={styles.flexBetween}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold' }}>顯示模板編輯器</h3>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button style={styles.button} onClick={saveTemplates}>💾 儲存</button>
              <button style={styles.buttonGray} onClick={() => setShowTemplateEditor(false)}>❌ 取消</button>
            </div>
          </div>
          
          <div style={{ marginTop: '20px' }}>
            {Object.entries(localTemplates).map(([templateId, template]) => (
              <div key={templateId} style={{ 
                marginBottom: '20px', 
                padding: '15px', 
                backgroundColor: '#f8f9fa', 
                borderRadius: '8px',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '60px' }}>模板{templateId}</h4>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => updateTemplate(templateId, 'name', e.target.value)}
                    style={{ 
                      flex: 1, 
                      padding: '8px 12px', 
                      border: '1px solid #d1d5db', 
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                    placeholder="模板名稱"
                  />
                </div>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '8px' }}>
                  {Object.entries(getCurrentFields()).map(([fieldKey, fieldConfig]) => (
                    <button
                      key={fieldKey}
                      onClick={() => toggleField(templateId, fieldKey)}
                      style={{
                        padding: '8px 12px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid #d1d5db',
                        backgroundColor: template.fields.includes(fieldKey) ? '#10b981' : 'white',
                        color: template.fields.includes(fieldKey) ? 'white' : '#374151',
                        cursor: 'pointer'
                      }}
                    >
                      {fieldConfig.label}
                    </button>
                  ))}
                </div>
                
                <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280' }}>
                  已選擇 {template.fields.length} 個欄位：{template.fields.map(f => getCurrentFields()[f]?.label).join('、')}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  // 自動播放視圖 - 簡潔版面，只顯示卡片
  const AutoPlayView = () => {
    if (!currentCard) return null;

    const currentFields = getCurrentFields();
    const template = displayTemplates[currentAutoPlayTemplate] || displayTemplates['A'];
    
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#1f2937',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        {/* 播放進度指示 */}
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '20px',
          color: 'white',
          fontSize: '14px',
          backgroundColor: 'rgba(0,0,0,0.5)',
          padding: '8px 12px',
          borderRadius: '6px'
        }}>
          {currentAutoPlayCard + 1}/{currentFolder.cards.length} - 步驟 {currentAutoPlayStep + 1}
          <br />
          {autoPlayMode === 'loop' ? '🔄 循環播放' : '📋 順序播放'}
        </div>

        {/* 停止按鈕 */}
        <button
          onClick={stopAutoPlay}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '8px',
            fontSize: '16px',
            cursor: 'pointer'
          }}
        >
          ⏹ 停止播放
        </button>

        {/* 卡片顯示區域 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '40px',
          maxWidth: '800px',
          width: '90%',
          boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
        }}>
          {/* 頁面頂部欄位顯示 */}
          {template.topFields && template.topFields.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              padding: '12px 20px',
              backgroundColor: '#fffbeb',
              borderRadius: '8px',
              marginBottom: '20px',
              gap: '10px',
              border: '1px solid #fbbf24'
            }}>
              {template.topFields.map((fieldKey) => {
                const field = currentFields[fieldKey];
                const value = currentCard.fields[fieldKey];
                if (!value) return null;

                return (
                  <div key={fieldKey} style={{ textAlign: 'center', flex: 1 }}>
                    <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px', fontWeight: '500' }}>
                      {field?.label || fieldKey}
                    </div>
                    <div style={{ fontSize: '13px', color: '#78350f', fontWeight: '600' }}>
                      {field?.type === 'kanji' ?
                        value.replace(/\[.*?\]/g, '') : // 頂部欄位移除注音
                        value
                      }
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ fontSize: '18px', color: '#6b7280', marginBottom: '10px' }}>
            {template.name}
          </div>

          {template.fields.map((fieldKey, index) => {
            const field = currentFields[fieldKey];
            const value = currentCard.fields[fieldKey];
            const fieldStyle = template.fieldStyles?.[fieldKey] || { fontSize: 24, fontFamily: 'sans-serif', textAlign: 'center' };

            if (!value) return null;

            return (
              <div
                key={fieldKey}
                style={{
                  marginBottom: index < template.fields.length - 1 ? '20px' : '0',
                  textAlign: fieldStyle.textAlign
                }}
              >
                {field?.type === 'kanji' ? (
                  <div style={{
                    fontSize: `${fieldStyle.fontSize}px`,
                    lineHeight: '1.8',
                    color: '#1f2937',
                    fontFamily: fieldStyle.fontFamily
                  }}>
                    <KanjiWithFurigana text={value} showFurigana={template.showFurigana} />
                  </div>
                ) : (
                  <div style={{
                    fontSize: `${fieldStyle.fontSize}px`,
                    lineHeight: '1.4',
                    color: '#374151',
                    fontFamily: fieldStyle.fontFamily
                  }}>
                    {value}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // 學習模式視圖
  const StudyView = () => {
    const cards = currentFolder?.cards || [];
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [currentPageIndex, setCurrentPageIndex] = useState(0); // 顯示頁面索引
    const [currentScriptIndex, setCurrentScriptIndex] = useState(0); // 播放腳本索引
    const [selectedDisplayFields, setSelectedDisplayFields] = useState([]); // 自定義顯示欄位
    const [useCustomDisplay, setUseCustomDisplay] = useState(false); // 是否使用自定義顯示
    const [isEditingScript, setIsEditingScript] = useState(false);
    const [editingScript, setEditingScript] = useState([]);
    const [showFieldSelector, setShowFieldSelector] = useState(false);
    const [editingStepIndex, setEditingStepIndex] = useState(null);
    const [draggedIndex, setDraggedIndex] = useState(null);
    const card = cards[currentCardIndex];
    const currentFields = getCurrentFields();
    

    // 當開始編輯時，複製當前腳本
    const startEditingScript = () => {
      if (!card?.pages?.[currentScriptIndex]) return;
      setEditingScript([...card.pages[currentScriptIndex].script]);
      setIsEditingScript(true);
    };

    // 添加語音播放步驟
    const addSpeakStep = (fieldKey) => {
      const newStep = {
        type: 'speak',
        field: fieldKey,
        repeat: 1,
        rate: 1.0
      };
      setEditingScript([...editingScript, newStep]);
    };

    // 添加暫停步驟  
    const addPauseStep = (duration = 1000, intervalType = 'fixed') => {
      const newStep = {
        type: 'pause',
        duration: duration,
        intervalType: intervalType, // 'fixed' | 'multiplier'
        multiplier: intervalType === 'multiplier' ? 1.0 : undefined
      };
      setEditingScript([...editingScript, newStep]);
    };

    // 刪除步驟
    const deleteStep = (index) => {
      const newScript = editingScript.filter((_, i) => i !== index);
      setEditingScript(newScript);
    };

    // 更新步驟
    const updateStep = (index, updatedStep) => {
      const newScript = editingScript.map((step, i) => 
        i === index ? updatedStep : step
      );
      setEditingScript(newScript);
    };

    // 拖曳排序功能
    const handleDragStart = (e, index) => {
      setDraggedIndex(index);
      e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
    };

    const handleDragEnd = () => {
      setDraggedIndex(null);
    };

    const handleDrop = (e, targetIndex) => {
      e.preventDefault();
      if (draggedIndex === null || draggedIndex === targetIndex) return;
      
      const newScript = [...editingScript];
      const draggedItem = newScript[draggedIndex];
      
      // 移除被拖曳的項目
      newScript.splice(draggedIndex, 1);
      
      // 插入到目標位置
      const insertIndex = draggedIndex < targetIndex ? targetIndex - 1 : targetIndex;
      newScript.splice(insertIndex, 0, draggedItem);
      
      setEditingScript(newScript);
      setDraggedIndex(null);
    };

    // 保存腳本
    const saveScript = () => {
      const updatedFolders = folders.map(folder => 
        folder.id === currentFolder.id 
          ? {
              ...folder,
              cards: folder.cards.map(c => 
                c.id === card.id 
                  ? {
                      ...c,
                      pages: c.pages.map((page, idx) => 
                        idx === currentScriptIndex 
                          ? { ...page, script: editingScript }
                          : page
                      )
                    }
                  : c
              )
            }
          : folder
      );
      
      setFolders(updatedFolders);
      
      // 更新 currentFolder
      const updatedCurrentFolder = updatedFolders.find(f => f.id === currentFolder.id);
      setCurrentFolder(updatedCurrentFolder);
      
      setIsEditingScript(false);
      setEditingScript([]);
      setShowFieldSelector(false);
      setEditingStepIndex(null);
    };
    
    if (!card) return null;

    // 如果卡片沒有 pages 屬性,建立預設的 page
    if (!card.pages || card.pages.length === 0) {
      card.pages = [{
        id: 'default',
        name: '預設腳本',
        script: []
      }];
    }

    const currentDisplayPage = card.pages[currentPageIndex];
    const currentScriptPage = card.pages[currentScriptIndex];

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
      <div style={{ padding: isMobile ? '12px' : '20px', maxWidth: isMobile ? '100%' : '800px', margin: '0 auto' }}>
        <div style={{ ...styles.flexBetween, flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '10px' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: isMobile ? '100%' : 'auto' }}>
            <button
              style={styles.buttonGray}
              onClick={() => setCurrentView('folder')}
            >
              ← 返回
            </button>
            <h1 style={{ fontSize: isMobile ? '18px' : '24px', fontWeight: 'bold' }}>學習模式 - {currentFolder.name}</h1>
          </div>
          <div style={{ fontSize: isMobile ? '13px' : '14px', color: '#6b7280', width: isMobile ? '100%' : 'auto', textAlign: isMobile ? 'right' : 'left' }}>
            卡片 {currentCardIndex + 1}/{cards.length}
          </div>
        </div>

        <div style={{ ...styles.card, textAlign: 'center', minHeight: '300px', marginTop: '20px' }}>
          {/* 顯示控制區域 */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f8fafc', borderRadius: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 'bold', color: '#374151' }}>
                📋 卡片顯示模板
              </h3>
              <button
                  onClick={() => {
                    setShowAutoPlayEditor(true);
                    setCurrentPlaySettingTab('pages');
                  }}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#6366f1',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  ⚙️ 編輯模板
                </button>
            </div>
            
            {/* ABCDE模板選擇器 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: isMobile ? '6px' : '8px', flexWrap: 'wrap' }}>
              {Object.entries(displayTemplates).map(([templateId, template]) => (
                <button
                  key={templateId}
                  onClick={() => setCurrentTemplate(templateId)}
                  style={{
                    padding: isMobile ? '8px 10px' : '10px 14px',
                    fontSize: isMobile ? '12px' : '14px',
                    borderRadius: '8px',
                    border: '2px solid #d1d5db',
                    backgroundColor: currentTemplate === templateId ? '#10b981' : 'white',
                    color: currentTemplate === templateId ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontWeight: currentTemplate === templateId ? 'bold' : 'normal',
                    boxShadow: currentTemplate === templateId ? '0 4px 12px rgba(16, 185, 129, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)',
                    transform: currentTemplate === templateId ? 'translateY(-1px)' : 'none',
                    transition: 'all 0.2s ease',
                    width: isMobile ? '60px' : '90px',
                    height: isMobile ? '60px' : '75px',
                    minWidth: isMobile ? '60px' : '90px',
                    minHeight: isMobile ? '60px' : '75px',
                    maxWidth: isMobile ? '60px' : '90px',
                    maxHeight: isMobile ? '60px' : '75px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    touchAction: 'manipulation'
                  }}
                >
                  <div style={{ fontSize: isMobile ? '16px' : '18px', fontWeight: 'bold' }}>{templateId}</div>
                  <div style={{ fontSize: isMobile ? '9px' : '10px', opacity: 0.8, marginTop: '2px', textAlign: 'center', lineHeight: '1.2' }}>{template.name}</div>
                </button>
              ))}
            </div>
            
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#6b7280', textAlign: 'center' }}>
              當前模板：{displayTemplates[currentTemplate]?.name} 
              ({displayTemplates[currentTemplate]?.fields.length} 個欄位)
              {displayTemplates[currentTemplate]?.showFurigana ? ' | 顯示注音' : ' | 隱藏注音'}
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(() => {
              // 使用當前選擇的模板
              const template = displayTemplates[currentTemplate];
              const fieldsToShow = template?.fields || [];

              return (
                <>
                  {/* 頁面頂部欄位顯示 */}
                  {template?.topFields && template.topFields.length > 0 && (
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      padding: '12px 20px',
                      backgroundColor: '#fffbeb',
                      borderRadius: '8px',
                      gap: '10px',
                      border: '1px solid #fbbf24'
                    }}>
                      {template.topFields.map((fieldKey) => {
                        const field = currentFields[fieldKey];
                        const value = card.fields[fieldKey];
                        if (!value) return null;

                        return (
                          <div key={fieldKey} style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '4px', fontWeight: '500' }}>
                              {field?.label || fieldKey}
                            </div>
                            <div style={{ fontSize: '13px', color: '#78350f', fontWeight: '600' }}>
                              {field?.type === 'kanji' ?
                                value.replace(/\[.*?\]/g, '') : // 頂部欄位移除注音
                                value
                              }
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 主要欄位顯示 */}
                  {fieldsToShow.map(fieldKey => {
                    const field = currentFields[fieldKey];
                    const value = card.fields[fieldKey];
                    const fieldStyle = template?.fieldStyles?.[fieldKey] || { fontSize: 24, fontFamily: 'sans-serif', textAlign: 'center' };

                    if (!value || !field) return null;

                    return (
                      <div key={fieldKey} style={{ textAlign: fieldStyle.textAlign }}>
                        {field.type === 'kanji' ? (
                          <div style={{
                            fontSize: `${fieldStyle.fontSize}px`,
                            fontWeight: 'bold',
                            color: '#374151',
                            fontFamily: fieldStyle.fontFamily,
                            lineHeight: '1.8'
                          }}>
                            <KanjiWithFurigana text={value} showFurigana={template?.showFurigana || false} />
                          </div>
                        ) : (
                          <p style={{
                            fontSize: `${fieldStyle.fontSize}px`,
                            color: '#374151',
                            fontFamily: fieldStyle.fontFamily,
                            lineHeight: '1.4',
                            margin: 0
                          }}>
                            {value}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </>
              );
            })()}
          </div>
        </div>

        <div style={styles.card}>
          {/* 播放控制區域 */}
          <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#fef7f0', borderRadius: '6px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', color: '#374151' }}>
              🎵 腳本播放控制
            </h3>
            
            {/* 腳本選擇器 */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: '5px', flexWrap: 'wrap', marginBottom: '15px' }}>
              {card.pages.map((page, index) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentScriptIndex(index)}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    border: '1px solid #d1d5db',
                    backgroundColor: index === currentScriptIndex ? '#dc2626' : 'white',
                    color: index === currentScriptIndex ? 'white' : '#374151',
                    cursor: 'pointer'
                  }}
                >
                  {page.name}
                </button>
              ))}
            </div>
            
            <p style={{ fontSize: '12px', color: '#6b7280', textAlign: 'center', marginBottom: '15px' }}>
              當前播放腳本：{card.pages[currentScriptIndex]?.name}
            </p>
          </div>
          
          <div style={styles.flexCenter}>
            <button
              onClick={() => executeScript(card, currentScriptIndex)}
              disabled={isPlaying}
              style={{ 
                ...styles.button, 
                backgroundColor: isPlaying ? '#9ca3af' : '#2563eb',
                padding: '12px 24px',
                fontSize: '16px'
              }}
            >
  ♪ {isPlaying ? '播放中...' : '播放'}
            </button>
            <button
              onClick={stopPlayback}
              disabled={!isPlaying}
              style={{ 
                ...styles.buttonRed, 
                backgroundColor: !isPlaying ? '#9ca3af' : '#dc2626',
                padding: '12px 24px',
                fontSize: '16px'
              }}
            >
              ⏹️ 停止
            </button>
            <button
              onClick={startEditingScript}
              disabled={isPlaying || isEditingScript}
              style={{ 
                ...styles.button,
                backgroundColor: isEditingScript ? '#9ca3af' : '#6b7280',
                padding: '12px 24px',
                fontSize: '16px'
              }}
            >
              📝 編輯腳本
            </button>
            <button
              onClick={() => setSettings({ ...settings, showFurigana: !settings.showFurigana })}
              style={{ 
                ...styles.buttonGreen, 
                backgroundColor: settings.showFurigana ? '#16a34a' : '#6b7280',
                padding: '12px 24px',
                fontSize: '16px'
              }}
            >
              {settings.showFurigana ? '👁️' : '🙈'} 注音
            </button>
          </div>

          <div style={{ ...styles.flexBetween, marginTop: '20px' }}>
            <button
              onClick={prevCard}
              disabled={currentCardIndex === 0}
              style={{ 
                ...styles.buttonGray, 
                backgroundColor: currentCardIndex === 0 ? '#d1d5db' : '#6b7280',
                padding: '10px 20px'
              }}
            >
              上一張卡片
            </button>
            <button
              onClick={nextCard}
              disabled={currentCardIndex >= cards.length - 1}
              style={{ 
                ...styles.buttonGray, 
                backgroundColor: currentCardIndex >= cards.length - 1 ? '#d1d5db' : '#6b7280',
                padding: '10px 20px'
              }}
            >
              下一張卡片
            </button>
          </div>
        </div>

        {/* 腳本編輯器 */}
        {isEditingScript && (
          <div style={{ ...styles.card, marginTop: '20px' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px' }}>
              📝 播放腳本編輯 - {card.pages[currentScriptIndex]?.name}
            </h3>
            
            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '10px', color: '#6b7280' }}>
                ℹ️ 當前腳本預覽 (點擊編輯，拖曳排序)
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {editingScript.map((step, index) => (
                  <div 
                    key={index} 
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, index)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '10px',
                      padding: '8px 12px',
                      backgroundColor: draggedIndex === index ? '#f3f4f6' : 'white',
                      borderRadius: '4px',
                      border: draggedIndex === index ? '2px dashed #2563eb' : '1px solid #e5e7eb',
                      cursor: 'grab',
                      opacity: draggedIndex === index ? 0.5 : 1,
                      transform: draggedIndex === index ? 'rotate(2deg)' : 'none',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ fontSize: '12px', color: '#9ca3af', minWidth: '15px' }}>⋮⋮</span>
                    <span style={{ fontSize: '16px', minWidth: '20px' }}>{index + 1}.</span>
                    
                    {editingStepIndex === index ? (
                      // 編輯模式
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                        {step.type === 'speak' ? (
                          <>
                            <select
                              value={step.field}
                              onChange={(e) => updateStep(index, { ...step, field: e.target.value })}
                              style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                            >
                              {Object.entries(currentFields).map(([fieldKey, fieldConfig]) => (
                                <option key={fieldKey} value={fieldKey}>{fieldConfig.label}</option>
                              ))}
                            </select>
                            <input
                              type="number"
                              value={step.repeat || 1}
                              onChange={(e) => updateStep(index, { ...step, repeat: parseInt(e.target.value) })}
                              style={{ width: '60px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                              min="1"
                              max="5"
                            />
                            <span style={{ fontSize: '12px' }}>次</span>
                            <input
                              type="number"
                              value={step.rate || 1.0}
                              onChange={(e) => updateStep(index, { ...step, rate: parseFloat(e.target.value) })}
                              style={{ width: '60px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                              step="0.1"
                              min="0.5"
                              max="2.0"
                            />
                            <span style={{ fontSize: '12px' }}>x速</span>
                          </>
                        ) : step.type === 'pause' ? (
                          <>
                            <span style={{ fontSize: '14px' }}>⏸️ 暫停</span>
                            <select
                              value={step.intervalType || 'fixed'}
                              onChange={(e) => {
                                const isMultiplier = e.target.value === 'multiplier';
                                updateStep(index, { 
                                  ...step, 
                                  intervalType: e.target.value,
                                  multiplier: isMultiplier ? (step.multiplier || 1.0) : undefined,
                                  duration: isMultiplier ? undefined : (step.duration || 1000)
                                });
                              }}
                              style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                            >
                              <option value="fixed">固定時間</option>
                              <option value="multiplier">音檔倍數</option>
                            </select>
                            
                            {step.intervalType === 'multiplier' ? (
                              <>
                                <select
                                  value={step.multiplier || 1.0}
                                  onChange={(e) => updateStep(index, { ...step, multiplier: parseFloat(e.target.value) })}
                                  style={{ padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                >
                                  <option value="0.5">0.5x</option>
                                  <option value="1.0">1.0x</option>
                                  <option value="1.5">1.5x</option>
                                  <option value="2.0">2.0x</option>
                                </select>
                                <span style={{ fontSize: '12px' }}>前段音檔長度</span>
                              </>
                            ) : (
                              <>
                                <input
                                  type="number"
                                  value={step.duration || 1000}
                                  onChange={(e) => updateStep(index, { ...step, duration: parseInt(e.target.value) })}
                                  style={{ width: '80px', padding: '4px 8px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                  min="100"
                                  max="5000"
                                  step="100"
                                />
                                <span style={{ fontSize: '12px' }}>毫秒</span>
                              </>
                            )}
                          </>
                        ) : null}
                        <button
                          style={{ ...styles.buttonGreen, padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => setEditingStepIndex(null)}
                        >
                          ✓
                        </button>
                      </div>
                    ) : (
                      // 顯示模式
                      <>
                        {step.type === 'speak' ? (
                          <span 
                            style={{ flex: 1, cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                            onClick={() => setEditingStepIndex(index)}
                          >
                            🗣️ 播放「{currentFields[step.field]?.label || step.field}」
                            {step.repeat > 1 && ` × ${step.repeat}`}
                            {step.rate !== 1.0 && ` (${step.rate}x速度)`}
                          </span>
                        ) : step.type === 'pause' ? (
                          <span 
                            style={{ flex: 1, cursor: 'pointer', padding: '4px 8px', borderRadius: '4px' }}
                            onClick={() => setEditingStepIndex(index)}
                          >
                            ⏸️ 暫停 {step.intervalType === 'multiplier' 
                              ? `${step.multiplier || 1.0}x 前段音檔長度` 
                              : `${step.duration}ms`}
                          </span>
                        ) : (
                          <span style={{ flex: 1 }}>
                            ❓ 未知類型: {step.type}
                          </span>
                        )}
                        <button
                          style={{ ...styles.buttonRed, padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => deleteStep(index)}
                        >
                          🗑️
                        </button>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '20px', padding: '15px', backgroundColor: '#f3f4f6', borderRadius: '6px' }}>
              <h4 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '15px', color: '#6b7280' }}>
                ➕ 新增腳本步驟
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div>
                  <button
                    style={{ ...styles.button, padding: '15px', fontSize: '14px', width: '100%', marginBottom: '10px' }}
                    onClick={() => setShowFieldSelector(!showFieldSelector)}
                  >
                    🗣️ 新增語音播放
                  </button>
                  {showFieldSelector && (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(2, 1fr)', 
                      gap: '5px',
                      padding: '10px',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      border: '1px solid #e5e7eb'
                    }}>
                      {Object.entries(currentFields).map(([fieldKey, fieldConfig]) => (
                        <button
                          key={fieldKey}
                          style={{ 
                            ...styles.buttonGray, 
                            padding: '8px 12px', 
                            fontSize: '12px',
                            textAlign: 'left'
                          }}
                          onClick={() => {
                            addSpeakStep(fieldKey);
                            setShowFieldSelector(false);
                          }}
                        >
                          {fieldConfig.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <button
                    style={{ ...styles.button, padding: '15px', fontSize: '14px', backgroundColor: '#6b7280', width: '100%', marginBottom: '10px' }}
                    onClick={() => addPauseStep()}
                  >
                    ⏸️ 新增固定暫停
                  </button>
                  <button
                    style={{ ...styles.button, padding: '10px', fontSize: '12px', backgroundColor: '#059669', width: '100%' }}
                    onClick={() => addPauseStep(0, 'multiplier')}
                  >
                    📐 新增倍數暫停
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
              <button
                style={{ ...styles.button, backgroundColor: '#16a34a' }}
                onClick={() => saveScript()}
              >
                💾 儲存腳本
              </button>
              <button
                style={styles.buttonGray}
                onClick={() => setIsEditingScript(false)}
              >
                ❌ 取消編輯
              </button>
            </div>
          </div>
        )}

        {/* 模板編輯器已整合到播放設定的頁面設定分頁中 */}
      </div>
    );
  };

  // 自動播放執行引擎
  const executeAutoPlayStep = useCallback(async (card, step) => {
    console.log('執行自動播放步驟:', step);
    
    switch (step.type) {
      case 'display':
        // 切換顯示模板 - 立即切換，不等待時間
        setCurrentAutoPlayTemplate(step.templateId);
        console.log('切換到模板:', step.templateId);
        break;
        
      case 'speak':
        // 語音播放
        const fieldValue = card.fields[step.field];
        console.log(`執行語音播放: 欄位=${step.field}, 內容="${fieldValue}", 重複=${step.repeat || 1}次`);
        
        if (fieldValue && fieldValue.trim()) {
          try {
            // 獲取該欄位的語音設定
            const fieldVoiceSetting = fieldVoiceSettings[step.field] || fieldVoiceSettings['kanji']; // 默認使用kanji設定
            console.log(`使用語音設定:`, fieldVoiceSetting);
            
            for (let i = 0; i < (step.repeat || 1); i++) {
              console.log(`語音播放第 ${i + 1} 次: "${fieldValue}"`);
              
              // 使用欄位特定的語音設定
              await speak(fieldValue, { 
                voice: fieldVoiceSetting.voice,
                rate: fieldVoiceSetting.rate,
                pitch: fieldVoiceSetting.pitch,
                style: fieldVoiceSetting.style
              });
              
              if (i < (step.repeat || 1) - 1) {
                // 重複之間的短暫停頓
                await new Promise(resolve => setTimeout(resolve, 200));
              }
            }
            
            // 後續暫停處理
            if (step.pauseMode === 'sentence' && step.sentenceMultiplier) {
              // 依照句長倍速暫停
              const cleanText = fieldValue.replace(/\[.*?\]/g, ''); // 移除注音符號
              const sentenceLength = cleanText.length;
              const basePauseTime = sentenceLength * 100; // 每個字100毫秒基準
              const adjustedPauseTime = basePauseTime * step.sentenceMultiplier;
              
              console.log(`句長暫停: ${cleanText} (${sentenceLength}字) × ${step.sentenceMultiplier} = ${adjustedPauseTime}ms`);
              await new Promise(resolve => setTimeout(resolve, adjustedPauseTime));
            } else if (step.pauseAfter && step.pauseAfter > 0) {
              // 固定時間暫停
              console.log(`固定暫停: ${step.pauseAfter}ms`);
              await new Promise(resolve => setTimeout(resolve, step.pauseAfter));
            }
          } catch (error) {
            console.error(`語音播放錯誤 (欄位: ${step.field}):`, error);
            // 即使語音播放失敗，也繼續執行下一步
          }
        } else {
          console.log(`跳過空白欄位: ${step.field}`);
        }
        break;
        
      case 'pause':
        // 靜音暫停
        await new Promise(resolve => setTimeout(resolve, step.duration || 1000));
        break;
        
      default:
        console.warn('未知的自動播放步驟類型:', step.type);
    }
  }, [speak, fieldVoiceSettings]);

  // 執行完整的自動播放
  const startAutoPlay = useCallback(async () => {
    if (!currentFolder?.cards || currentFolder.cards.length === 0) {
      alert('沒有卡片可以播放');
      return;
    }

    setIsAutoPlaying(true);
    setCurrentAutoPlayCard(0);
    setCurrentAutoPlayStep(0);

    const cards = currentFolder.cards;
    let cardIndex = 0;

    try {
      do {
        const card = cards[cardIndex];
        setCurrentCard(card);
        setCurrentView('autoplay'); // 切換到自動播放模式
        setCurrentAutoPlayCard(cardIndex);

        console.log(`開始播放卡片 ${cardIndex + 1}/${cards.length}:`, card.fields.kanji || '未命名');

        // 創建一個局部的顯示模板狀態管理器
        let currentDisplayTemplate = currentTemplate;
        const setCurrentDisplayTemplate = (templateId) => {
          currentDisplayTemplate = templateId;
          setCurrentTemplate(templateId);
        };

        // 執行腳本中的每個步驟
        for (let stepIndex = 0; stepIndex < autoPlayScript.length; stepIndex++) {
          if (!isAutoPlaying) break; // 檢查是否被中止

          setCurrentAutoPlayStep(stepIndex);
          const step = autoPlayScript[stepIndex];
          
          await executeAutoPlayStep(card, step);
        }

        cardIndex++;
        
        // 檢查播放模式
        if (cardIndex >= cards.length) {
          if (autoPlayMode === 'loop') {
            cardIndex = 0; // 循環播放，重新開始
          } else {
            break; // 順序播放，結束
          }
        }
        
      } while (isAutoPlaying && (autoPlayMode === 'loop' || cardIndex < cards.length));
      
      console.log('自動播放完成');
      
    } catch (error) {
      console.error('自動播放錯誤:', error);
      alert('自動播放發生錯誤: ' + error.message);
    } finally {
      setIsAutoPlaying(false);
      setCurrentAutoPlayCard(0);
      setCurrentAutoPlayStep(0);
      setCurrentView('folder'); // 播放結束後回到資料夾視圖
    }
  }, [currentFolder, autoPlayScript, autoPlayMode, isAutoPlaying, executeAutoPlayStep, currentTemplate]);

  // 停止自動播放
  const stopAutoPlay = useCallback(() => {
    setIsAutoPlaying(false);
    setCurrentView('folder'); // 回到資料夾視圖
    // 停止語音播放
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, []);

  // 播放選中的子資料夾
  const startAutoPlayWithSubFolders = useCallback(async () => {
    if (!currentFolder?.subFolders || selectedSubFolders.length === 0) {
      alert('請先選擇要播放的子資料夾');
      return;
    }

    // 收集所有選中的子資料夾中的卡片
    const selectedCards = [];
    currentFolder.subFolders.forEach(subFolder => {
      if (selectedSubFolders.includes(subFolder.id)) {
        selectedCards.push(...subFolder.cards);
      }
    });

    if (selectedCards.length === 0) {
      alert('選中的子資料夾中沒有卡片');
      return;
    }

    console.log(`開始播放 ${selectedSubFolders.length} 個子資料夾,共 ${selectedCards.length} 張卡片`);

    setIsAutoPlaying(true);
    setCurrentAutoPlayCard(0);
    setCurrentAutoPlayStep(0);

    let cardIndex = 0;

    try {
      do {
        const card = selectedCards[cardIndex];
        setCurrentCard(card);
        setCurrentView('autoplay');
        setCurrentAutoPlayCard(cardIndex);

        console.log(`播放卡片 ${cardIndex + 1}/${selectedCards.length}`);

        // 執行腳本中的每個步驟
        for (let stepIndex = 0; stepIndex < autoPlayScript.length; stepIndex++) {
          if (!isAutoPlaying) break;

          setCurrentAutoPlayStep(stepIndex);
          const step = autoPlayScript[stepIndex];

          await executeAutoPlayStep(card, step);
        }

        cardIndex++;

        if (cardIndex >= selectedCards.length) {
          if (autoPlayMode === 'loop') {
            cardIndex = 0;
          } else {
            break;
          }
        }

      } while (isAutoPlaying && (autoPlayMode === 'loop' || cardIndex < selectedCards.length));

      console.log('子資料夾播放完成');

    } catch (error) {
      console.error('子資料夾播放錯誤:', error);
      alert('播放發生錯誤: ' + error.message);
    } finally {
      setIsAutoPlaying(false);
      setCurrentAutoPlayCard(0);
      setCurrentAutoPlayStep(0);
      setCurrentView('folder');
    }
  }, [currentFolder, selectedSubFolders, autoPlayScript, autoPlayMode, isAutoPlaying, executeAutoPlayStep]);

  // 隨機播放功能
  const startRandomPlayback = useCallback(async () => {
    const cards = currentFolder?.cards || [];
    if (cards.length === 0) {
      alert('沒有卡片可以播放');
      return;
    }

    console.log('開始隨機播放，卡片數量:', cards.length);
    setIsPlaying(true);
    
    // 創建隨機順序的卡片列表
    const shuffledCards = [...cards].sort(() => Math.random() - 0.5);
    
    try {
      for (let i = 0; i < shuffledCards.length; i++) {
        if (!isPlaying) break;
        
        const card = shuffledCards[i];
        setCurrentCard(card);
        setCurrentView('study'); // 切換到學習視圖顯示卡片
        
        // 隨機選擇一個頁面，如果沒有pages則創建默認頁面
        let randomPageIndex = 0;
        if (card.pages && card.pages.length > 0) {
          randomPageIndex = Math.floor(Math.random() * card.pages.length);
        }
        
        console.log(`隨機播放 ${i + 1}/${shuffledCards.length}: ${card.fields.kanji || card.fields.hiragana || '未命名'}`);
        
        try {
          await executeScript(card, randomPageIndex);
        } catch (scriptError) {
          console.error('執行腳本錯誤:', scriptError);
          // 如果腳本執行失敗，至少播放一次語音
          const fieldToSpeak = card.fields.kanji || card.fields.hiragana || card.fields.meaning;
          if (fieldToSpeak) {
            await speak(fieldToSpeak);
          }
        }
        
        // 卡片間停頓
        if (isPlaying && i < shuffledCards.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
      
      console.log('隨機播放完成');
      
    } catch (error) {
      console.error('隨機播放錯誤:', error);
      alert('隨機播放發生錯誤: ' + error.message);
    } finally {
      setIsPlaying(false);
      setCurrentView('folder'); // 播放結束後回到資料夾視圖
    }
  }, [currentFolder, isPlaying, executeScript, speak]);

  // 資料夾視圖
  const FolderView = () => {
    const currentFields = getCurrentFields();
    
    return (
      <div style={{ padding: '20px' }}>
        <div style={styles.flexBetween}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button 
              style={styles.buttonGray} 
              onClick={() => setCurrentView('home')}
            >
              ← 返回
            </button>
            <span style={{ fontSize: '32px' }}>{currentFolder.icon}</span>
            <h1 style={{ fontSize: '28px', fontWeight: 'bold' }}>{currentFolder.name}</h1>
          </div>
          <div style={{
            display: 'flex',
            gap: isMobile ? '8px' : '10px',
            flexWrap: 'wrap',
            justifyContent: isMobile ? 'center' : 'flex-start'
          }}>
            <button
              onClick={() => setShowGroupDialog(true)}
              disabled={currentFolder.cards.length === 0}
              title="建立子資料夾"
              style={{
                ...styles.button,
                backgroundColor: currentFolder.cards.length === 0 ? '#d1d5db' : '#8b5cf6',
                minWidth: isMobile ? '44px' : '50px',
                padding: isMobile ? '12px' : '10px 16px',
                fontSize: isMobile ? '22px' : '20px',
                fontWeight: '400'
              }}
            >
              ⊕
            </button>
            <button
              onClick={() => setShowSpreadsheet(true)}
              title="試算表編輯"
              style={{
                ...styles.button,
                backgroundColor: '#7c3aed',
                minWidth: isMobile ? '44px' : '50px',
                padding: isMobile ? '12px' : '10px 16px',
                fontSize: isMobile ? '22px' : '20px',
                fontWeight: '400'
              }}
            >
              ☰
            </button>
            <button
              onClick={() => {
                if (currentFolder.cards.length > 0) {
                  setCurrentCard(currentFolder.cards[0]);
                  setCurrentView('study');
                }
              }}
              disabled={currentFolder.cards.length === 0}
              title="開始學習"
              style={{
                ...styles.button,
                backgroundColor: currentFolder.cards.length === 0 ? '#d1d5db' : '#2563eb',
                minWidth: isMobile ? '44px' : '50px',
                padding: isMobile ? '12px' : '10px 16px',
                fontSize: isMobile ? '22px' : '20px',
                fontWeight: '400'
              }}
            >
              ▶
            </button>
            <button
              onClick={() => {
                console.log('自動播放設定按鈕被點擊');
                setShowAutoPlayEditor(true);
              }}
              disabled={currentFolder.cards.length === 0}
              title="自動播放設定"
              style={{
                ...styles.button,
                backgroundColor: '#f59e0b',
                minWidth: isMobile ? '44px' : '50px',
                padding: isMobile ? '12px' : '10px 16px',
                fontSize: isMobile ? '22px' : '20px',
                fontWeight: '400'
              }}
            >
              ⚙
            </button>
            <button
              onClick={() => {
                console.log('自動播放按鈕被點擊, isAutoPlaying:', isAutoPlaying);
                if (isAutoPlaying) {
                  console.log('執行停止播放');
                  stopAutoPlay();
                } else {
                  console.log('執行開始播放');
                  startAutoPlay();
                }
              }}
              disabled={currentFolder.cards.length === 0}
              title={isAutoPlaying ? `停止播放 (${currentAutoPlayCard + 1}/${currentFolder.cards.length})` : '自動播放'}
              style={{
                ...styles.button,
                backgroundColor: isAutoPlaying ? '#dc2626' : '#10b981',
                minWidth: isMobile ? '44px' : '50px',
                padding: isMobile ? '12px' : '10px 16px',
                fontSize: isMobile ? '22px' : '20px',
                fontWeight: '400'
              }}
            >
              {isAutoPlaying ? '■' : '▶'}
            </button>
            <button
              onClick={() => {
                console.log('隨機播放按鈕被點擊, isPlaying:', isPlaying);
                startRandomPlayback();
              }}
              disabled={currentFolder.cards.length === 0 || isPlaying}
              title={isPlaying ? '播放中...' : '隨機播放'}
              style={{
                ...styles.button,
                backgroundColor: isPlaying ? '#9ca3af' : '#10b981',
                minWidth: isMobile ? '44px' : '50px',
                padding: isMobile ? '12px' : '10px 16px',
                fontSize: isMobile ? '22px' : '20px',
                fontWeight: '400'
              }}
            >
              ⊙
            </button>
            {isPlaying && (
              <button
                onClick={stopPlayback}
                title="停止播放"
                style={{
                  ...styles.buttonRed,
                  minWidth: isMobile ? '44px' : '50px',
                  padding: isMobile ? '12px' : '10px 16px',
                  fontSize: isMobile ? '22px' : '20px',
                  fontWeight: '400'
                }}
              >
                ■
              </button>
            )}
          </div>
        </div>

        {/* 子資料夾顯示區域 */}
        {currentFolder.subFolders && currentFolder.subFolders.length > 0 && (
          <div style={{ marginTop: '24px', marginBottom: '24px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px'
            }}>
              <h2 style={{ fontSize: '20px', fontWeight: '600', color: '#1f2937' }}>
                📁 子資料夾 ({currentFolder.subFolders.length})
              </h2>
              <button
                onClick={() => {
                  // 選擇全部/取消全部
                  if (selectedSubFolders.length === currentFolder.subFolders.length) {
                    setSelectedSubFolders([]);
                  } else {
                    setSelectedSubFolders(currentFolder.subFolders.map(sf => sf.id));
                  }
                }}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  borderRadius: '6px',
                  border: '1px solid #e5e7eb',
                  backgroundColor: 'white',
                  color: '#4F46E5',
                  cursor: 'pointer',
                  fontWeight: '600'
                }}
              >
                {selectedSubFolders.length === currentFolder.subFolders.length ? '取消全選' : '全選'}
              </button>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              {currentFolder.subFolders.map(subFolder => (
                <div
                  key={subFolder.id}
                  onClick={() => {
                    const isSelected = selectedSubFolders.includes(subFolder.id);
                    if (isSelected) {
                      setSelectedSubFolders(selectedSubFolders.filter(id => id !== subFolder.id));
                    } else {
                      setSelectedSubFolders([...selectedSubFolders, subFolder.id]);
                    }
                  }}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    border: selectedSubFolders.includes(subFolder.id)
                      ? '3px solid #4F46E5'
                      : '2px solid #e5e7eb',
                    backgroundColor: selectedSubFolders.includes(subFolder.id)
                      ? '#eef2ff'
                      : 'white',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                >
                  {selectedSubFolders.includes(subFolder.id) && (
                    <div style={{
                      position: 'absolute',
                      top: '8px',
                      right: '8px',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      backgroundColor: '#4F46E5',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '14px',
                      fontWeight: 'bold'
                    }}>
                      ✓
                    </div>
                  )}
                  <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                    {subFolder.name}
                  </div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    {subFolder.cards.length} 張卡片
                  </div>
                </div>
              ))}
            </div>

            {selectedSubFolders.length > 0 && (
              <div style={{ marginTop: '16px', display: 'flex', gap: '10px' }}>
                <button
                  onClick={() => {
                    console.log('自動播放選中的子資料夾:', selectedSubFolders);
                    startAutoPlayWithSubFolders();
                  }}
                  style={{
                    ...styles.button,
                    backgroundColor: '#10b981'
                  }}
                >
                  🎭 播放選中的子資料夾 ({selectedSubFolders.length})
                </button>
              </div>
            )}
          </div>
        )}

        <div style={styles.grid}>
          {currentFolder.cards.map(card => {
            // 動態獲取欄位定義
            const fields = getCurrentFields();
            const sortedFieldKeys = Object.entries(fields)
              .sort((a, b) => (a[1].order ?? 0) - (b[1].order ?? 0))
              .map(([key]) => key);

            // 取前3個欄位來顯示(如果有的話)
            const field1Key = sortedFieldKeys[0];
            const field2Key = sortedFieldKeys[1];
            const field3Key = sortedFieldKeys[2];

            const displayText1 = field1Key ? (card.fields[field1Key] || '未命名') : '未命名';
            const displayText2 = field2Key ? card.fields[field2Key] : '';
            const displayText3 = field3Key ? card.fields[field3Key] : '';

            return (
              <div key={card.id} style={styles.card}>
                <div style={{ marginBottom: '15px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '5px' }}>
                    <KanjiWithFurigana text={displayText1} showFurigana={settings.showFurigana} />
                  </h3>
                  {displayText2 && <p style={{ color: '#6b7280' }}>{displayText2}</p>}
                  {displayText3 && <p style={{ fontSize: '12px', color: '#9ca3af' }}>{displayText3}</p>}
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => {
                      setCurrentCard(card);
                      executeScript(card, 0);
                    }}
                    style={{ ...styles.button, flex: 1 }}
                  >
    ▶ 播放
                  </button>
                  <button
                    onClick={() => {
                      setCurrentCard(card);
                      setCurrentPageIndex(0);
                      setCurrentView('study');
                    }}
                    style={{ ...styles.buttonGray, flex: 1 }}
                  >
    ◉ 學習
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {currentFolder.cards.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>○</div>
            <p style={{ color: '#6b7280', fontSize: '18px' }}>這個資料夾還沒有任何卡片</p>
            <p style={{ color: '#9ca3af' }}>點擊「試算表編輯」開始添加日文單字！</p>
          </div>
        )}

        {showSpreadsheet && <SpreadsheetEditor />}
        {showFieldEditor && <FieldEditor />}
        {showImportDialog && <ImportDialog />}
        {showFieldSelector && <FieldSelectorDialog />}
        {showTemplateEditor && <TemplateEditor />}
        {/* 語音風格編輯器對話框 */}
        {showVoiceStyleEditor && (
          <VoiceStyleEditor 
            fieldKey={editingFieldKey}
            voiceStyle={editingVoiceStyle}
            onSave={(newStyle) => {
              // 更新編輯中的欄位
              if (editingFieldKey && getCurrentFields()[editingFieldKey]) {
                const updatedFields = folders.find(f => f.id === currentFolder.id)?.customFields || DEFAULT_FIELDS;
                updatedFields[editingFieldKey] = {
                  ...updatedFields[editingFieldKey],
                  voiceStyle: newStyle
                };
                
                const updatedFolders = folders.map(folder =>
                  folder.id === currentFolder.id
                    ? { ...folder, customFields: updatedFields }
                    : folder
                );
                setFolders(updatedFolders);
                setCurrentFolder({ ...currentFolder, customFields: updatedFields });
              }
              setShowVoiceStyleEditor(false);
              setEditingFieldKey(null);
              setEditingVoiceStyle(null);
            }}
            onCancel={() => {
              setShowVoiceStyleEditor(false);
              setEditingFieldKey(null);
              setEditingVoiceStyle(null);
            }}
          />
        )}
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
      if (confirm('確定要刪除這個資料夾嗎？')) {
        setFolders(folders.filter(f => f.id !== folderId));
      }
    };

    // 雲端備份功能 - 導出所有數據
    const exportAllData = () => {
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        folders: folders,
        settings: settings,
        fieldVoiceSettings: fieldVoiceSettings,
        autoPlayScript: autoPlayScript,
        autoPlayMode: autoPlayMode,
        displayTemplates: displayTemplates
      };
      
      const dataStr = JSON.stringify(backupData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `日語閃卡備份_${new Date().toISOString().slice(0,10)}.json`;
      link.click();
      
      URL.revokeObjectURL(url);
      alert('✅ 備份文件已下載！請將此文件保存到雲端硬碟，以便在其他裝置恢復數據。');
    };

    // 恢復數據功能
    const handleRestoreData = (event) => {
      const file = event.target.files[0];
      if (!file) return;
      
      if (confirm('⚠️ 恢復數據將會覆蓋現有所有資料，確定要繼續嗎？')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const backupData = JSON.parse(e.target.result);
            
            // 驗證備份文件格式
            if (!backupData.version || !backupData.folders) {
              throw new Error('無效的備份文件格式');
            }
            
            // 恢復數據
            if (backupData.folders) setFolders(backupData.folders);
            if (backupData.settings) setSettings(backupData.settings);
            if (backupData.fieldVoiceSettings) setFieldVoiceSettings(backupData.fieldVoiceSettings);
            if (backupData.autoPlayScript) setAutoPlayScript(backupData.autoPlayScript);
            if (backupData.autoPlayMode) setAutoPlayMode(backupData.autoPlayMode);
            
            alert(`✅ 數據恢復成功！\n備份時間：${new Date(backupData.timestamp).toLocaleString()}\n資料夾數量：${backupData.folders.length}`);
          } catch (error) {
            alert('❌ 恢復失败：' + error.message);
          }
        };
        reader.readAsText(file);
      }
      
      // 清空文件輸入
      event.target.value = '';
    };

    // 自動雲端同步功能 - 使用瀏覽器的 Web Share API 或 localStorage 跨域同步
    const autoCloudSync = async () => {
      const backupData = {
        version: '1.0',
        timestamp: new Date().toISOString(),
        folders: folders,
        settings: settings,
        fieldVoiceSettings: fieldVoiceSettings,
        autoPlayScript: autoPlayScript,
        autoPlayMode: autoPlayMode,
        displayTemplates: displayTemplates
      };
      
      const syncKey = 'japanese_flashcard_sync_' + new Date().toISOString().slice(0,10);
      
      try {
        // 方法1: 使用 Web Share API（手機優先）
        if (navigator.share) {
          const dataStr = JSON.stringify(backupData, null, 2);
          const dataBlob = new Blob([dataStr], { type: 'application/json' });
          const file = new File([dataBlob], `${syncKey}.json`, { type: 'application/json' });
          
          await navigator.share({
            title: '🇯🇵 日語閃卡數據同步',
            text: '將此文件保存到雲端硬碟，其他裝置可用「恢復數據」載入',
            files: [file]
          });
          
          alert('✅ 同步文件已分享！請保存到雲端硬碟（Google Drive、iCloud 等）');
          return;
        }
        
        // 方法2: 顯示同步碼（跨裝置複製貼上）
        const syncCode = btoa(JSON.stringify(backupData)).slice(0, 12);
        const fullData = JSON.stringify(backupData, null, 2);
        
        // 創建彈窗顯示同步選項
        const syncModal = document.createElement('div');
        syncModal.style.cssText = `
          position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
          background: rgba(0,0,0,0.8); z-index: 10000; display: flex; 
          align-items: center; justify-content: center;
        `;
        
        syncModal.innerHTML = `
          <div style="background: white; padding: 30px; border-radius: 15px; max-width: 500px; width: 90%;">
            <h3 style="margin-top: 0; color: #1a1a1a;">☁️ 選擇同步方式</h3>
            
            <button onclick="
              const data = ${JSON.stringify(fullData)};
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = url;
              link.download = '${syncKey}.json';
              link.click();
              URL.revokeObjectURL(url);
              this.parentElement.parentElement.remove();
              alert('✅ 備份文件已下載！\\n請上傳到 Google Drive、Dropbox 或其他雲端硬碟');
            " style="
              width: 100%; padding: 15px; margin: 10px 0; background: #10B981; 
              color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer;
            ">
              💾 下載到雲端硬碟
            </button>
            
            <button onclick="
              navigator.clipboard.writeText('${syncCode}').then(() => {
                alert('✅ 同步碼已複製: ${syncCode}\\n\\n在其他裝置：\\n1. 點擊「自動雲端同步」\\n2. 選擇「輸入同步碼」\\n3. 貼上此碼即可同步');
                this.parentElement.parentElement.remove();
              });
            " style="
              width: 100%; padding: 15px; margin: 10px 0; background: #4F46E5; 
              color: white; border: none; border-radius: 10px; font-size: 16px; cursor: pointer;
            ">
              📋 複製同步碼（12位）
            </button>
            
            <button onclick="this.parentElement.parentElement.remove();" style="
              width: 100%; padding: 10px; margin: 10px 0; background: #6B7280; 
              color: white; border: none; border-radius: 10px; font-size: 14px; cursor: pointer;
            ">
              取消
            </button>
          </div>
        `;
        
        document.body.appendChild(syncModal);
        
      } catch (error) {
        console.error('同步失敗:', error);
        alert('❌ 同步失敗，請使用「下載備份」功能手動備份');
      }
    };

    return (
      <div style={{ 
        padding: '32px 24px',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{ 
          textAlign: 'center',
          marginBottom: '40px'
        }}>
          <h1 style={{
            ...styles.header,
            background: 'linear-gradient(135deg, #4F46E5, #7C3AED, #EC4899)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            marginBottom: '12px',
            fontSize: '32px',
            fontWeight: '700'
          }}>
            🇯🇵 日本語学習カード
          </h1>
          <p style={{
            color: '#6B7280',
            fontSize: '16px',
            margin: '0 0 32px 0',
            fontWeight: '400'
          }}>
            智能語音閃卡，讓日語學習更有效率
          </p>
          
          <div style={{
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            gap: '12px',
            justifyContent: 'center',
            flexWrap: isMobile ? 'nowrap' : 'wrap',
            maxWidth: isMobile ? '100%' : 'none'
          }}>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('語音設定按鈕被點擊了!', settings);
                setShowTTSSettings(true);
              }}
              style={{
                ...styles.button,
                backgroundColor: '#dc2626',
                position: 'relative',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                pointerEvents: 'auto',
                zIndex: 10,
                flex: isMobile ? 1 : 'auto',
                width: isMobile ? '100%' : 'auto'
              }}
            >
              <span>⚙ 語音設定</span>
              <span style={{
                fontSize: '10px',
                padding: '2px 6px',
                borderRadius: '10px',
                backgroundColor: 'rgba(255,255,255,0.2)',
                color: 'white',
                pointerEvents: 'none'
              }}>
                {settings.azureTTS.enabled && settings.azureTTS.subscriptionKey ? 'Azure' : '預設'}
              </span>
            </button>
            <button
              onClick={() => setShowNewFolder(true)}
              style={{ ...styles.button, flex: isMobile ? 1 : 'auto', width: isMobile ? '100%' : 'auto' }}
            >
+ 新增資料夾
            </button>

            <button
              onClick={exportAllData}
              style={{ ...styles.button, backgroundColor: '#10B981', flex: isMobile ? 1 : 'auto', width: isMobile ? '100%' : 'auto' }}
            >
              💾 下載備份
            </button>

            <button
              onClick={() => document.getElementById('restoreInput').click()}
              style={{ ...styles.button, backgroundColor: '#7C3AED', flex: isMobile ? 1 : 'auto', width: isMobile ? '100%' : 'auto' }}
            >
              📱 恢復數據
            </button>

            <button
              onClick={() => setShowSyncDialog(true)}
              style={{ ...styles.button, backgroundColor: '#FF6B35', flex: isMobile ? 1 : 'auto', width: isMobile ? '100%' : 'auto' }}
            >
              ☁️ 雲端同步設定
            </button>
            
            <input
              id="restoreInput"
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleRestoreData}
            />
          </div>
        </div>

        {showNewFolder && (
          <div style={{ ...styles.card, marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                placeholder="資料夾名稱"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                style={{ ...styles.input, flex: 1 }}
                onKeyPress={(e) => e.key === 'Enter' && createFolder()}
              />
              <button onClick={createFolder} style={styles.buttonGreen}>創建</button>
              <button onClick={() => setShowNewFolder(false)} style={styles.buttonGray}>取消</button>
            </div>
          </div>
        )}

        <div style={styles.grid}>
          {folders.map(folder => (
            <div 
              key={folder.id} 
              style={{
                ...styles.card,
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.12)'
                }
              }}
              onClick={() => {
                setCurrentFolder(folder);
                setCurrentView('folder');
              }}
            >
              {/* 背景漸層 */}
              <div style={{
                position: 'absolute',
                top: 0,
                right: 0,
                width: '60px',
                height: '60px',
                background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                borderRadius: '0 16px 0 50px',
                opacity: 0.1
              }}></div>
              
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={styles.flexBetween}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{
                      fontSize: '32px',
                      padding: '8px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minWidth: '48px',
                      height: '48px'
                    }}>
                      <span style={{ filter: 'grayscale(100%) brightness(0) invert(1)' }}>
                        {folder.icon}
                      </span>
                    </div>
                    <div>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: '600',
                        margin: 0,
                        color: '#1a1a1a',
                        letterSpacing: '-0.3px'
                      }}>
                        {folder.name}
                      </h3>
                      <p style={{ 
                        color: '#6b7280', 
                        margin: '4px 0 0 0',
                        fontSize: '14px',
                        fontWeight: '400'
                      }}>
                        {folder.cards.length} 張卡片
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteFolder(folder.id);
                    }} 
                    style={{ 
                      ...styles.buttonRed, 
                      padding: '8px',
                      borderRadius: '8px',
                      fontSize: '16px',
                      minWidth: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                  >
                    🗑
                  </button>
                </div>
              </div>
              
              {/* 進入指示器 */}
              <div style={{
                position: 'absolute',
                bottom: '16px',
                right: '16px',
                color: '#9CA3AF',
                fontSize: '20px',
                transform: 'rotate(-45deg)'
              }}>
                ↗
              </div>
            </div>
          ))}
        </div>

        {folders.length === 0 && (
          <div style={{ 
            textAlign: 'center', 
            padding: '80px 20px',
            background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)',
            borderRadius: '20px',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ 
              fontSize: '64px', 
              marginBottom: '24px',
              background: 'linear-gradient(135deg, #4F46E5, #7C3AED)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              🇯🇵
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '12px',
              letterSpacing: '-0.5px'
            }}>
              開始你的日語學習之旅
            </h3>
            <p style={{ 
              color: '#6B7280', 
              fontSize: '16px',
              marginBottom: '32px',
              lineHeight: '1.6'
            }}>
              創建你的第一個學習資料夾，享受智能語音閃卡帶來的高效學習體驗
            </p>
          </div>
        )}
      </div>
    );
  };

  // 主要渲染
  return (
    <div style={styles.container}>
      {currentView === 'home' && <HomeView />}
      {currentView === 'folder' && currentFolder && <FolderView />}
      {currentView === 'study' && currentFolder && <StudyView />}
      {currentView === 'autoplay' && currentFolder && <AutoPlayView />}

      {/* 全域對話框 - 可在任何視圖打開 */}
      {showTTSSettings && <TTSSettingsDialog />}
      {showSyncDialog && <SyncDialog />}

      {/* 播放設定（三分頁系統）*/}
      {showAutoPlayEditor && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAutoPlayEditor(false);
            }
          }}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '1200px',
              width: '95%',
              height: '90vh',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', margin: 0 }}>⚙️ 播放設定</h3>
                {/* 顯示模式切換 */}
                <div style={{
                  display: 'flex',
                  gap: '5px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '8px',
                  padding: '4px'
                }}>
                  <button
                    onClick={() => setCardDisplayMode('card')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: cardDisplayMode === 'card' ? 'white' : 'transparent',
                      color: cardDisplayMode === 'card' ? '#4F46E5' : '#6b7280',
                      cursor: 'pointer',
                      fontWeight: cardDisplayMode === 'card' ? '600' : '400',
                      boxShadow: cardDisplayMode === 'card' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    🃏 卡片
                  </button>
                  <button
                    onClick={() => setCardDisplayMode('table')}
                    style={{
                      padding: '6px 12px',
                      fontSize: '13px',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: cardDisplayMode === 'table' ? 'white' : 'transparent',
                      color: cardDisplayMode === 'table' ? '#4F46E5' : '#6b7280',
                      cursor: 'pointer',
                      fontWeight: cardDisplayMode === 'table' ? '600' : '400',
                      boxShadow: cardDisplayMode === 'table' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                      transition: 'all 0.2s'
                    }}
                  >
                    📊 表格
                  </button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setDesignMode(!designMode)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: designMode ? '2px solid #4F46E5' : '1px solid #d1d5db',
                    backgroundColor: designMode ? '#4F46E5' : 'white',
                    color: designMode ? 'white' : '#374151',
                    cursor: 'pointer',
                    fontWeight: designMode ? '600' : '400',
                    transition: 'all 0.2s'
                  }}
                  title="開啟設計模式來自訂元素樣式"
                >
                  {designMode ? '🎨 設計模式中' : '🎨 設計模式'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAutoPlayEditor(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: 'none',
                    backgroundColor: '#2563eb',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  💾 儲存
                </button>
                <button 
                  type="button"
                  onClick={() => setShowAutoPlayEditor(false)}
                  style={{
                    padding: '8px 16px',
                    fontSize: '14px',
                    borderRadius: '6px',
                    border: '1px solid #d1d5db',
                    backgroundColor: '#6b7280',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  ❌ 取消
                </button>
              </div>
            </div>

            {/* 分頁導航 */}
            <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', marginBottom: '20px' }}>
              <button
                onClick={() => setCurrentPlaySettingTab('script')}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: currentPlaySettingTab === 'script' ? '#3b82f6' : '#6b7280',
                  borderBottom: currentPlaySettingTab === 'script' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📜 腳本設定
              </button>
              <button
                onClick={() => setCurrentPlaySettingTab('pages')}
                style={{
                  padding: '12px 24px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: currentPlaySettingTab === 'pages' ? '#3b82f6' : '#6b7280',
                  borderBottom: currentPlaySettingTab === 'pages' ? '2px solid #3b82f6' : '2px solid transparent',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                📱 頁面設定
              </button>
            </div>

            {/* 分頁內容 - 固定高度，獨立滾動 */}
            <div style={{ 
              flex: 1,
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0
            }}>
              {/* 分頁1: 腳本設定 */}
              {currentPlaySettingTab === 'script' && (
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden',
                  gap: '10px',
                  maxHeight: '80vh'
                }}>
                  {/* 固定頭部區域 */}
                  <div style={{ 
                    flexShrink: 0, 
                    paddingBottom: '10px',
                    maxHeight: '200px',
                    overflowY: 'auto'
                  }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '8px', color: '#3b82f6' }}>📜 腳本設定</h4>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '12px' }}>設定自動播放的腳本順序：模板顯示 + 語音播放 + 暫停時間</p>
                    
                    {/* 播放模式選擇 */}
                    <div style={{ marginBottom: '18px', padding: '15px', backgroundColor: '#fef7f0', borderRadius: '8px' }}>
                      <h5 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '12px', marginTop: '0' }}>播放方式</h5>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <button
                          onClick={() => setAutoPlayMode('sequential')}
                          style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            backgroundColor: autoPlayMode === 'sequential' ? '#2563eb' : 'white',
                            color: autoPlayMode === 'sequential' ? 'white' : '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          📋 順序播放
                        </button>
                        <button
                          onClick={() => setAutoPlayMode('loop')}
                          style={{
                            padding: '8px 16px',
                            fontSize: '14px',
                            borderRadius: '6px',
                            border: '1px solid #d1d5db',
                            backgroundColor: autoPlayMode === 'loop' ? '#2563eb' : 'white',
                            color: autoPlayMode === 'loop' ? 'white' : '#374151',
                            cursor: 'pointer'
                          }}
                        >
                          🔄 循環播放
                        </button>
                      </div>
                    </div>

                    <h5 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '8px', marginTop: '5px' }}>播放腳本</h5>
                    <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '12px' }}>
                      💡 可拖曳 ⋮⋮ 符號調整步驟順序
                    </p>
                  </div>

                  {/* 可滾動的腳本編輯區域 */}
                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px', 
                    padding: '15px',
                    marginBottom: '10px',
                    minHeight: 0,
                    maxHeight: '600px'
                  }}>
                      {autoPlayScript.map((step, index) => (
                        <div 
                          key={step.id} 
                          draggable
                          onDragStart={(e) => handleAutoPlayStepDragStart(e, index)}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.currentTarget.style.backgroundColor = '#f0f9ff';
                          }}
                          onDragLeave={(e) => {
                            e.currentTarget.style.backgroundColor = 'transparent';
                          }}
                          onDrop={(e) => handleAutoPlayStepDrop(e, index)}
                          style={{
                            marginBottom: '15px',
                            padding: '15px',
                            backgroundColor: 'white',
                            borderRadius: '8px',
                            border: '1px solid #d1d5db',
                            cursor: 'move',
                            position: 'relative',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                          }}
                        >
                          {/* 拖曳手柄 */}
                          <div style={{
                            position: 'absolute',
                            left: '8px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af',
                            fontSize: '16px',
                            cursor: 'grab'
                          }}>
                            ⋮⋮
                          </div>

                          {/* 步驟內容 */}
                          <div style={{ marginLeft: '30px' }}>
                            {step.type === 'display' && (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>📱 顯示模板</span>
                                  <select
                                    value={step.templateId || 'A'}
                                    onChange={(e) => {
                                      const newScript = [...autoPlayScript];
                                      newScript[index] = { ...step, templateId: e.target.value };
                                      setAutoPlayScript(newScript);
                                    }}
                                    style={{ 
                                      fontSize: '12px', 
                                      padding: '4px 8px', 
                                      borderRadius: '4px', 
                                      border: '1px solid #d1d5db',
                                      backgroundColor: '#f8f9fa'
                                    }}
                                  >
                                    <option value="A">模板 A</option>
                                    <option value="B">模板 B</option>
                                    <option value="C">模板 C</option>
                                    <option value="D">模板 D</option>
                                    <option value="E">模板 E</option>
                                  </select>
                                  <button
                                    onClick={() => {
                                      const newScript = autoPlayScript.filter((_, i) => i !== index);
                                      setAutoPlayScript(newScript);
                                    }}
                                    style={{ 
                                      fontSize: '12px', 
                                      padding: '4px 8px', 
                                      backgroundColor: '#fee2e2', 
                                      color: '#dc2626', 
                                      border: 'none', 
                                      borderRadius: '4px', 
                                      cursor: 'pointer' 
                                    }}
                                  >
                                    🗑️ 刪除
                                  </button>
                                </div>
                              </div>
                            )}

                            {step.type === 'speak' && (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>🎵 語音播放</span>
                                  <button
                                    onClick={() => {
                                      const newScript = autoPlayScript.filter((_, i) => i !== index);
                                      setAutoPlayScript(newScript);
                                    }}
                                    style={{ 
                                      fontSize: '12px', 
                                      padding: '4px 8px', 
                                      backgroundColor: '#fee2e2', 
                                      color: '#dc2626', 
                                      border: 'none', 
                                      borderRadius: '4px', 
                                      cursor: 'pointer' 
                                    }}
                                  >
                                    🗑️ 刪除
                                  </button>
                                </div>
                                
                                {/* 第一行：基本設定 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '15px' }}>
                                  <div>
                                    <label style={{ fontSize: '12px', color: '#6b7280' }}>播放欄位</label>
                                    <select
                                      value={step.field || 'kanji'}
                                      onChange={(e) => {
                                        const newScript = [...autoPlayScript];
                                        newScript[index] = { ...step, field: e.target.value };
                                        setAutoPlayScript(newScript);
                                      }}
                                      style={{ 
                                        width: '100%', 
                                        fontSize: '12px', 
                                        padding: '6px', 
                                        borderRadius: '4px', 
                                        border: '1px solid #d1d5db',
                                        backgroundColor: 'white'
                                      }}
                                    >
                                      {Object.entries(getCurrentFields()).map(([key, field]) => (
                                        <option key={key} value={key}>{field.label}</option>
                                      ))}
                                    </select>
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '12px', color: '#6b7280' }}>重複次數</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={step.repeat || 1}
                                      onChange={(e) => {
                                        const newScript = [...autoPlayScript];
                                        newScript[index] = { ...step, repeat: parseInt(e.target.value) };
                                        setAutoPlayScript(newScript);
                                      }}
                                      style={{ width: '100%', fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                    />
                                  </div>
                                  <div>
                                    <label style={{ fontSize: '12px', color: '#6b7280' }}>語速</label>
                                    <input
                                      type="number"
                                      step="0.1"
                                      min="0.5"
                                      max="2.0"
                                      value={step.rate || 1.0}
                                      onChange={(e) => {
                                        const newScript = [...autoPlayScript];
                                        newScript[index] = { ...step, rate: parseFloat(e.target.value) };
                                        setAutoPlayScript(newScript);
                                      }}
                                      style={{ width: '100%', fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                    />
                                  </div>
                                </div>
                                
                                {/* 第二行：暫停設定 */}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                                  <div>
                                    <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>⏱️ 暫停方式</label>
                                    <select
                                      value={step.pauseMode || 'fixed'}
                                      onChange={(e) => {
                                        const newScript = [...autoPlayScript];
                                        newScript[index] = { ...step, pauseMode: e.target.value };
                                        setAutoPlayScript(newScript);
                                      }}
                                      style={{ 
                                        width: '100%', 
                                        fontSize: '12px', 
                                        padding: '6px', 
                                        borderRadius: '4px', 
                                        border: '2px solid #10b981',
                                        backgroundColor: '#f0fdf4'
                                      }}
                                    >
                                      <option value="fixed">⏰ 固定時間</option>
                                      <option value="sentence">📏 依句長倍速</option>
                                    </select>
                                  </div>
                                  <div>
                                    {step.pauseMode === 'sentence' ? (
                                      <>
                                        <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>📏 句長倍速</label>
                                        <select
                                          value={step.sentenceMultiplier || 1.0}
                                          onChange={(e) => {
                                            const newScript = [...autoPlayScript];
                                            newScript[index] = { ...step, sentenceMultiplier: parseFloat(e.target.value) };
                                            setAutoPlayScript(newScript);
                                          }}
                                          style={{ 
                                            width: '100%', 
                                            fontSize: '12px', 
                                            padding: '6px', 
                                            borderRadius: '4px', 
                                            border: '2px solid #3b82f6',
                                            backgroundColor: '#eff6ff'
                                          }}
                                        >
                                          <option value="0.5">🏃 0.5x (快)</option>
                                          <option value="1.0">🚶 1.0x (標準)</option>
                                          <option value="1.5">🐌 1.5x (慢)</option>
                                          <option value="2.0">🦌 2.0x (很慢)</option>
                                        </select>
                                      </>
                                    ) : (
                                      <>
                                        <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>⏰ 固定暫停時間</label>
                                        <input
                                          type="number"
                                          placeholder="毫秒"
                                          value={step.pauseAfter || 0}
                                          onChange={(e) => {
                                            const newScript = [...autoPlayScript];
                                            newScript[index] = { ...step, pauseAfter: parseInt(e.target.value) };
                                            setAutoPlayScript(newScript);
                                          }}
                                          style={{ 
                                            width: '100%', 
                                            fontSize: '12px', 
                                            padding: '6px', 
                                            borderRadius: '4px', 
                                            border: '2px solid #f59e0b',
                                            backgroundColor: '#fefbf0'
                                          }}
                                        />
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {step.type === 'pause' && (
                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 'bold', color: '#1f2937' }}>⏸️ 靜音暫停</span>
                                  <button
                                    onClick={() => {
                                      const newScript = autoPlayScript.filter((_, i) => i !== index);
                                      setAutoPlayScript(newScript);
                                    }}
                                    style={{ 
                                      fontSize: '12px', 
                                      padding: '4px 8px', 
                                      backgroundColor: '#fee2e2', 
                                      color: '#dc2626', 
                                      border: 'none', 
                                      borderRadius: '4px', 
                                      cursor: 'pointer' 
                                    }}
                                  >
                                    🗑️ 刪除
                                  </button>
                                </div>
                                <label style={{ fontSize: '12px', color: '#6b7280' }}>暫停時間(毫秒)</label>
                                <input
                                  type="number"
                                  value={step.duration || 1000}
                                  onChange={(e) => {
                                    const newScript = [...autoPlayScript];
                                    newScript[index] = { ...step, duration: parseInt(e.target.value) };
                                    setAutoPlayScript(newScript);
                                  }}
                                  style={{ width: '100%', fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db', marginTop: '5px' }}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                  {/* 固定底部：添加步驟按鈕 */}
                  <div style={{ flexShrink: 0 }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          const newScript = [...autoPlayScript];
                          newScript.push({
                            id: Date.now().toString(),
                            type: 'display',
                            templateId: 'A'
                          });
                          setAutoPlayScript(newScript);
                        }}
                        style={{ 
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        ➕ 顯示模板
                      </button>
                      <button
                        onClick={() => {
                          const newScript = [...autoPlayScript];
                          newScript.push({
                            id: Date.now().toString(),
                            type: 'speak',
                            field: 'kanji',
                            repeat: 1,
                            rate: 1.0,
                            pauseAfter: 1000
                          });
                          setAutoPlayScript(newScript);
                        }}
                        style={{ 
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        ➕ 語音播放
                      </button>
                      <button
                        onClick={() => {
                          const newScript = [...autoPlayScript];
                          newScript.push({
                            id: Date.now().toString(),
                            type: 'pause',
                            duration: 1000
                          });
                          setAutoPlayScript(newScript);
                        }}
                        style={{ 
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #d1d5db',
                          backgroundColor: '#f3f4f6',
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        ➕ 靜音暫停
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* 分頁2: 頁面設定 */}
              {currentPlaySettingTab === 'pages' && (
                <div style={{ 
                  height: '100%', 
                  display: 'flex', 
                  flexDirection: 'column',
                  overflow: 'hidden'
                }}>
                  {/* 固定頭部區域 */}
                  <div style={{ flexShrink: 0 }}>
                    <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px', color: '#3b82f6' }}>📱 頁面設定</h4>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginBottom: '15px' }}>設定5種頁面模板（A、B、C、D、E），每種模板可自訂顯示的欄位</p>
                  </div>
                  
                  {/* 可滾動內容區域 */}
                  <div style={{ 
                    flex: 1, 
                    overflowY: 'auto', 
                    border: '1px solid #e5e7eb', 
                    borderRadius: '6px', 
                    padding: '20px',
                    backgroundColor: '#f8f9fa'
                  }}>
                    {/* 模板設定界面 */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', height: '100%' }}>
                      {/* 左側：模板設定 */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#059669' }}>📋 模板設定</h4>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                          {Object.entries(displayTemplates).map(([templateId, template]) => (
                            <div key={templateId} style={{ 
                              marginBottom: '20px', 
                              padding: '15px', 
                              backgroundColor: 'white', 
                              borderRadius: '8px',
                              border: '1px solid #d1d5db',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                                <h4 style={{ fontSize: '16px', fontWeight: 'bold', minWidth: '60px', color: '#3b82f6' }}>模板{templateId}</h4>
                                <input
                                  type="text"
                                  value={template.name}
                                  onChange={(e) => {
                                    setDisplayTemplates(prev => ({
                                      ...prev,
                                      [templateId]: {
                                        ...prev[templateId],
                                        name: e.target.value
                                      }
                                    }));
                                  }}
                                  style={{ 
                                    flex: 1, 
                                    padding: '8px 12px', 
                                    border: '1px solid #d1d5db', 
                                    borderRadius: '4px',
                                    fontSize: '14px'
                                  }}
                                  placeholder="模板名稱"
                                />
                              </div>
                              
                              <div style={{ marginBottom: '15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>顯示欄位</label>
                                  <div style={{ fontSize: '12px', color: '#6b7280' }}>（可多選）</div>
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                  {Object.entries(getCurrentFields()).map(([fieldKey, fieldConfig]) => (
                                    <label key={fieldKey} style={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      gap: '6px',
                                      padding: '6px 10px',
                                      backgroundColor: template.fields.includes(fieldKey) ? '#dbeafe' : '#f3f4f6',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                      fontSize: '12px',
                                      border: template.fields.includes(fieldKey) ? '1px solid #3b82f6' : '1px solid #d1d5db'
                                    }}>
                                      <input
                                        type="checkbox"
                                        checked={template.fields.includes(fieldKey)}
                                        onChange={(e) => {
                                          const newFields = e.target.checked 
                                            ? [...template.fields, fieldKey]
                                            : template.fields.filter(f => f !== fieldKey);
                                          setDisplayTemplates(prev => ({
                                            ...prev,
                                            [templateId]: {
                                              ...prev[templateId],
                                              fields: newFields
                                            }
                                          }));
                                        }}
                                        style={{ margin: 0 }}
                                      />
                                      {fieldConfig.label}
                                    </label>
                                  ))}
                                </div>
                              </div>

                              {/* 欄位樣式設定區 */}
                              {template.fields.length > 0 && (
                                <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                                  <div style={{ fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '10px' }}>欄位樣式設定</div>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                    {template.fields.map(fieldKey => {
                                      const fieldStyle = template.fieldStyles[fieldKey] || { fontSize: 24, fontFamily: 'sans-serif', textAlign: 'center' };
                                      const fieldConfig = getCurrentFields()[fieldKey];
                                      return (
                                        <div key={fieldKey} style={{ padding: '10px', backgroundColor: 'white', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
                                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#3b82f6', marginBottom: '8px' }}>
                                            {fieldConfig?.label || fieldKey}
                                          </div>

                                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                                            {/* 字型大小 */}
                                            <div>
                                              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>
                                                字型大小：{fieldStyle.fontSize}px
                                              </label>
                                              <input
                                                type="range"
                                                min="12"
                                                max="72"
                                                value={fieldStyle.fontSize}
                                                onChange={(e) => {
                                                  setDisplayTemplates(prev => ({
                                                    ...prev,
                                                    [templateId]: {
                                                      ...prev[templateId],
                                                      fieldStyles: {
                                                        ...prev[templateId].fieldStyles,
                                                        [fieldKey]: {
                                                          ...fieldStyle,
                                                          fontSize: parseInt(e.target.value)
                                                        }
                                                      }
                                                    }
                                                  }));
                                                }}
                                                style={{ width: '100%' }}
                                              />
                                            </div>

                                            {/* 字型選擇 */}
                                            <div>
                                              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>字型</label>
                                              <select
                                                value={fieldStyle.fontFamily}
                                                onChange={(e) => {
                                                  setDisplayTemplates(prev => ({
                                                    ...prev,
                                                    [templateId]: {
                                                      ...prev[templateId],
                                                      fieldStyles: {
                                                        ...prev[templateId].fieldStyles,
                                                        [fieldKey]: {
                                                          ...fieldStyle,
                                                          fontFamily: e.target.value
                                                        }
                                                      }
                                                    }
                                                  }));
                                                }}
                                                style={{ width: '100%', padding: '4px 6px', fontSize: '12px', border: '1px solid #d1d5db', borderRadius: '4px' }}
                                              >
                                                <option value="sans-serif">無襯線</option>
                                                <option value="serif">襯線</option>
                                                <option value="monospace">等寬</option>
                                                <option value="'Noto Sans JP', sans-serif">日文字型</option>
                                              </select>
                                            </div>

                                            {/* 對齊方式 */}
                                            <div>
                                              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '4px' }}>對齊</label>
                                              <div style={{ display: 'flex', gap: '4px' }}>
                                                {['left', 'center', 'right'].map(align => (
                                                  <button
                                                    key={align}
                                                    onClick={() => {
                                                      setDisplayTemplates(prev => ({
                                                        ...prev,
                                                        [templateId]: {
                                                          ...prev[templateId],
                                                          fieldStyles: {
                                                            ...prev[templateId].fieldStyles,
                                                            [fieldKey]: {
                                                              ...fieldStyle,
                                                              textAlign: align
                                                            }
                                                          }
                                                        }
                                                      }));
                                                    }}
                                                    style={{
                                                      flex: 1,
                                                      padding: '4px',
                                                      fontSize: '11px',
                                                      border: '1px solid #d1d5db',
                                                      borderRadius: '4px',
                                                      backgroundColor: fieldStyle.textAlign === align ? '#3b82f6' : 'white',
                                                      color: fieldStyle.textAlign === align ? 'white' : '#374151',
                                                      cursor: 'pointer'
                                                    }}
                                                  >
                                                    {align === 'left' ? '←' : align === 'center' ? '↔' : '→'}
                                                  </button>
                                                ))}
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* 頁面頂部欄位設定 */}
                              <div style={{ marginBottom: '15px', padding: '12px', backgroundColor: '#fffbeb', borderRadius: '6px', border: '1px solid #fbbf24' }}>
                                <div style={{ fontSize: '14px', fontWeight: '500', color: '#92400e', marginBottom: '8px' }}>
                                  頁面頂部顯示欄位（最多3個）
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                  {Object.entries(getCurrentFields()).map(([fieldKey, fieldConfig]) => {
                                    const isSelected = template.topFields?.includes(fieldKey);
                                    const canSelect = !isSelected && (template.topFields?.length || 0) < 3;
                                    return (
                                      <label
                                        key={fieldKey}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 8px',
                                          backgroundColor: isSelected ? '#fbbf24' : '#fef3c7',
                                          borderRadius: '4px',
                                          cursor: canSelect || isSelected ? 'pointer' : 'not-allowed',
                                          fontSize: '11px',
                                          border: isSelected ? '1px solid #f59e0b' : '1px solid #fde68a',
                                          opacity: canSelect || isSelected ? 1 : 0.5
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isSelected}
                                          disabled={!canSelect && !isSelected}
                                          onChange={(e) => {
                                            const newTopFields = e.target.checked
                                              ? [...(template.topFields || []), fieldKey]
                                              : (template.topFields || []).filter(f => f !== fieldKey);
                                            setDisplayTemplates(prev => ({
                                              ...prev,
                                              [templateId]: {
                                                ...prev[templateId],
                                                topFields: newTopFields
                                              }
                                            }));
                                          }}
                                          style={{ margin: 0 }}
                                        />
                                        {fieldConfig.label}
                                      </label>
                                    );
                                  })}
                                </div>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <label style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '14px',
                                  fontWeight: '500',
                                  color: '#374151'
                                }}>
                                  <input
                                    type="checkbox"
                                    checked={template.showFurigana}
                                    onChange={(e) => {
                                      setDisplayTemplates(prev => ({
                                        ...prev,
                                        [templateId]: {
                                          ...prev[templateId],
                                          showFurigana: e.target.checked
                                        }
                                      }));
                                    }}
                                  />
                                  顯示注音
                                </label>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* 右側：預覽區域 */}
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '15px', color: '#059669' }}>👀 模板預覽</h4>
                        <div style={{ flex: 1, overflowY: 'auto' }}>
                          {Object.entries(displayTemplates).map(([templateId, template]) => (
                            <div key={templateId} style={{
                              marginBottom: '15px',
                              padding: '15px',
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              border: '1px solid #d1d5db',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                            }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h5 style={{ fontSize: '14px', fontWeight: 'bold', margin: 0, color: '#3b82f6' }}>
                                  模板{templateId}：{template.name}
                                </h5>
                                <button
                                  onClick={() => setCurrentTemplate(templateId)}
                                  style={{
                                    padding: '4px 8px',
                                    fontSize: '12px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    backgroundColor: currentTemplate === templateId ? '#16a34a' : '#f3f4f6',
                                    color: currentTemplate === templateId ? 'white' : '#374151',
                                    cursor: 'pointer'
                                  }}
                                >
                                  {currentTemplate === templateId ? '✓ 使用中' : '使用模板'}
                                </button>
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                                欄位：{template.fields.length > 0 ? template.fields.map(fieldKey => getCurrentFields()[fieldKey]?.label || fieldKey).join(' | ') : '無欄位'}
                                {template.topFields && template.topFields.length > 0 && (
                                  <div style={{ marginTop: '4px', color: '#92400e' }}>
                                    頂部：{template.topFields.map(fieldKey => getCurrentFields()[fieldKey]?.label || fieldKey).join(', ')}
                                  </div>
                                )}
                              </div>
                              {currentFolder?.cards?.[0] && (
                                <div style={{
                                  padding: '12px',
                                  backgroundColor: '#f8fafc',
                                  borderRadius: '4px',
                                  border: '1px solid #e2e8f0'
                                }}>
                                  {/* 頂部欄位預覽 */}
                                  {template.topFields && template.topFields.length > 0 && (
                                    <div style={{
                                      display: 'flex',
                                      justifyContent: 'space-around',
                                      padding: '8px',
                                      backgroundColor: '#fffbeb',
                                      borderRadius: '4px',
                                      marginBottom: '10px',
                                      gap: '6px',
                                      border: '1px solid #fbbf24'
                                    }}>
                                      {template.topFields.map((fieldKey) => {
                                        const fieldValue = currentFolder.cards[0].fields[fieldKey];
                                        const field = getCurrentFields()[fieldKey];
                                        if (!fieldValue) return null;

                                        return (
                                          <div key={fieldKey} style={{ textAlign: 'center', flex: 1 }}>
                                            <div style={{ fontSize: '9px', color: '#92400e', marginBottom: '2px' }}>
                                              {field?.label || fieldKey}
                                            </div>
                                            <div style={{ fontSize: '10px', color: '#78350f', fontWeight: '600' }}>
                                              {fieldValue.replace(/\[.*?\]/g, '')}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}

                                  {/* 主要欄位預覽 */}
                                  {template.fields.map((fieldKey, index) => {
                                    const fieldValue = currentFolder.cards[0].fields[fieldKey];
                                    if (!fieldValue) return null;

                                    const displayValue = template.showFurigana ?
                                      fieldValue :
                                      fieldValue.replace(/\[.*?\]/g, '');

                                    const fieldStyle = template.fieldStyles?.[fieldKey] || { fontSize: 14, fontFamily: 'sans-serif', textAlign: 'center' };
                                    // 預覽時縮小字型大小
                                    const previewFontSize = Math.max(10, Math.min(fieldStyle.fontSize * 0.5, 18));

                                    return (
                                      <div
                                        key={fieldKey}
                                        style={{
                                          marginBottom: index < template.fields.length - 1 ? '6px' : 0,
                                          textAlign: fieldStyle.textAlign
                                        }}
                                      >
                                        <span style={{
                                          fontWeight: '500',
                                          fontSize: `${previewFontSize}px`,
                                          fontFamily: fieldStyle.fontFamily
                                        }}>
                                          {displayValue}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 底部測試和播放按鈕 - 只在腳本設定分頁顯示 */}
            {currentPlaySettingTab === 'script' && (
              <>
                <div style={{ 
                  marginTop: 'auto', 
                  padding: '20px 24px', 
                  backgroundColor: '#f8f9fa', 
                  display: 'flex', 
                  gap: '12px', 
                  flexShrink: 0,
                  borderTop: '1px solid #e5e7eb',
                  marginLeft: '-24px',
                  marginRight: '-24px',
                  marginBottom: '-24px',
                  borderBottomLeftRadius: '12px',
                  borderBottomRightRadius: '12px'
                }}>
                  <ClickableWrapper
                    designMode={designMode}
                    elementId="test-play-button"
                    onSelect={setSelectedElement}
                    isSelected={selectedElement?.id === 'test-play-button'}
                    customStyle={customStyles['test-play-button']}
                  >
                    <button
                      onClick={async () => {
                        if (designMode) return; // 設計模式下不執行
                        console.log('🎮 測試播放按鈕被點擊');

                        if (currentFolder?.cards?.length > 0) {
                          const testCard = currentFolder.cards[0];
                          setCurrentCard(testCard);
                          setCurrentAutoPlayCard(0);
                          setCurrentView('autoplay');
                          setShowAutoPlayEditor(false);

                          try {
                            for (let i = 0; i < autoPlayScript.length; i++) {
                              const step = autoPlayScript[i];
                              setCurrentAutoPlayStep(i);
                              console.log(`測試執行步驟 ${i + 1}/${autoPlayScript.length}:`, step);
                              await executeAutoPlayStep(testCard, step);
                              await new Promise(resolve => setTimeout(resolve, 300));
                            }

                            setTimeout(() => {
                              setCurrentView('folder');
                              alert('測試播放完成！');
                            }, 1000);
                          } catch (error) {
                            console.error('測試播放錯誤:', error);
                            setCurrentView('folder');
                            alert('測試播放失敗：' + error.message);
                          }
                        } else {
                          alert('沒有可用的卡片進行測試');
                        }
                      }}
                      disabled={currentFolder?.cards?.length === 0 || designMode}
                      style={{
                        flex: 1,
                        padding: '12px 20px',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: designMode ? '#cbd5e1' : '#f59e0b',
                        color: 'white',
                        cursor: designMode ? 'default' : 'pointer',
                        ...(customStyles['test-play-button'] || {})
                      }}
                    >
                      🎮 測試播放
                    </button>
                  </ClickableWrapper>
                <button
                  onClick={() => {
                    setShowAutoPlayEditor(false);
                    startAutoPlay();
                  }}
                  disabled={currentFolder?.cards?.length === 0}
                  style={{ 
                    flex: 1,
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: '#dc2626',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  🎭 開始自動播放
                </button>
              </div>
            
              {/* 播放腳本編輯 */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
                  <h5 style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '5px' }}>播放腳本</h5>
                  <p style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', margin: 0 }}>
                    💡 可拖曳 ⋮⋮ 符號調整步驟順序
                  </p>
                  <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px', padding: '10px', minHeight: '200px', maxHeight: '350px' }}>
                    {autoPlayScript.map((step, index) => (
                      <div 
                        key={step.id} 
                        draggable
                        onDragStart={(e) => handleAutoPlayStepDragStart(e, index)}
                        onDragOver={handleAutoPlayStepDragOver}
                        onDrop={(e) => handleAutoPlayStepDrop(e, index)}
                        onDragEnd={handleAutoPlayStepDragEnd}
                        style={{ 
                          marginBottom: '10px', 
                          padding: '12px', 
                          backgroundColor: draggedStepIndex === index ? '#e0f2fe' : '#f9fafb', 
                          borderRadius: '6px',
                          border: draggedStepIndex === index ? '2px solid #0284c7' : '1px solid #e5e7eb',
                          cursor: 'move',
                          opacity: draggedStepIndex === index ? 0.7 : 1,
                          transform: draggedStepIndex === index ? 'rotate(2deg)' : 'none',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '14px', color: '#6b7280', cursor: 'move' }}>⋮⋮</span>
                            <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#374151' }}>步驟 {index + 1}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '5px' }}>
                            <select
                              value={step.type}
                              onChange={(e) => {
                                const newScript = [...autoPlayScript];
                                newScript[index] = { ...step, type: e.target.value };
                                setAutoPlayScript(newScript);
                              }}
                              style={{ fontSize: '12px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            >
                              <option value="display">📱 顯示頁面</option>
                              <option value="speak">🗣️ 語音播放</option>
                              <option value="pause">⏸️ 靜音暫停</option>
                            </select>
                            <button
                              onClick={() => {
                                const newScript = autoPlayScript.filter((_, i) => i !== index);
                                setAutoPlayScript(newScript);
                              }}
                              style={{ 
                                fontSize: '12px', 
                                padding: '4px 8px', 
                                borderRadius: '4px', 
                                border: '1px solid #ef4444',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                        
                        {step.type === 'display' && (
                          <div>
                            <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>📱 顯示模板 (立即切換)</label>
                            <select
                              value={step.templateId || 'A'}
                              onChange={(e) => {
                                const newScript = [...autoPlayScript];
                                newScript[index] = { ...step, templateId: e.target.value };
                                setAutoPlayScript(newScript);
                              }}
                              style={{ 
                                width: '100%', 
                                fontSize: '14px', 
                                padding: '8px', 
                                borderRadius: '6px', 
                                border: '2px solid #3b82f6',
                                backgroundColor: '#f0f8ff',
                                marginTop: '4px'
                              }}
                            >
                              {Object.entries(displayTemplates).map(([id, template]) => (
                                <option key={id} value={id}>📄 模板{id} - {template.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        {step.type === 'speak' && (
                          <div style={{ 
                            padding: '10px', 
                            backgroundColor: '#fef7f0', 
                            borderRadius: '6px',
                            border: '2px solid #f59e0b'
                          }}>
                            <label style={{ fontSize: '12px', color: '#92400e', fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>
                              🗣️ 語音播放設定
                            </label>
                            {/* 第一行：基本設定 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                              <div>
                                <label style={{ fontSize: '12px', color: '#6b7280' }}>播放欄位</label>
                                <select
                                  value={step.field || 'kanji'}
                                  onChange={(e) => {
                                    const newScript = [...autoPlayScript];
                                    newScript[index] = { ...step, field: e.target.value };
                                    setAutoPlayScript(newScript);
                                  }}
                                  style={{ 
                                    width: '100%', 
                                    fontSize: '12px', 
                                    padding: '6px', 
                                    borderRadius: '4px', 
                                    border: '1px solid #d1d5db',
                                    backgroundColor: 'white'
                                  }}
                                >
                                  {Object.entries(getCurrentFields()).map(([key, field]) => (
                                    <option key={key} value={key}>{field.label}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label style={{ fontSize: '12px', color: '#6b7280' }}>重複次數</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={step.repeat || 1}
                                  onChange={(e) => {
                                    const newScript = [...autoPlayScript];
                                    newScript[index] = { ...step, repeat: parseInt(e.target.value) };
                                    setAutoPlayScript(newScript);
                                  }}
                                  style={{ width: '100%', fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                />
                              </div>
                              <div>
                                <label style={{ fontSize: '12px', color: '#6b7280' }}>語速</label>
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.5"
                                  max="2.0"
                                  value={step.rate || 1.0}
                                  onChange={(e) => {
                                    const newScript = [...autoPlayScript];
                                    newScript[index] = { ...step, rate: parseFloat(e.target.value) };
                                    setAutoPlayScript(newScript);
                                  }}
                                  style={{ width: '100%', fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                                />
                              </div>
                            </div>
                            
                            {/* 第二行：暫停設定 */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                              <div>
                                <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>⏱️ 暫停方式</label>
                                <select
                                  value={step.pauseMode || 'fixed'}
                                  onChange={(e) => {
                                    const newScript = [...autoPlayScript];
                                    newScript[index] = { ...step, pauseMode: e.target.value };
                                    setAutoPlayScript(newScript);
                                  }}
                                  style={{ 
                                    width: '100%', 
                                    fontSize: '12px', 
                                    padding: '6px', 
                                    borderRadius: '4px', 
                                    border: '2px solid #10b981',
                                    backgroundColor: '#f0fdf4'
                                  }}
                                >
                                  <option value="fixed">⏰ 固定時間</option>
                                  <option value="sentence">📏 依句長倍速</option>
                                </select>
                              </div>
                              <div>
                                {step.pauseMode === 'sentence' ? (
                                  <>
                                    <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>📏 句長倍速</label>
                                    <select
                                      value={step.sentenceMultiplier || 1.0}
                                      onChange={(e) => {
                                        const newScript = [...autoPlayScript];
                                        newScript[index] = { ...step, sentenceMultiplier: parseFloat(e.target.value) };
                                        setAutoPlayScript(newScript);
                                      }}
                                      style={{ 
                                        width: '100%', 
                                        fontSize: '12px', 
                                        padding: '6px', 
                                        borderRadius: '4px', 
                                        border: '2px solid #3b82f6',
                                        backgroundColor: '#eff6ff'
                                      }}
                                    >
                                      <option value="0.5">🏃 0.5x (快)</option>
                                      <option value="1.0">🚶 1.0x (標準)</option>
                                      <option value="1.5">🐌 1.5x (慢)</option>
                                      <option value="2.0">🦌 2.0x (很慢)</option>
                                    </select>
                                  </>
                                ) : (
                                  <>
                                    <label style={{ fontSize: '12px', color: '#6b7280', fontWeight: 'bold' }}>⏰ 固定暫停時間</label>
                                    <input
                                      type="number"
                                      placeholder="毫秒"
                                      value={step.pauseAfter || 0}
                                      onChange={(e) => {
                                        const newScript = [...autoPlayScript];
                                        newScript[index] = { ...step, pauseAfter: parseInt(e.target.value) };
                                        setAutoPlayScript(newScript);
                                      }}
                                      style={{ 
                                        width: '100%', 
                                        fontSize: '12px', 
                                        padding: '6px', 
                                        borderRadius: '4px', 
                                        border: '2px solid #f59e0b',
                                        backgroundColor: '#fefbf0'
                                      }}
                                    />
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {step.type === 'pause' && (
                          <div>
                            <label style={{ fontSize: '12px', color: '#6b7280' }}>暫停時間(毫秒)</label>
                            <input
                              type="number"
                              value={step.duration || 1000}
                              onChange={(e) => {
                                const newScript = [...autoPlayScript];
                                newScript[index] = { ...step, duration: parseInt(e.target.value) };
                                setAutoPlayScript(newScript);
                              }}
                              style={{ width: '100%', fontSize: '12px', padding: '4px', borderRadius: '4px', border: '1px solid #d1d5db' }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div style={{ display: 'flex', gap: '5px', marginTop: '10px' }}>
                      <button
                        onClick={() => {
                          setAutoPlayScript([...autoPlayScript, {
                            id: Date.now().toString(),
                            type: 'display',
                            templateId: 'A'
                          }]);
                        }}
                        style={{ 
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #2563eb',
                          backgroundColor: '#2563eb',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        ➕ 顯示頁面
                      </button>
                      <button
                        onClick={() => {
                          setAutoPlayScript([...autoPlayScript, {
                            id: Date.now().toString(),
                            type: 'speak',
                            field: 'kanji',
                            repeat: 1,
                            rate: 1.0,
                            pauseAfter: 500
                          }]);
                        }}
                        style={{ 
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #10b981',
                          backgroundColor: '#10b981',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        ➕ 語音播放
                      </button>
                      <button
                        onClick={() => {
                          setAutoPlayScript([...autoPlayScript, {
                            id: Date.now().toString(),
                            type: 'pause',
                            duration: 1000
                          }]);
                        }}
                        style={{ 
                          flex: 1,
                          padding: '8px 12px',
                          fontSize: '12px',
                          borderRadius: '4px',
                          border: '1px solid #6b7280',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        ➕ 暫停
                      </button>
                    </div>
                  </div>
                </div>
              
              {/* 右側：預覽 */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                flex: 1,
                maxWidth: '400px'
              }}>
                <h4 style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  marginBottom: '12px',
                  color: '#1f2937',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <span>📺</span>
                  播放預覽
                </h4>
                <div style={{
                  padding: '12px 15px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '8px',
                  marginBottom: '12px',
                  border: '1px solid #dbeafe'
                }}>
                  <p style={{ fontSize: '13px', color: '#1e40af', margin: 0, fontWeight: '600' }}>
                    {autoPlayMode === 'sequential' ? '📋 順序播放模式' : '🔄 循環播放模式'}
                  </p>
                  <p style={{ fontSize: '12px', color: '#3b82f6', margin: '8px 0 0 0', lineHeight: '1.5' }}>
                    共 <strong>{autoPlayScript.length}</strong> 個步驟 • 預計每張卡片約{' '}
                    <strong>
                      {Math.round(autoPlayScript.reduce((total, step) => {
                        if (step.type === 'speak') {
                          let speakTime = 1000 * (step.repeat || 1);
                          if (step.pauseMode === 'sentence') {
                            // 估算: 假設平均句長5字, 每字100毫秒基準
                            const estimatedLength = 5;
                            const estimatedPause = estimatedLength * 100 * (step.sentenceMultiplier || 1.0);
                            return total + speakTime + estimatedPause;
                          } else {
                            return total + speakTime + (step.pauseAfter || 0);
                          }
                        }
                        if (step.type === 'pause') return total + (step.duration || 1000);
                        return total;
                      }, 0) / 1000)}
                    </strong>
                    {' '}秒
                  </p>
                </div>

                <div style={{
                  flex: 1,
                  maxHeight: '500px',
                  overflowY: 'auto',
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '12px',
                  backgroundColor: '#ffffff'
                }}>
                  <h5 style={{
                    fontSize: '13px',
                    fontWeight: '700',
                    marginBottom: '12px',
                    color: '#4b5563',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span>📜</span>
                    腳本流程預覽
                  </h5>
                  {autoPlayScript.map((step, index) => (
                    <div key={step.id} style={{
                      marginBottom: '10px',
                      padding: '10px 12px',
                      backgroundColor: '#f9fafb',
                      borderRadius: '6px',
                      border: '1px solid #e5e7eb',
                      fontSize: '12px',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f3f4f6';
                      e.currentTarget.style.borderColor = '#d1d5db';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = '#f9fafb';
                      e.currentTarget.style.borderColor = '#e5e7eb';
                    }}
                    >
                      <div style={{ fontWeight: 'bold', color: '#374151' }}>
                        {index + 1}. {
                          step.type === 'display' ? `📱 顯示模板${step.templateId}` :
                          step.type === 'speak' ? `🗣️ 播放${getCurrentFields()[step.field]?.label} × ${step.repeat}次` :
                          step.type === 'pause' ? `⏸️ 暫停 ${step.duration}ms` : '未知步驟'
                        }
                      </div>
                      {step.type === 'display' && (
                        <div style={{ color: '#10b981', marginTop: '4px', fontSize: '11px', fontWeight: 'bold' }}>
                          ⚡ 立即切換 (持續顯示直到下一個模板)
                        </div>
                      )}
                      {step.type === 'speak' && (
                        <div style={{ color: '#6b7280', marginTop: '4px' }}>
                          語速：{step.rate || 1.0}x，
                          {step.pauseMode === 'sentence' ? 
                            `依句長暫停 (${step.sentenceMultiplier || 1.0}x倍速)` : 
                            `固定暫停：${step.pauseAfter || 0}毫秒`
                          }
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              </>
            )}
        </div>
        </div>
      )}
      
      {/* 模板編輯器已整合至播放設定的頁面設定分頁 */}

      {/* 設計編輯器 - 視覺化調整元素樣式 */}
      {designMode && showAutoPlayEditor && (
        <DesignEditor
          selectedElement={selectedElement}
          onStyleChange={(newStyle) => {
            if (selectedElement) {
              setCustomStyles({
                ...customStyles,
                [selectedElement.id]: newStyle
              });
            }
          }}
          onClose={() => setDesignMode(false)}
        />
      )}

      {/* 雲端同步對話框 */}
      {showSyncDialog && <SyncDialog />}
    </div>
  );
};

export default FullFlashcardApp;