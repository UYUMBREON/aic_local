/** @jsxImportSource @emotion/react */
import { useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { Box, Typography } from '@mui/material';
import DOMPurify from 'dompurify'

const highlightClassStyle = css`
  .highlight1 {
    color: #ffd200;
  }
  .highlight2 {
    color: #00d006;
  }
  .highlight3 {
    color: #17c2ff;
  }
`;

/**
 * 筆記画面用のテキスト表示のプロパティの型
 * @typedef {Object} ConversationTextViewerProps
 * @property {string} text - テキスト
 * @property {number} speakerIdx - 発声中のパネリストのインデックス
 * @property {Object[]} avatarsConfig - パネリストのアバター設定
 */

/**
 * 筆記画面用のテキスト表示(筆記テキストビューワー) \
 * 与えられたテキストを表示する。 \
 * テキストはアニメーション付きで1文字ずつ表示し、音声で読み上げる。
 * @function ConversationTextViewer
 * @param {ConversationTextViewerProps} props - プロパティ
 * @returns {JSX.Element} チャット画面用のテキスト表示のコンポーネント
 */
export default function ConversationTextViewer({ text, speakerIdx, avatarsConfig }) {

  /* 自動スクロールのためのエフェクト */
  const textEndRef = useRef(null); // 自動スクロールの位置を決めるための参照
  useEffect(() => {
    textEndRef.current?.scrollIntoView({ behavior: 'smooth' }); // テキストが更新されるたびに，指定の位置に自動スクロール
  }, [text]);

  /* ディスプレイのフォント等の描画スタイル */
  const displayFontStyle = css`
    @font-face {
      font-family: 'CustomFont';
      src: url('/fonts/meiryob.ttc') format('truetype');
    }
    color: #ffffff;
    font-family: 'CustomFont', sans-serif;
    font-size: 44px;
    background-color: black;
    padding: 8px 24px;

    // NOTE: <b>タグはHTML的に推奨されてないが、ここでは利用している
    b {
      color: #FF0066; /* 文字色を赤に変更 */
      text-shadow: // 外枠の設定。-webkit-text-strokeを使用すると中肉まで削れるので影で設計
        2.5px 2.5px 0 white, // 右下
        -2.5px 2.5px 0 white, // 左下
        2.5px -2.5px 0 white, //右上
        -2.5px -2.5px 0 white, // 左上
        2.5px 0px 0 white,  // 右
        -2.5px 0px 0 white, // 左
        0px 2.5px 0 white,  // 下
        0px -2.5px 0 white; // 上
    }
  `;

  /* <xxx>...</xxx>の部分の色を変えるために、タグが途中までしかない場合に補完する関数 */
  // textには一文字ずつ文字が追加される。
  // 全文が「私は<xxx>ラーメン</xxx>が好き」だと、
  // textには「私は<xxx」「私は<xxx>ラーメ」のような文が入力される
  // このタグが微妙な状態を補完する関数
  const getTagCompletedText = (text) => {
    const openTag = "<b>";
    const closeTag = "</b>";


    /* 開きタグが不完全な場合、それを削除だけして返却 */
    const incompleteOpenTagRegex = /<[^>]*$/;
    if (incompleteOpenTagRegex.test(text)) {
      text = text.replace(incompleteOpenTagRegex, '');
      return text;
    }

    /* 開きタグはあるが、閉じタグがない場合に補完 */
    const openTagIndex = text.lastIndexOf(openTag);   // 文字列が無い場合は-1が返る
    const closeTagIndex = text.lastIndexOf(closeTag); // 文字列が無い場合は-1が返る
    if (openTagIndex !== -1 && closeTagIndex === -1) {

      // 閉じタグが不完全な場合、それを削除
      const incompleteCloseTagRegex = /<\/[^>]*$/;
      if (incompleteCloseTagRegex.test(text)) {
        text = text.replace(incompleteCloseTagRegex, '');
      }

      // 閉じタグを後ろにつけて返却
      text += closeTag;
      return text;
    }

    /* 補完する必要が無い場合、そのまま返す */
    return text;
  };

  /* コンポーネント本体 */
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <Typography
        css={displayFontStyle} // CSSによりフォント設定
        sx={{
          width: '90vw', height: '66vh', margin:'16px', borderRadius: '8px', whiteSpace: 'pre-line', wordWrap: 'break-word', overflowY: 'auto'
        }}
      >
        <span css={highlightClassStyle} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(getTagCompletedText(text))}} />
        <span ref={textEndRef} />
      </Typography>
    </Box>
  );
}