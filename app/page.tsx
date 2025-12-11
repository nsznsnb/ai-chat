'use client';

/**
 * メインチャットページ
 * ChatContainer と ChatInput を統合
 */

import { useChat } from '@/hooks/useChat';
import ChatContainer from '@/components/ChatContainer';
import ChatInput from '@/components/ChatInput';
import ErrorMessage from '@/components/ErrorMessage';

export default function Home() {
  const { messages, isLoading, error, sendMessage, clearError, reset } = useChat();

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">AI Chat</h1>
              <p className="text-xs text-gray-500">エンターテイメントチャットボット</p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={reset}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
            >
              会話をリセット
            </button>
          )}
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col max-w-5xl w-full mx-auto overflow-hidden">
        {/* エラーメッセージ */}
        {error && (
          <div className="px-4 pt-4">
            <ErrorMessage
              message={error}
              onRetry={() => {
                clearError();
                if (messages.length > 0) {
                  const lastUserMessage = [...messages]
                    .reverse()
                    .find(m => m.role === 'user');
                  if (lastUserMessage) {
                    sendMessage(lastUserMessage.content);
                  }
                }
              }}
              onDismiss={clearError}
            />
          </div>
        )}

        {/* チャットコンテナ */}
        <ChatContainer
          messages={messages}
          isLoading={isLoading}
        />

        {/* 入力エリア */}
        <ChatInput
          onSendMessage={sendMessage}
          disabled={isLoading}
        />
      </main>

      {/* フッター */}
      <footer className="bg-white border-t border-gray-200 py-3">
        <div className="max-w-5xl mx-auto px-4">
          <p className="text-xs text-center text-gray-500">
            Powered by Claude API | Built with Next.js 15
          </p>
        </div>
      </footer>
    </div>
  );
}
