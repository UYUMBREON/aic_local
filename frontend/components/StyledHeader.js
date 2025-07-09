import { AppBar, Box, CircularProgress, Toolbar, Typography } from "@mui/material";
import useRooms from "../hooks/useRooms";
import { useState, useEffect } from "react";

/**
 * ヘッダーに表示する文字列を生成する関数
 * @function createHeaderString
 * @param {boolean} isToEnglish - 英語化フラグ
 * @param {Object} param - 表示する任意の値
 * @returns {string} 表示文字列
 */
function createHeaderString(isToEnglish, param) {
  if (isToEnglish) {
    return param == null ? `AI Constellation` : `AI Constellation : ${param}`;
  } else {
    return param == null ? `AIコンステレーション` : `AIコンステレーション : ${param}`;
  }
}

/**
 * 共通ヘッダーのプロパティの型
 * @typedef {Object} StyledHeaderProps
 * @property {number} roomId - ルームID
 * @property {Object[]} messages - メッセージリスト
 * @property {isToEnglish} [isToEnglish=false] - 英語化フラグ
 */

/**
 * 共通ヘッダー \
 * ルームIDが与えられた場合は、ヘッダーにルーム名を表示する。 \
 * また、議論が進行中の場合は、インジケーターを表示する。
 * @function StyledHeader
 * @param {StyledHeaderProps} props - プロパティ
 * @returns {JSX.Element} 共通ヘッダーのコンポーネント
 */
export default function StyledHeader({ roomId, messages, isToEnglish = false }) {
    // ルーム一覧取得用関数
    const { rooms, getRooms } = useRooms();
    // ヘッダーに表示する文字列
    const [headerString, setHeaderString] = useState(null);

    // 初回表示されたときの処理
    useEffect(() => {
      if (roomId == null) {
        const newHeaderString = createHeaderString(isToEnglish, null);
        setHeaderString(newHeaderString);
      } else {
        // ルーム一覧を取得してヘッダー文字列を更新
        getRooms().then((rooms) => {
          const room = rooms.find(r => r.roomId == roomId);
          const newHeaderString = createHeaderString(isToEnglish, room?.roomName);
          setHeaderString(newHeaderString);
        });
      }
    }, [roomId]);

    // 英語化フラグが変更された時の処理
    useEffect(() => {
      const room = rooms.find(r => r.roomId == roomId);
      const newHeaderString = createHeaderString(isToEnglish, room?.roomName);
      setHeaderString(newHeaderString);
    }, [isToEnglish]);

  return (
    <Box sx={{ flexGrow: 1, paddingTop: 0 }}>
      <AppBar position="static" sx={{ boxShadow: 'none', backgroundImage: "linear-gradient(90deg, rgba(1, 26, 93, 1), rgba(61, 68, 114, 1))", display: "flex", justifyContent: "space-between", flexDirection: "row" }}>
        <Toolbar>
          <Typography variant="h6" component="" sx={{ flexGrow: 1 }}>
            { headerString }
          </Typography>
        </Toolbar>
        {messages.length > 0 && (messages[messages.length - 1]['msg_text'] != '議論終了') && (
          <Box sx={{ display: 'flex', flexDirection: 'column', pr: 2, alignItems: 'center', justifyContent: "center" }}>
            <CircularProgress />
          </Box>
        )}
      </AppBar>
    </Box>
  );
}