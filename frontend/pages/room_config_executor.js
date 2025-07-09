import StyledRoomConfigDisplay from "../components/Display/StyledRoomConfigDisplay"

/**
 * ルーム設定画面(実行者ユーザ用) \
 * ルーム設定画面では、実行者はルームを作成することができる。 \
 * 実行者は作成したルームを一覧で見ることができ、加えてそのルームに入室することができる。 \
 * また、作成したルームを削除することもできる。
 * @function RoomConfigExecutor
 * @returns {JSX.Element} ルーム設定画面のコンポーネント
 */
export default function RoomConfigExecutor() {
  return <StyledRoomConfigDisplay chatRoomMode={"exec"} />
}
