"""LLMクライアントの抽象クラスのパッケージ。

抽象クラスとしてBaseLLMClientを定義する。
"""
import collections
import typing
import openai
import openai.types.chat
import asyncio
from concurrent.futures import ThreadPoolExecutor


@typing.runtime_checkable
class BaseLLMClient(typing.Protocol):
    """LLMクライアントの抽象クラス。

    LLMを搭載したサーバにWebAPIリクエストを送信する際、クライアントの役割を担う。
    メッセージをプロンプトとして送信し、応答を得る。
    リクエストの送受信には、OpenAIのSDKを使用する。

    Attributes:
        _model_version (str): モデルバージョン。モデル名とモデルのバージョン情報を示すもの。
        _client (OpenAI): クライアントモジュール。メッセージをLLMに送信する際に使用。
    """
    _model_version: str
    _client: openai.OpenAI

    async def generate(
        self,
        messages: collections.abc.Iterable[openai.types.chat.ChatCompletionMessageParam],
        temperature: float | None = None,
        top_p: float | None = None,
        max_tokens: int | None = None
    ) -> openai.types.chat.ChatCompletion:
        """文章を生成する。

        Args:
            messages (Iterable[ChatCompletionMessageParam]): プロンプトのリスト。
            temperature (float | None): 生成のランダム性の度合。
            top_p (float | None): 核サンプリング。
            max_tokens (int | None): 最大トークン数。

        Returns:
            ChatCompletion: 生成結果。
        """
        # 引数が設定されている場合は、その値を利用
        create_params = {}
        if temperature is not None:
            create_params['temperature'] = temperature
        if top_p is not None:
            create_params['top_p'] = top_p
        if max_tokens is not None:
            create_params['max_tokens'] = max_tokens

        # 生成処理を関数化
        def _create():
            return self._client.chat.completions.create(
                model=self._model_version,
                messages=messages,
                **create_params,
            )

        # 非同期として生成
        loop = asyncio.get_running_loop()
        with ThreadPoolExecutor() as executor:
            result = await loop.run_in_executor(executor, _create)
            return result.choices[0].message.content  # 結果のテキストのみ取得して返却

    @staticmethod
    def format_system_message(prompt: str) -> dict[str, str]:
        """テキストに対して、システムプロンプトの属性を付与して、API用のメッセージを生成する。

        Args:
            prompt: 付与対象のプロンプト

        Returns:
            dict[str, str]: API用の形式のメッセージ。
        """
        return {'role': 'system', 'content': prompt}

    @staticmethod
    def format_user_message(prompt: str) -> dict[str, str]:
        """テキストに対して、ユーザプロンプトの属性を付与して、API用のメッセージを生成する。

        Args:
            prompt: 付与対象のプロンプト

        Returns:
            dict[str, str]: API用の形式のメッセージ。
        """
        return {'role': 'user', 'content': prompt}

    @staticmethod
    def format_assistant_message(prompt: str) -> dict[str, str]:
        """テキストに対して、アシスタントプロンプトの属性を付与して、API用のメッセージを生成する。

        Args:
            prompt: 付与対象のプロンプト

        Returns:
            dict[str, str]: APIに送信できる形式のメッセージ。
        """
        return {'role': 'assistant', 'content': prompt}
