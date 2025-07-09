import { Box } from "@mui/material";
import { useEffect, useState } from "react";
import StyledChatMessageInputBox from "../Chat/StyledChatMessageInputBox";
import StyledChatMessageViewer from "../Chat/StyledChatMessageViewer";
import StyledSettingAndPanelistContainer from "../SettingAndPanelist/StyledSettingAndPanelContainer";
import useWebSocket from "../../hooks/useWebSocket";
import useRequestNextMessage from "../../hooks/useRequestNextMessage";
import useSendAdditionalMessage from "../../hooks/useSendAdditionalMessage";
import { defaultDiscussionContext, DiscussionContext } from "../../contexts/DiscussionContext";
import { useRouter } from "next/router"

/**
 * タイマーID
 * @type {number|null}
 */
let timerId = null;

/**
 * チャット画面のプロパティの型
 * @typedef {Object} StyledChatDisplayProps
 * @property {number} roomId - ルームID
 * @property {chatRoomMode} - チャットルームモード。閲覧(view)か実行(exec)か。
 */

/**
 * チャット画面 \
 * (1)設定パネル (2)メッセージビューワー (3)テキスト入力ボックスを表示する。 
 * 
 * (1)設定パネル \
 * ユーザが実行者である場合は、設定パネルで議題や設定ファイルの設定を行い、議論を開始することができる。 \
 * ユーザが閲覧者である場合は、それらは変更することができない。 
 * 
 * (2)チャットメッセージビューワー \
 * 議論開始後、このコンポーネントはパネリストの発言をWebSocketを通じてメッセージとして受信する。 \
 * メッセージビューワーはそれらのメッセージを表示する。 
 * 
 * (3)テキスト入力ボックス \
 * 議論終了後、ユーザが実行者である場合は、テキスト入力ボックスを表示する(初期状態は非表示)。 \
 * 実行者はテキスト入力ボックスに新たな議題を入力し、議論を再開することができる。
 * @function StyledChatDisplay
 * @param {StyledChatDisplayProps} props - プロパティ
 * @returns {JSX.Element} チャット画面のコンポーネント
 */
export default function StyledChatDisplay({ roomId, chatRoomMode }) {
  // 議論コンテキスト
  const [context, setContext] = useState(defaultDiscussionContext)

  // メッセージ取得通信用、sendMessageは使用しない（別のAPIの利用が必要な設計のため）
  const [messages, sendMessage, closedEvent] = useWebSocket(`/backend_api/ws/chat?room_id=${roomId}&chat_room_mode=${chatRoomMode}&screen_name=chat`);

  // メッセージボックスの無効化状態
  const [isMessageBoxDisabled, setIsMessageBoxDisabled] = useState(true);

  // 次のメッセージ要求用関数
  const { requestNextMessage } = useRequestNextMessage();

  // メッセージポスト関数
  const { sendAdditionalMessage } = useSendAdditionalMessage();

  // ルーター
  const router = useRouter();

  // 革アG技術フラグ
  const [isTechEnabled, setIsTechEnabled] = useState(false);

  /* プロンプトの送信ボタンが押されたときの処理 */
  const handleSendAdditionalMessage = async (msg) => {
    // メッセージポスト
    sendAdditionalMessage(msg);
    /* 事後処理 */
    // 議論中フラグを立てる
    setContext({ ...context, isRunning: true });
    // メッセージ入力ボックスを無効化
    setIsMessageBoxDisabled(true);
    // 次のデータをリクエスト
    timerId = setInterval(() => requestNextMessage(roomId), 1000);  // 追加議論はキャッシュ非対応なので1000ミリ秒間隔
  };

  /* メッセージが更新されたときの処理 */
  useEffect(() => {
    /* 議論開始時にテキスト入力ボックスを非表示にする */
    if (messages.filter(msg_i => msg_i['type'] !== 'system_info').length === 0) {
      setIsMessageBoxDisabled(true);
    }

    /* メッセージが空のときは何もしない */
    if (messages.length === 0) return;

    /* 最後のメッセージがシステム情報システム情報の場合、終了 */
    if (messages[messages.length - 1]["type"] === "system_info") {
      if (messages[messages.length - 1]["msg_text"] === "議論終了") {
        clearInterval(timerId);
        timerId = null;
        setContext({ ...context, isRunning: false });  // 議論中フラグを下ろす
        if (messages.filter(msg_i => msg_i['type'] !== 'system_info').length === 0) return; // 停止時はメッセージ入力ボックスを有効化をスキップ
        setIsMessageBoxDisabled(false); // メッセージ入力ボックスを有効化
        return;
      }
    }

    /* 何らかのメッセージ受信時は議論中フラグを立てる */
    if (!context.isRunning) {
      setContext({ ...context, isRunning: true })
    }
  }, [messages]);

  /* Webソケット切断時の処理 */
  useEffect(() => {
    if (closedEvent != null && closedEvent.reason == "実行者重複") {
      alert("すでにこのルームには実行権限のあるユーザが入室しているため、入室できません。");
      router.push("/exec");
    }
  }, [closedEvent])

  /* ページ本体 */
  return (
    <DiscussionContext.Provider value={[context, setContext]}>
      {closedEvent != null && closedEvent.reason == "実行者重複" ? (
        <></>
      ):(
        <Box
          sx={{
            background: "#00002F",
            width: "100%",
            height: "auto",
            minHeight: "100vh",
          }}
        >
          {/* 設定とパネリスト */}
          <StyledSettingAndPanelistContainer
            messages={messages}
            roomId={roomId}
            chatRoomMode={chatRoomMode}
            autoRequestNextMessage={true}
            isTechEnabled={isTechEnabled}
            setIsTechEnabled={setIsTechEnabled}
          />

          {/* チャット画面 */}
          <Box sx={{ display: "flex", justifyContent: "center" }}>
            <StyledChatMessageViewer messages={messages} />
          </Box>

          {/* テキスト入力ボックス */}
          {isMessageBoxDisabled || chatRoomMode != "exec" ? (
            <></>
          ) : (
            <Box 
              sx={{
                alignItems: 'center',
                marginLeft: 8,
                marginTop: 3,
                marginRight: 8,
              }}
            >
              <StyledChatMessageInputBox
                roomId={roomId}
                isTechEnabled={isTechEnabled}
                onSendMessage={handleSendAdditionalMessage}
                disabled={isMessageBoxDisabled || context.isRunning}
              />
            </Box>
          )}
        </Box>
      )}
    </DiscussionContext.Provider>
  );
}
