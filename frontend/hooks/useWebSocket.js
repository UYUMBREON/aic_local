import { useEffect, useState } from 'react';

/**
 * メッセージ送信関数の型
 * @callback SendMessage
 * @param {Object} message - メッセージ
 * @returns {void}
 */

/**
 * Webソケット提供フックの戻り値の型
 * @typedef {Object} UseWebSocketResult
 * @property {Object[]} messages - 0 メッセージリスト
 * @property {SendMessage} sendMessage - 1 メッセージ送信関数
 * @property {Object} closeEventArg - 2 切断イベント時の引数
 */

/**
 * Webソケット提供フック \
 * Webソケットで取得したメッセージを提供する。 \
 * それらのメッセージは、このフックの中で状態管理されるので、呼び出し元はWebソケット受信によるメッセージの更新を気にしなくて済む。 \
 * その他、メッセージ送信用の関数と切断イベント時の引数を提供する。 \
 * ただし、メッセージ送信用の関数は使われない想定のものになっている。 \
 * 切断イベント時の引数は、複数の実行者が入室した際のエラー処理等で利用されている。
 * @function useWebSocket
 * @param {string} url - Webソケット接続先URL
 * @returns {UseWebSocketResult}
 */
export default function useWebSocket(url){
  const [ messages, setMessages ] = useState([]);
  const [ ws, setWs ] = useState(null);
  const [ closeEventArg, setCloseEventArg] = useState(null);

  /* ページ表示時に実行する処理を登録 */
  useEffect(() => {
    const socket = new WebSocket(url);
    setWs(socket);

    // 接続時に実行する動作を設定
    socket.onopen = () => {
      console.log("WebSocket connection opened");
    };

    // メッセージ受信時に実行する動作を設定
    socket.onmessage = (event) => {
      setMessages(JSON.parse(event.data));    // jsonにパースしたデータを格納
    };

    // エラー発生時に実行する動作を設定
    socket.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    // 切断時に実行する動作を設定
    socket.onclose = (event) => {
      setCloseEventArg(event);
    }

    // コンポーネントのアンマウント時に実行する動作を設定
    return () => socket.close();
  }, [url]);


  /* メッセージ送信時の処理 */
  const sendMessage = (message) => {
    if (ws) {
      ws.send(message);
    }
  };

  return [ messages, sendMessage, closeEventArg ];
};
