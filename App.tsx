import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import StyleSelector from './components/StyleSelector';
import LoadingScreen from './components/LoadingScreen';
import ResultScreen from './components/ResultScreen';
import { generateImage, generateCaption } from './services/geminiService';
import { Screen, Style, UserImage, HistoryItem } from './types';

const HISTORY_STORAGE_KEY = 'alterevo-history';

function App() {
  const [screen, setScreen] = useState<Screen>('selector');
  const [userImage, setUserImage] = useState<UserImage | null>(null);
  const [selectedStyle, setSelectedStyle] = useState<Style | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [generatedCaption, setGeneratedCaption] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (storedHistory) {
        setHistory(JSON.parse(storedHistory));
      }
    } catch (e) {
      console.error("Failed to load history from localStorage", e);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  }, []);

  const handleTransform = async (image: UserImage, style: Style) => {
    setUserImage(image);
    setSelectedStyle(style);
    setScreen('loading');
    setError(null);

    try {
      const [imgResult, captionResult] = await Promise.all([
        generateImage(image, style.imagePrompt),
        generateCaption(style.captionPrompt),
      ]);
      
      setGeneratedImage(imgResult);
      setGeneratedCaption(captionResult);

      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        userImage: image,
        generatedImage: imgResult,
        generatedCaption: captionResult,
        style: style,
        timestamp: Date.now(),
      };
      
      // Keep history to a reasonable size, e.g., 20 items
      const updatedHistory = [newHistoryItem, ...history].slice(0, 20);
      setHistory(updatedHistory);
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(updatedHistory));
      
      setScreen('result');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.';
      console.error(errorMessage);
      setError(errorMessage);
      setScreen('selector');
    }
  };
  
  const handleTryAnother = () => {
    setSelectedStyle(null);
    setGeneratedImage(null);
    setGeneratedCaption(null);
    setError(null);
    setScreen('selector');
  };

  const handleViewHistoryItem = (item: HistoryItem) => {
    setUserImage(item.userImage);
    setSelectedStyle(item.style);
    setGeneratedImage(item.generatedImage);
    setGeneratedCaption(item.generatedCaption);
    setError(null);
    setScreen('result');
  };

  const handleClearHistory = () => {
    if (window.confirm('Are you sure you want to clear your entire creation history?')) {
      setHistory([]);
      localStorage.removeItem(HISTORY_STORAGE_KEY);
    }
  };

  const renderScreen = () => {
    switch (screen) {
      case 'loading':
        return selectedStyle ? <LoadingScreen style={selectedStyle} /> : <StyleSelector onTransform={handleTransform} userImage={userImage} setUserImage={setUserImage} history={history} onViewHistoryItem={handleViewHistoryItem} onClearHistory={handleClearHistory} />;
      case 'result':
        return userImage && generatedImage && generatedCaption ? (
          <ResultScreen
            userImage={userImage}
            generatedImage={generatedImage}
            generatedCaption={generatedCaption}
            onTryAnother={handleTryAnother}
          />
        ) : <StyleSelector onTransform={handleTransform} userImage={userImage} setUserImage={setUserImage} history={history} onViewHistoryItem={handleViewHistoryItem} onClearHistory={handleClearHistory} />;
      case 'selector':
      default:
        return <StyleSelector onTransform={handleTransform} userImage={userImage} setUserImage={setUserImage} history={history} onViewHistoryItem={handleViewHistoryItem} onClearHistory={handleClearHistory} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-6 md:p-8 flex flex-col">
      <Header />
      <main className="flex-grow flex flex-col items-center justify-center">
        {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg relative mb-6 w-full max-w-5xl" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
                <button className="absolute top-0 bottom-0 right-0 px-4 py-3" onClick={() => setError(null)} aria-label="Close error message">
                    <svg className="fill-current h-6 w-6 text-red-400" role="button" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><title>Close</title><path d="M14.348 14.849a1.2 1.2 0 0 1-1.697 0L10 11.819l-2.651 3.029a1.2 1.2 0 1 1-1.697-1.697l2.758-3.15-2.759-3.152a1.2 1.2 0 1 1 1.697-1.697L10 8.183l2.651-3.031a1.2 1.2 0 1 1 1.697 1.697l-2.758 3.152 2.758 3.15a1.2 1.2 0 0 1 0 1.698z"/></svg>
                </button>
            </div>
        )}
        {renderScreen()}
      </main>
    </div>
  );
}

export default App;