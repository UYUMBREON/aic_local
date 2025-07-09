"""Local-LLMコンテナに対する疎通テスト用モジュール。"""
from openai import OpenAI
import os


API_KEY = os.environ['OPENAI_API_KEY']


def _request(
    base_url: str,
    model: str,
    messages: list[dict[str, str]],
    headers: dict[str, str] | None = None
) -> str | None:
    """指定のURLとモデルに対して、OpenAIクラスでリクエストを送信する。

    動作確認用の関数から呼び出される共通関数。

    Args:
        base_url: HTTPリクエストを送信する際に利用するベースURL。
        model: モデル名。
        messages: プロンプトのリスト。
        headers: HTTPリクエストを送信する際にヘッダーに付与するパラメータ。

    Returns:
        str | None: モデルの応答。
    """
    llm = OpenAI(
        base_url=base_url,
        api_key=API_KEY,
        default_headers=headers
    )
    completion = llm.chat.completions.create(
        model=model,
        messages=messages
    )
    return model, completion.choices[0].message.content


def test_request_fastchat_tsuzumi():
    """Tsuzumi用のFastChatサーバにOpenAIでリクエストする。

    共通関数_requestを利用してリクエストする。
    結果を標準出力する。
    動作確認用。
    """
    completion = _request(
        base_url="http://fastchat-tsuzumi7B-v1.2-api-server:30000/v1",
        model="tsuzumi-7b-v1_2-8k-instruct",
        messages=[{
            "role": "user",
            "content": "こんにちは"
        }],
        headers={
            "Authorization": "Bearer 8859b0cb"
        }
    )
    print(completion)
    """
    `headers`に`Authorization`がないと以下のようなエラーになる。
    openai.AuthenticationError: Error code: 401
    - {'detail': {'error': {'message': '', 'type': 'invalid_request_error', 'param': None, 'code': 'invalid_api_key'}}}
    """


def test_request_vllm_llama_1():
    """ELYZA-japanese-Llama-2-7b-fast-instruct用のvLLMサーバにOpenAIでリクエストする。

    共通関数_requestを利用してリクエストする。
    結果を標準出力する。
    動作確認用。
    """
    completion = _request(
        base_url="http://vLLM-ELYZA-japanese-Llama-2-7b-fast-instruct:8000/v1",
        model="ELYZA-japanese-Llama-2-7b-fast-instruct",
        messages=[{
            "role": "user",
            "content": "こんにちは"
        }]
    )
    print(completion)


def test_request_vllm_llama_2():
    """Llama-3-ELYZA-JP-8B用のvLLMサーバにOpenAIでリクエストする。

    共通関数_requestを利用してリクエストする。
    結果を標準出力する。
    動作確認用。
    """
    completion = _request(
        base_url="http://vLLM-Llama-3-ELYZA-JP-8B:8000/v1",
        model="Llama-3-ELYZA-JP-8B",
        messages=[{
            "role": "user",
            "content": "こんにちは"
        }]
    )
    print(completion)


def test_request_vllm_meta_llama_1():
    """Meta-Llama-3.1-8B-Instruct用のvLLMサーバにOpenAIでリクエストする。

    共通関数_requestを利用してリクエストする。
    結果を標準出力する。
    動作確認用。
    """
    completion = _request(
        base_url="http://vLLM-Meta-Llama-3.1-8B-Instruct:8000/v1",
        model="Meta-Llama-3.1-8B-Instruct",
        messages=[{
            "role": "user",
            "content": "こんにちは"
        }]
    )
    print(completion)


def test_request_vllm_meta_llama_2():
    """Meta-Llama-3-8B-Instruct用のvLLMサーバにOpenAIでリクエストする。

    共通関数_requestを利用してリクエストする。
    結果を標準出力する。
    動作確認用。
    """
    completion = _request(
        base_url="http://vLLM-Meta-Llama-3-8B-Instruct:8400/v1",
        model="Meta-Llama-3-8B-Instruct",
        messages=[{
            "role": "user",
            "content": "こんにちは"
        }]
    )
    print(completion)


def test_request_vllm_phi_1():
    """Phi-3-small-8k-instruct用のvLLMサーバにOpenAIでリクエストする。

    共通関数_requestを利用してリクエストする。
    結果を標準出力する。
    動作確認用。
    """
    completion = _request(
        base_url="http://vLLM-Phi-3-small-8k-instruct:8000/v1",
        model="Phi-3-small-8k-instruct",
        messages=[{
            "role": "user",
            "content": "こんにちは"
        }]
    )
    print(completion)


def main():
    """このモジュールのメイン処理。

    動作確認用の関数を連続で呼び出す。
    """
    test_request_fastchat_tsuzumi()
    test_request_vllm_llama_1()
    test_request_vllm_llama_2()
    test_request_vllm_meta_llama_1()
    test_request_vllm_meta_llama_2()
    test_request_vllm_phi_1()


if __name__ == "__main__":
    main()
