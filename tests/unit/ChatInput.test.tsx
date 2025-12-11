/**
 * ChatInput コンポーネントの単体テスト
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import ChatInput from '@/components/ChatInput';

describe('ChatInput', () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    mockOnSendMessage.mockClear();
  });

  describe('基本的な入力と送信', () => {
    test('テキストを入力できること', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');
      await userEvent.type(textarea, 'テストメッセージ');

      expect(textarea).toHaveValue('テストメッセージ');
    });

    test('送信ボタンをクリックするとメッセージが送信されること', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');
      const submitButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'テストメッセージ');
      await userEvent.click(submitButton);

      expect(mockOnSendMessage).toHaveBeenCalledWith('テストメッセージ');
      expect(textarea).toHaveValue('');
    });

    test('Enterキーでメッセージが送信されること', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');

      await userEvent.type(textarea, 'テストメッセージ');
      fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: false });

      expect(mockOnSendMessage).toHaveBeenCalledWith('テストメッセージ');
      expect(textarea).toHaveValue('');
    });

    test('Shift+Enterで改行されること', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');

      // userEvent.type with {Shift>}{Enter} for newline
      await userEvent.type(textarea, '1行目{Shift>}{Enter}{/Shift}2行目');

      expect(textarea).toHaveValue('1行目\n2行目');
      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('バリデーション', () => {
    test('空のメッセージは送信されないこと', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const submitButton = screen.getByRole('button', { name: '' });
      await userEvent.click(submitButton);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    test('空白のみのメッセージは送信されないこと', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');
      const submitButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, '   ');
      await userEvent.click(submitButton);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });

    test('前後の空白がトリムされること', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');
      const submitButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, '  テストメッセージ  ');
      await userEvent.click(submitButton);

      expect(mockOnSendMessage).toHaveBeenCalledWith('テストメッセージ');
    });

    test('最大文字数を超えた場合にアラートが表示されること', async () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});

      render(<ChatInput onSendMessage={mockOnSendMessage} maxLength={100} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');
      const submitButton = screen.getByRole('button', { name: '' });

      const longMessage = 'a'.repeat(101);
      await userEvent.type(textarea, longMessage);
      await userEvent.click(submitButton);

      expect(alertSpy).toHaveBeenCalledWith('メッセージは100文字以内で入力してください');
      expect(mockOnSendMessage).not.toHaveBeenCalled();

      alertSpy.mockRestore();
    });

    test('残り文字数が100文字未満の場合に表示されること', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} maxLength={150} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');

      const message = 'a'.repeat(60);
      await userEvent.type(textarea, message);

      await waitFor(() => {
        expect(screen.getByText(/残り 90 文字/)).toBeInTheDocument();
      });
    });
  });

  describe('disabled状態', () => {
    test('disabled時は入力できないこと', () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} disabled={true} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');
      expect(textarea).toBeDisabled();
    });

    test('disabled時は送信ボタンが無効化されること', () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} disabled={true} />);

      const submitButton = screen.getByRole('button', { name: '' });
      expect(submitButton).toBeDisabled();
    });

    test('disabled時は送信されないこと', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} disabled={true} />);

      const submitButton = screen.getByRole('button', { name: '' });
      await userEvent.click(submitButton);

      expect(mockOnSendMessage).not.toHaveBeenCalled();
    });
  });

  describe('送信ボタンの状態', () => {
    test('入力がない場合は送信ボタンが無効化されること', () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const submitButton = screen.getByRole('button', { name: '' });
      expect(submitButton).toBeDisabled();
    });

    test('入力がある場合は送信ボタンが有効化されること', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');
      const submitButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'テスト');

      expect(submitButton).not.toBeDisabled();
    });
  });

  describe('プレースホルダー', () => {
    test('カスタムプレースホルダーが表示されること', () => {
      render(
        <ChatInput
          onSendMessage={mockOnSendMessage}
          placeholder="カスタムプレースホルダー"
        />
      );

      expect(screen.getByPlaceholderText('カスタムプレースホルダー')).toBeInTheDocument();
    });
  });

  describe('送信後の動作', () => {
    test('送信後にテキストエリアがクリアされること', async () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);

      const textarea = screen.getByPlaceholderText('メッセージを入力してください...');
      const submitButton = screen.getByRole('button', { name: '' });

      await userEvent.type(textarea, 'テストメッセージ');
      await userEvent.click(submitButton);

      expect(textarea).toHaveValue('');
    });
  });
});
