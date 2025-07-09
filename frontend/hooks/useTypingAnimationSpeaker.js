import { useState, useEffect } from 'react';
import useTypingAnimationText from './useTypingAnimationText';

/**
 * 入力テキストセット関数の型
 * @callback SetInputText
 * @param {string} inputText - 入力テキスト
 * @returns {void}
 */

/**
 * 発声読み上げ付きアニメーションテキスト提供フックの戻り値の型
 * @typedef {Object} UseTypingAnimationSpeakerResult
 * @property {string} internalText - 0 内部状態として持つテキスト
 * @property {SetInputText} setInputText - 1 入力テキストをセットする関数
 * @property {boolean} done - 2 描画 & 発声終了フラグ
 */

/**
 * 発声付きアニメーションテキスト提供フック \
 * 筆記画面においてアニメーション表示されるテキストを発声(音声による読み上げ)付きで提供する。 \
 * useTypingAnimationTextをラップしたものであり、入力値をセットする関数や完了フラグも提供する。
 * @function useTypingAnimationSpeaker
 * @returns {UseTypingAnimationSpeakerResult}
 */
export default function useTypingAnimationSpeaker(){
  const [ internalText, setInternalText, typingDone ] = useTypingAnimationText(); // 内部状態として持つテキスト
  const [ speakingDone, setSpeakingDone ] = useState(true); // 発声終了フラグ
  const [ done, setDone ] = useState(true);                 // タイピング & 発声の終了フラグ

  /* 発声とタイピングを実行する関数 */
  const setInputText = (inputText, pitch, voiceID) => {

    /* テキストが空の場合、初期化処理 */
    if (inputText === '') {
      setInternalText(inputText); // テキストを初期化
      setSpeakingDone(false);     // ここで発話中になるが、すぐさまエフェクトで回収され、発話終了になる。
      return;
    }

    /* テキストが空でない場合、音声発話＆テキストタイピング描画 */
    const speakText = async () => {
      const uttr = new SpeechSynthesisUtterance(); // 音声合成用モジュール
      setSpeakingDone(false);
      uttr.text = inputText.replace(/<\/?[^>]+(>|$)/g, ""); // タグを削除したテキストを設定
      uttr.rate = 5.0;
      uttr.pitch = pitch;
      uttr.voice = window.speechSynthesis.getVoices()[voiceID];
      await new Promise(function(resolve) {
        uttr.onend = resolve;
        window.speechSynthesis.speak(uttr);
        setSpeakingDone(true);
      });
    };
    speakText();                // テキストを発話
    setInternalText(inputText); // テキストを描画
  };

  /* 終了フラグ用エフェクト（タイピング or 発声のいずれかの終了フラグが変更されたときに実行） */
  useEffect(() => {
    setDone((typingDone && speakingDone));
  }, [typingDone, speakingDone]);

  /* 終了フラグ用エフェクト（空文字が設定されたときに即座に終了するためのエフェクト） */
  useEffect(() => {
    if (internalText === '' && !speakingDone) setSpeakingDone(true);
  }, [internalText, speakingDone]);

  return [ internalText, setInputText, done ];
};
