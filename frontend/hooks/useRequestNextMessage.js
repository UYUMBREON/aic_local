import { useCallback, useState } from 'react';

/**
 * 次のメッセージ要求関数の型
 * @callback RequestNextMessage
 * @returns {Object[]} 最新のメッセージリスト
 */

/**
 * 次のメッセージ要求フックの戻り値の型
 * @typedef {Object} UseRequestNextMessageResult
 * @property {RequestNextMessage} requestNextMessage - 次のメッセージ要求関数
 * @property {any} error - リクエスト時のメッセージ
 */

/**
 * 次のメッセージ要求フック \
 * 次のメッセージ要求関数を提供する。 \
 * 次のメッセージ要求関数は、サーバが保持するメッセージリストの更新と、各クライアントへの一斉送信を要求する。
 * @function useRequestNextMessage
 * @returns {UseRequestNextMessageResult}
 */
export default function useRequestNextMessage() {
  // エラー用変数
  const [error, setError] = useState(null);

  // 次のメッセージ要求用コールバック関数
  const requestNextMessage = useCallback(async (roomId) => {
    setError(null);
    try {
      const response = await fetch("/backend_api/next_accessible_message", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          "room_id": roomId
        })
      });
      if (!response.ok) {
        throw new Error(response.status + ":" + response.statusText);
      }
      return await response.json();
    } catch (error) {
      setError(error.message);
      return [];
    }
  });

  return { requestNextMessage, error };
};