'use client';

/**
 * チャットメッセージ表示コンポーネント
 * ユーザー/AIメッセージの表示、マークダウン対応
 */

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Message } from '@/types/chat';

interface ChatMessageProps {
  message: Message;
  className?: string;
}

export default function ChatMessage({ message, className = '' }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const formatTimestamp = (date: Date) => {
    return new Intl.DateTimeFormat('ja-JP', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4 ${className}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-3 ${
          isUser
            ? 'bg-blue-500 text-white'
            : 'bg-gray-100 text-gray-900 border border-gray-200'
        }`}
      >
        <div className="flex items-center mb-1">
          <span className={`text-xs font-semibold ${isUser ? 'text-blue-100' : 'text-gray-600'}`}>
            {isUser ? 'あなた' : 'AI'}
          </span>
          <span className={`text-xs ml-2 ${isUser ? 'text-blue-200' : 'text-gray-500'}`}>
            {formatTimestamp(message.timestamp)}
          </span>
        </div>

        <div
          className={`prose prose-sm max-w-none ${
            isUser
              ? 'prose-invert prose-p:text-white prose-headings:text-white prose-strong:text-white prose-code:text-blue-100'
              : 'prose-gray'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap break-words m-0">{message.content}</p>
          ) : (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-2 last:mb-0 whitespace-pre-wrap break-words">{children}</p>
                ),
                code: ({ inline, children, ...props }: any) =>
                  inline ? (
                    <code
                      className="bg-gray-200 text-gray-800 px-1 py-0.5 rounded text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  ) : (
                    <code
                      className="block bg-gray-800 text-gray-100 p-3 rounded overflow-x-auto text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside mb-2 last:mb-0 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside mb-2 last:mb-0 space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li className="ml-2">{children}</li>,
                h1: ({ children }) => <h1 className="text-lg font-bold mb-2 mt-3 first:mt-0">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-bold mb-2 mt-3 first:mt-0">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-bold mb-2 mt-2 first:mt-0">{children}</h3>,
                blockquote: ({ children }) => (
                  <blockquote className="border-l-4 border-gray-300 pl-4 italic my-2">{children}</blockquote>
                ),
              }}
            >
              {message.content}
            </ReactMarkdown>
          )}
        </div>
      </div>
    </div>
  );
}
