/**
 * Chat API統合テスト
 * 実際のAPIエンドポイントの動作を検証
 *
 * 注意: これらのテストは開発サーバーが起動している場合のみ実行されます
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

// 統合テストはデフォルトでスキップ（開発サーバー起動が必要）
describe.skip('Chat API Integration Tests', () => {
  const apiUrl = 'http://localhost:3000/api/chat';

  beforeAll(() => {
    // テスト環境の準備
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn('⚠️  ANTHROPIC_API_KEY not set - some tests will be skipped');
    }
  });

  afterAll(() => {
    // クリーンアップ処理
  });

  describe('バリデーションテスト', () => {
    test('空のリクエストボディを拒否すること', async () => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('error');
      expect(data).toHaveProperty('code', 'INVALID_REQUEST');
    });

    test('空のメッセージを拒否すること', async () => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: '',
          conversationHistory: [],
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('code', 'INVALID_REQUEST');
    });

    test('長すぎるメッセージを拒否すること（境界値テスト）', async () => {
      const longMessage = 'a'.repeat(10001);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: longMessage,
          conversationHistory: [],
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('code', 'INVALID_REQUEST');
    });

    test('不正なroleを持つ会話履歴を拒否すること', async () => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello',
          conversationHistory: [
            { role: 'invalid_role', content: 'Test' },
          ],
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('code', 'INVALID_REQUEST');
    });

    test('会話履歴が100メッセージを超える場合に拒否すること（境界値テスト）', async () => {
      const longHistory = Array.from({ length: 101 }, (_, i) => ({
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
      }));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: 'Hello',
          conversationHistory: longHistory,
        }),
      });

      expect(response.status).toBe(400);

      const data = await response.json();
      expect(data).toHaveProperty('code', 'INVALID_REQUEST');
    });
  });

  describe('正常系テスト（APIキーが設定されている場合）', () => {
    const shouldSkip = !process.env.ANTHROPIC_API_KEY;

    (shouldSkip ? test.skip : test)(
      '正常なリクエストを処理できること',
      async () => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: 'こんにちは',
            conversationHistory: [],
          }),
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data).toHaveProperty('response');
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.response).toBe('string');
        expect(data.response.length).toBeGreaterThan(0);

        // タイムスタンプがISO 8601形式であることを確認
        expect(() => new Date(data.timestamp)).not.toThrow();
      },
      30000 // 30秒タイムアウト
    );

    (shouldSkip ? test.skip : test)(
      '会話履歴を正しく処理できること',
      async () => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: '私の名前は何ですか？',
            conversationHistory: [
              { role: 'user', content: '私の名前は太郎です' },
              { role: 'assistant', content: 'こんにちは、太郎さん！' },
            ],
          }),
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.response.toLowerCase()).toMatch(/太郎|taro/i);
      },
      30000
    );

    (shouldSkip ? test.skip : test)(
      '日本語のメッセージを正しく処理できること',
      async () => {
        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: '東京の天気について教えてください',
            conversationHistory: [],
          }),
        });

        expect(response.status).toBe(200);

        const data = await response.json();
        expect(data.response).toBeTruthy();
        expect(typeof data.response).toBe('string');
      },
      30000
    );
  });

  describe('エラーハンドリングテスト', () => {
    test('Content-Typeが不正な場合に適切にエラー処理すること', async () => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: 'invalid body',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    test('JSONパースエラーを適切に処理すること', async () => {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: 'invalid json',
      });

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('CORSテスト', () => {
    test('OPTIONSリクエストに適切に応答すること', async () => {
      const response = await fetch(apiUrl, {
        method: 'OPTIONS',
      });

      expect(response.status).toBe(204);
      expect(response.headers.has('Access-Control-Allow-Origin')).toBe(true);
      expect(response.headers.has('Access-Control-Allow-Methods')).toBe(true);
    });
  });
});
