// 測試 .apkg 匯入功能
import fs from 'fs';
import { parseApkgFile, convertToAppFormat } from './src/utils/apkgImporter.js';

async function testImport() {
  try {
    console.log('讀取 適時適所.apkg...');

    // 讀取檔案 - Node.js 環境需要使用 Blob
    const fileBuffer = fs.readFileSync('./適時適所.apkg');

    // 建立類似 File 的物件
    const file = {
      arrayBuffer: async () => fileBuffer.buffer.slice(
        fileBuffer.byteOffset,
        fileBuffer.byteOffset + fileBuffer.byteLength
      ),
      name: '適時適所.apkg'
    };

    console.log('解析 .apkg 檔案...');
    const ankiCards = await parseApkgFile(file);

    console.log(`成功提取 ${ankiCards.length} 張卡片`);
    console.log('\n前 3 張卡片預覽:');
    ankiCards.slice(0, 3).forEach((card, index) => {
      console.log(`\n卡片 ${index + 1}:`);
      console.log(JSON.stringify(card.fields, null, 2));
    });

    console.log('\n轉換為應用程式格式...');
    const folderData = convertToAppFormat(ankiCards, '適時適所');

    console.log('\n欄位定義:');
    console.log(JSON.stringify(folderData.fields, null, 2));

    console.log(`\n成功! 總共 ${folderData.cards.length} 張卡片`);

  } catch (error) {
    console.error('錯誤:', error);
    console.error(error.stack);
  }
}

testImport();
