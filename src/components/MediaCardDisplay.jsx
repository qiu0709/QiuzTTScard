import React, { useState, useRef, useEffect } from 'react';

/**
 * 照片錄音卡片顯示組件 - 用於顯示和播放媒體卡片
 */
const MediaCardDisplay = ({ card, isMobile = false }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef(null);

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

  // 更新播放進度
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', updateTime);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('ended', handleEnded);

    return () => {
      audio.removeEventListener('timeupdate', updateTime);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [card?.media?.audio]);

  // 格式化時間顯示
  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const styles = {
    container: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: isMobile ? '16px' : '24px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      maxWidth: '800px',
      margin: '0 auto',
    },
    title: {
      fontSize: isMobile ? '20px' : '28px',
      fontWeight: 'bold',
      marginBottom: '20px',
      color: '#1f2937',
      textAlign: 'center',
    },
    imageContainer: {
      marginBottom: '20px',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: '#f3f4f6',
    },
    image: {
      width: '100%',
      height: 'auto',
      maxHeight: isMobile ? '300px' : '500px',
      objectFit: 'contain',
      display: 'block',
    },
    audioControls: {
      backgroundColor: '#F3F4F6',
      borderRadius: '12px',
      padding: isMobile ? '16px' : '20px',
      marginBottom: '20px',
    },
    playButton: {
      width: '100%',
      padding: '16px',
      fontSize: isMobile ? '16px' : '18px',
      fontWeight: '600',
      borderRadius: '12px',
      border: 'none',
      cursor: 'pointer',
      backgroundColor: '#4F46E5',
      color: 'white',
      marginBottom: '16px',
      transition: 'all 0.2s',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
    },
    progressBar: {
      width: '100%',
      height: '6px',
      backgroundColor: '#E5E7EB',
      borderRadius: '3px',
      marginBottom: '8px',
      position: 'relative',
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: '#4F46E5',
      borderRadius: '3px',
      transition: 'width 0.1s',
    },
    timeDisplay: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '12px',
      color: '#6b7280',
      marginBottom: '12px',
    },
    speedControl: {
      marginTop: '12px',
    },
    speedLabel: {
      fontSize: '13px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px',
      display: 'block',
    },
    speedSlider: {
      width: '100%',
      marginBottom: '4px',
    },
    speedMarks: {
      display: 'flex',
      justifyContent: 'space-between',
      fontSize: '11px',
      color: '#9ca3af',
    },
    note: {
      backgroundColor: '#FEF3C7',
      padding: isMobile ? '12px' : '16px',
      borderRadius: '12px',
      border: '2px solid #FCD34D',
      fontSize: isMobile ? '14px' : '16px',
      lineHeight: '1.6',
      color: '#78350F',
      whiteSpace: 'pre-wrap',
    },
    emptyState: {
      textAlign: 'center',
      padding: '40px 20px',
      color: '#9ca3af',
      fontSize: '14px',
    },
  };

  // 如果沒有媒體內容
  if (!card?.media) {
    return (
      <div style={styles.container}>
        <div style={styles.emptyState}>
          此卡片沒有媒體內容
        </div>
      </div>
    );
  }

  const { title, image, audio, note } = card.media;
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div style={styles.container}>
      {/* 標題 */}
      {title && <h2 style={styles.title}>{title}</h2>}

      {/* 照片 */}
      {image && (
        <div style={styles.imageContainer}>
          <img src={image} alt={title || '卡片照片'} style={styles.image} />
        </div>
      )}

      {/* 錄音播放器 */}
      {audio && (
        <div style={styles.audioControls}>
          <button
            onClick={togglePlayback}
            style={styles.playButton}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4338CA'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4F46E5'}
          >
            <span style={{ fontSize: '24px' }}>{isPlaying ? '⏸' : '▶'}</span>
            <span>{isPlaying ? '暫停錄音' : '播放錄音'}</span>
          </button>

          {/* 播放進度條 */}
          <div style={styles.progressBar}>
            <div style={{ ...styles.progressFill, width: `${progress}%` }} />
          </div>

          {/* 時間顯示 */}
          <div style={styles.timeDisplay}>
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>

          {/* 播放速度控制 */}
          <div style={styles.speedControl}>
            <label style={styles.speedLabel}>
              播放速度: {playbackRate.toFixed(1)}x
            </label>
            <input
              type="range"
              min="0.5"
              max="4.0"
              step="0.1"
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              style={styles.speedSlider}
            />
            <div style={styles.speedMarks}>
              <span>0.5x (慢)</span>
              <span>1.0x (正常)</span>
              <span>2.0x (快)</span>
              <span>4.0x (極快)</span>
            </div>
          </div>

          <audio ref={audioRef} src={audio} style={{ display: 'none' }} />
        </div>
      )}

      {/* 文字註解 */}
      {note && (
        <div style={styles.note}>
          <div style={{ fontWeight: '600', marginBottom: '8px', fontSize: isMobile ? '13px' : '14px' }}>
            📝 註解
          </div>
          {note}
        </div>
      )}

      {/* 如果沒有任何內容 */}
      {!image && !audio && !note && (
        <div style={styles.emptyState}>
          此卡片沒有照片、錄音或註解
        </div>
      )}
    </div>
  );
};

export default MediaCardDisplay;
