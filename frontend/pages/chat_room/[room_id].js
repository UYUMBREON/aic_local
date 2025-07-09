import { useRouter } from "next/router"
import StyledChatDisplay from "../../components/Display/StyledChatDisplay";

/**
 * チャット画面(閲覧者ユーザ/実行者ユーザ 共通) \
 * チャット画面では、閲覧者はそのルームの議論全体を閲覧することができる。 \
 * 議論は、それまでにパネリストが行った発言の履歴として表示される。 \
 * 加えて、実行者は議論と追加議論の開始・停止を行うことができる。
 * @function ChatRoom
 * @returns {JSX.Element} チャット画面のコンポーネント
 */
export default function ChatRoom() {
  // パスパラメータからルームID, クエリパラメータで編集可否フラグを取得
  const router = useRouter();
  const { room_id, chatRoomMode } = router.query;
  return (
     <StyledChatDisplay roomId={room_id} chatRoomMode={chatRoomMode} />
  );
}