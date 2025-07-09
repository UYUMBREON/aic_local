import { useCallback, useState } from 'react';

/**
 * 議題リスト取得関数の型
 * @callback GetAgendaList
 * @returns {void}
 */

/**
 * 議題リスト取得フックの戻り値の型
 * @typedef {Object} UseAgendaListResult
 * @property {Object[]} agendaList - 議題リスト
 * @property {GetAgendaList} getAgendaList - 議題リスト取得関数
 * @property {any} error - リクエスト時のエラー
 */

/**
 * 議題リスト取得フック \
 * 議題リストと議題リスト取得関数を提供する。 \
 * 議題リスト取得関数は、サーバが保持するすべての議題をリストとして取得する。 \
 * その後、内部の状態変数にセットすることで、フックの呼び出し元に最新の議題リストを供給する。
 * @function useAgendaList
 * @returns {UseAgendaListResult}
 */
export default function useAgendaList() {
  // 議題リスト用変数
  const [agendaList, setAgendaList] = useState([]);
  // エラー用変数
  const [error, setError] = useState(null);

  // 議題取得用コールバック関数
  const getAgendaList = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(
        "/backend_api/system/agenda/" + "agenda-list.yml", {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error(response.status + ":" + response.statusText);
      }
      const result = await response.json();
      setAgendaList(result);
    } catch (error) {
      setError(error.message);
    }
  })

  return {agendaList, getAgendaList, error};
};