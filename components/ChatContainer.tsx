'use client';

/**
 * チャットコンテナコンポーネント
 * メッセージリストの表示、自動スクロール
 */

import { useEffect, useRef } from 'react';
import { Message } from '@/types/chat';
import ChatMessage from './ChatMessage';
import LoadingIndicator from './LoadingIndicator';

interface ChatContainerProps {
  messages: Message[];
  isLoading?: boolean;
  className?: string;
}

export default function ChatContainer({
  messages,
  isLoading = false,
  className = ''
}: ChatContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 新しいメッセージが追加されたら自動スクロール
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading]);

  return (
    <div
      ref={containerRef}
      className={`flex-1 overflow-y-auto px-4 py-6 space-y-4 ${className}`}
    >
      {messages.length === 0 && !isLoading ? (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <div className="mb-4">
            <svg
              className="w-16 h-16 text-gray-300 mx-auto"
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
          <h2 className="text-xl font-semibold text-gray-700 mb-2">
            AIチャットボット
          </h2>
          <p className="text-gray-500 max-w-md">
            メッセージを入力して会話を始めましょう。
            <br />
            どんな質問でもお気軽にどうぞ。
          </p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 border border-gray-200 rounded-lg px-4 py-3">
                <LoadingIndicator size="small" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </>
      )}
    </div>
  );
}
