/**
 * 解析 Anki 純文字匯出檔案 (.txt)
 * @param {File} file - .txt 檔案
 * @returns {Promise<Object>} 解析後的資料
 */
export async function parseTxtFile(file) {
  try {
    const text = await file.text();
    console.log('讀取 .txt 檔案成功，長度:', text.length);

    // Anki 純文字格式：每張卡片用空行分隔，每個欄位用 Tab 分隔
    const lines = text.split('\n');
    const cards = [];
    let currentCard = [];
    let fieldNames = [];

    // 第一行通常是欄位名稱（如果有的話）
    // 或者我們需要從內容推斷

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '') {
        // 空行表示卡片結束
        if (currentCard.length > 0) {
          cards.push([...currentCard]);
          currentCard = [];
        }
      } else {
        // 檢查是否為欄位名稱行（通常包含 Tab 且沒有太多內容）
        if (i === 0 && line.includes('\t') && !line.includes('[sound:')) {
          // 可能是欄位名稱
          fieldNames = line.split('\t');
          console.log('檢測到欄位名稱:', fieldNames);
        } else {
          // 卡片內容行
          currentCard.push(line);
        }
      }
    }

    // 最後一張卡片
    if (currentCard.length > 0) {
      cards.push(currentCard);
    }

    console.log(`解析到 ${cards.length} 張卡片`);

    if (cards.length === 0) {
      throw new Error('檔案中沒有找到卡片');
    }

    // 分析卡片結構
    // Anki 純文字格式：每行是一個欄位值
    const fieldsPerCard = cards[0].length;
    console.log(`每張卡片有 ${fieldsPerCard} 個欄位`);

    // 如果沒有檢測到欄位名稱，使用預設名稱
    if (fieldNames.length === 0) {
      fieldNames = Array.from({ length: fieldsPerCard }, (_, i) => `欄位${i + 1}`);
      console.log('使用預設欄位名稱:', fieldNames);
    }

    // 轉換為標準格式
    const convertedCards = cards.map((cardFields, index) => {
      const card = {
        id: `txt-${Date.now()}-${index}`,
        fields: {},
        audioFields: {}
      };

      cardFields.forEach((value, fieldIndex) => {
        const fieldName = fieldNames[fieldIndex] || `欄位${fieldIndex + 1}`;

        // 處理音檔引用 [sound:filename.mp3]
        const { text, audioFileName } = extractAudioReference(value);
        card.fields[fieldName] = text;

        if (audioFileName) {
          // 注意：純文字匯出不包含實際音檔，只有檔案名稱
          card.audioFields[fieldName] = {
            fileName: audioFileName,
                dataUrl: null, // 無實際音檔
            mimeType: getMimeTypeFromFileName(audioFileName)
          };
        }
      });

      return card;
    });

    console.log('轉換完成，第一張卡片範例:', convertedCards[0]);

    return {
      cards: convertedCards,
      mediaFiles: {} // 純文字檔案不包含實際媒體檔案
    };
  } catch (error) {
    console.error('解析 .txt 檔案失敗:', error);
    throw new Error('解析 .txt 檔案失敗: ' + error.message);
  }
}

/**
 * 從文字中提取音檔引用
 */
function extractAudioReference(text) {
  if (!text) return { text: '', audioFileName: null };

  let processedText = text;
  let audioFileName = null;

  // 處理 Anki 音檔標記 [sound:filename.mp3]
  const soundMatch = text.match(/\[sound:([^\]]+)\]/);
  if (soundMatch) {
    audioFileName = soundMatch[1];
    processedText = text.replace(/\[sound:([^\]]+)\]/g, '').trim();
  }

  return { text: processedText, audioFileName };
}

/**
 * 根據檔案名稱獲取 MIME 類型
 */
function getMimeTypeFromFileName(fileName) {
  const ext = fileName.split('.').pop().toLowerCase();
  const mimeTypes = {
    'mp3': 'audio/mpeg',
    'wav': 'audio/wav',
    'ogg': 'audio/ogg',
    'm4a': 'audio/mp4',
    'webm': 'audio/webm',
    'aac': 'audio/aac',
    'flac': 'audio/flac'
  };
  return mimeTypes[ext] || 'audio/mpeg';
}

/**
 * 將解析後的卡片轉換為應用程式格式
 */
export function convertTxtToAppFormat(txtCards, folderName = '匯入的純文字卡片') {
  console.log('開始轉換為應用程式格式...');
  console.log(`總共 ${txtCards.length} 張卡片`);

  if (txtCards.length === 0) {
    return {
      name: folderName,
      customFields: {},
      cards: []
    };
  }

  // 分析欄位
  const fieldContentCount = {};
  const fieldSamples = {};

  txtCards.forEach(card => {
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

  const minCardCount = Math.max(1, Math.floor(txtCards.length * 0.1));
  const usefulFields = Object.keys(fieldContentCount)
    .filter(fieldName => fieldContentCount[fieldName] >= minCardCount);

  // 建立欄位定義
  const fields = {};
  usefulFields.forEach((fieldName, index) => {
    fields[`field${index + 1}`] = {
      label: fieldName,
      type: 'text',
      order: index
    };
  });

  // 轉換卡片
  const cards = txtCards.map((txtCard, index) => {
    const convertedCard = {
      id: txtCard.id || `card-${Date.now()}-${index}`,
      fields: {},
      audioFields: {}
    };

    Object.entries(fields).forEach(([fieldKey, fieldDef]) => {
      const originalFieldName = fieldDef.label;
      convertedCard.fields[fieldKey] = txtCard.fields[originalFieldName] || '';

      if (txtCard.audioFields && txtCard.audioFields[originalFieldName]) {
        convertedCard.audioFields[fieldKey] = txtCard.audioFields[originalFieldName];
      }
    });

    return convertedCard;
  });

  console.log(`成功轉換 ${cards.length} 張卡片`);

  return {
    name: folderName,
    customFields: fields,
    cards: cards
  };
}
