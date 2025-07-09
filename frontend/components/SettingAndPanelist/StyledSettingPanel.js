import { Box, Button, FormControl, FormControlLabel, InputLabel, MenuItem, Select, Switch, TextField, Typography } from '@mui/material';
import ResetButton from './ResetButton';
import { useContext } from 'react';
import { DiscussionContext } from '../../contexts/DiscussionContext';

const backgroundColor = "#00002F";
const borderColor = "#ffffff";
const fontColor = "#ffffff";
const selectStyle = {
  color: fontColor,
  "& .MuiInputBase-input": {
    "&.Mui-disabled": {
      WebkitTextFillColor: fontColor,
      opacity: 0.6
    }
  },
  "& .MuiOutlinedInput-notchedOutline": {
    borderColor: borderColor,
  },
  "&:hover .MuiOutlinedInput-notchedOutline": {
    borderColor: borderColor,
  },
  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
    borderColor: borderColor,
    borderWidth: 1
  },
  '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
    borderColor: borderColor,
  },
  '.MuiSvgIcon-root': {
    fill: "#ffffff",
    "&.Mui-disabled": {
      opacity: 0
    }
  },
};
const inputLabelStyle = {
  color: fontColor,
  "&.Mui-focused": {
    color: fontColor
  }
};
const textFieldStyle = {
  '& .MuiInputBase-input': {
    color: '#ffffff',    // 入力文字の色
    '&.Mui-disabled': {
      WebkitTextFillColor: fontColor,
      opacity: 0.6
    },
  },
  input: {
    "&::placeholder": {
      opacity: 1
    }
  },
  '& label': {
    color: '#ffffff', // 通常時のラベル色 
  },
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#ffffff',    // 通常時のボーダー色(アウトライン)
    },
    '&:hover fieldset': {
      borderColor: '#ffffff',    // ホバー時のボーダー色(アウトライン)
    },
    '&.Mui-focused fieldset': {
      borderColor: '#ffffff',    // フォーカス時のボーダー色(アウトライン)
      borderWidth: 1
    },
    '&.Mui-disabled fieldset': {
      borderColor: '#ffffff',    // 非活性時のボーダー色(アウトライン)
      borderWidth: 1
    },
  },
};
const buttonStyle = {
  borderColor: borderColor,
  marginRight: "15px",
  width: "70px",
  backgroundColor: backgroundColor,
  color: fontColor,
  "&.Mui-disabled": {
    color: '#aaaaaa',  // disabled時のテキスト色
    borderColor: '#aaaaaa',  // disabled時のボーダー色
  }
};
const switchStyle = {
  ".MuiSwitch-track": {
    backgroundColor: "#ffffff",
  },
  ".MuiButtonBase-root.Mui-disabled + .MuiSwitch-track": {
    backgroundColor: "#ffffff",
    opacity: 0.5
  }
}

/**
 * 設定パネルのプロパティの型
 * @typedef {Object} StyledSettingPanelProps
 * @property {boolean} isToEnglish - 英語化フラグ
 * @property {boolean} isTechEnabled - 革アG技術フラグ
 * @property {boolean} isSelectAgenda - 議題選択フラグ
 * @property {Object[]} agendaList - 議題リスト
 * @property {Object[]} configList - 設定ファイルリスト
 * @property {string} agendaText - 議題テキスト
 * @property {number} agendaId - 議題ID
 * @property {number} configId - 設定ファイルID
 * @property {function(boolean):void} setIsToEnglish - 英語化フラグセット処理
 * @property {function(boolean):void} setIsTechEnabled - 革アG技術フラグセット処理
 * @property {function(string):void} setAgendaText - 議題テキストセット処理
 * @property {function(number):void} setAgendaId - 議題IDセット処理
 * @property {function(number):void} setConfigId - 設定ファイルIDセット処理
 * @property {function(Object):void} handleStartClick - Startボタン押下時処理
*/

/**
 * 設定パネル \
 * 議題や設定ファイルの入力フォーム、および、開始/停止ボタンを表示する。\
 * これらによって、ユーザは議論に使用する議題や設定ファイルを設定し、議論の開始/終了を制御することができる。
 * 
 * 議題の入力方式は自由入力と選択入力の2種類があり、ユーザはこれを切り替えることができる。 \
 * なお、設定ファイルの入力方式は、選択入力のみである。 \
 * これらの議題と設定ファイルは、ユーザが開始ボタン押下時にサーバに送信され、議論開始の主要なデータとなる。
 * 
 * また、議題や設定ファイルの他にも、ユーザは議論の言語設定や革アG技術の使用可否も切り替えることができる。 \
 * これらの状態もまた、ユーザが開始ボタンを押下時にサーバへ送信され、議論に反映される。
 * @function StyledSettingPanel
 * @param {StyledSettingPanelProps} props - プロパティ
 * @returns {JSX.Element} 設定パネルのコンポーネント
 */
export default function StyledSettingPanel({
  isToEnglish,
  isTechEnabled,
  isSelectAgenda,
  agendaList,
  configList,
  agendaText,
  agendaId,
  configId,
  roomId,
  setIsSelectAgenda,
  setIsToEnglish,
  setIsTechEnabled,
  setAgendaText,
  setAgendaId,
  setConfigId,
  handleStartClick,
  chatRoomMode
}) {
  // 議論コンテキスト
  const [context,] = useContext(DiscussionContext);
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        marginBottom: 2,
        backgroundColor: backgroundColor,
        ml: 8, 
        mr: 8
      }}
    >
      {/* 入力フォーム */}
      <Box sx={{ marginRight: "15px", width: "50%", display: 'flex' }}>
        {/* 議題入力方式切り替えスイッチ */}
        <FormControlLabel
          label={
            <Typography sx={{ color: fontColor, width:'80px' }}>
              Free-input
            </Typography>
          }
          control={
            <Switch
              sx={{ ...switchStyle }}
              checked={!isSelectAgenda}
              onChange={(e) => setIsSelectAgenda(!e.target.checked)}
              disabled={chatRoomMode === "view"}
            />
          }
        />
        {/* 議題プルダウンメニュー/自由入力 */}
        {isSelectAgenda ? (
          <FormControl sx={{ width: "100%" }}>
            <InputLabel sx={{ ...inputLabelStyle }} id="config-select-label">
              {isToEnglish ? "Agenda" : "議題"}
            </InputLabel>
            <Select
              sx={{ ...selectStyle }}
              fullWidth
              labelId="config-select-label"
              id="config-select"
              value={agendaId}
              label={isToEnglish ? "Agenda" : "議題"}
              onChange={(e) => setAgendaId(e.target.value)}
              disabled={chatRoomMode === "view"}
            >
              {agendaList.map((item, index) => (
                <MenuItem value={item.id} key={index}>
                  {isToEnglish
                    ? "display" in item
                      ? item.display.en
                      : item.en
                    : "display" in item
                    ? item.display.ja
                    : item.ja}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : (
          <TextField
            variant="outlined"
            placeholder={isToEnglish ? "Agenda" : "議題"}
            value={agendaText}
            onChange={(e) => setAgendaText(e.target.value)}
            sx={{ width: "100%", ...textFieldStyle }}
            disabled={chatRoomMode === "view"}
          />
        )}
      </Box>
      {/* 設定ファイルプルダウンメニュー */}
      <Box sx={{ marginRight: 2, width: "30%", borderColor: borderColor }}>
        <FormControl sx={{ width: "100%" }}>
          <InputLabel sx={{ ...inputLabelStyle }} id="config-select-label">
            {isToEnglish ? "Configuration File" : "設定ファイル"}
          </InputLabel>
          <Select
            disabled={chatRoomMode === "view"}
            sx={{ ...selectStyle }}
            fullWidth
            labelId="config-select-label"
            id="config-select"
            value={configId}
            label={isToEnglish ? "Configuration File" : "設定ファイル"}
            onChange={(e) => setConfigId(e.target.value)}
          >
            {configList.map((item, index) => (
              <MenuItem
                sx={{ color: backgroundColor }}
                value={item.id}
                key={index}
              >
                {isToEnglish ? item.label.en : item.label.ja}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      <Box sx={{ display: "flex", flex: 1 }}>
        {/* 英語化トグル */}
        <Box sx={{ display: 'flex', flex: 1, justifyContent: 'center' }}>
          <FormControlLabel
            sx={{ justifyContent: "flex-end" }}
            control={
              <Switch
                sx={{ ...switchStyle }}
                checked={isToEnglish}
                onChange={(e) => setIsToEnglish(e.target.checked)}
                disabled={chatRoomMode === "view"}
              />
            }
            label={<Typography sx={{ color: fontColor }}>English</Typography>}
          />
          {/* 革アG技術トグル */}
          <FormControlLabel 
            control={
              <Switch
                checked={isTechEnabled}
                onChange={e => {setIsTechEnabled(e.target.checked)}}
                sx={{ ...switchStyle }}
                disabled={chatRoomMode === "view"}
              />
            }
            label={<Typography sx={{ color: fontColor }}>Tech</Typography>}
            sx={{color: "#ffffff"}}
          />
        </Box>
        {/* 開始ボタン・停止ボタン */}
        <Box sx={{ display: "flex", visibility: chatRoomMode === "exec" ? "visible" : "hidden" }}>
          <Button
            disabled={
              isSelectAgenda 
                ? (agendaId === "" || configId === "" || context.isRunning)
                : (agendaText === "" || configId === "" || context.isRunning)
            } // 議題と設定ファイルが選択されていない場合、議論中の場合はボタンを無効化
            variant="outlined"
            onClick={handleStartClick}
            sx={{ ...buttonStyle }}
          >
            {isToEnglish ? "Start" : "開始"}
          </Button>
          <ResetButton roomId={roomId} buttonStyle={buttonStyle} isToEnglish={isToEnglish}/>
        </Box>
      </Box>
    </Box>
  );
}
