/**
 * Chat APIエンドポイント
 * POST /api/chat
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { nanoid } from 'nanoid';
import { sendMessageToClaude, ClaudeApiError } from '@/lib/claude';
import prisma from '@/lib/prisma';
import {
  ChatApiRequest,
  ChatApiResponse,
  ApiErrorResponse,
  ApiErrorCode
} from '@/types/api';

/**
 * リクエストボディのバリデーションスキーマ
 */
const chatRequestSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(10000, 'Message too long'),
  conversationHistory: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string(),
    })
  ).max(100, 'Conversation history too long'),
});

/**
 * POST /api/chat
 * ユーザーメッセージを受け取り、Claude APIからの応答を返却
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // リクエストボディの取得
    const body = await request.json() as ChatApiRequest;

    // バリデーション
    const validationResult = chatRequestSchema.safeParse(body);
    if (!validationResult.success) {
      const errorResponse: ApiErrorResponse = {
        error: 'Invalid request format',
        code: ApiErrorCode.INVALID_REQUEST,
        details: process.env.NODE_ENV === 'development'
          ? validationResult.error.issues
          : undefined,
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    const { message, conversationHistory } = validationResult.data;

    // Claude APIへメッセージ送信
    let aiResponse: string;
    try {
      aiResponse = await sendMessageToClaude(message, conversationHistory);
    } catch (error) {
      // Claude APIエラーのハンドリング
      if (error instanceof ClaudeApiError) {
        const errorResponse: ApiErrorResponse = {
          error: error.message,
          code: error.code,
          details: process.env.NODE_ENV === 'development'
            ? error.details
            : undefined,
        };

        // エラーコードに応じたHTTPステータス
        const statusCode = error.code === ApiErrorCode.RATE_LIMIT_EXCEEDED
          ? 429
          : error.code === ApiErrorCode.MISSING_API_KEY
          ? 500
          : 503;

        // エラーログをDBに記録（オプション）
        await logToDatabase(message, '', error.message);

        return NextResponse.json(errorResponse, { status: statusCode });
      }

      // 予期しないエラー
      throw error;
    }

    // 成功時のレスポンス
    const timestamp = new Date().toISOString();
    const response: ChatApiResponse = {
      response: aiResponse,
      timestamp,
    };

    // 成功ログをDBに記録（オプション）
    await logToDatabase(message, aiResponse);

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    // 予期しないエラーのハンドリング
    console.error('Unexpected error in /api/chat:', error);

    const errorResponse: ApiErrorResponse = {
      error: 'Internal server error',
      code: ApiErrorCode.INTERNAL_SERVER_ERROR,
      details: process.env.NODE_ENV === 'development' && error instanceof Error
        ? { message: error.message, stack: error.stack }
        : undefined,
    };

    return NextResponse.json(errorResponse, { status: 500 });
  }
}

/**
 * データベースへのログ記録（オプショナル機能）
 * エラーが発生してもAPIレスポンスには影響させない
 */
async function logToDatabase(
  message: string,
  response: string,
  error?: string
): Promise<void> {
  try {
    await prisma.chatLog.create({
      data: {
        sessionId: nanoid(),
        message,
        response,
        error: error || undefined,
      },
    });
  } catch (dbError) {
    // ログ記録の失敗はコンソールに出力するのみ
    console.error('Failed to log to database:', dbError);
  }
}

/**
 * OPTIONS /api/chat
 * CORSプリフライトリクエスト対応
 */
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
