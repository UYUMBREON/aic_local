/** @jsxImportSource @emotion/react */
import React, { useEffect, useRef } from 'react';
import { css } from '@emotion/react';
import { Box, List, ListItem, ListItemText, ListItemAvatar, Typography, Divider, alpha } from '@mui/material'
import DOMPurify from 'dompurify'
import StyledPanelistAvatar from '../SettingAndPanelist/StyledPanelistAvatar';
import StyledInterventionMessage from './StyledInterventionMessage';

const boxStyle = {
  borderStyle: 'solid',
  borderColor: "#ffffff",
  borderWidth: 1,
  borderRadius: 1
}

const listStyle = {
  bgcolor: '#00144F',
  color: '#ffffff'
}

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
 * チャット画面用メッセージ表示のプロパティの型
 * @typedef {Object} StyledChatMessageViewerProps
 * @property {Object[]} messages - メッセージリスト
 */

/**
 * チャット画面用メッセージ表示(チャットメッセージビューワー) \
 * 与えられたメッセージのリストを一覧にして表示する。 \
 * メッセージごとに、パネリスト自身の情報(アバター画像・名前)と発言内容を表示する。
 * @function StyledChatMessageViewer
 * @param {StyledChatMessageViewerProps} props - プロパティ
 * @returns {JSX.Element} チャット画面用メッセージ表示のコンポーネント
 */
export default function StyledChatMessageViewer({ messages }) {
  const chatMessageEndRef = useRef(null); // 自動スクロールの位置を決めるための参照

  useEffect(() => {
    chatMessageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]); // メッセージが更新されるたびに，指定の位置に自動スクロール

  return (
    <Box
      sx={{
        width: '100%',
        maxHeight: '60vh',
        overflowY: 'auto',
        ml: 8, mr: 8,
        ...boxStyle
      }}
    >
      <List sx={messages.length === 0 || messages.filter(msg_i => msg_i['type'] !== 'system_info').length === 0 ? listStyle : { pt: 0, pb: 0, ...listStyle }}>
        {/* メッセージが無いもしくはSystemメッセージのみの場合はNo messages yetを表示 */}
        {messages.length === 0 || messages.filter(msg_i => msg_i['type'] !== 'system_info').length === 0 ? (
          <ListItem alignItems='flex-start'>
            No messages yet...
          </ListItem>
        ) : (
          <>
            {messages.filter(msg_i => msg_i['type'] !== 'system_info').map((msg_i, index, list) => (
              <Box key={index}>
                {
                  (msg_i['type'] === 'opt_info')
                    ?
                    (list.length - 1 === index) ? <StyledInterventionMessage text={msg_i['msg_text']} /> : <></>
                    :
                    <ListItem key={index} alignItems='flex-start' sx={(msg_i['user_name'] === 'ユーザ' || msg_i['user_name'] === 'User') ? { backgroundColor: alpha('#FFFFFF', 0.15) } : {}}>
                      {/* アバター */}
                      <ListItemAvatar sx={{ width: 120, display: 'flex', flexDirection: 'column', alignItems: 'center', mr: 3 }}>
                        <StyledPanelistAvatar alt={msg_i['user_name']} src={msg_i['user_img']} variant='square' sx={{ width: 100, height: 100 }} />
                        <Box>{msg_i['user_name']}</Box>
                      </ListItemAvatar>
                      {/* メッセージ */}
                      <ListItemText
                        primary={
                          <Typography variant='body2' color='#ffffff' sx={{ fontSize: '1.4rem', wordWrap: 'break-word', whiteSpace: 'pre-wrap' }}>
                            <span css={highlightClassStyle} dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(msg_i['msg_text']) }} />
                          </Typography>
                        }
                      />
                    </ListItem>
                }
                {(msg_i['user_name'] === 'ユーザ' || msg_i['user_name'] === 'User' || list.length - 1 === index) ? <></> : <Divider variant="inset" component="li" sx={{ marginLeft: 20, marginRight: "23px", borderColor: "#ffffff" }} />}
              </Box>
            ))}
          </>
        )}
        <div ref={chatMessageEndRef} />
      </List>
    </Box>
  );
}
