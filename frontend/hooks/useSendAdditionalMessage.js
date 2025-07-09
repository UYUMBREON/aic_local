import { useCallback, useState } from 'react';

/**
 * 議論追加用メッセージ送信関数の型
 * @callback SendAdditionalMessage
 * @returns {void}
 */

/**
 * 追加議論用メッセージ送信フックの戻り値の型
 * @typedef {Object} UseSendAdditionalMessageResult
 * @property {SendAdditionalMessage} sendAdditionalMessage - 議論追加用メッセージ送信関数
 * @property {any} error - リクエスト時のエラー
 */

/**
 * 追加議論用メッセージ送信フック \
 * 追加議論用メッセージ送信関数を提供する。 \
 * 追加議論用メッセージ送信関数は、指定したルームにおいて、すでに完了した議論を新しい議題で再開するようにサーバに要求する。
 * @function useSendAdditionalMessage
 * @returns {UseSendAdditionalMessageResult}
 */
export default function useSendAdditionalMessage() {
  // エラー用変数
  const [error, setError] = useState(null);

  // メッセージポスト関数
  const sendAdditionalMessage = useCallback(async (msg) => {
    setError(null);
    try {
      /* メッセージをポスト（非同期処理） */
      const response = fetch("/backend_api/additional_discussion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: msg,
      });

      if (!response.ok) {
        throw new Error(response.status + ":" + response.statusText);
      }

    } catch (error) {
      setError(error.message);
    }
  });

  return { sendAdditionalMessage, error };
};