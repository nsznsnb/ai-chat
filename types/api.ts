/**
 * API関連の型定義
 */

import { ConversationHistory } from './chat';

/**
 * APIエラーコード
 */
export enum ApiErrorCode {
  INVALID_REQUEST = 'INVALID_REQUEST',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CLAUDE_API_ERROR = 'CLAUDE_API_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  MISSING_API_KEY = 'MISSING_API_KEY',
}

/**
 * APIエラーレスポンス
 */
export interface ApiErrorResponse {
  error: string;        // エラーメッセージ
  code: ApiErrorCode;   // エラーコード
  details?: unknown;    // 詳細情報（開発環境のみ）
}

/**
 * Chat APIリクエストボディ
 */
export interface ChatApiRequest {
  message: string;
  conversationHistory: ConversationHistory;
}

/**
 * Chat API成功レスポンス
 */
export interface ChatApiResponse {
  response: string;
  timestamp: string;
}

/**
 * レート制限の設定
 */
export interface RateLimitConfig {
  windowMs: number;      // 時間枠（ミリ秒）
  maxRequests: number;   // 最大リクエスト数
}

/**
 * レート制限の状態
 */
export interface RateLimitState {
  count: number;         // リクエスト数
  resetTime: number;     // リセット時刻（Unix timestamp）
}
