import { useCallback, useState } from 'react';

/**
 * 議論停止関数の型
 * @callback StopDiscussion
 * @param {number} roomId - ルームID
 * @returns {void}
 */

/**
 * 議論停止フックの戻り値の型
 * @typedef {Object} UseStopDiscussionResult
 * @property {StopDiscussion} stopDiscussion - 議論停止関数
 * @property {any} error - リクエスト時のエラー
 */

/**
 * 議論停止フック \
 * 議論停止関数を提供する。 \
 * 議論停止関数は、指定したルームで進行中の議論の強制終了・メッセージリストの破棄をサーバに要求する。
 * @function useStopDiscussion
 * @returns {UseStopDiscussionResult}
 */
export default function useStopDiscussion() {
  // エラー用変数
  const [error, setError] = useState(null);

  // 議論停止用コールバック関数
  const stopDiscussion = useCallback(async (roomId) => {
    setError(null);
    try {
      const response = await fetch(
        '/backend_api/discussion_end', {
        method: 'POST',
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

    } catch (error) {
      setError(error.message);
    }
  })

  return { stopDiscussion, error };
};