/**
 * Prismaクライアントのシングルトンパターン実装
 * 開発環境でのホットリロード対応
 */

import { PrismaClient } from '@prisma/client';

/**
 * PrismaClientのグローバル型定義
 * 開発環境でのホットリロード時にクライアントインスタンスを保持
 */
declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

/**
 * Prismaクライアントのシングルトンインスタンス
 *
 * 本番環境: 毎回新しいインスタンスを作成
 * 開発環境: グローバル変数にキャッシュして再利用（ホットリロード対策）
 */
const prisma = global.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development'
    ? ['query', 'error', 'warn']
    : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export default prisma;

/**
 * データベース接続テスト関数
 * 起動時やヘルスチェックで使用
 */
export async function testDatabaseConnection(): Promise<boolean> {
  try {
    await prisma.$connect();
    console.log('✓ Database connected successfully');
    return true;
  } catch (error) {
    console.error('✗ Database connection failed:', error);
    return false;
  }
}

/**
 * データベース切断関数
 * アプリケーション終了時に呼び出し
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
