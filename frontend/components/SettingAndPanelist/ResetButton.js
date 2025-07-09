import { Box, Button } from '@mui/material';
import React, { useContext } from 'react';
import useStopDiscussion from '../../hooks/useStopDiscussion';
import { DiscussionContext } from '../../contexts/DiscussionContext';

/**
 * リセットボタンのプロパティの型
 * @typedef {Object} ResetButtonProps
 * @property {number} roomId - ルームID
 * @property {Objbect} [buttonStyle={}] - ボタンのスタイル
 * @property {boolean} [isToEnglish=false] - 英語化フラグ
 * @property {boolean} [disabled=false] - 活性状態フラグ
 */

/**
 * リセットボタン(停止ボタン) \
 * 議論を停止する。 \
 * 議論を実行していない時は、非活性状態になる。
 * @function ResetButton
 * @param {ResetButtonProps} props - プロパティ
 * @returns {JSX.Element} リセットボタンのコンポーネント
 */
export default function ResetButton({ roomId, buttonStyle = {}, isToEnglish = false, disabled = false }) {
  // 議論コンテキスト
  const [context, setContext] = useContext(DiscussionContext);
  // 議論停止用関数
  const { stopDiscussion } = useStopDiscussion();
  // ボタン押下時処理
  const handleStopDiscussion = () => {
    stopDiscussion(roomId);
    setContext({ ...context, isRunning: false });  // 議論中フラグを下ろす
  }
  return <Box>
    <Button
      variant='outlined'
      onClick={handleStopDiscussion}
      disabled={disabled || !context.isRunning}
      sx={{...buttonStyle, mr: 0}}
    >
      {isToEnglish ? 'STOP' : '停止'}
    </Button>
  </Box>
};
