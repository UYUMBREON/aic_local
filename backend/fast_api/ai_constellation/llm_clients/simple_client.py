"""LLMクライアントのパッケージ。

抽象クラスBaseLLMClientを継承するSimpleLLMClientを定義する。
"""
import httpx
import logging
import openai
import openai.types.chat
from openai._types import Timeout, NotGiven
from openai._constants import DEFAULT_MAX_RETRIES
from typing import Union, Mapping
from ai_constellation.llm_clients.base_client import BaseLLMClient
from ai_constellation.common.utils import replace_env_variable


class SimpleLLMClient(BaseLLMClient):
    """任意のLLMに対応するLLMクライアント。

    LLMに対してリクエストを送る際に使用する。
    OpenAIのSDKが対応する範囲内で、任意のLLMに対応する。
    """

    def __init__(
        self,
        model_tag: str,
        model_version: str,
        *,
        api_key: str | None = None,
        organization: str | None = None,
        project: str | None = None,
        base_url: str | httpx.URL | None = None,
        timeout: Union[float, Timeout, None, NotGiven] = NotGiven(),
        max_retries: int = DEFAULT_MAX_RETRIES,
        default_headers: Mapping[str, str] | None = None,
        default_query: Mapping[str, object] | None = None,
        strict_response_validation: bool = False
    ):
        """コンストラクタ。

        OpenAIのSDKからクライアントモジュールを生成する。
        クライアントモジュールには与えられた引数一式をそのまま渡す。
        そのため、多くの引数はOpenAIのSDKの仕様に準拠する。

        生成したクライアントモジュールは、インスタンス変数として保持し、generateで使用する。
        ユーザが指定したモデルタグや、どのバージョンモデルが使われるかの情報も、同様に保持する。

        Args:
            model_tag (str): ユーザが指定した任意のモデルタグ。設定ファイル等で使われる識別子。
            model_version (str): モデル名とバージョン。`gpt-4o-2024-05-13`など。
            api_key (str | None): APIキー。文字列内に環境変数が含まれていれば展開する。
            organization (str | None): 登録組織ID。
            project (str | None): 登録プロジェクトID。
            base_url (str | httpx.URL | None): HTTPリクエストを送信する際にヘッダーに付与するパラメータ。
            timeout (Union[float, Timeout, None, NotGiven]): タイムアウトする秒数(単位:秒)。
            max_retries (int): 最大リトライ数。
            default_headers (Mapping[str, str] | None): HTTPリクエストを送信する際にヘッダーに付与するパラメータ。
            default_query (Mapping[str, str] | None): HTTPリクエストを送信する際のクエリパラメータ。
            strict_response_validation (bool): LLMの応答に厳密なバリデーションチェックを行うか。
        """
        # モデルタグ
        self._model_tag = model_tag
        # モデルバージョン
        self._model_version = model_version
        # APIキーについては、文字列内に含まれてる環境変数を展開
        if api_key is not None:
            api_key = replace_env_variable(api_key)
        # クライアントをセット
        self._client = openai.OpenAI(
            api_key=api_key,
            organization=organization,
            project=project,
            base_url=base_url,
            timeout=timeout,
            max_retries=max_retries,
            default_headers=default_headers,
            default_query=default_query,
            http_client=None,
            _strict_response_validation=strict_response_validation
        )
        # ロガーをセット
        self._logger = logging.getLogger(f'{self.__class__.__module__}.{self.__class__.__name__})')
        self._logger.addHandler(logging.NullHandler())
