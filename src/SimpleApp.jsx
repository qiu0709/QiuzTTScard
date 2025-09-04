import React, { useState } from 'react';

const SimpleApp = () => {
  const [message, setMessage] = useState('日本語学習カード 載入成功！');
  const [count, setCount] = useState(0);

  const handleClick = () => {
    setCount(count + 1);
    setMessage(`你點擊了 ${count + 1} 次！`);
  };

  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f3f4f6',
      padding: '40px',
      fontFamily: 'Arial, sans-serif'
    },
    header: {
      fontSize: '32px',
      fontWeight: 'bold',
      color: '#2563eb',
      marginBottom: '20px',
      textAlign: 'center'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      padding: '30px',
      maxWidth: '600px',
      margin: '0 auto',
      textAlign: 'center'
    },
    button: {
      backgroundColor: '#2563eb',
      color: 'white',
      border: 'none',
      padding: '12px 24px',
      borderRadius: '6px',
      fontSize: '16px',
      cursor: 'pointer',
      marginTop: '20px'
    },
    buttonHover: {
      backgroundColor: '#1d4ed8'
    },
    message: {
      fontSize: '18px',
      color: '#374151',
      marginBottom: '20px'
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.header}>🇯🇵 日本語学習カード</h1>
      
      <div style={styles.card}>
        <p style={styles.message}>{message}</p>
        
        <button 
          style={styles.button}
          onClick={handleClick}
          onMouseOver={(e) => e.target.style.backgroundColor = '#1d4ed8'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#2563eb'}
        >
          測試按鈕 - 點擊我！
        </button>
        
        <div style={{marginTop: '30px', padding: '20px', backgroundColor: '#f9fafb', borderRadius: '6px'}}>
          <h3 style={{color: '#374151', marginBottom: '10px'}}>功能測試</h3>
          <p style={{color: '#6b7280', fontSize: '14px'}}>
            如果你能看到這個頁面並且按鈕可以點擊，表示 React 應用程式運行正常！
          </p>
        </div>
      </div>
    </div>
  );
};

export default SimpleApp;