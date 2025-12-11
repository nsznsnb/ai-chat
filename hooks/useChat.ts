'use client';

/**
 * チャット機能のカスタムフック
 * API呼び出しロジック、エラーハンドリング、リトライロジックを提供
 */

import { useState, useCallback } from 'react';
import { useChatContext } from '@/contexts/ChatContext';
import { ConversationHistory } from '@/types/chat';
import { ChatApiResponse, ApiErrorResponse } from '@/types/api';

/**
 * API呼び出しのオプション
 */
interface SendMessageOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * useChat フック
 */
export function useChat() {
  const {
    state,
    addUserMessage,
    addAssistantMessage,
    setLoading,
    setError,
    resetSession,
  } = useChatContext();

  const [isSending, setIsSending] = useState(false);

  /**
   * メッセージを送信してAIからの応答を取得
   */
  const sendMessage = useCallback(
    async (message: string, options: SendMessageOptions = {}) => {
      const { maxRetries = 2, retryDelay = 1000 } = options;

      // 入力検証
      if (!message || message.trim().length === 0) {
        setError('メッセージを入力してください');
        return;
      }

      // メッセージ長の検証
      if (message.length > 10000) {
        setError('メッセージが長すぎます（最大10,000文字）');
        return;
      }

      setIsSending(true);
      setLoading(true);
      setError(null);

      // ユーザーメッセージを追加
      addUserMessage(message);

      // 会話履歴を構築
      const conversationHistory: ConversationHistory = state.messages.map(
        (msg) => ({
          role: msg.role,
          content: msg.content,
        })
      );

      let lastError: Error | null = null;

      // リトライロジック
      for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
          const response = await fetch('/api/chat', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              message,
              conversationHistory,
            }),
          });

          if (!response.ok) {
            // エラーレスポンスの処理
            const errorData: ApiErrorResponse = await response.json();
            throw new Error(errorData.error || `HTTP Error: ${response.status}`);
          }

          const data: ChatApiResponse = await response.json();

          // AIの応答を追加
          addAssistantMessage(data.response);

          setIsSending(false);
          setLoading(false);
          return;
        } catch (error) {
          lastError = error as Error;
          console.error(`Send message attempt ${attempt + 1} failed:`, error);

          // 最後の試行でない場合は待機
          if (attempt < maxRetries) {
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }

      // すべての試行が失敗した場合
      const errorMessage =
        lastError?.message || '予期しないエラーが発生しました';
      setError(`メッセージの送信に失敗しました: ${errorMessage}`);
      setIsSending(false);
      setLoading(false);
    },
    [
      state.messages,
      addUserMessage,
      addAssistantMessage,
      setLoading,
      setError,
    ]
  );

  /**
   * エラーをクリア
   */
  const clearError = useCallback(() => {
    setError(null);
  }, [setError]);

  /**
   * セッションをリセット
   */
  const reset = useCallback(() => {
    resetSession();
    setIsSending(false);
  }, [resetSession]);

  return {
    // 状態
    messages: state.messages,
    isLoading: state.isLoading,
    error: state.error,
    isSending,

    // アクション
    sendMessage,
    clearError,
    reset,
  };
}
