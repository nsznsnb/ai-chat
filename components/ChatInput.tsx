'use client';

/**
 * チャット入力コンポーネント
 * テキスト入力フィールドと送信ボタン
 */

import { useState, useRef, FormEvent, KeyboardEvent } from 'react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'メッセージを入力してください...',
  maxLength = 10000,
  className = ''
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    sendMessage();
  };

  const sendMessage = () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage || disabled) {
      return;
    }

    if (trimmedMessage.length > maxLength) {
      alert(`メッセージは${maxLength}文字以内で入力してください`);
      return;
    }

    onSendMessage(trimmedMessage);
    setMessage('');

    // テキストエリアの高さをリセット
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enterキーで送信（Shift+Enterで改行）
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);

    // テキストエリアの高さを自動調整
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  };

  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars < 100;

  return (
    <form onSubmit={handleSubmit} className={`border-t border-gray-200 bg-white ${className}`}>
      <div className="p-4">
        <div className="flex items-end space-x-3">
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed max-h-32 overflow-y-auto"
              style={{ minHeight: '44px' }}
            />
            {isNearLimit && (
              <p className="text-xs text-gray-500 mt-1">
                残り {remainingChars} 文字
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={disabled || !message.trim()}
            className="flex-shrink-0 bg-blue-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            <svg
              className="w-5 h-5"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z"
              />
            </svg>
          </button>
        </div>

        <p className="text-xs text-gray-500 mt-2">
          Enterで送信、Shift+Enterで改行
        </p>
      </div>
    </form>
  );
}
