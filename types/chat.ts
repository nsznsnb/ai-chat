/**
 * チャット関連の型定義
 */

/**
 * メッセージのロール
 */
export type MessageRole = 'user' | 'assistant';

/**
 * チャットメッセージの型
 */
export interface Message {
  id: string;          // メッセージID（nanoid等で生成）
  role: MessageRole;   // メッセージの送信者
  content: string;     // メッセージ内容
  timestamp: Date;     // 送信時刻
}

/**
 * 会話履歴の型
 */
export type ConversationHistory = Array<{
  role: MessageRole;
  content: string;
}>;

/**
 * チャットセッションの状態
 */
export interface ChatSession {
  messages: Message[];   // メッセージリスト
  isLoading: boolean;    // ローディング状態
  error: string | null;  // エラーメッセージ
}

/**
 * Claude APIへのメッセージ送信パラメータ
 */
export interface SendMessageParams {
  message: string;
  conversationHistory: ConversationHistory;
}

/**
 * Claude APIレスポンスの型
 */
export interface ClaudeResponse {
  response: string;
  timestamp: string;
}
