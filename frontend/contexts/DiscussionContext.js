import { createContext } from "react";

/**
 * 議論コンテキストの型
 * @typedef {Object} DiscussionContext
 * @property {boolean} isRunning - 議論中フラグ。議論の実行中か。
 * @property {boolean} existCache - キャッシュフラグ。キャッシュで実行しているか。
 */

/**
 * 議論コンテキスト初期設定
 * @type {DiscussionContext}
 */
export const defaultDiscussionContext = {
  isRunning: false,
  existCache: false,
};

/**
 * 議論コンテキスト \
 * 複数のコンポーネントで共有する必要がある議論の状態を含む。 \
 * 議論中フラグは、開始/停止ボタンの活性状態の制御やメッセージの定期的な要求処理(インターバル)で利用されている。 \
 * キャッシュフラグは、開始ボタン押下時の処理やインターバル時間の制御で利用されている。
 * @type {React.Context<DiscussionContext>}
 */
export const DiscussionContext = createContext(defaultDiscussionContext);
