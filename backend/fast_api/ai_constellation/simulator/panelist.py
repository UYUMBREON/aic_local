"""AI-Constellationシミュレータのうちのパネリストのモジュール。

Panelistを定義する。
"""
import json
import logging
from openai.types.chat import ChatCompletion
from ai_constellation.llm_clients.base_client import BaseLLMClient


_LOGGER = logging.getLogger(__name__)
_LOGGER.addHandler(logging.NullHandler())


class Panelist:
    """パネリスト。

    基本動作として、与えられたLLMクライアントを使用して、質問に対しする応答を返却する。
    応答は固有のペルソナを持った議論の参加者として生成する。
    """

    def __init__(
        self,
        id: str,
        name: str,
        persona: str,
        client: BaseLLMClient,
        system_prompt: str
    ):
        """コンストラクタ。

        与えられたペルソナの情報やLLMクライアントを保持する。
        また、システムプロンプトは、メッセージログに追加する形でも保持する。

        Args:
            id (str): パネリストID。
            name (str): パネリスト名。
            persona (str): パネリストのペルソナ。
            client (BaseLLMClient): LLMクライアント。
            system_prompt (str): システムプロンプト。
        """
        self.id: str = id                         # 識別用のID
        self.name: str = name                     # ログなどに使用する名前
        self.persona: str = persona               # ペルソナ
        self.client: BaseLLMClient = client       # LLMクライアント
        self.system_prompt: str = system_prompt   # システムプロンプト
        self.chat_log: list[dict[str, str]] = []  # メッセージログ（パネリストの記憶）

        # メッセージログにシステムプロンプトを追加
        self.chat_log.append(self.client.format_system_message(system_prompt))

    async def generate(self, user_prompt: str) -> ChatCompletion:
        """ログを残しながら応答を生成する。

        Args:
            user_prompt: ユーザプロンプト。

        Returns:
            ChatCompletion: 応答結果。
        """
        # メッセージログにユーザプロンプト（リクエスト）を追加したリクエスト用のデータを作成
        messege_log_tmp = self.chat_log + [self.client.format_user_message(user_prompt)]
        response = await self.client.generate(messege_log_tmp)  # LLMが回答を作成
        self.log(user_prompt, response)  # ログを残す
        return response

    # ログに残さずに応答生成
    async def generate_wo_log(self, user_prompt: str | list[str]) -> ChatCompletion | list[ChatCompletion]:
        """ログを残さずに応答を生成する。

        ユーザプロンプトを複数で渡された場合にも対応している。
        複数で渡された場合は、すべてのユーザプロンプトに対して1回ずつ応答の生成を行い、複数の応答結果を返却する。

        Args:
            user_prompt (str | list[str]): ユーザプロンプト。

        Returns:
            ChatCompletion | list[ChatCompletion]: 応答結果。
        """
        if type(user_prompt) is list:
            response_list = []
            for prompt in user_prompt:
                # メッセージログにユーザプロンプト（リクエスト）を追加したリクエスト用のデータを作成
                messege_log_tmp = self.chat_log + [self.client.format_user_message(prompt)]
                response_list.append(await self.client.generate(messege_log_tmp))  # LLMが回答を作成
            return response_list
        elif type(user_prompt) is str:
            # メッセージログにユーザプロンプト（リクエスト）を追加したリクエスト用のデータを作成
            messege_log_tmp = self.chat_log + [self.client.format_user_message(user_prompt)]
            response = await self.client.generate(messege_log_tmp)  # LLMが回答を作成
            return response
        else:
            raise Exception('user_prompt is not of type string or string list.')

    # ログを残すための関数（主に外部からログを残すために使用）
    def log(self, user_prompt: str, response: ChatCompletion):
        """議論ログを追加する。

        議論ログとして、ユーザプロンプトとアシスタントプロンプトを追加する。
        主に外部から議論ログを追加するために使用する。

        Args:
            user_prompt (str): ユーザプロンプト
            response (ChatCompletion): アシスタントプロンプト
        """
        self.chat_log.append(self.client.format_user_message(user_prompt))    # メッセージログにユーザプロンプト（リクエスト）を追加
        self.chat_log.append(self.client.format_assistant_message(response))  # メッセージログにアシスタントプロンプト（レスポンス）を追加

        # ロギング
        chat_log = {self.id: {'name': self.name, 'log': self.chat_log}}
        _LOGGER.debug('panelist_chat_log:\n%s', json.dumps(chat_log, indent=4, ensure_ascii=False))
