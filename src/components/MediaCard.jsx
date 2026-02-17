import React, { useState, useRef, useEffect } from 'react';

/**
 * 照片錄音卡片組件 - 支援上傳照片、錄音和播放
 */
const MediaCard = ({ card, onUpdate, onClose }) => {
  const [image, setImage] = useState(card?.media?.image || null);
  const [audio, setAudio] = useState(card?.media?.audio || null);
  const [note, setNote] = useState(card?.media?.note || '');
  const [title, setTitle] = useState(card?.media?.title || '');
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);
  const recordingIntervalRef = useRef(null);

  // 處理照片上傳
  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // 檢查檔案大小（限制 5MB）
    if (file.size > 5 * 1024 * 1024) {
      alert('照片檔案太大，請選擇小於 5MB 的檔案');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImage(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // 開始錄音
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          setAudio(e.target.result);
        };
        reader.readAsDataURL(audioBlob);

        // 停止所有軌道
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // 開始計時
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      console.error('錄音錯誤:', error);
      alert('無法存取麥克風，請確認已授予權限');
    }
  };

  // 停止錄音
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    }
  };

  // 播放/暫停錄音
  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  // 調整播放速度
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  // 處理音檔播放結束
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.onended = () => {
        setIsPlaying(false);
      };
    }
  }, [audio]);

  // 保存卡片
  const handleSave = () => {
    const mediaCard = {
      id: card?.id || Date.now(),
      type: 'media',
      media: {
        title,
        note,
        image,
        audio,
      },
      createdAt: card?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onUpdate(mediaCard);
    onClose();
  };

  // 刪除照片
  const removeImage = () => {
    setImage(null);
  };

  // 刪除錄音
  const removeAudio = () => {
    setAudio(null);
    setIsPlaying(false);
  };

  // 格式化時間顯示
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = {
    container: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(43, 39, 34, 0.45)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
    },
    modal: {
      backgroundColor: 'var(--paper)',
      borderRadius: '16px',
      padding: '24px',
      maxWidth: '600px',
      width: '100%',
      maxHeight: '90vh',
      overflow: 'auto',
      boxShadow: '0 16px 40px rgba(43, 39, 34, 0.18)',
    },
    header: {
      fontSize: '24px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: 'var(--ink)',
    },
    section: {
      marginBottom: '24px',
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      marginBottom: '8px',
      color: 'var(--ink)',
    },
    input: {
      width: '100%',
      padding: '12px',
      fontSize: '16px',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      outline: 'none',
      transition: 'border-color 0.2s',
      backgroundColor: 'var(--paper)',
      color: 'var(--ink)',
    },
    textarea: {
      width: '100%',
      padding: '12px',
      fontSize: '16px',
      border: '1px solid var(--border)',
      borderRadius: '10px',
      outline: 'none',
      minHeight: '100px',
      resize: 'vertical',
      backgroundColor: 'var(--paper)',
      color: 'var(--ink)',
    },
    button: {
      padding: '12px 24px',
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '8px',
      border: 'none',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: 'var(--accent)',
      color: 'white',
    },
    buttonSecondary: {
      padding: '12px 24px',
      fontSize: '16px',
      fontWeight: '600',
      borderRadius: '10px',
      border: '1px solid var(--border)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      backgroundColor: 'var(--paper)',
      color: 'var(--ink)',
    },
    buttonDanger: {
      padding: '8px 16px',
      fontSize: '14px',
      fontWeight: '600',
      borderRadius: '6px',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: 'var(--danger)',
      color: 'white',
    },
    imagePreview: {
      width: '100%',
      maxHeight: '300px',
      objectFit: 'contain',
      borderRadius: '12px',
      border: '1px solid var(--border)',
    },
    recordingIndicator: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px 16px',
      backgroundColor: 'var(--danger-bg)',
      borderRadius: '20px',
      fontSize: '14px',
      fontWeight: '600',
      color: 'var(--danger-dark)',
    },
    playbackControls: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px',
      backgroundColor: 'var(--paper)',
      borderRadius: '12px',
    },
  };

  return (
    <div style={styles.container} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={styles.header}>📸 照片錄音卡片</h2>

        {/* 標題 */}
        <div style={styles.section}>
          <label style={styles.label}>標題</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="輸入卡片標題..."
            style={styles.input}
          />
        </div>

        {/* 照片上傳 */}
        <div style={styles.section}>
          <label style={styles.label}>📷 照片</label>
          {image ? (
            <div>
              <img src={image} alt="上傳的照片" style={styles.imagePreview} />
              <button onClick={removeImage} style={{ ...styles.buttonDanger, marginTop: '12px' }}>
                刪除照片
              </button>
            </div>
          ) : (
            <label style={{ ...styles.button, display: 'inline-block', cursor: 'pointer' }}>
              選擇照片
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                style={{ display: 'none' }}
              />
            </label>
          )}
        </div>

        {/* 錄音功能 */}
        <div style={styles.section}>
          <label style={styles.label}>🎤 錄音</label>

          {isRecording && (
            <div style={styles.recordingIndicator}>
              <span style={{
                width: '12px',
                height: '12px',
                backgroundColor: 'var(--danger)',
                borderRadius: '50%',
                animation: 'pulse 1.5s infinite'
              }}></span>
              錄音中... {formatTime(recordingTime)}
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
            {!isRecording && !audio && (
              <button onClick={startRecording} style={styles.button}>
                🎤 開始錄音
              </button>
            )}

            {isRecording && (
              <button onClick={stopRecording} style={{ ...styles.button, backgroundColor: 'var(--danger)' }}>
                ⏹ 停止錄音
              </button>
            )}

            {audio && !isRecording && (
              <>
                <button onClick={removeAudio} style={styles.buttonDanger}>
                  刪除錄音
                </button>
                <button onClick={startRecording} style={styles.buttonSecondary}>
                  🎤 重新錄音
                </button>
              </>
            )}
          </div>

          {/* 錄音播放控制 */}
          {audio && !isRecording && (
            <div style={{ ...styles.playbackControls, marginTop: '12px' }}>
              <button
                onClick={togglePlayback}
                style={styles.button}
              >
                {isPlaying ? '⏸ 暫停' : '▶ 播放'}
              </button>

              <div style={{ flex: 1 }}>
                <label style={{ ...styles.label, marginBottom: '4px' }}>
                  播放速度: {playbackRate.toFixed(1)}x
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.1"
                  value={playbackRate}
                  onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                  style={{ width: '100%' }}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' }}>
                  <span>0.5x</span>
                  <span>1.0x</span>
                  <span>2.0x</span>
                  <span>4.0x</span>
                </div>
              </div>

              <audio ref={audioRef} src={audio} style={{ display: 'none' }} />
            </div>
          )}
        </div>

        {/* 文字註解 */}
        <div style={styles.section}>
          <label style={styles.label}>📝 註解</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="輸入文字註解..."
            style={styles.textarea}
          />
        </div>

        {/* 操作按鈕 */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
          <button onClick={handleSave} style={{ ...styles.button, flex: 1 }}>
            ✅ 保存
          </button>
          <button onClick={onClose} style={{ ...styles.buttonSecondary, flex: 1 }}>
            ✖ 取消
          </button>
        </div>
      </div>

      {/* 錄音動畫 CSS */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default MediaCard;
