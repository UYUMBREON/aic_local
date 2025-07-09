import React, { useState } from 'react';
import { Box, TextField, Button } from '@mui/material';
import DOMPurify from 'dompurify'

const backgroundColor = "#00002F";
const borderColor = "#ffffff";
const fontColor = "#ffffff";
const textFieldStyle = {
  '& .MuiInputBase-input': {
    color: '#ffffff',    // 入力文字の色
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
  },
  '& .Mui-disabled': {
    opacity: 0
  }
};
const buttonStyle = {
  borderColor: borderColor,
  width: "70px",
  backgroundColor: backgroundColor,
  color: fontColor
};

/**
 * テキスト入力ボックスのプロパティの型
 * @typedef {Object} StyledChatMessageInputBoxProps
 * @property {number} roomId - ルームID
 * @property {boolean} isTechEnabled - 革アG技術フラグ。革アG技術を使用するか。
 * @property {function} onSendMessage - Sendボタン押下時処理
 * @property {boolean} disabled - 活性状態フラグ
 */

/**
 * テキスト入力ボックス \
 * テキスト入力フォームとSendボタンを表示する。 \
 * ユーザはテキストを入力し、それをSendボタン押下によってサーバに送信することができる。
 * @function StyledChatMessageInputBox
 * @param {StyledChatMessageInputBoxProps} props - プロパティ 
 * @returns {JSX.Element} テキスト入力ボックスのコンポーネント
 */
export default function StyledChatMessageInputBox({
  roomId,
  isTechEnabled,
  onSendMessage,
  disabled
}) {
  const [message, setMessage] = useState('');

  /* 送信ボタンが押されたときの動作 */
  const handleSendMessage = () => {
    if (message.trim()) {
      const msgJsonText = JSON.stringify({
        'type': 'message',
        'user_name': '司会者',
        'msg_text': DOMPurify.sanitize(message),  // メッセージをサニタイズして設定
        'room_id': roomId,
        'tech_enable': isTechEnabled,
      });
      onSendMessage(msgJsonText);   // メッセージ送信
      setMessage('');               // 入力フィールドをクリア
    }
  };

  /* 特殊なキーが押された場合の動作 */
  const handleKeyPress = (event) => {
    if (event.key === 'Enter') {
      if (disabled) {
        return;
      }
      handleSendMessage();    // エンターキーを押したときにメッセージ送信
    }
  };

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', backgroundColor: backgroundColor }}>
      {/* 入力フォーム */}
      <TextField
        fullWidth
        variant="outlined"
        placeholder="Type your message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={handleKeyPress}
        sx={{ marginRight: "15px", ...textFieldStyle }}
        disabled={disabled}
      />
      {/* Sendボタン */}
      <Button
        variant="outlined"
        onClick={handleSendMessage}
        disabled={disabled}
        sx={{ ...buttonStyle }}
      >
        Send
      </Button>
    </Box>
  );
}