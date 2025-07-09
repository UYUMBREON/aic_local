import asyncio
import json
import pathlib
import dataclasses
import logging
import os
from datetime import datetime, timedelta
from typing import Literal, Tuple
from fastapi import WebSocket
from ai_constellation.simulator.facilitator import Facilitator
from ai_constellation.common.utils import Mappable


# ロガー
_LOGGER = logging.getLogger(__name__)
_LOGGER.addHandler(logging.NullHandler())


# メッセージ種別
MessageType = Literal[
    "message",
    "system_info",
    "opt_info",
]


@dataclasses.dataclass
class Message(Mappable):
    """Webソケットの送受信に用いるメッセージ。

    メッセージ種別やメッセージ作成者、メッセージの本文などの情報を保持する。

    Attributes:
        type (MessageType | None): メッセージ種別。
        user_name (str | None): メッセージ作成者。システムやパネリスト名など。
        message_text (str | None): メッセージの本文。パネリストの発言など。
        timestamp (str | None): 作成時間タイムスタンプ。
        time (str | None): 作成時間。タイムスタンプと同じ日時で時間を`%H:%M`形式で格納する。
        user_img (str | None): メッセージ作成者の画像。画像までのパスが格納されている。
        handover_datum (dict | None): 引継ぎデータ。クライアント間で受け渡される任意のデータ。
    """
    type: MessageType | None = None
    user_name: str | None = None
    msg_text: str | None = None
    timestamp: str | None = None
    time: str | None = None
    user_img: str | None = None
    handover_datum: dict | None = None


class ConnectionManager:
    """接続管理用のモジュール。

    AIコンステレーションのLLMの議論を閲覧するためのモジュール。
    基本的には議論開始（start_discussion関数）と議論継続（start_additional_discussion関数）を利用して動かす。

    実装要件
      (1) 「管理者」が議論開始、議論継続を操作する。
      (2) 複数人の「閲覧者」が複数の接続デバイスからwebsocketを通じてLLMのトーク内容となるメッセージ一覧を閲覧する。
      (3) 接続デバイスがページをリロードしても正しく動くように設計する。
      (4) LLMのメッセージはすぐに閲覧できず、「管理者」が「次へ（Next）」ボタンを押すと、全員の接続デバイスに古いデータからメッセージが表示される。

    実装内容
      実装要件(1): 議論開始と議論継続はHTTPリクエストで受け取る。
      実装要件(2): 閲覧者はwebsocketで接続する。
      実装要件(3): wsで新規接続したり、閲覧可能なメッセージ一覧が更新されるたびに、閲覧可能なメッセージの全データをブロードキャスト。
      実装要件(4): 閲覧できないデータのDB（self.messages）と閲覧できるデータのDB（self.accessible_messages）に分けてDBを作る。
        add_accessible_message関数を「次へ（Next）」に紐づける。
    """

    ######## 初期化 ###############################################################

    def __init__(self):
        """コンストラクタ。

        接続相手やDBを初期化する。
        """
        self.active_connections: dict[WebSocket, dict] = {}  # ws接続中のユーザのリスト
        self.reset_message_db()                              # メッセージのDBをリセット
        self.is_running_discussion = False

    ######## ws接続関係 ###########################################################

    async def connect(self, websocket: WebSocket, **query_params):
        """Webソケットの接続を確保する。

        Args:
            websocket (WebSocket): Webソケットのインスタンス。
            query_params: クエリパラメータ。可変長名前付き引数。
        """
        # 接続
        await websocket.accept()
        # 接続可否判定
        is_valid, err_code, err_msg = self.validate_connection(websocket, **query_params)
        # 接続可否判定がNGの場合は切断して終了（接続してからではないとエラーメッセージ等が遅れないので一度接続してから切断する）
        if not is_valid:
            _LOGGER.error(f"ConnectionManager.can_connect returned error. err_code={err_code}, err_msg={err_msg}")
            await websocket.close(err_code, err_msg)
            return
        # 接続リストに追加
        self.active_connections[websocket] = {
            **query_params,                                          # 接続リストは接続時のクエリパラメータと共に保存
            "accecpt_datetime": datetime.now() + timedelta(hours=9)  # 記録用に接続日時も加えておく
        }
        self._log_active_connections()  # ロギング
        # 接続してきた相手に，現在のDBの全メッセージを送信（ブラウザリロード対策）
        await websocket.send_text(self.get_accessible_message_db_text())

    def validate_connection(self, websocket: WebSocket, **query_params: dict) -> Tuple[bool, int, str]:
        """Webソケットの接続検証。

        Args:
            websocket (WebSocket): Webソケットのインスタンス。
            query_params (dict): クエリパラメータ。可変長名前付き引数。

        Returns:
            Tuple[bool, int, str]: 検証結果、エラーコード(Webソケットのクローズドコードに準拠)、エラーメッセージ(クローズ理由)。
        """
        # 自身が実行者で、すでに実行者として接続しているクライアントが存在している場合、接続不可
        if query_params.get("chat_room_mode") == "exec":
            if any(active_query_param.get("chat_room_mode") == "exec"
                   for active_query_param in self.active_connections.values()):
                return False, 1008, "実行者重複"
        return True, 0, None

    def disconnect(self, websocket: WebSocket):
        """Webソケット接続解除。

        Args:
            websocket (WebSocket): Webソケットのインスタンス。
        """
        self.active_connections.pop(websocket)  # 接続中のユーザのリストから接続を削除
        self._log_active_connections()  # ロギング

    def _log_active_connections(self):
        """Webソケット接続先のロギング。"""
        if len(self.active_connections) == 0:
            _LOGGER.info("Active connections: empty.")
        else:
            log = ""
            for ws, d in self.active_connections.items():
                log += f"\n- {ws.client.host}:{ws.client.port} ({ws.application_state.name})"
                for k, v in d.items():
                    log += f"\n - {k}: {v}"
            _LOGGER.info(f"Active connections: {log}")

    async def broadcast(self, message: str):
        """Webソケット接続しているすべてのクライアントにメッセージを一斉送信(ブロードキャスト)する。

        Args:
            message (str): メッセージ。
        """
        for connection in self.active_connections.keys():
            try:
                await connection.send_text(message)  # メッセージを送信
            except Exception:
                self.active_connections.pop(connection)  # もし接続がクローズされていたら、その接続をリストから除外

    ######## メッセージDB管理の汎用関数 ###################################################

    def reset_message_db(self):
        """メッセージDBをリセットする。"""
        self.messages: list[Message] = []              # DBに保持されているデータ
        self.accessible_messages: list[Message] = []   # DBの中でユーザに表示するデータ
        self.accessible_index = -1                     # DBの中でユーザに表示するデータの終端のインデックス、表示可能なデータが0個なら-1

    def get_accessible_message_db_text(self) -> str:
        """閲覧可能メッセージDBをJSON文字列にダンプする。

        Returns:
            str: JSON文字列。
        """
        return json.dumps([message.to_dict() for message in self.accessible_messages], ensure_ascii=False)

    def get_user_img(self, name: str) -> str:
        """ユーザ名から画像を取得する。

        Args:
            name (str): ユーザ名

        Returns:
            str: 画像までのパス。
        """
        if name in self.image_dict:
            return self.image_dict[name]    # 辞書に登録されている場合はそのURLを返す
        elif name == 'system':
            return '/images/system.png'     # systemのメッセージの場合は専用のURLを返す
        else:
            return ''                       # それ以外は空白で返す（画像なしで表示される）

    def push_message(self, new_message: Message):
        """メッセージをメッセージDBに追加する。

        Args:
            new_message (Message): メッセージ。
        """
        # 不要な「」を削除
        if new_message.msg_text[0] == '「' and new_message.msg_text[-1] == '」':
            new_message.msg_text = new_message.msg_text[1:-2]
        now = datetime.now() + timedelta(hours=9)
        new_message.timestamp = str(now.timestamp())                         # メッセージ本体にタイムスタンプ情報を取得
        new_message.time = now.strftime('%H:%M')                             # メッセージ本体に時刻情報を追加
        new_message.user_img = self.get_user_img(new_message.user_name)   # メッセージ本体にユーザの画像の情報を追加
        self.messages.append(new_message)                                       # DBにメッセージを追加
        print(new_message)

    async def add_accessible_message(self) -> list:
        """閲覧可能メッセージDBにメッセージDBのメッセージを1つ追加し、ブロードキャストする。

        Returns:
            list: メッセージ追加後の閲覧可能メッセージDB。
        """
        if len(self.messages) <= self.accessible_index + 1:
            pass
        else:
            self.accessible_messages.append(self.messages[self.accessible_index+1])  # 閲覧可能なメッセージを1つ増やす
            self.accessible_index += 1
            await self.broadcast(self.get_accessible_message_db_text())  # DB更新のため，全体へDBの全メッセージを送信
        return self.accessible_messages

    ######## メッセージ処理関連 ###################################################

    async def start_discussion(
        self,
        config_message: dict,
        handover_datum: dict | None = None
    ) -> dict:
        """議論を開始する。

        Args:
            config_message (dict): 議論の初期設定メッセージ。
            handover_datum (dict): 実行ユーザ以外のユーザへの引継ぎデータ。議題や設定ファイルのIDなど、画面構成に必要な情報。

        Returns:
            dict: リクエスト結果。議論に関する情報。
        """
        # 実行中フラグが立っている時は議論を実行しない
        if self.is_running_discussion:
            _LOGGER.warning("discussion is already running, start_discussion canceled.")
            return {"status": "failed"}
        # 実行中フラグを立てる
        self.is_running_discussion = True
        # 強制停止フラグを下ろす
        self.should_stop = False
        # キャッシュ
        cache = None
        try:
            # フロントエンドで画像表示・音声合成用の参加者（ユーザ, パネリスト）のコンフィグを作成
            # userだけ別のデータとして格納されているので、panelistsのリストの先頭に追加
            participants_config = [config_message['user']] + config_message['panelists']
            participants_config = [{
                'name': datum_i['name'],
                'image': datum_i['image'],
                'voice_id': datum_i['voice_id'],
                'voice_pitch': datum_i['voice_pitch'],
            } for datum_i in participants_config]

            # 画像URLをひくための変数を作成
            self.user_name = config_message['user']['name']
            self.image_dict = {datum_i['name']: datum_i['image'] for datum_i in participants_config}

            # DBをリセット、フロントエンドで使用するデータをDBにpush
            self.reset_message_db()

            # 議論開始メッセージ
            # 議論を実行したユーザから他のユーザへの引継ぎデータを含む
            # さらにパネリスト構成の情報を含む
            handover_datum['participants_config'] = participants_config
            self.push_message(Message(
                type='system_info',
                user_name='system',
                msg_text='議論開始',
                handover_datum=handover_datum
            ))

            # キャッシュの指定がある場合、キャッシュを読み込む
            if 'cache' in config_message:
                cache_dir = pathlib.Path('./cache/')
                cache_file = cache_dir / config_message['cache']
                if os.path.isfile(cache_file):
                    with cache_file.open('r', encoding='utf-8') as f:
                        cache = json.load(f)
                    _LOGGER.info(f"cache file found: {cache_file}")
                else:
                    _LOGGER.warning(f"cache file not found: {cache_file}")

            # 議論用のモジュールを用意
            self.discussion_module = Facilitator(
                panelist_names=[e['name'] for e in config_message['panelists']],
                panelist_personas=[e['persona'] for e in config_message['panelists']],
                panelist_characteristics=[e['characteristics'] for e in config_message['panelists']],
                panelist_models=[e['model'] for e in config_message['panelists']],
                system_prompt=config_message['system_prompt'],
                first_user_prompt=config_message['first_user_prompt'],
                subsequent_user_prompt=config_message['subsequent_user_prompt'],
                additional_first_user_prompt=config_message['additional_first_user_prompt'],
                additional_subsequent_user_prompt=config_message['additional_subsequent_user_prompt'],
                additional_last_user_prompt=config_message['additional_last_user_prompt'],
                num_discussion_turn=1,
            )

            # 議論実行
            asyncio.create_task(self.do_discussion(
                agenda=config_message['agenda'],
                is_continue=False,
                use_strategy=config_message['tech_enable'],
                lang=config_message['lang'],
                cache=cache)
            )
            return {
                "status": "succeeded",
                "exist_cache": cache is not None
            }
        except Exception as ex:
            _LOGGER.exception("start_discussion error happened.")
            raise ex
        finally:
            # 実行中フラグを下ろす
            self.is_running_discussion = False

    async def start_additional_discussion(self, query_message):
        """追加議論を開始する。

        Args:
            query_message (dict): ユーザ入力のメッセージ。
        """
        # WARNING: start_additional_discussion関数はcacheに対応していない
        # 実行中フラグが立っている時は議論を実行しない
        if self.is_running_discussion:
            _LOGGER.warning("discussion is already running, start_additional_discussion canceled.")
            return
        # 実行中フラグを立てる
        self.is_running_discussion = True
        try:
            # 各種設定値の取り出し
            agenda = query_message['msg_text']           # 議題情報
            use_strategy = query_message["tech_enable"]  # 革アG技術を使うかどうか

            # 追加議論開始メッセージ
            # 追加議論時も議論を実行したユーザから他のユーザに引き継ぎデータを送らないと、初回議論の設定値で画面が更新されてしまう
            self.push_message(Message(
                type='system_info',
                user_name='system',
                msg_text='議論開始',
                handover_datum=query_message
            ))

            # 議論実行
            await self.do_discussion(agenda=agenda, is_continue=True, use_strategy=use_strategy)
        except Exception as ex:
            _LOGGER.exception("start_additional_discussion error happened.")
            raise ex
        finally:
            # 実行中フラグを下ろす
            self.is_running_discussion = False

    async def do_discussion(
        self,
        agenda: str,
        is_continue: bool,
        use_strategy: bool,
        lang: str = None,
        cache: dict = None
    ):
        """議論を実行する。

        Args:
            agenda (str): 議題。
            is_continue (bool): 追加議論か否か。
            use_strategy (bool): 議論戦略器を使うかどうか。
            lang (str): 言語。日本語(ja)か英語(en)か。
            cache (dict): 議論のキャッシュ。
        """
        if not cache:
            # 議題指示をDBに追加
            new_message = Message(
                type='message',
                user_name=self.user_name,
                msg_text=agenda,
            )
            self.push_message(new_message)
            await asyncio.sleep(1)

            # 議論開始：LLMの出力をDBに追加
            gen_start_discussion = self.discussion_module.start_discussion(agenda, is_continue, use_strategy, lang)
            while True:
                try:
                    comment_type, panelist_name, comment = await gen_start_discussion.__anext__()
                    # 強制停止フラグが立っていた場合は終了
                    if self.should_stop:
                        break
                    # Noneが返却されたらcontinue
                    if comment_type is None or panelist_name is None or comment is None:
                        continue
                    # コメントをDBに追加
                    new_message = Message(
                        type=comment_type,
                        user_name=panelist_name,
                        msg_text=comment
                    )
                    self.push_message(new_message)
                    await asyncio.sleep(1)
                except StopAsyncIteration:
                    break  # __anext__の終了検知、議論終了

            # 議論終了シグナルをDBに追加
            new_message = Message(
                type='system_info',
                user_name='system',
                msg_text='議論終了'
            )
            self.push_message(new_message)

        else:
            # キャッシュの確認
            if agenda not in cache:
                new_message = Message(
                    type='system_info',
                    user_name='Error',
                    msg_text='Cache Error',
                )
                self.push_message(new_message)
                return

            # 議論開始：キャッシュの内容をDBに追加
            for message_type, panelist_name, comment in cache[agenda]:
                # 強制停止フラグが立っていた場合は終了
                if self.should_stop:
                    break

                # コメントをDBに追加
                new_message = Message(
                    type=message_type,
                    user_name=panelist_name,
                    msg_text=comment
                )
                self.push_message(new_message)
                await asyncio.sleep(1)

            # 議論終了シグナルをDBに追加
            new_message = Message(
                type='system_info',
                user_name='system',
                msg_text='議論終了'
            )
            self.push_message(new_message)

    async def stop_discussion(self):
        """議論を停止する。"""
        self.should_stop = True     # 強制停止フラグを立てる
        self.reset_message_db()     # DBをリセット
