import { useCallback, useState } from 'react';

/**
 * 議論開始関数の型
 * @callback StartDiscussion
 * @param {number} roomId - ルームID
 * @param {number} agendaId - 議題ID
 * @param {string} agendaText - 議題テキスト。選択入力の時は選択されている議題アイテムのテキスト。自由入力の時はユーザ入力値。
 * @param {number} configId - 設定ファイルID
 * @param {string} configFile - 設定ファイルのラベル
 * @param {string} lang - 言語。日本語(ja)か英語(en)か。
 * @param {boolean} techEnable - 革アG技術フラグ。革アG技術を使用するか。
 * @param {boolean} isSelectAgenda - 議題入力方式フラグ。選択入力であるか。
 * @returns {Object} 実行結果。キャッシュで実行しているか等の情報を含む。
 */

/**
 * 議論開始フックの戻り値の型
 * @typedef {Object} UseStartDiscussionResult
 * @property {StartDiscussion} startDiscussion - 議論開始関数
 * @property {string} error - リクエスト時のエラー
 */

/**
 * 議論開始フック \
 * 議論開始関数を提供する。 \
 * 議論開始関数は、指定したルームにおいて議論の開始をサーバに要求する。 \
 * 多くの引数を要するのは、実行者の状態を閲覧者に伝えるため。
 * @function useStartDiscussion
 * @returns {UseStartDiscussionResult}
 */
export default function useStartDiscussion() {
  // エラー用変数
  const [error, setError] = useState(null);

  // 初回メッセージポスト関数
  const startDiscussion = useCallback(async (roomId, agendaId, agendaText, configId, configFile, lang, techEnable, isSelectAgenda) => {
    setError(null);
    try {
      /* データ作成 */
      const msgJsonText = JSON.stringify({
        room_id: roomId,
        agenda_id: agendaId,
        agenda_text: agendaText,
        config_id: configId,
        config_file: configFile,
        lang: lang,
        tech_enable: techEnable,
        is_select_agenda: isSelectAgenda,
      });

      /* メッセージをポスト（非同期処理） */
      const response = await fetch("/backend_api/new_discussion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: msgJsonText,
      });

      if (!response.ok) {
        throw new Error(response.status + ":" + response.statusText);
      }
      return await response.json()
    } catch (error) {
      setError(error.message);
      return null
    }
  });

  return { startDiscussion, error };
};
