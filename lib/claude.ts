/**
 * Claude API（Anthropic SDK）のラッパークライアント
 */

import Anthropic from '@anthropic-ai/sdk';
import { ConversationHistory } from '@/types/chat';
import { ApiErrorCode } from '@/types/api';

/**
 * Claude APIクライアントの初期化
 */
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Claude APIエラークラス
 */
export class ClaudeApiError extends Error {
  constructor(
    message: string,
    public code: ApiErrorCode,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ClaudeApiError';
  }
}

/**
 * Claude APIへメッセージを送信
 *
 * @param message - ユーザーメッセージ
 * @param conversationHistory - 会話履歴
 * @returns AIの応答テキスト
 * @throws {ClaudeApiError} API呼び出しが失敗した場合
 */
export async function sendMessageToClaude(
  message: string,
  conversationHistory: ConversationHistory = []
): Promise<string> {
  // APIキーの検証
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new ClaudeApiError(
      'Claude APIキーが設定されていません。環境変数ANTHROPIC_API_KEYを確認してください。',
      ApiErrorCode.MISSING_API_KEY
    );
  }

  // 入力検証
  if (!message || message.trim().length === 0) {
    throw new ClaudeApiError(
      'メッセージが空です。',
      ApiErrorCode.INVALID_REQUEST
    );
  }

  try {
    // Claude APIへのリクエスト
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      messages: [
        ...conversationHistory.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        {
          role: 'user' as const,
          content: message,
        },
      ],
    });

    // レスポンスの検証
    if (!response.content || response.content.length === 0) {
      throw new ClaudeApiError(
        'AIからの応答が空でした。もう一度お試しください。',
        ApiErrorCode.CLAUDE_API_ERROR
      );
    }

    // テキストコンテンツの抽出
    const textContent = response.content.find(
      block => block.type === 'text'
    );

    if (!textContent || textContent.type !== 'text') {
      throw new ClaudeApiError(
        'AIの応答形式が不正です。もう一度お試しください。',
        ApiErrorCode.CLAUDE_API_ERROR
      );
    }

    return textContent.text;

  } catch (error) {
    // Anthropic SDKのエラーハンドリング
    if (error instanceof Anthropic.APIError) {
      // レート制限エラー
      if (error.status === 429) {
        throw new ClaudeApiError(
          'リクエスト数が上限に達しました。しばらく待ってから再度お試しください。',
          ApiErrorCode.RATE_LIMIT_EXCEEDED,
          error
        );
      }

      // 認証エラー
      if (error.status === 401) {
        throw new ClaudeApiError(
          'APIキーが無効です。設定を確認してください。',
          ApiErrorCode.MISSING_API_KEY,
          error
        );
      }

      // タイムアウト・ネットワークエラー
      if (error.status === 408 || error.status === 503 || error.status === 504) {
        throw new ClaudeApiError(
          'AIサーバーへの接続がタイムアウトしました。ネットワーク接続を確認して再度お試しください。',
          ApiErrorCode.CLAUDE_API_ERROR,
          error
        );
      }

      // その他のAPIエラー
      throw new ClaudeApiError(
        `AI APIエラーが発生しました。${error.message || 'もう一度お試しください。'}`,
        ApiErrorCode.CLAUDE_API_ERROR,
        error
      );
    }

    // 既にClaudeApiErrorの場合はそのままスロー
    if (error instanceof ClaudeApiError) {
      throw error;
    }

    // ネットワークエラー
    if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('network'))) {
      throw new ClaudeApiError(
        'ネットワーク接続エラーが発生しました。インターネット接続を確認してください。',
        ApiErrorCode.INTERNAL_SERVER_ERROR,
        error
      );
    }

    // 予期しないエラー
    throw new ClaudeApiError(
      '予期しないエラーが発生しました。しばらく待ってから再度お試しください。',
      ApiErrorCode.INTERNAL_SERVER_ERROR,
      error
    );
  }
}

/**
 * Claude APIの接続テスト
 * ヘルスチェック等で使用
 */
export async function testClaudeConnection(): Promise<boolean> {
  try {
    await sendMessageToClaude('Hello', []);
    return true;
  } catch (error) {
    console.error('Claude API connection test failed:', error);
    return false;
  }
}
