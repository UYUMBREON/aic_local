import StyledRoomConfigDisplay from "../components/Display/StyledRoomConfigDisplay"

/**
 * ルーム設定画面(閲覧者ユーザ用) \
 * ルーム設定画面では、閲覧者は実行者が作成したルームの一覧を見ることができ、加えてそのルームに入室することができる。
 * @function RoomConfigViewer
 * @returns {JSX.Element} ルーム設定画面のコンポーネント
 */
export default function RoomConfigViewer() {
  return <StyledRoomConfigDisplay chatRoomMode={"view"} />
}
