import { Box } from "@mui/material";
import React, { useEffect, useState, useContext } from "react";
import StyledHeader from "../StyledHeader";
import StyledPanelistsDisplay from "./StyledPanelistsDisplay";
import StyledSettingPanel from "./StyledSettingPanel";
import useAgendaList from "../../hooks/useAgendaList";
import useRequestNextMessage from "../../hooks/useRequestNextMessage";
import useConfigList from "../../hooks/useConfigList";
import useStartDiscussion from "../../hooks/useStartDiscussion";
import { DiscussionContext } from "../../contexts/DiscussionContext";

const backgroundColor = "#00002F";

/**
 * タイマーID
 * @type {number|null}
 */
let timerId = null;

/**
 * 設定パネルとアバター表示のプロパティの型
 * @typedef {Object} StyledSettingAndPanelistContainerProps
 * @property {boolean} roomId - ルームID
 * @property {Object[]} messages - メッセージリスト
 * @property {string} chatRoomMode - チャットルームモード。閲覧(view)か実行(exec)か。
 * @property {bool} autoRequestNextMessage - 自動で次のメッセージ要求を実行するか。
 * @property {boolean} isTechEnabled - 革アG技術フラグ。革アG技術を使用するか。
 * @property {function(boolean):void} setIsTechEnabled - 革アG技術フラグセット処理
 */

/**
 * 設定パネルとアバター表示 \
 * 設定パネルとアバターの一覧を表示する。 \
 * アバターの一覧は、設定パネルで選択されている設定ファイル内のパネリスト情報に基づいて表示される。
 * 
 * なお、このコンポーネントは設定パネルの状態管理やイベント処理の制御まで担う。 \
 * ユーザが設定パネルから議論を開始した後、このコンポーネントはインターバルによって次のメッセージを要求するようになる。
 * @function StyledSettingAndPanelistContainer
 * @param {StyledSettingAndPanelistContainerProps} props - プロパティ 
 * @returns {JSX.Element} 設定パネルとアバター表示のコンポーネント
 */
export default function StyledSettingAndPanelistContainer({
  roomId,
  messages,
  chatRoomMode,
  autoRequestNextMessage,
  isTechEnabled,
  setIsTechEnabled
}) {
  // 議論コンテキスト
  const [context, setContext] = useContext(DiscussionContext)

  // 英語化フラグ
  const [isToEnglish, setIsToEnglish] = useState(false);

  // 議題選択フラグ
  const [isSelectAgenda, setIsSelectAgenda] = useState(true);

  // 議題用の変数
  const { agendaList, getAgendaList } = useAgendaList();
  const [agendaId, setAgendaId] = useState("");
  const [agendaText, setAgendaText] = useState("");

  // 設定ファイル用の変数
  const { configList, getConfigList } = useConfigList();
  const [configId, setConfigId] = useState("");

  // 初回メッセージポスト用関数
  const { startDiscussion } = useStartDiscussion();

  // 次のメッセージ要求用関数
  const { requestNextMessage } = useRequestNextMessage();

  /* 開始ボタン押下時の処理 */
  const handleStartClick = async () => {
    /* 言語設定の取得 */
    const lang = isToEnglish ? "en" : "ja";

    /* 議題テキストの取得 */
    const selectedAgenda = isSelectAgenda
      ? agendaList.find((item) => item.id === agendaId)[lang]
      : agendaText;

    /* 設定ファイル名の取得 */
    const configFile = configList.find((item) => item.id === configId)["file"][
      lang
    ];

    /* 議論開始 */
    const result = await startDiscussion(
      roomId,
      agendaId,
      selectedAgenda,
      configId,
      configFile,
      lang,
      isTechEnabled,
      isSelectAgenda
    );
    
    /* 事後処理 */
    // キャッシュが存在するか
    const existCache = "exist_cache" in result ? result["exist_cache"] : false;
    // 議論コンテキスト更新
    setContext({
      ...context,
      isRunning: true,  // 議論中フラグを立てる
      existCache: existCache
    });
    // 次のデータをリクエスト
    if (autoRequestNextMessage) {
      timerId = setInterval(
        () => requestNextMessage(roomId),
        existCache ? 3000 : 1000
      );
    } else {
      requestNextMessage(roomId);
    }
  };

  useEffect(() => {
    getConfigList(); // 設定ファイルの一覧を取得
    getAgendaList(); // 議題リストの取得
  }, []);

  /* メッセージが更新されたときの処理 */
  useEffect(() => {
    /* メッセージが空のときは何もしない */
    if (messages.length === 0) return;

    /* メッセージに議論開始メッセージが含まれている場合 */
    if (messages.some(msg => msg["type"] === "system_info" && msg["msg_text"] === "議論開始")) {
      // 議論開始メッセージから引き継ぎデータ抽出
      const startMesssages = messages.filter(msg => msg["type"] === "system_info" && msg["msg_text"] === "議論開始");
      const firstHanderoverDatum = startMesssages[0]["handover_datum"];  // 最初の引き継ぎデータ
      const lastHandoverDatum = startMesssages[startMesssages.length - 1]["handover_datum"];  // 最後の引き継ぎデータ
      // 英語化フラグ更新
      setIsToEnglish(firstHanderoverDatum['lang'] === "en" ? true : false);
      // 革アG技術フラグ更新
      setIsTechEnabled(lastHandoverDatum['tech_enable']);  // 革アG技術は追加議論実行時に切り替える可能性があるので、最後の引き継ぎデータから取得
      // 議題入力方法更新
      setIsSelectAgenda(firstHanderoverDatum['is_select_agenda']);
      // 議題更新
      if (firstHanderoverDatum['is_select_agenda']) {
        setAgendaId(firstHanderoverDatum['agenda_id']);
      } else {
        setAgendaText(firstHanderoverDatum['agenda_text']);
      }
      // 設定ファイル更新
      setConfigId(firstHanderoverDatum['config_id']);
    }

    /* 最後のメッセージが議論終了メッセージである場合、終了 */
    if (messages[messages.length - 1]["type"] === "system_info" && messages[messages.length - 1]["msg_text"] === "議論終了") {
      clearInterval(timerId);
      timerId = null;
    }
  }, [messages]);

  
  return (
    <Box>
      {/* ヘッダー */}
      <StyledHeader roomId={roomId} messages={messages} isToEnglish={isToEnglish} />
      <Box
        sx={{
          pt: 1,
          pb: 2,
          marginTop: 1,
          backgroundColor: backgroundColor,
        }}
      >
        {/* 設定 */}
        <StyledSettingPanel
          isToEnglish={isToEnglish}
          isTechEnabled={isTechEnabled}
          isSelectAgenda={isSelectAgenda}
          agendaList={agendaList}
          configList={configList}
          agendaText={agendaText}
          agendaId={agendaId}
          configId={configId}
          roomId={roomId}
          setIsSelectAgenda={setIsSelectAgenda}
          setIsToEnglish={setIsToEnglish}
          setIsTechEnabled={setIsTechEnabled}
          setAgendaText={setAgendaText}
          setAgendaId={setAgendaId}
          setConfigId={setConfigId}
          handleStartClick={handleStartClick}
          chatRoomMode={chatRoomMode}
        />

        {/* アバター */}
        <StyledPanelistsDisplay
          configList={configList}
          configId={configId}
          isToEnglish={isToEnglish}
        />
      </Box>
    </Box>
  );
}
