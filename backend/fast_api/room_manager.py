import dataclasses
import logging
from typing import Tuple
from datetime import datetime, timedelta
from ai_constellation.common.utils import Mappable
from connection_manager import ConnectionManager


# ロガー
_LOGGER = logging.getLogger(__name__)
_LOGGER.addHandler(logging.NullHandler())


@dataclasses.dataclass
class Room(Mappable):
    """ルーム。

    ルームIDやルーム名など、ルームの情報を保持する。
    """
    room_id: int = -1
    room_name: str = ''
    created_at: datetime = None
    connection_manager: ConnectionManager = None


# ルームID初期値
DEFAULT_ROOM_ID = 1


class RoomManager:
    """ルーム管理用モジュール。

    ルームDBを保持し、その中にConnectionManagerを含む情報を格納する。
    ルームDBを操作する機能を外部に提供する。

    Attributes:
        config_dir (str): 設定ファイルのディレクトリ。
    """
    config_dir = "./configs/"

    def __init__(self):
        """コンストラクタ

        ルームDBを初期化する。
        ルームDBは辞書型であり、keyとしてルームID、valueとしてRoomインスタンスを格納する。
        """
        # ルームDB
        self.room_db: dict[int, Room] = {}
        # 初期状態でルームを1件加えておく
        self.create_room("Room 1")

    def get_rooms(self) -> dict[int, Room]:
        """ルーム一覧を取得。

        ルームは呼び出し元での変更を考慮してディープコピーとして返却する。

        Returns:
            dict[int, Room]: ルーム一覧。
        """
        return {room_id: {
            "room_id": room.room_id,
            "room_name": room.room_name,
            "created_at": room.created_at
        } for room_id, room in self.room_db.items()}

    def create_room(self, room_name: str) -> Room:
        """ルーム作成。

        与えられたルーム名でルームを新規作成する。
        新規作成したルームをルームDBに格納する。

        Args:
            room_name (str): ルーム名。

        Returns:
            Room: 新規作成したルーム。
        """
        # ルームID
        room_id = DEFAULT_ROOM_ID if len(self.room_db) == 0 else max(self.room_db.keys()) + 1
        # 作成日時
        created_at = datetime.now() + timedelta(hours=9)
        # 新規ルーム作成
        created_room = Room(
            room_id=room_id,
            room_name=room_name,
            created_at=created_at,
            connection_manager=ConnectionManager()
        )
        # ルームDBに新規ルーム追加
        self.room_db[room_id] = created_room
        _LOGGER.info(f"room created: {created_room}")
        return created_room

    def delete_room(self, room_id: int) -> Room | None:
        """ルーム削除。

        与えられたルームIDでルームDBからルームを削除する。

        Returns:
            Room | None: 削除したルーム。ルームが存在しない場合はNone。
        """
        if room_id not in self.room_db:
            _LOGGER.error(f"room not deleted: room id `{room_id}` not found.")
            return None
        # 対象ルームを削除してDBを更新
        deleted_room = self.room_db.pop(room_id)
        _LOGGER.info(f"room deleted: {deleted_room}")
        return deleted_room

    def try_get_connection_manager_by_room_id(self, room_id: int) -> Tuple[ConnectionManager | None, bool]:
        """ConnectionManagerを取得する。

        Args:
            room_id (int): ルームID。

        Returns:
            Tuple[ConnectionManager | None, bool]: ConnectionManagerと取得成否。
        """
        # ルームIDがルームDB内に存在するかチェック
        if room_id not in self.room_db:
            return (None, False)
        # ConnectionManagerを取得して返却
        connection_manager = self.room_db[room_id].connection_manager
        return (connection_manager, True)

    def try_get_connection_manager_by_post_data(
        self,
        post_body: dict
    ) -> Tuple[ConnectionManager | None, int | None, bool]:
        """POSTのHTTPリクエストのボディからConnectionManagerを取得する。WebAPI向けの機能。

        Args:
            data (dict): POSTのHTTPリクエストのボディ。

        Returns:
            Tuple[ConnectionManager | None, int | None, bool]: ConnectionManagerとルームIDと取得可否。
        """
        # 'room_id'キーがdataの中にあるかチェック
        if 'room_id' not in post_body:
            return (None, None, False)
        # ConnectionManagerを取得して返却
        room_id = int(post_body['room_id'])
        (connection_manager, exist) = self.try_get_connection_manager_by_room_id(room_id)
        return (connection_manager, room_id, exist)
