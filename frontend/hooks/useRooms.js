import { useCallback, useState } from 'react';

/**
 * ルームリスト取得関数の型
 * @callback GetRooms
 * @returns {Object[]} ルームリスト
 */

/**
 * ルーム作成関数の型
 * @callback CreateRoom
 * @param {{ roomName: string }} room - ルーム情報。ルーム名など。
 * @returns {void}
 */

/**
 * ルーム削除関数の型
 * @callback DeleteRoom
 * @param {number} roomId - ルームID
 * @returns {void}
 */

/**
 * ルームリスト操作フックの戻り値の型
 * @typedef {Object} UseRoomsResult
 * @property {Object[]} rooms - ルームリスト
 * @property {GetRooms} getRooms - ルームリスト取得関数
 * @property {CreateRoom} createRoom - ルーム作成関数
 * @property {DeleteRoom} deleteRoom - ルーム削除関数
 * @property {any} error - リクエスト時のエラー
 */

/**
 * ルームリスト操作フック \
 * ルームのリストとそれを操作する関数一式を提供する。 \
 * ルームを操作する関数としては、作成関数・削除関数がある。 \
 * 作成関数は、入力値にしたがって新規のルームを作成するようにサーバに要求する。 \
 * 削除関数は、指定のルームをルームのリストから削除するようにサーバに要求する。
 * @function useRooms
 * @returns {UseRoomsResult}
 */
export default function useRooms() {
  // ルーム一覧
  const [rooms, setRooms] = useState([]);
  // エラー用変数
  const [error, setError] = useState(null);
  
  // ルーム取得関数
  const getRooms = useCallback(async () => {
    setError(null);
    try {
      const response = await fetch(
        "/backend_api/rooms",
        {
          method: "GET",
        }
      );
      if (!response.ok) {
        throw new Error(response.status + ":" + response.statusText);
      }
      const result = await response.json();
      const tmpRooms = Object.values(result).map(x => {
        return {
          "roomId": x.room_id,
          "roomName": x.room_name,
          "createdAt": new Date(x.created_at)
        };
      });
      setRooms(tmpRooms);
      return tmpRooms;
    } catch (ex) {
      console.log(ex);
      setError(ex);
      return [];
    }
  });

  // ルーム作成関数
  const createRoom = useCallback(async (room) => {
    setError(null);
    try {
      const response = await fetch(
        "/backend_api/rooms",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            room_name: room.roomName
          })
        }
      );
      if (!response.ok) {
        throw new Error(response.status + ":" + response.statusText);
      }
    } catch (ex) {
      console.log(ex);
      setError(ex);
    }
  })

  // ルーム削除関数
  const deleteRoom = useCallback(async (roomId) => {
    setError(null);
    try {
      const response = await fetch(
        `/backend_api/rooms/${roomId}`,
        {
          method: "DELETE"
        }
      );
      if (!response.ok) {
        throw new Error(response.status + ":" + response.statusText);
      }
    } catch (ex) {
      console.log(ex);
      setError(ex);
    }
  })

  // 一式返却
  return {
    rooms,
    getRooms,
    createRoom,
    deleteRoom,
    error
  }
}
