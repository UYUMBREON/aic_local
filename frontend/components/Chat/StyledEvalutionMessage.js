import { Box, Typography } from '@mui/material';

// 色
const BG_COLOR = "#B2BACE"
const BG_BORDER_COLOR = "#001A5C"
const EVALUTION_POINT_MARK_COLOR = "#00A0E9"

// 評価ポイントの表示用文字
const EVALUTION_POINT_MARK = '★'

// ダミーデータ
const tmpEvalutionMessage = {
  point1: {
    label: '多様性',
    value: 5
  },
  point2: {
    label: '正確性',
    value: 3
  },
  point3: {
    label: '一貫性',
    value: 1
  },
  reason: {
    label: '評価理由',
    value: '依頼者の信頼を勝ち取るためには、責任感と誠実な態度が求められます。'
  }
}

/** 評価ポイントを表示用文字に変換 */
function toStringEvalutionPoint(evalutionPointValue) {
  return EVALUTION_POINT_MARK.repeat(evalutionPointValue)
}

/** 議論評価メッセージの表示判定 */
function predicateIsVisible(evalutionMessage, isVisible){
  // 表示フラグが立っていない場合は非表示
  if (!isVisible) {
    return false
  }
  // 議論評価メッセージが存在していない場合は非表示
  if (evalutionMessage == null) {
    return false
  }
  // 表示
  return true
}

/**
 * 議論評価メッセージのプロパティの型
 * @typedef {Object} StyledEvalutionMessageProps
 * @property {Object} evalutionMessage - 議論評価メッセージ
 * @property {boolean} isVisible - 表示フラグ
 */

/**
 * 議論評価メッセージ \
 * 議論の評価メッセージを表示する。 \
 * 評価メッセージは、評価ポイントの点数や評価理由に分かれて表示される。
 * @function StyledEvalutionMessage
 * @param {StyledEvalutionMessageProps} props - プロパティ
 * @returns {JSX.Element} 議論評価メッセージのコンポーネント
 */
export default function StyledEvalutionMessage({ evalutionMessage, isVisible=false }) {
  // WARNING: 一旦、議論評価メッセージのダミーデータで表示できるようにしておく
  evalutionMessage = tmpEvalutionMessage;

  // 表示判定
  if (!predicateIsVisible(evalutionMessage, isVisible)) {
    return <></>  // 非表示の場合は空返却
  }

  return (
    <Box sx={{ display:'flex', alignItems:'center', background:BG_COLOR, borderRadius:'4px', padding:'5px' }}>
      {/* 表ヘッダー */}
      <Box sx={{ width:'10%', minWidth:'140px'}}>議論の評価結果</Box>
      {/* 表ボディ */}
      <Box sx={{ width:'90%', minWidth:'560px', borderLeft:`1px solid ${BG_BORDER_COLOR}`}}>
        {/* 評価ポイント表示部 */}
        <Box sx={{ padding:'5px', display:'flex', borderBottom:`1px solid ${BG_BORDER_COLOR}` }}>
          {/* 評価ポイント1 */}
          <Box sx={{ width:'180px', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>
            {evalutionMessage.point1.label}:
            <Typography variant="body1" component="span" style={{ color:EVALUTION_POINT_MARK_COLOR }}>
              {toStringEvalutionPoint(evalutionMessage.point1.value)}
            </Typography>
          </Box>
          {/* 評価ポイント2 */}
          <Box sx={{ width:'180px', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>
            {evalutionMessage.point2.label}:
            <Typography variant="body1" component="span" style={{ color:EVALUTION_POINT_MARK_COLOR }}>
              {toStringEvalutionPoint(evalutionMessage.point2.value)}
            </Typography>
          </Box>
          {/* 評価ポイント3 */}
          <Box sx={{ width:'180px', textOverflow:'ellipsis', overflow:'hidden', whiteSpace:'nowrap' }}>
            {evalutionMessage.point3.label}:
            <Typography variant="body1" component="span" style={{ color:EVALUTION_POINT_MARK_COLOR }}>
              {toStringEvalutionPoint(evalutionMessage.point3.value)}
            </Typography>
          </Box>
        </Box>
        {/* 評価理由表示部 */}
        <Box sx={{ padding:'5px' }}>
          <Box>{evalutionMessage.reason.label}:{evalutionMessage.reason.value}</Box>
        </Box>
      </Box>
    </Box>
  )

}
