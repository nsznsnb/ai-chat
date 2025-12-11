/**
 * Health Check API Endpoint
 *
 * アプリケーションの健全性を確認するためのエンドポイント
 * - Docker のヘルスチェック
 * - Cloud Run のヘルスチェック
 * - ロードバランサーのヘルスチェック
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 基本的なヘルスチェック
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: '1.0.0',
    };

    return NextResponse.json(health, { status: 200 });
  } catch (error) {
    // エラーが発生した場合
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 503 }
    );
  }
}

// OPTIONSメソッド対応（CORS プリフライト）
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
