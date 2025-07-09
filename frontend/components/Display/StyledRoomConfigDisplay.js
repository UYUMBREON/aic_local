import {
  Box,
  Button,
  TextField,
  TableContainer,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  Paper,
  Typography
} from "@mui/material";
import useRooms from "../../hooks/useRooms";
import { useState, useEffect } from "react";
import { useRouter } from "next/router"
import StyledHeader from "../StyledHeader";

const buttonStyle = {
  borderColor: "#ffffff",
  width: "70px",
  height: "40px",
  backgroundColor: "#ffffff",
  color: "#000000",
  "&.Mui-disabled": {
    color: '#aaaaaa',  // disabled時のテキスト色
    borderColor: '#aaaaaa',  // disabled時のボーダー色
  }
};

const buttonLongStyle = {
  ...buttonStyle,
  width: "150px"
}

const textFieldStyle = {
  marginRight: "10px",
  input: {
    color: '#ffffff',
    "&::placeholder": {
      opacity: 1
    }
  },
  '& label': {
    color: '#ffffff', // 通常時のラベル色 
  },
  '& label.Mui-focused': {
    color: '#ffffff', // フォーカス時のラベル色 
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
    }
  },
};

const textFieldErrorStyle = {  // エラー時のスタイル
  '& .MuiInputBase-input': {
    color: '#ff0000', // 入力文字の色
  },
  '& label': {
    color: '#ff0000', // 通常時のラベル色 
  },
  '& label.Mui-focused': {
    color: '#ff0000', // フォーカス時のラベル色 
  },
  '& .MuiOutlinedInput-root': {
    '& fieldset': {
      borderColor: '#ff0000',    // 通常時のボーダー色(アウトライン)
    },
    '&:hover fieldset': {
      borderColor: '#ff0000',    // ホバー時のボーダー色(アウトライン)
    },
    '&.Mui-focused fieldset': {
      borderColor: '#ff0000',    // フォーカス時のボーダー色(アウトライン)
    }
  },
  '& .MuiFormHelperText-root': {
    color: '#ff0000', // ヘルパーテキストの文字色
  },
}

/**
 * Date型を既定の形式に変換する関数
 * @function dateFormatter
 * @param {Date} date 日時
 * @returns {string} 文字列にフォーマットした日時
 */
function dateFormatter(date) {
  const yyyymmdd = new Intl.DateTimeFormat(
    "ja",
    {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }
  )

  return yyyymmdd.format(date);
}

/**
 * ルーム設定画面のプロパティの型
 * @typedef {Object} StyledRoomConfigDisplayProps
 * @property {string} chatRoomMode - チャットルームモード。閲覧(view)か実行(exec)か。
 */

/**
 * ルーム設定画面 \
 * (1)ルーム作成フォーム (2)ルーム一覧を表示する。 
 * 
 * (1)ルーム作成フォームは、ユーザが実行者の時のみ表示される。 \
 * 実行者は、ルーム作成フォームにルーム名を入力し、ルームを作成することができる。 
 * 
 * (2)ルーム一覧は、実行者が作成したルームが一覧表示される。 \
 * ルームごとに情報が表示されるのに加え、チャット画面閲覧ボタン・筆記画面閲覧ボタン・削除ボタンが表示される。 \
 * このうち、筆記画面閲覧ボタンと削除ボタンはユーザが実行者の時のみ表示される。
 * @function StyledRoomConfigDisplay
 * @param {StyledRoomConfigDisplayProps} props - プロパティ
 * @returns {JSX.Element} ルーム設定画面のコンポーネント
 */
export default function StyledRoomConfigDisplay({ chatRoomMode }) {
  // ルーム一覧・hooks
  const { rooms, getRooms, createRoom, deleteRoom } = useRooms();
  // ルーム名
  const [newRoomName, setNewRoomName] = useState('');
  const [isValidNewRoomName, setIsValidNewRoomName] = useState(true);
  // ルーター
  const router = useRouter();

  // 初回表示時イベント
  useEffect(() => {
    getRooms();
  }, [])

  // 新規ルーム名
  const handleChangeNewRoomName = (e) => {
    setNewRoomName(e.target.value);
    setIsValidNewRoomName(e.target.value.match(/^[a-zA-Z0-9!\"#$%&'()*+,\-./:;<=>?@[\\\]^_`{|}~ ]*$/));
  }

  // 新規ルーム作成ボタン押下時イベント
  const handleClickCreateButton = async () => {
    await createRoom({
      roomName: newRoomName
    })
    await getRooms();
  }

  // チャット画面閲覧ボタン押下時イベント
  const handleClickViewChatButton = (_, targetRoom) => {
    // 閲覧画面/実行画面に画面遷移
    router.push(`/chat_room/${targetRoom.roomId}?chatRoomMode=${chatRoomMode}`)
  }

  // 筆記画面閲覧ボタン押下時イベント
  const handleClickViewTypingButton = (_, targetRoom) => {
    // 閲覧画面/実行画面に画面遷移
    router.push(`/typing_room/${targetRoom.roomId}?chatRoomMode=${chatRoomMode}`)
  }

  // ルーム削除ボタン押下時イベント
  const handleClickRemoveButton = async (_, targetRoom) => {
    await deleteRoom(targetRoom.roomId)
    await getRooms();
  }

  return (
    <Box
      sx={{
        background: "#00002F",
        width: "100%",
        height: "auto",
        minHeight: "100vh",
      }}
    >
      {/* ヘッダー */}
      <StyledHeader messages={[]} />

      {/* ルーム作成フォーム */}
      {chatRoomMode === "exec" ? (
        <Box
          display="flex"
          sx={{ width: "90%", margin: "0 auto", marginTop: "10px" }}
        >
          <TextField
            variant="outlined"
            fullWidth
            size="small"
            label="ルーム名"
            value={newRoomName}
            onChange={handleChangeNewRoomName}
            sx={isValidNewRoomName ? textFieldStyle : {...textFieldStyle, ...textFieldErrorStyle}}
            helperText={isValidNewRoomName ? null : "ルーム名は半角英数記号で入力してください。"}
          />
          <Button
            variant="outlined"
            sx={buttonStyle}
            onClick={handleClickCreateButton}
            disabled={!newRoomName || !isValidNewRoomName}
          >
            <Typography>作成</Typography>
          </Button>
        </Box>
      ) : <></>}

      {/* ルーム一覧 */}
      <TableContainer component={Paper} sx={{ width: "90%", margin: "0 auto", marginTop: "10px", maxHeight: "70vh", border: '1px solid #ffffff' }}>
        {/* テーブルヘッダー */}
        <Table stickyHeader aria-label="Room list">
          <TableHead>
            <TableRow>
              <TableCell sx={{ color: "#ffffff", bgcolor: "#203864" }} align="center" width={"10%"}>
                <Typography>ルームID</Typography>
              </TableCell>
              <TableCell sx={{ color: "#ffffff", bgcolor: "#203864" }} align="center" width={"20%"}>
                <Typography>ルーム名</Typography>
              </TableCell>
              <TableCell sx={{ color: "#ffffff", bgcolor: "#203864" }} align="center" width={"50%"}>
                <Typography>作成日時</Typography>
              </TableCell>
              <TableCell sx={{ color: "#ffffff", bgcolor: "#203864" }} align="center" width={"20%"}></TableCell>
            </TableRow>
          </TableHead>
          {/* テーブルボディ */}
          <TableBody sx={{ bgcolor: "#2F5597" }}>
            {rooms.length == 0 ? (
              <TableRow>
                <TableCell colSpan={4} sx={{ color: "#ffffff" }}>
                  <Typography>表示するルームはありません</Typography>
                </TableCell>
              </TableRow>
            ) :
              // ルーム作成日の降順でソートして表示
              Object.values(rooms).sort((a, b) => b.createdAt - a.createdAt).map((room_i, index) => (
                <TableRow key={index}>
                  <TableCell sx={{ color: "#ffffff" }} align="center">
                    <Typography>{room_i.roomId}</Typography>
                  </TableCell>
                  <TableCell sx={{ color: "#ffffff" }} align="center">
                    <Typography>{room_i.roomName}</Typography>
                  </TableCell>
                  <TableCell sx={{ color: "#ffffff" }} align="center">
                    <Typography>{dateFormatter(room_i.createdAt)}</Typography>
                  </TableCell>
                  <TableCell sx={{ color: "#ffffff" }} align="center">
                    <Box
                      display={'flex'}
                    >
                      <Button
                        sx={{ ...buttonLongStyle }}
                        onClick={(e) => handleClickViewChatButton(e, room_i)}
                      >
                        <Typography>チャット画面閲覧</Typography>
                      </Button>
                      {chatRoomMode === "exec" ? (
                        <>
                          <Button
                            sx={{ ...buttonLongStyle, marginLeft: 1 }}
                            onClick={(e) => handleClickViewTypingButton(e, room_i)}
                          >
                            <Typography>筆記画面閲覧</Typography>
                          </Button>
                          <Button
                            sx={{ ...buttonStyle, marginLeft: 1 }}
                            onClick={(e) => handleClickRemoveButton(e, room_i)}
                          >
                            <Typography>削除</Typography>
                          </Button>
                        </>
                      ) : <></>}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  )
}
