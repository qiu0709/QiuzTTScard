/**
 * Azure Text-to-Speech 服務模組
 * 提供高品質的日語語音合成功能
 */

import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

// 從環境變數讀取 Azure 設定
const AZURE_SPEECH_KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const AZURE_SPEECH_REGION = import.meta.env.VITE_AZURE_SPEECH_REGION;

/**
 * Azure TTS 語音配置
 * 日語語音選項:
 * - ja-JP-NanamiNeural (女性,自然)
 * - ja-JP-KeitaNeural (男性,自然)
 * - ja-JP-AoiNeural (女性,活潑)
 * - ja-JP-DaichiNeural (男性,沉穩)
 */
const DEFAULT_VOICE = 'ja-JP-NanamiNeural';

class AzureTTSService {
  constructor() {
    this.synthesizer = null;
    this.currentAudio = null;
    this.isPlaying = false;
  }

  /**
   * 初始化 Azure Speech 合成器
   */
  initializeSynthesizer(voiceName = DEFAULT_VOICE) {
    if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
      console.error('Azure Speech 金鑰或區域未設定');
      throw new Error('請在 .env 檔案中設定 VITE_AZURE_SPEECH_KEY 和 VITE_AZURE_SPEECH_REGION');
    }

    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(
      AZURE_SPEECH_KEY,
      AZURE_SPEECH_REGION
    );

    // 設定語音
    speechConfig.speechSynthesisVoiceName = voiceName;

    // 設定輸出格式 (高品質音訊)
    speechConfig.speechSynthesisOutputFormat = SpeechSDK.SpeechSynthesisOutputFormat.Audio24Khz96KBitRateMonoMp3;

    // 建立音訊配置 (使用瀏覽器音訊輸出)
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultSpeakerOutput();

    this.synthesizer = new SpeechSDK.SpeechSynthesizer(speechConfig, audioConfig);
  }

  /**
   * 播放文字語音
   * @param {string} text - 要播放的文字
   * @param {object} options - 播放選項
   * @param {string} options.voice - 語音名稱
   * @param {number} options.rate - 語速 (0.5-2.0, 1.0 為正常速度)
   * @param {number} options.pitch - 音調 (-50 到 50, 0 為正常音調)
   * @returns {Promise} 播放完成的 Promise
   */
  async speak(text, options = {}) {
    const {
      voice = DEFAULT_VOICE,
      rate = 1.0,
      pitch = 0
    } = options;

    // 停止當前播放
    this.stop();

    // 初始化合成器
    this.initializeSynthesizer(voice);

    return new Promise((resolve, reject) => {
      // 使用 SSML 來控制語速和音調
      const ssml = `
        <speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
          <voice name="${voice}">
            <prosody rate="${rate}" pitch="${pitch >= 0 ? '+' : ''}${pitch}%">
              ${this.escapeXml(text)}
            </prosody>
          </voice>
        </speak>
      `;

      this.isPlaying = true;

      this.synthesizer.speakSsmlAsync(
        ssml,
        (result) => {
          this.isPlaying = false;

          if (result.reason === SpeechSDK.ResultReason.SynthesizingAudioCompleted) {
            console.log('Azure TTS 播放成功');
            resolve(result);
          } else {
            console.error('Azure TTS 播放失敗:', result.errorDetails);
            reject(new Error(result.errorDetails));
          }

          // 釋放資源
          this.synthesizer.close();
          this.synthesizer = null;
        },
        (error) => {
          this.isPlaying = false;
          console.error('Azure TTS 錯誤:', error);

          // 釋放資源
          if (this.synthesizer) {
            this.synthesizer.close();
            this.synthesizer = null;
          }

          reject(error);
        }
      );
    });
  }

  /**
   * 停止當前播放
   */
  stop() {
    if (this.synthesizer) {
      this.synthesizer.close();
      this.synthesizer = null;
    }
    this.isPlaying = false;
  }

  /**
   * 轉義 XML 特殊字元
   */
  escapeXml(text) {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * 獲取可用的日語語音列表
   */
  getAvailableVoices() {
    return [
      { name: 'ja-JP-NanamiNeural', gender: '女性', description: '自然、溫柔' },
      { name: 'ja-JP-KeitaNeural', gender: '男性', description: '自然、清晰' },
      { name: 'ja-JP-AoiNeural', gender: '女性', description: '活潑、年輕' },
      { name: 'ja-JP-DaichiNeural', gender: '男性', description: '沉穩、專業' },
      { name: 'ja-JP-MayuNeural', gender: '女性', description: '親切、友善' },
      { name: 'ja-JP-NaokiNeural', gender: '男性', description: '穩重、可靠' },
      { name: 'ja-JP-ShioriNeural', gender: '女性', description: '優雅、成熟' }
    ];
  }

  /**
   * 檢查服務是否正在播放
   */
  getIsPlaying() {
    return this.isPlaying;
  }
}

// 匯出單例
export default new AzureTTSService();
