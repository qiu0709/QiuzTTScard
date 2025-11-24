import JSZip from 'jszip';
import initSqlJs from 'sql.js';

/**
 * 解析 Anki .apkg 檔案
 * @param {File} file - .apkg 檔案
 * @returns {Promise<Object>} 解析後的資料，包含卡片和音檔
 */
export async function parseApkgFile(file) {
  try {
    // 1. 解壓 .apkg 檔案 (實際上是 ZIP 格式)
    // 支援 File 物件和 ArrayBuffer
    const fileData = file.arrayBuffer ? await file.arrayBuffer() : file;
    const zip = await JSZip.loadAsync(fileData);

    // 2. 讀取 collection 資料庫 (支援 anki21 和 anki2 格式)
    let collectionFile = zip.file('collection.anki21');
    if (!collectionFile) {
      collectionFile = zip.file('collection.anki2');
    }
    if (!collectionFile) {
      throw new Error('無效的 .apkg 檔案: 找不到 collection.anki21 或 collection.anki2');
    }

    console.log('找到資料庫檔案:', collectionFile.name);
    const dbData = await collectionFile.async('arraybuffer');

    // 3. 提取媒體檔案映射表
    const mediaMap = await extractMediaMap(zip);
    console.log('媒體檔案映射表:', mediaMap);

    // 4. 提取音檔檔案
    const mediaFiles = await extractMediaFiles(zip, mediaMap);
    console.log(`提取了 ${Object.keys(mediaFiles).length} 個媒體檔案`);

    // 5. 初始化 SQL.js 並載入資料庫
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });

    const db = new SQL.Database(new Uint8Array(dbData));

    // 6. 提取卡片資料
    const cards = extractCards(db, mediaFiles);

    // 7. 清理資源
    db.close();

    return { cards, mediaFiles };
  } catch (error) {
    console.error('解析 .apkg 檔案失敗:', error);
    throw new Error('解析 .apkg 檔案失敗: ' + error.message);
  }
}

/**
 * 提取媒體檔案映射表
 */
async function extractMediaMap(zip) {
  try {
    const mediaFile = zip.file('media');
    if (!mediaFile) {
      console.log('沒有找到 media 映射檔案');
      return {};
    }

    const mediaContent = await mediaFile.async('text');
    const mediaMap = JSON.parse(mediaContent);
    console.log('媒體映射表:', mediaMap);
    return mediaMap;
  } catch (error) {
    console.warn('無法讀取媒體映射表:', error);
    return {};
  }
}

/**
 * 提取媒體檔案並轉換為 base64
 */
async function extractMediaFiles(zip, mediaMap) {
  const mediaFiles = {};

  for (const [index, fileName] of Object.entries(mediaMap)) {
    try {
      // 媒體檔案名稱就是數字索引
      const mediaFile = zip.file(index);
      if (!mediaFile) {
        console.warn(`找不到媒體檔案: ${index} (${fileName})`);
        continue;
      }

      // 判斷檔案類型
      const extension = fileName.split('.').pop().toLowerCase();
      const isAudio = ['mp3', 'wav', 'ogg', 'm4a', 'webm', 'aac', 'flac'].includes(extension);

      if (!isAudio) {
        console.log(`跳過非音檔: ${fileName}`);
        continue;
      }

      // 讀取檔案並轉換為 base64
      const fileData = await mediaFile.async('base64');
      const mimeType = getMimeType(extension);
      const dataUrl = `data:${mimeType};base64,${fileData}`;

      mediaFiles[fileName] = {
        fileName,
        dataUrl,
        mimeType
      };

      console.log(`成功提取音檔: ${fileName} (${(fileData.length / 1024).toFixed(2)} KB)`);
    } catch (error) {
      console.error(`提取媒體檔案 ${fileName} 失敗:`, error);
    }
  }

  return mediaFiles;
}

/**
 * 根據副檔名獲取 MIME 類型
 */
function getMimeType(extension) {
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'webm': 'audio/webm',
    'aac': 'audio/aac',
    'flac': 'audio/flac'
  };
  return mimeTypes[extension] || 'audio/mpeg';
}

/**
 * 從 Anki 資料庫提取卡片
 */
function extractCards(db, mediaFiles = {}) {
  console.log('開始提取卡片...');

  try {
    // 首先嘗試獲取模型和欄位名稱
    let fieldNamesByModel = {};
    let fieldOrderByModel = {}; // 保存欄位順序資訊

    try {
      // 查詢 col 表獲取模型資訊
      const colQuery = db.exec('SELECT models FROM col');
      if (colQuery.length > 0 && colQuery[0].values.length > 0) {
        const modelsJson = colQuery[0].values[0][0];
        console.log('模型 JSON (前500字元):', modelsJson.substring(0, 500));

        const models = JSON.parse(modelsJson);
        console.log('解析的模型:', models);

        // 提取每個模型的欄位名稱和順序
        Object.entries(models).forEach(([modelId, model]) => {
          if (model.flds && Array.isArray(model.flds)) {
            // 保存欄位名稱(按照原始順序)
            fieldNamesByModel[modelId] = model.flds.map((f, index) => ({
              name: f.name || f,
              order: f.ord !== undefined ? f.ord : index
            }));

            // 保存原始順序
            fieldOrderByModel[modelId] = model.flds.map(f => f.name || f);

            console.log(`模型 ${modelId} (${model.name}) 的欄位:`, fieldOrderByModel[modelId]);
          }
        });

        // 將欄位順序資訊存到全域變數供後續使用
        window._ankiFieldOrder = fieldOrderByModel;
      }
    } catch (e) {
      console.warn('無法獲取欄位名稱,將使用預設名稱:', e);
    }

    // 查詢卡片資料,包含模型 ID
    const query = db.exec('SELECT id, mid, flds FROM notes');

    console.log('查詢結果:', query);
    console.log('查詢到的記錄數量:', query.length > 0 ? query[0].values.length : 0);

    // 額外除錯：檢查資料庫中的表格
    try {
      const tables = db.exec("SELECT name FROM sqlite_master WHERE type='table'");
      console.log('資料庫中的表格:', tables);

      // 檢查 notes 表的總數
      const countQuery = db.exec('SELECT COUNT(*) as count FROM notes');
      console.log('notes 表中的總記錄數:', countQuery);
    } catch (e) {
      console.warn('無法取得資料庫資訊:', e);
    }

    if (!query.length || !query[0].values.length) {
      console.warn('資料庫中沒有找到卡片');
      return [];
    }

    const cards = [];
    query[0].values.forEach(([id, mid, flds]) => {
      // 分割欄位值 (Anki 使用 \x1f 分隔)
      const fieldValues = flds.split('\x1f');

      // 獲取該卡片模型的欄位名稱
      const fieldNameObjs = fieldNamesByModel[mid] || [];
      const fieldNames = fieldNameObjs.map(f => f.name || f);

      console.log(`卡片 ${id} (模型 ${mid}) 有 ${fieldValues.length} 個欄位`);
      if (fieldNames.length > 0) {
        console.log(`使用欄位名稱:`, fieldNames.slice(0, 5), '...');
      }

      const card = {
        id: `anki-${id}`,
        fields: {},
        audioFields: {} // 存儲音檔數據
      };

      // 為每個欄位建立一個鍵值對,使用真實欄位名稱
      fieldValues.forEach((value, index) => {
        const fieldName = fieldNames[index] || `欄位${index + 1}`;
        const { text, audioFile } = extractAudioFromHtml(value, mediaFiles);
        card.fields[fieldName] = text;
        if (audioFile) {
          card.audioFields[fieldName] = audioFile;
        }
      });

      cards.push(card);
    });

    console.log(`成功提取 ${cards.length} 張卡片`);
    return cards;
  } catch (error) {
    console.error('提取卡片失敗:', error);
    throw error;
  }
}

/**
 * 從 HTML 中提取音檔引用和文字
 */
function extractAudioFromHtml(html, mediaFiles) {
  if (!html) return { text: '', audioFile: null };

  let text = html;
  let audioFile = null;

  // 處理 Anki 音檔標記 [sound:filename.mp3]
  const soundMatch = text.match(/\[sound:([^\]]+)\]/);
  if (soundMatch) {
    const fileName = soundMatch[1];
    // 從 mediaFiles 中查找對應的音檔
    if (mediaFiles[fileName]) {
      audioFile = mediaFiles[fileName];
      console.log(`找到音檔: ${fileName}`);
    } else {
      console.warn(`音檔未找到: ${fileName}`);
    }
    // 移除音檔標記
    text = text.replace(/\[sound:([^\]]+)\]/g, '');
  }

  // 清理 HTML
  text = cleanHtml(text);

  return { text, audioFile };
}

/**
 * 清理 HTML 標籤,保留重要內容
 */
function cleanHtml(html) {
  if (!html) return '';

  let text = html;

  // 保留換行
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>/gi, '\n');
  text = text.replace(/<\/div>/gi, '\n');
  text = text.replace(/<\/li>/gi, '\n');

  // 移除 script 和 style 標籤及其內容
  text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 移除圖片標籤但保留替代文字
  text = text.replace(/<img[^>]*alt=["']([^"']*)["'][^>]*>/gi, '🖼️ $1');
  text = text.replace(/<img[^>]*>/gi, '🖼️');

  // 移除其他 HTML 標籤
  text = text.replace(/<[^>]+>/g, '');

  // 解碼 HTML 實體
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&apos;/g, "'");

  // 清理多餘空白
  text = text.replace(/\n\s*\n+/g, '\n\n');
  text = text.replace(/[ \t]+/g, ' ');
  text = text.trim();

  return text;
}

/**
 * 將 Anki 卡片轉換為應用程式格式
 */
export function convertToAppFormat(ankiCards, folderName = '匯入的 Anki 卡包') {
  console.log('開始轉換為應用程式格式...');
  console.log(`總共 ${ankiCards.length} 張卡片`);

  if (ankiCards.length === 0) {
    console.warn('沒有卡片可轉換');
    return {
      name: folderName,
      fields: {},
      cards: []
    };
  }

  // 分析所有卡片,找出有內容的欄位(非空白且出現在多張卡片中)
  const fieldContentCount = {}; // 記錄每個欄位有內容的卡片數量
  const fieldSamples = {}; // 記錄每個欄位的樣本內容

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

  console.log('欄位內容統計:', fieldContentCount);

  // 只保留至少有 10% 卡片有內容的欄位
  const minCardCount = Math.max(1, Math.floor(ankiCards.length * 0.1));
  const usefulFields = Object.keys(fieldContentCount)
    .filter(fieldName => fieldContentCount[fieldName] >= minCardCount)
    .sort((a, b) => fieldContentCount[b] - fieldContentCount[a]); // 按使用頻率排序

  console.log(`保留 ${usefulFields.length} 個有用的欄位 (從 ${Object.keys(fieldContentCount).length} 個中篩選):`, usefulFields);

  // 不再自動限制欄位數量,由用戶在欄位選擇器中決定
  const selectedFields = usefulFields;
  console.log('可選擇的欄位:', selectedFields.length, '個');

  // 建立欄位定義
  const fields = {};
  selectedFields.forEach((fieldName, index) => {
    // 猜測欄位類型
    let fieldType = 'text';

    if (fieldName.includes('假名') || fieldName.includes('平假名') || fieldName.includes('片假名') ||
        fieldName.includes('讀音') || fieldName.includes('發音') || fieldName.includes('ひらがな')) {
      fieldType = 'furigana';
    } else if (fieldName.includes('漢字') || fieldName.includes('單字') || fieldName.includes('kanji')) {
      fieldType = 'kanji';
    } else if (fieldName.includes('意味') || fieldName.includes('意思') || fieldName.includes('meaning')) {
      fieldType = 'text';
    } else if (fieldName.includes('例') || fieldName.includes('example')) {
      fieldType = 'text';
    }

    fields[`field${index + 1}`] = {
      label: fieldName,
      type: fieldType,
      order: index
    };
  });

  console.log('建立的欄位定義:', fields);

  // 轉換卡片
  const cards = ankiCards.map((ankiCard, index) => {
    const convertedCard = {
      id: ankiCard.id || `card-${Date.now()}-${index}`,
      fields: {},
      audioFields: {} // 保留音檔數據
    };

    // 將 Anki 卡片的欄位映射到新格式
    Object.entries(fields).forEach(([fieldKey, fieldDef]) => {
      const originalFieldName = fieldDef.label;
      convertedCard.fields[fieldKey] = ankiCard.fields[originalFieldName] || '';

      // 如果該欄位有音檔，也保存音檔數據
      if (ankiCard.audioFields && ankiCard.audioFields[originalFieldName]) {
        convertedCard.audioFields[fieldKey] = ankiCard.audioFields[originalFieldName];
      }
    });

    return convertedCard;
  });

  console.log(`成功轉換 ${cards.length} 張卡片`);
  console.log('第一張卡片範例:', cards[0]);

  // 統計有音檔的卡片數量
  const cardsWithAudio = cards.filter(card => Object.keys(card.audioFields).length > 0);
  console.log(`其中 ${cardsWithAudio.length} 張卡片包含音檔`);

  return {
    name: folderName,
    customFields: fields,  // 使用 customFields 而不是 fields
    cards: cards
  };
}
