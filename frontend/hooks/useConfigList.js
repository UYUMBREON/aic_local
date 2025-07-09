import { useCallback, useState } from 'react';

/**
 * 設定ファイルリスト取得関数の型
 * @callback GetConfigList
 * @returns {void}
 */

/**
 * 設定ファイルリスト取得フックの戻り値の型
 * @typedef {Object} UseConfigListResult
 * @property {Object[]} configList - 設定ファイルリスト
 * @property {GetConfigList} getConfigList - 設定ファイルリスト取得関数
 * @property {any} error - リクエスト時のエラー
 */

/**
 * 設定ファイルリスト取得フック \
 * 設定ファイルリストと設定ファイルリスト取得関数を提供する。 \
 * 設定ファイルリスト取得関数は、サーバが保持する設定ファイルをリストとして取得する。 \
 * その後、内部の状態変数にセットすることで、フックの呼び出し元に最新の設定ファイルリストを供給する。
 * @function useConfigList
 * @returns {UseConfigListResult}
 */
export default function useConfigList() {
  // 設定ファイル用の変数
  const [configList, setConfigList] = useState([]);
  // エラー用変数
  const [error, setError] = useState(null);

  // 設定ファイルリスト取得用コールバック関数
  const getConfigList = useCallback(async () => {
    setError(null);
    try {
      /* 設定ファイルリストの取得 */
      const response = await fetch(
        "/backend_api/system/config_list",
        {
          method: "GET",
        }
      );

      if (!response.ok) {
        throw new Error(response.status + ":" + response.statusText);
      }
      const result = await response.json();
      setConfigList(result);
    } catch (error) {
      setError(error.message);
    }
  });

  return { configList, getConfigList, error };
};