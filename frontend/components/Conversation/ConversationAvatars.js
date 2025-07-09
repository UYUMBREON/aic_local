/** @jsxImportSource @emotion/react */
import { css, keyframes } from '@emotion/react';
import { Avatar, Box, Typography } from '@mui/material';
import SpeechBubble from './SpeechBubble'

/**
 * 筆記画面用アバター表示のプロパティの型
 * @typedef {Object} ConversationAvatars
 * @property {number} speakerIdx - 発声中のパネリストのインデックス
 * @property {boolean} speakingFlag - 発声中フラグ
 * @property {Object[]} avatarsConfig - パネリストのアバター設定
 */

/**
 * 筆記画面用アバター表示 \
 * 与えられたアバターの情報に基づき、議論に参加しているパネリストの情報を表示する。 \
 * パネリストの情報は、アバター画像とパネリスト名を表示する。 \
 * 発言中のパネリストについては、アバターを大きく表示し、また吹き出しを表示することで、強調して表現する。
 * @function ConversationAvatars
 * @param {ConversationAvatars} props - プロパティ 
 * @returns {JSX.Element} 筆記画面用アバター表示のコンポーネント
 */
export default function ConversationAvatars({ speakerIdx, speakingFlag, avatarsConfig }) {

  /* アバターをジャンプさせるためのCSS */
  const jumpAnimation = keyframes`
    0%, 100% {
      transform: translateY(0px); // 0%, 100%の時点でY軸に対して…pxの位置に移動するように設定
    }
    50% {
      transform: translateY(-20px); // 50%の時点でY軸に対して…pxの位置に移動するように設定
    }
  `;
  const jumpingStyle = css`
    animation: ${jumpAnimation} 0.5s ease-in-out infinite; // 0.5秒で1回アニメーションをするように設定
    z-index: 0; // アニメーションで上下する際に他のコンポーネントより下側に描画するように設定
    border: 3px solid #ff5555;  // 強調表示のためにボーダーを設定
  `;

  /* コンポーネント本体 */
  return (
    <Box sx={{ border: '0px solid', borderColor: 'grey.400', width: '75vw', height: '19vh', display: 'flex', justifyContent: 'center', alignItems: 'center', margin: 'auto' }}>
      {avatarsConfig.map((avatar, index) => (
        <Box key={index} display="flex" flexDirection="column" alignItems="center" sx={{width: '12vw'}}>
          {/* 吹き出し */}
          {(index===speakerIdx && speakingFlag) ? <Box sx={{ml:'auto', zIndex: 1}}><SpeechBubble/></Box> : null}
          {/* アバター */}
          <Avatar
            alt={avatar.name}
            src={avatar.image}
            sx={(index===speakerIdx && speakingFlag) ? {width: 120, height: 120} : { width: 100, height: 100}} // indexに応じてスタイル変更
            css={(index===speakerIdx && speakingFlag) ? jumpingStyle : null} // indexに応じてCSSでのジャンプ動作付与
          />
          {/* 名前 */}
          <Typography
            variant="body1"
            // fontWeight={(index===speakerIdx && speakingFlag) ? "bold" : "normal"}
            fontSize={(index===speakerIdx && speakingFlag) ? (avatar.name.length > 8 ? "20px" : "25px") : "20px"}
            sx={{zIndex: 1, color: "#ffffff"}}
          >
            {avatar.name}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}