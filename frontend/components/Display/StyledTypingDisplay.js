import { DiscussionContext, defaultDiscussionContext } from "../../contexts/DiscussionContext";
import StyledChatMessageInputBox from "../Chat/StyledChatMessageInputBox";
import ConversationAvatars from "../Conversation/ConversationAvatars";
import ConversationTextViewer from "../Conversation/ConversationTextViewer";
import useTypingAnimationSpeaker from "../../hooks/useTypingAnimationSpeaker";
import useRequestNextMessage from "../../hooks/useRequestNextMessage";
import useSendAdditionalMessage from "../../hooks/useSendAdditionalMessage";
import { useState, useEffect } from "react";
import { Box, Button, FormControlLabel, Switch } from "@mui/material";
import useWebSocket from "../../hooks/useWebSocket";
import { useRouter } from "next/router";
import StyledSettingAndPanelistContainer from "../SettingAndPanelist/StyledSettingAndPanelContainer";

const buttonStyle = {
  borderColor: "#ffffff",
  marginLeft: "15px",
  marginRight: "15px",
  width: "70px",
  backgroundColor: "#00002f",
  color: "#ffffff",
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
 * 筆記画面のプロパティの型
 * @typedef {Object} StyledTypingDisplayProps
 * @property {number} roomId - ルームID
 */

/**
 * 筆記画面 \
 * (1)筆記テキストビューワー (2)Nextボタン (3)テキスト入力ボックスを表示する。 
 * 
 * (1)筆記テキストビューワー \
 * パネリストの発言を1件ずつ表示する。
 * 
 * (2)Nextボタン \
 * ユーザは、Nextボタンを押下することで、現在表示されているメッセージの次のメッセージをサーバに要求することができる。
 * 
 * (3)テキスト入力ボックス \
 * 実行者は表示されている発言に対してメッセージを入力し、送信することができる。 \
 * これにより、ユーザはサーバで行われている議論に介入することができる。 \
 * また、革アGトグルを切り替えることで、介入処理に革アG技術を使うか切り替えることができる。
 * @function StyledTypingDisplay
 * @param {StyledTypingDisplayProps} props - プロパティ
 * @returns {JSX.Element} 筆記画面のコンポーネント
 */
export default function StyledTypingDisplay({roomId}) {
  /* 必要な変数の定義 */
  const [context, setContext] = useState(defaultDiscussionContext);  // 議論コンテキスト

  // NOTE: 筆記画面は基本メッセージ受信をWebソケットで行わないが、チャット画面を含めた実行者ユーザの排他制御のためにWebソケットを繋ぐ
  const [wsMessages,, closedEvent] = useWebSocket(`/backend_api/ws/chat?room_id=${roomId}&chat_room_mode=exec&screen_name=typing`);  // Webソケット
  const [isFirstWebSocket, setIsFirstWebSocket] = useState(true);  // 初めてWebソケットを受信したかのフラグ
  const router = useRouter();  // ルーター

  const [isMessageBoxDisabled, setIsMessageBoxDisabled] = useState(true);  // メッセージボックスの無効化状態
  const [isNextDisabled, setIsNextDisabled] = useState(true);              // Nextボタンの無効化状態
  const [isTechEnabled, setIsTechEnabled] = useState(true);                // 革アG技術の利用の有無

  const [avatarsConfig, setAvatarsConfig] = useState([]);     // アバターの設定
  const [conversationText, setConversationText, animationDone] = useTypingAnimationSpeaker();  // タイピング & 音声再生をするためのフック
  const [texts, setTexts] = useState([]);                     // 読み上げる文章のリスト
  const [speakingTextIdx, setSpeakingTextIdx] = useState(0);  // 現在、textsの中でどの文章を発話中かを指定するためのインデックス
  const [speakingFlag, setSpeakingFlag] = useState(false);    // 現在、発話中かを監視するためのフラグ
  const [speakerIdx, setSpeakerIdx] = useState(0);            // 現在の話者を指定するためのインデックス
  
  const [messages, setMessages] = useState([]);  // メッセージ
  const {requestNextMessage} = useRequestNextMessage();  // 次のメッセージ要求関数
  const {sendAdditionalMessage} = useSendAdditionalMessage();  // メッセージポスト関数


  /* 次のメッセージの取得・格納 */
  const fetchNextMessage = async () => {
    if (!speakingFlag) {
      // NEXTボタン無効化
      setIsNextDisabled(true);
      // 次のメッセージ要求
      const newMessages = await requestNextMessage(roomId);
      // メッセージセット
      setMessages(newMessages);
    }
  }

  /* NEXTボタン押下時処理 */
  const handleNextButtonClicked = async () => {
    await fetchNextMessage();
  };

  /* テキスト入力ボックス押下時処理 */
  const handleSendButtonClicked = async (msg) => {
    // メッセージポスト
    sendAdditionalMessage(msg);
    // 議論中フラグを立てる
    setContext({ ...context, isRunning: true });
    // テキスト入力ボックスを無効化
    setIsMessageBoxDisabled(true);
    // 次のメッセージ要求
    const _ = setTimeout(() => fetchNextMessage(), 1000)
  };

  /* Webソケットメッセージ受信時の処理 */
  useEffect(() => {
    // Webソケットメッセージを初めて受信した場合(つまり、画面にアクセスした時 or 議論開始直後)
    // すでにメッセージが存在していれば、1件目のメッセージをセットする(以降のuseEffectの処理が走る)
    if (isFirstWebSocket && wsMessages.length > 0) {
      setIsFirstWebSocket(false);
      setMessages([wsMessages[0]]);
    }
  }, [wsMessages, isFirstWebSocket]);

  /* メッセージ受信時処理 */
  useEffect(() => {
    /* メッセージが空である場合の処理 */
    if (messages.length === 0) {
      // 何もしない
      return;
    }

    /* 最初のメッセージが議論開始メッセージであり、パネリスト構成未設定の場合の処理 */
    if (messages[0]["type"] === "system_info" 
      && messages[0]["msg_text"] === "議論開始"
      && avatarsConfig.length === 0
    ) {
      // パネリスト構成を抽出し、セット
      const participantsConfig = messages[0]["handover_datum"]["participants_config"];
      setAvatarsConfig(participantsConfig);
      // NEXTボタンを有効化
      setIsNextDisabled(false);
      return;
    }

    /* 最後のメッセージが議論終了メッセージである場合の処理 */
    if (messages[messages.length - 1]["type"] === "system_info" && messages[messages.length - 1]["msg_text"] === "議論終了") {
      // テキスト入力ボックスを有効化
      setIsMessageBoxDisabled(false);
      return;
    }

    /* テキスト再生設定 */
    const lastMessage = messages[messages.length - 1];  // 一番最後のメッセージを取得
    if (lastMessage['type'] !== 'message') {            // 通常のメッセージ以外の場合はテキスト再生設定をスキップ
      const timerId = setTimeout(() => fetchNextMessage(), 1000);
      return () => clearTimeout(timerId);
    }
    const texts0 = lastMessage['msg_text'].split(/(?<=[。])/);  // テキストを「。」で分割
    const speakingTextIdx0 = -1;                                // 現在読んでいるテキストの位置を設定（再生の最初が0になるように-1でセット）
    const participantsConfig = messages[0]["handover_datum"]["participants_config"];
    const speakerIdx0 = participantsConfig.findIndex(item => item.name === lastMessage['user_name']);

    setTexts(texts0);                      // 発言するテキストの配列を設定
    setSpeakingTextIdx(speakingTextIdx0);  // 発言するテキストの位置を設定
    setSpeakingFlag(true);                 // 発言中フラグを立てる
    setSpeakerIdx(speakerIdx0);            // 発言者を設定
    setConversationText('', 0, 0);         // 初期化 → この完了により、下のエフェクトにより再生スタート
  }, [messages]);

  /* 登録されているテキストを順番に発言するためのエフェクト */
  useEffect(() => {
    if (!texts) return;                                // テキストの配列がまだ無いときは何もしない
    if (!animationDone) return;                        // アニメーションが開始した際は何もしない
    if (speakingTextIdx + 1 >= texts.length){
      setSpeakingFlag(false);                          // 発言中フラグを解除
      setIsNextDisabled(false);                        // Nextボタンを有効化
      return;                                          // 次のテキストが無いので終了
    }
    const nextSpeakingTextIdx = speakingTextIdx + 1;   // 次に発言するテキストの位置
    setSpeakingTextIdx(nextSpeakingTextIdx);           // 発言するテキストの位置を設定

    /* 少し待ってから次の文章を読み始める */
    const timerId = setTimeout(() => {
      setConversationText(texts[nextSpeakingTextIdx], avatarsConfig[speakerIdx]['voice_pitch'], avatarsConfig[speakerIdx]['voice_id']);  // 発言の内容を設定して動作開始（setが間に合わない可能性があるのでconstで定義した変数を利用）
    }, 500);
    return () => clearTimeout(timerId); // アンマウント時にタイマーをクリア
  }, [animationDone]);

  /* Webソケット切断時の処理 */
  useEffect(() => {
    if (closedEvent != null && closedEvent.reason == "実行者重複") {
      alert("すでにこのルームには実行権限のあるユーザが入室しているため、入室できません。");
      router.push("/exec")
    }
  }, [closedEvent]);

  return (
    <DiscussionContext.Provider value={[context, setContext]}>
      {closedEvent != null && closedEvent.reason == "実行者重複"? (
        <></>
      ): (
        <Box
          sx={{
            backgroundColor: "#00002f",
            width: "100%",
            height: "auto",
            minHeight: "100vh"
          }}
        >
          {/* 議論開始前後で表示を切り替える */}
          {wsMessages.length === 0 ? (
            <>
              {/* 設定とパネリスト */}
              <StyledSettingAndPanelistContainer
                roomId={roomId}
                messages={messages}
                chatRoomMode="exec"
                autoRequestNextMessage={false}
                isTechEnabled={isTechEnabled}
                setIsTechEnabled={setIsTechEnabled}
              />
            </>
          ) : (
            <>
              {/* 会話の描画画面 */}
              <ConversationTextViewer text={conversationText} speakerIdx={speakerIdx} avatarsConfig={avatarsConfig}></ConversationTextViewer>
              <ConversationAvatars speakerIdx={speakerIdx} speakingFlag={speakingFlag} avatarsConfig={avatarsConfig}></ConversationAvatars>

              {/* 入力ボタンなど */}
              <Box sx={{ display: 'flex', alignItems: 'center', width: '90vw', margin: "0 auto" }}>
                {/* テキスト入力ボックス */}
                <Box sx={{ flexGrow: 1 }}>
                  <StyledChatMessageInputBox
                    roomId={roomId}
                    isTechEnabled={isTechEnabled}
                    onSendMessage={handleSendButtonClicked}
                    disabled={isMessageBoxDisabled}
                  />
                </Box>
                {/* NEXTボタン */}
                <Button 
                  variant="outlined"
                  onClick={handleNextButtonClicked}
                  disabled={isNextDisabled}
                  sx={{ ...buttonStyle, marginRight: 3 }}
                >
                  NEXT
                </Button>
                {/* Tech（革アG技術の利用）トグル */}
                <FormControlLabel 
                  control={
                    <Switch
                      checked={isTechEnabled}
                      onChange={e => {setIsTechEnabled(e.target.checked)}}
                      sx={{ ...switchStyle }}
                    />
                  }
                  label="Tech"
                  sx={{color: "#ffffff"}}
                />
              </Box>
            </>
          )}
        </Box>
      )}
    </DiscussionContext.Provider>
  )
} 