"""非同期のロガーのモジュール。"""
import logging
import logging.handlers
import os
import queue
import sys


class AsyncLogger:
    """非同期でロギングをするためのロガー。

    メインのプログラムのパフォーマンスを下げないように、ロギングを別スレッドで実行する。
    start時にファイル出力先を変更することができる。
    """

    def __init__(self):
        """コンストラクタ。

        ロガーを生成する。
        ロガーには、キュー、キューハンドラ、レベル、フォーマットを設定する。
        """
        # ロガー、キューとキューハンドラを設定（ロギングを別スレッドで実施するための設定）
        self.logger = logging.getLogger()
        self.logging_queue = queue.SimpleQueue()
        self.queue_handler = logging.handlers.QueueHandler(self.logging_queue)

        # ログのレベルを設定
        self.logger.setLevel(logging.DEBUG)

        # ログのフォーマットを設定
        self.formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

        # start実行が初回かどうかを確認するためにNoneを入れておく
        self.listener = None

    def _set_stream_handler(self):
        """ストリームハンドラ(標準出力や標準エラー出力にログを出力するハンドラ)を設定する。"""
        self.stream_handler = logging.StreamHandler(sys.stdout)
        # self.stream_handler.setLevel(logging.DEBUG)   # コンソールにDEBUGレベル表示
        self.stream_handler.setLevel(logging.INFO)      # コンソールにDEBUGレベル非表示
        self.stream_handler.setFormatter(self.formatter)

    def _set_file_handler(self, logfile_path: str):
        """ファイルハンドラ(ファイルにログを出力するハンドラ)を設定する。

        Args:
            logfile_path (str): ファイルハンドラがログを出力するファイルまでのパス。
        """
        self.file_handler = logging.FileHandler(logfile_path)
        self.file_handler.setLevel(logging.DEBUG)
        self.file_handler.setFormatter(self.formatter)

    def start(self, logfile_path: str):
        """ロギングを開始する。

        出力先のディレクトリを作成する。
        既存のロギングのリスナーやハンドラが存在する場合は停止・削除する。
        その後、新しいハンドラを設定し、リスナーを開始する。

        Args:
            logfile_path (str): ログ出力先ファイル。
        """
        # 出力先のディレクトリを作成
        directory = os.path.dirname(logfile_path)
        if directory:
            os.makedirs(directory, exist_ok=True)

        # 既存のリスナーが存在する場合は停止
        if self.listener is not None:
            self.listener.stop()            # リスナを停止

        # 既存のハンドラをすべて削除
        for h in self.logger.handlers[:]:
            self.logger.removeHandler(h)    # loggerのハンドラから削除
            h.close()                       # ハンドラを停止

        # 新しいハンドラを設定
        self._set_stream_handler()
        self._set_file_handler(logfile_path)

        # リスナーを開始
        self.listener = logging.handlers.QueueListener(
            self.logging_queue,
            self.stream_handler,
            self.file_handler,
            respect_handler_level=True
        )                                           # リスナを作成
        self.logger.addHandler(self.queue_handler)  # loggerにキューハンドラを追加
        self.listener.start()                       # リスナを起動
