import React from 'react';

const App = () => {
  return (
    <div className="min-h-screen bg-gray-100 p-6">
      <h1 className="text-3xl font-bold text-blue-600 mb-4">
        🇯🇵 日本語学習カード
      </h1>
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-700">閃卡應用程式載入成功！</p>
        <button className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          測試按鈕
        </button>
      </div>
    </div>
  );
};

export default App;