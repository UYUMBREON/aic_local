import { useRouter } from "next/router"
import StyledTypingDisplay from "../../components/Display/StyledTypingDisplay"

/**
 * 筆記画面 \
 * 筆記画面は、実行者のみが入ることができる画面で、閲覧者が入ることを想定していない。 \
 * 筆記画面では、実行者は現在行われている議論の発言を1つずつ閲覧することができる。 \
 * 発言内容は音声・アニメーション付きで表示される。 \
 * 実行者は表示されている発言に対してメッセージを送信し、議論に介入することができる。
 * @function TypingRoom
 * @returns {JSX.Element} 筆記画面のコンポーネント
 */
export default function TypingRoom() {
  // パスパラメータからルームID, クエリパラメータで編集可否フラグを取得
  const router = useRouter();
  const { room_id } = router.query;
  return (
    <StyledTypingDisplay roomId={room_id}/>
  );
}