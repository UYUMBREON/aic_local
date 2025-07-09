import { Box } from "@mui/material";

const interventionStyle1 = {
  animation: "pulse .6s linear -0.4s infinite alternate",
}

const interventionStyle2 = {
  animation: "pulse .6s linear -0.2s infinite alternate"
}

const interventionStyle3 = {
  animation: "pulse .6s linear 0s infinite alternate"
}

/**
 * 介入中メッセージのプロパティの型
 * @typedef {Object} StyledInterventionMessageProps
 * @property {string} text - テキスト
 */

/**
 * 介入中メッセージ \
 * 議論戦略構成器が議論を実行している最中であることをアニメーションで示す。
 * @function StyledInterventionMessage
 * @param {StyledInterventionMessageProps} props - プロパティ 
 * @returns {JSX.Element} 介入中メッセージのコンポーネント
 */
export default function StyledInterventionMessage({ text }) {
  return (
    <>
      <style>
        {`@keyframes pulse {
          from {
            opacity: 1;
            transform: scale(1);
          }
          to {
            opacity: .0;
            transform: scale(.1);
          }
        }`}
      </style>

      <Box sx={{ display: "flex", justifyContent: "center", flexDirection: "row", backgroundColor: "transparent", fontSize: '1.4rem', py: '1em'}}>
        <Box sx={{ color: "#FEF200", ...interventionStyle1 }}>
          ▶
        </Box>
        <Box sx={{ color: "#FEF200", ...interventionStyle2 }}>
          ▶
        </Box>
        <Box sx={{ color: "#FEF200", ...interventionStyle3 }}>
          ▶
        </Box>
        <Box sx={{ color: "#FEF200", mx: '0.5em' }}>
          {text}
        </Box>
        <Box sx={{ color: "#FEF200", ...interventionStyle3 }}>
          ◀
        </Box>
        <Box sx={{ color: "#FEF200", ...interventionStyle2 }}>
          ◀
        </Box>
        <Box sx={{ color: "#FEF200", ...interventionStyle1 }}>
          ◀
        </Box>
      </Box>
    </>

  )
}