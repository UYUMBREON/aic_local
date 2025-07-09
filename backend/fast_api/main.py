"""FastAPIのメインモジュール。

FastAPIのエンドポイントを定義する。
ConnectionManagerで接続状態を管理する。
"""
import yaml
import pathlib
import os
from datetime import datetime, timedelta
from typing import Any, Literal
from ai_constellation.common.async_logger import AsyncLogger
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.websockets import WebSocketState
from collections import OrderedDict
from ai_constellation.common.utils import yaml_ordered_dict_representer, yaml_multiline_string_representer
from room_manager import RoomManager

################################# ロギング関係 #################################

# FastAPIをasyncで使っているので、念のため別スレッドでログ出力を行う
logger = AsyncLogger()
start_datetime = datetime.now() + timedelta(hours=9)
logger.start(logfile_path=f'./logs/log_{start_datetime.strftime("%Y%m%d%H%M%S")}.log')  # ログ出力先を設定


################################# FastAPI設定関係 #################################

app = FastAPI()

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# YAMLファイルの読み書きに必要な設定をパッケージに登録
yaml.add_representer(OrderedDict, yaml_ordered_dict_representer, Dumper=yaml.SafeDumper)
yaml.add_representer(str, yaml_multiline_string_representer, Dumper=yaml.SafeDumper)


############################### API：ルーム関係 ###############################

# ルーム管理者
_ROOM_MANAGER = RoomManager()


@app.get('/rooms')
def get_rooms() -> dict[int, dict[str, Any]]:
    """ルーム一覧を取得する。

    Returns:
        dict[int, dict[str, Any]]: ルーム一覧。
    """
    global _ROOM_MANAGER
    return _ROOM_MANAGER.get_rooms()


@app.post('/rooms')
def create_room(data: dict[str, Any]) -> dict:
    """ルームを新規作成する。

    Args:
        data (dict[str, Any]): 新規作成するルームのパラメータ。POSTのHTTPリクエストのボディ。

    Returns:
        dict: 処理結果。
    """
    global _ROOM_MANAGER
    _ = _ROOM_MANAGER.create_room(data['room_name'])
    return {'status': 'success'}


@app.delete('/rooms/{room_id}')
def delete_room(room_id: int) -> dict:
    """ルームを削除する。

    Args:
        room_id (int): ルームID。

    Returns:
        dict: 処理結果。
    """
    global _ROOM_MANAGER
    deleted_room = _ROOM_MANAGER.delete_room(room_id)
    # 対象ルームが存在しない場合は404エラー
    if deleted_room is None:
        raise HTTPException(
            status_code=404,
            detail=f'room not found. room_id={room_id}')
    return {'status': 'success'}


################################# API：議論の基本通信関係 #################################

@app.post("/new_discussion")
async def start_discussion(data: dict) -> dict:
    """議論を開始する。

    Args:
        data (dict): 議論の初期設定メッセージ。

    Returns:
        dict: 処理結果。
    """
    # ConnectionManagerを取得
    (connection_manager, room_id, exist) = _ROOM_MANAGER.try_get_connection_manager_by_post_data(data)
    if not exist:
        logger.logger.error(f"start_discussion error happend. ConnectionManager not found. room_id={room_id}")
        raise HTTPException(
            status_code=404,
            detail=f'ConnectionManager not found. room_id={room_id}')
    # start_discussionに渡すmessageを作成
    config_dir = pathlib.Path(RoomManager.config_dir)
    config_file = config_dir / data['config_file']
    with config_file.open('r', encoding='utf-8') as f:
        message = yaml.load(f, Loader=yaml.SafeLoader)
    # messageに言語を設定
    message['lang'] = data['lang']
    # messageに革アG技術フラグを設定
    message['tech_enable'] = data['tech_enable']
    # messageに議題を設定
    message['agenda'] = data['agenda_text']
    # messageにキャッシュファイルを設定
    if data['is_select_agenda']:
        agenda_id = data['agenda_id']  # 議題ID
        config_file_base_name = os.path.splitext(os.path.basename(config_file))[0]  # 設定ファイル名(拡張子なし)
        message['cache'] = f'{agenda_id}_{config_file_base_name}.json'  # キャッシュファイル名は議題IDと設定ファイルから作成
    # 議論開始
    result = await connection_manager.start_discussion(
        config_message=message,
        handover_datum=data
    )
    return result


@app.post("/next_accessible_message")
async def add_accessible_message(data: dict) -> list:
    """閲覧可能メッセージを追加する。

    ConnectionManagerが保持するメッセージDBからメッセージを1つ、閲覧可能メッセージDBに移す。
    その後、閲覧可能メッセージを各クライアントにブロードキャストする。
    閲覧可能メッセージは、HTTPリクエストに対するレスポンスとしても返却する。

    Args:
        data (dict): POSTのHTTPリクエストのボディ。ルームIDを含む。

    Returns:
        list: 閲覧可能メッセージ。
    """
    (connection_manager, room_id, exist) = _ROOM_MANAGER.try_get_connection_manager_by_post_data(data)
    if not exist:
        logger.logger.error(f"add_accessible_message error happend. ConnectionManager not found. room_id={room_id}")
        raise HTTPException(
            status_code=404,
            detail=f'ConnectionManager not found. room_id={room_id}')
    messages = await connection_manager.add_accessible_message()  # 次のデータを送信するよう要求
    return messages


@app.post("/additional_discussion")
async def start_additional_discussion(data: dict) -> dict:
    """追加議論を開始する。

    Args:
        data (dict): 追加議論の初期設定用メッセージ。ルームIDやユーザ入力のメッセージを含む。

    Returns:
        dict: 処理結果。
    """
    (connection_manager, room_id, exist) = _ROOM_MANAGER.try_get_connection_manager_by_post_data(data)
    if not exist:
        logger.logger.error("start_additional_discussion error happend. "
                            + f"ConnectionManager not found. room_id={room_id}")
        raise HTTPException(
            status_code=404,
            detail=f'ConnectionManager not found. room_id={room_id}')
    await connection_manager.start_additional_discussion(data)  # 新しいユーザプロンプトに応じて再度議論を開始
    return {"status": "success"}


# Webソケット用のパラメータ
ChatRoomMode = Literal['view', 'exec']  # チャットルームモード
ScreenName = Literal['chat', 'typing']  # 画面名


@app.websocket('/ws/chat')
async def websocket_endpoint_chat(
    websocket: WebSocket,
    room_id: int = Query(...),
    chat_room_mode: ChatRoomMode = Query(...),
    screen_name: ScreenName = Query(...)
):
    """Webソケット接続を受け入れる。

    Args:
        websocket (WebSocket): Webソケットインスタンス。
        room_id (int): ルームID。
        chat_room_mode (ChatRoomMode): クライアントのチャットルームモード。
        screen_name (ScreenName): クライアントで表示している画面名。ログ用。
    """
    # ConnectionManager取得
    (connection_manager, exist) = _ROOM_MANAGER.try_get_connection_manager_by_room_id(room_id)
    if not exist:
        logger.logger.error(f"websocket_endpoint_chat error happend. ConnectionManager not found. room_id={room_id}")
        raise HTTPException(
            status_code=404,
            detail=f'ConnectionManager not found. room_id={room_id}')
    # サーバからクライアントへの送信専用で接続
    await connection_manager.connect(
        websocket,
        room_id=room_id,
        chat_room_mode=chat_room_mode,
        screen_name=screen_name
    )
    # 接続失敗したら終了(websokcetがclosedな状態でreceive_textを呼び出すと例外になる)
    if websocket.application_state == WebSocketState.DISCONNECTED:
        logger.logger.error("websocket_endpoint_chat error happend. websocket application_state is DISCONNECTED.")
        return
    try:
        while True:
            data = await websocket.receive_text()   # データ受信（データが送られてくることは想定上ない）
            raise Exception(f'{data=}')             # 受信したらおかしいので、例外を上げる
    except WebSocketDisconnect:
        logger.logger.exception("websocket_endpoint_chat error happened.")
        connection_manager.disconnect(websocket)


@app.post("/discussion_end")
async def stop_discussion(data: dict) -> dict:
    """議論を停止する。

    Args:
        data (dict): POSTのHTTPリクエストのボディ。ルームIDを含む。

    Returns:
        dict: 処理結果。
    """
    (connection_manager, room_id, exist) = _ROOM_MANAGER.try_get_connection_manager_by_post_data(data)
    if not exist:
        logger.logger.error(f"stop_discussion error happend. ConnectionManager not found. room_id={room_id}")
        raise HTTPException(
            status_code=404,
            detail=f'ConnectionManager not found. room_id={room_id}')
    await connection_manager.stop_discussion()
    return {"status": "stop discussion"}


############################### API：設定ファイル関係 ###############################

@app.get('/system/config_list')
async def list_config() -> list:
    """設定ファイルとそのパネリストの一覧を取得する。

    フロントエンドで設定ファイルを確認するために用いる。
    パネリストのみ表示するため、それ以外の設定値は返さない。

    Returns:
        list: 設定ファイルとパネリストの一覧。
    """
    # 議論設定ファイルの一覧を取得
    config_dir = pathlib.Path(RoomManager.config_dir)
    config_ja_paths = list(config_dir.glob('*_ja.yml'))
    config_ja_paths.sort()

    # 設定ファイルの形式に沿ったオブジェクトを作成
    config_list = []
    for idx, path in enumerate(config_ja_paths):
        prefix = path.stem[:-3]  # "_ja"を取り除く

        # pathの設定値をまとめたconfigを構成するために初期化
        config = {}
        config['id'] = idx + 1
        config['file'] = {
            'ja': f'{prefix}_ja.yml',
            'en': f'{prefix}_en.yml',
        }
        config['label'] = {'ja': '', 'en': ''}
        config['panelist_names'] = {'ja': list(), 'en': list()}
        config['panelist_images'] = {'ja': dict(), 'en': dict()}

        # 議論設定ファイルを読み込み、パネリスト情報を取得
        for lang in ['ja', 'en']:
            # 元データ読み込み
            config_path = config_dir / f'{prefix}_{lang}.yml'
            with config_path.open('r', encoding='utf-8') as f:
                config_origin = yaml.load(f, Loader=yaml.SafeLoader)

            # 'label'の読み込み
            config['label'][lang] = config_origin['label']

            # 'user'の読み込み
            user = config_origin['user']
            config['panelist_names'][lang].append(user['name'])
            config['panelist_images'][lang].update({user['name']: user['image']})

            # 'panelists'の読み込み
            panelists = config_origin['panelists']
            config['panelist_names'][lang].extend([e['name'] for e in panelists])
            config['panelist_images'][lang].update({e['name']: e['image'] for e in panelists})

        config_list.append(config)
    return config_list


@app.get('/system/agenda/{agenda_file}')
async def load_agenda(agenda_file: str) -> list:
    """議題一覧ファイルの内容を取得する。

    Args:
        agenda_file (str): 議題一覧ファイルまでのパス。

    Return:
        list: 議題一覧。
    """
    config_dir = pathlib.Path(RoomManager.config_dir)
    path = config_dir / agenda_file
    if not path.exists():
        raise HTTPException(
            status_code=404,
            detail=f'agenda file not found. path={agenda_file}')
    with path.open('r', encoding='utf-8') as f:
        agenda_list = yaml.load(f, Loader=yaml.SafeLoader)
    return agenda_list
