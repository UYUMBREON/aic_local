import { useState, useEffect } from 'react';

/**
 * 入力テキストセット関数の型
 * @callback SetInputText
 * @param {string} inputText - 入力テキスト
 * @returns {void}
 */

/**
 * アニメーションテキスト提供フックの戻り値の型
 * @typedef {Object} UseTypingAnimationTextResult
 * @property {string} internalText - 0 内部状態として持つテキスト
 * @property {SetInputText} setInputText - 1 入力テキストをセットする関数
 * @property {boolean} done - 2 描画終了フラグ
 */

/**
 * アニメーションテキスト提供フック \
 * 筆記画面においてアニメーション表示されるテキストを提供する。 \
 * また、入力値をセットする関数や完了フラグも提供する。
 * @function useTypingAnimationText
 * @returns {UseTypingAnimationTextResult}
 */
export default function useTypingAnimationText(){
  /*
    入力テキストと内部状態として持っているテキストを区別することで
    useEffectを利用して入力テキストを監視し、変更時に内部テキストを変更する動作を実現している。
    これにより、レンダリングがうまくいく。
  */
  const [ internalText, setInternalText ] = useState(''); // 内部状態として持つテキスト
  const [ inputText, setInputText ] = useState('');       // 入力テキスト
  const [ done, setDone ] = useState(true);               // 描画終了フラグ

  useEffect(() => {

      /* テキストの初期化、後続のための設定 */
      if (inputText == '') {
        setInternalText('');                        // 空文字を設定をされた場合、内部テキストを空文字に
        return;
      }
      else if (internalText !== '') {
        if (inputText[0] !== '\n'){
          setInternalText(internalText + '\n');     // 内部テキストが既に存在し、入力先頭に改行が含まれていない場合、内部テキストに改行を入れて後ろに続ける
        }
      }

      /* 文字列描画のための初期化 */
      setDone(false);                               // 描画終了フラグをfalseに設定
      const charItr = inputText[Symbol.iterator](); // 入力テキストのイテレータを取得
      let timerId;                                  // 繰り返し実行のためのタイマー

      /* 再起を利用した繰り返し実行 */
      const showChar = () => {
        const nextChar = charItr.next();            // イテレータにより、次の文字を取得
        if (nextChar.done){
          setDone(true);                            // 次の文字がない場合、終了フラグを立てて終了
          return;
        }
        setInternalText(current => current + nextChar.value); // 次の文字を内部テキストに追加
        timerId = setTimeout(showChar, 120);        // 次の文字を描画するためにsetTimeoutを再度実行
      };
      showChar(); // 再起関数の実行

      /* 終了 */
      return () => clearTimeout(timerId);           // アンマウント時にタイマーを削除

    }, [inputText]); // 入力テキストが変更されたときに実行

  return [ internalText, setInputText, done ];
};
