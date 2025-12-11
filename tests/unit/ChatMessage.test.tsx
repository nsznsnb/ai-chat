/**
 * ChatMessage コンポーネントの単体テスト
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ChatMessage from '@/components/ChatMessage';
import { Message } from '@/types/chat';

describe('ChatMessage', () => {
  const mockUserMessage: Message = {
    id: 'msg-1',
    role: 'user',
    content: 'こんにちは',
    timestamp: new Date('2025-12-07T10:00:00Z'),
  };

  const mockAssistantMessage: Message = {
    id: 'msg-2',
    role: 'assistant',
    content: 'こんにちは！何かお手伝いできることはありますか？',
    timestamp: new Date('2025-12-07T10:00:05Z'),
  };

  describe('ユーザーメッセージの表示', () => {
    test('ユーザーメッセージが正しく表示されること', () => {
      render(<ChatMessage message={mockUserMessage} />);

      expect(screen.getByText('こんにちは')).toBeInTheDocument();
      expect(screen.getByText('あなた')).toBeInTheDocument();
    });

    test('ユーザーメッセージが右寄せで表示されること', () => {
      const { container } = render(<ChatMessage message={mockUserMessage} />);
      const messageContainer = container.querySelector('.justify-end');
      expect(messageContainer).toBeInTheDocument();
    });

    test('ユーザーメッセージが青色の背景で表示されること', () => {
      const { container } = render(<ChatMessage message={mockUserMessage} />);
      const messageBox = container.querySelector('.bg-blue-500');
      expect(messageBox).toBeInTheDocument();
    });
  });

  describe('AIメッセージの表示', () => {
    test('AIメッセージが正しく表示されること', () => {
      render(<ChatMessage message={mockAssistantMessage} />);

      expect(screen.getByText('こんにちは！何かお手伝いできることはありますか？')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument();
    });

    test('AIメッセージが左寄せで表示されること', () => {
      const { container } = render(<ChatMessage message={mockAssistantMessage} />);
      const messageContainer = container.querySelector('.justify-start');
      expect(messageContainer).toBeInTheDocument();
    });

    test('AIメッセージがグレー色の背景で表示されること', () => {
      const { container } = render(<ChatMessage message={mockAssistantMessage} />);
      const messageBox = container.querySelector('.bg-gray-100');
      expect(messageBox).toBeInTheDocument();
    });
  });

  describe('マークダウンレンダリング', () => {
    test('マークダウンコンテンツが表示されること', () => {
      const markdownMessage: Message = {
        id: 'msg-3',
        role: 'assistant',
        content: 'これは**太字**のテストです',
        timestamp: new Date(),
      };

      const { getByText } = render(<ChatMessage message={markdownMessage} />);
      // react-markdownがモックされているため、コンテンツがそのまま表示されることを確認
      expect(getByText(/これは\*\*太字\*\*のテストです/)).toBeInTheDocument();
    });

    test('複数行のマークダウンコンテンツが表示されること', () => {
      const markdownMessage: Message = {
        id: 'msg-4',
        role: 'assistant',
        content: '- アイテム1\n- アイテム2\n- アイテム3',
        timestamp: new Date(),
      };

      const { getByText } = render(<ChatMessage message={markdownMessage} />);
      // コンテンツが表示されることを確認
      expect(getByText(/アイテム1/)).toBeInTheDocument();
    });

    test('コードを含むコンテンツが表示されること', () => {
      const markdownMessage: Message = {
        id: 'msg-5',
        role: 'assistant',
        content: 'インラインコード: `console.log()`',
        timestamp: new Date(),
      };

      const { getByText } = render(<ChatMessage message={markdownMessage} />);
      // コンテンツが表示されることを確認
      expect(getByText(/console\.log\(\)/)).toBeInTheDocument();
    });
  });

  describe('タイムスタンプの表示', () => {
    test('タイムスタンプが正しいフォーマットで表示されること', () => {
      const { container } = render(<ChatMessage message={mockUserMessage} />);

      // タイムスタンプ要素が存在することを確認
      const timestampElements = container.querySelectorAll('.text-xs');
      expect(timestampElements.length).toBeGreaterThan(0);

      // 時刻フォーマット（HH:MM）が含まれているか確認
      const hasTimestamp = Array.from(timestampElements).some(
        el => /\d{2}:\d{2}/.test(el.textContent || '')
      );
      expect(hasTimestamp).toBe(true);
    });
  });

  describe('改行とテキスト折り返し', () => {
    test('長いテキストが正しく折り返されること', () => {
      const longMessage: Message = {
        id: 'msg-6',
        role: 'user',
        content: 'a'.repeat(200),
        timestamp: new Date(),
      };

      const { container } = render(<ChatMessage message={longMessage} />);
      const messageBox = container.querySelector('.break-words');
      expect(messageBox).toBeInTheDocument();
    });

    test('改行が正しく保持されること', () => {
      const multilineMessage: Message = {
        id: 'msg-7',
        role: 'user',
        content: '1行目\n2行目\n3行目',
        timestamp: new Date(),
      };

      const { container } = render(<ChatMessage message={multilineMessage} />);
      const messageBox = container.querySelector('.whitespace-pre-wrap');
      expect(messageBox).toBeInTheDocument();
      expect(messageBox?.textContent).toBe('1行目\n2行目\n3行目');
    });
  });
});
