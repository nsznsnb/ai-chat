/**
 * ChatContainer コンポーネントの単体テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatContainer from '@/components/ChatContainer';
import { Message } from '@/types/chat';

describe('ChatContainer', () => {
  const mockMessages: Message[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'こんにちは',
      timestamp: new Date('2025-12-07T10:00:00Z'),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'こんにちは！何かお手伝いできることはありますか？',
      timestamp: new Date('2025-12-07T10:00:05Z'),
    },
    {
      id: 'msg-3',
      role: 'user',
      content: '天気について教えてください',
      timestamp: new Date('2025-12-07T10:00:10Z'),
    },
  ];

  describe('メッセージリストの表示', () => {
    test('複数のメッセージが正しく表示されること', () => {
      render(<ChatContainer messages={mockMessages} />);

      expect(screen.getByText('こんにちは')).toBeInTheDocument();
      expect(screen.getByText('こんにちは！何かお手伝いできることはありますか？')).toBeInTheDocument();
      expect(screen.getByText('天気について教えてください')).toBeInTheDocument();
    });

    test('メッセージが正しい順序で表示されること', () => {
      const { container } = render(<ChatContainer messages={mockMessages} />);

      const messages = container.querySelectorAll('[class*="justify-"]');
      expect(messages).toHaveLength(3);
    });

    test('各メッセージに一意のキーが設定されていること', () => {
      const { container } = render(<ChatContainer messages={mockMessages} />);

      const messageElements = container.querySelectorAll('[class*="justify-"]');
      expect(messageElements).toHaveLength(mockMessages.length);
    });
  });

  describe('空状態の表示', () => {
    test('メッセージがない場合に空状態が表示されること', () => {
      render(<ChatContainer messages={[]} />);

      expect(screen.getByText('AIチャットボット')).toBeInTheDocument();
      expect(screen.getByText(/メッセージを入力して会話を始めましょう/)).toBeInTheDocument();
    });

    test('空状態にアイコンが表示されること', () => {
      const { container } = render(<ChatContainer messages={[]} />);

      const icon = container.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });

    test('メッセージがある場合は空状態が表示されないこと', () => {
      render(<ChatContainer messages={mockMessages} />);

      expect(screen.queryByText('AIチャットボット')).not.toBeInTheDocument();
    });
  });

  describe('ローディング状態', () => {
    test('ローディング中にローディングインジケーターが表示されること', () => {
      render(<ChatContainer messages={mockMessages} isLoading={true} />);

      expect(screen.getByText('応答を待っています...')).toBeInTheDocument();
    });

    test('ローディング中でない場合はローディングインジケーターが表示されないこと', () => {
      render(<ChatContainer messages={mockMessages} isLoading={false} />);

      expect(screen.queryByText('応答を待っています...')).not.toBeInTheDocument();
    });

    test('メッセージが空でローディング中の場合、空状態が表示されないこと', () => {
      render(<ChatContainer messages={[]} isLoading={true} />);

      expect(screen.queryByText('AIチャットボット')).not.toBeInTheDocument();
      expect(screen.getByText('応答を待っています...')).toBeInTheDocument();
    });
  });

  describe('スクロール動作', () => {
    test('スクロールコンテナが存在すること', () => {
      const { container } = render(<ChatContainer messages={mockMessages} />);

      const scrollContainer = container.querySelector('.overflow-y-auto');
      expect(scrollContainer).toBeInTheDocument();
    });

    test('メッセージエリアにスクロール用のref要素が存在すること', () => {
      const { container } = render(<ChatContainer messages={mockMessages} />);

      // messagesEndRef が DOM に存在することを確認
      const containerElement = container.querySelector('.overflow-y-auto');
      expect(containerElement).toBeInTheDocument();
      expect(containerElement?.lastElementChild).toBeTruthy();
    });
  });

  describe('レスポンシブデザイン', () => {
    test('コンテナに適切なスタイルクラスが適用されていること', () => {
      const { container } = render(<ChatContainer messages={mockMessages} />);

      const scrollContainer = container.querySelector('.overflow-y-auto');
      expect(scrollContainer).toHaveClass('flex-1');
      expect(scrollContainer).toHaveClass('px-4');
      expect(scrollContainer).toHaveClass('py-6');
    });

    test('カスタムクラス名を適用できること', () => {
      const { container } = render(
        <ChatContainer messages={mockMessages} className="custom-class" />
      );

      const scrollContainer = container.querySelector('.custom-class');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('メッセージの更新', () => {
    test('メッセージが追加されたときに再レンダリングされること', () => {
      const { rerender } = render(<ChatContainer messages={mockMessages} />);

      // 初期状態: 3メッセージ（roleラベルのみカウント）
      expect(screen.getAllByText(/あなた|AI/)).toHaveLength(3);

      const newMessages: Message[] = [
        ...mockMessages,
        {
          id: 'msg-4',
          role: 'assistant',
          content: '新しいメッセージ',
          timestamp: new Date(),
        },
      ];

      rerender(<ChatContainer messages={newMessages} />);

      expect(screen.getByText('新しいメッセージ')).toBeInTheDocument();
    });

    test('メッセージがクリアされたときに空状態が表示されること', () => {
      const { rerender } = render(<ChatContainer messages={mockMessages} />);

      expect(screen.queryByText('AIチャットボット')).not.toBeInTheDocument();

      rerender(<ChatContainer messages={[]} />);

      expect(screen.getByText('AIチャットボット')).toBeInTheDocument();
    });
  });
});
