"""議論戦略構成器のモジュール。

以下のクラスを定義する。
- DiscussionStrategist
- DiscussionStateJudge
- DiscussionEvaluator

DiscussionStrategistは、DiscussionStateJudgeを用いて議論の状態を判定し、DiscussionEvaluatorで議論の展開を評価する。
"""
import json
import logging
import string
import numpy as np
import torch
import yaml
from transformers import pipeline, AutoTokenizer
from typing import Any
from openai.types.chat import ChatCompletion
from ai_constellation.llm_clients.base_client import BaseLLMClient
from ai_constellation.simulator.panelist import Panelist


_LOGGER = logging.getLogger(__name__)
_LOGGER.addHandler(logging.NullHandler())


class DiscussionStrategist:
    """議論戦略構成器。

    基本動作として、与えられたベースのユーザプロンプトに対して、介入文を付け足したプロンプトを生成する。
    介入文は複数パターン存在し、その中で最も良い介入文で得た応答を返却する。
    """

    def __init__(
        self,
        tail_prompts: list[str],
        state_names: list[str],
        state_judge_prompt: str,
        legal_prompts_dict: dict[str, list[int]],
        llm_client: BaseLLMClient,
        embedding_model_name: str,
        torch_device: str,
    ):
        """コンストラクタ。

        埋め込み用のパイプラインを生成する。
        また、議論状態判断器と議論評価器を生成する。
        その際、議論状態判断器と議論評価器には埋め込み用のパイプラインを渡す。
        これらのモジュールは、インスタンス変数で保持し、get_best_responseで使用する。

        Args:
            tail_prompts (list[str]): ユーザプロンプトの後ろに付け足す介入文のリスト。ベースプロンプト。
            state_names (list[str]): 議論の状態名のリスト。
            state_judge_prompt (str): 議論の状態を取得するためのプロンプト。
            legal_prompts_dict (dict[str, list[int]]): 議論の状態と使用可能なプロンプトのインデックス番号を格納した辞書。
            llm_client (BaseLLMClient): 議論状態を取得するためのLLMクライアント。
            embedding_model_name (str): 議論ログや議論の状態の埋め込み(Embedding)に使用するモデルの名前。パイプライン用。
            torch_device (str): GPU/CPUの設定。
        """
        # 基本的な戦略情報を設定
        self.tail_prompts = tail_prompts              # 後ろに追加するプロンプトのリスト
        self.legal_prompts_dict = legal_prompts_dict  # 状態をkeyとして渡すと、使用可能なプロンプトのインデックス番号のリストを返す辞書

        # 埋め込みモデルの設定（トークナイザ, 埋め込みモデル）
        tokenizer = AutoTokenizer.from_pretrained(
            embedding_model_name,                 # 埋め込みのモデル名を設定
            truncation_side='left',               # 文章長が長い場合、先頭から削る（先頭は古い発言）
        )
        embedding_pipeline = pipeline(
            model=embedding_model_name,            # 埋め込みのモデル名を設定
            task='feature-extraction',             # タスクは特徴量抽出
            tokenize_kwargs={'truncation': True},  # 文章長が長い場合、文字数カットを実行
            tokenizer=tokenizer,                   # トークナイザ
            device=torch.device(torch_device)      # GPU/CPUの設定
        )

        if state_names == [] or state_names is None:
            self.state_judge = None
        else:
            # 実行に使う議論状態判断器、議論評価器を設定
            self.state_judge = DiscussionStateJudge(
                state_names=state_names,
                state_judge_prompt=state_judge_prompt,
                llm_client=llm_client,
                embedding_pipeline=embedding_pipeline,
            )  # 状態の判断器
        self.evaluator = DiscussionEvaluator(embedding_pipeline)    # 議論の評価器

    @classmethod
    def from_yaml(cls, path: str, llm_client: BaseLLMClient) -> 'DiscussionStrategist':
        """yamlファイルから設定値を読み込み、インスタンスを生成する。

        Args:
            path (str): yamlファイルまでのパス。
            llm_client: LLMクライアント。

        Returns:
            DiscussionStrategist: 議論戦略構成器のインスタンス。
        """
        with open(path, 'r', encoding='utf-8') as fp:
            config = yaml.safe_load(fp)
        return cls(
            tail_prompts=config['tail_prompts'],
            legal_prompts_dict=config['legal_prompts_dict'],
            state_names=config['state_names'],
            state_judge_prompt=config['state_judge_prompt'],
            llm_client=llm_client,
            embedding_model_name=config['embedding_model_name'],
            torch_device=config['torch_device'],
        )

    async def get_best_response(
        self,
        previous_comments: list[str],
        base_prompt: str,
        panelist: Panelist
    ) -> ChatCompletion | Any:
        """最も良い展開になる応答を取得する。

        議論状態判断器を使用して、これまでの議論の状態を判定する。
        その状態で使用可能な介入文のリスト取得し、それぞれベースプロンプトに結合する。
        それらの各プロンプトでLLMに応答を求める。
        それらの応答を議論評価器で点数化し、最も点数の良い応答を取得する。
        応答をロギングしてから返却する。

        Args:
            previous_comments: これまでの議論ログ。
            base_prompt: 介入文を付け足すユーザプロンプト。
            panelist: パネリスト。

        Returns:
            ChatCompletion | Any: 最も良い展開になる応答。
        """
        
        if self.state_judge is None:
            # 状態に関係なく全行動集合を取得
            legal_actions = [base_prompt + tail_prompt_i
                            for i, tail_prompt_i in enumerate(self.tail_prompts)]           
        else:
            # 状態を取得
            state = await self.state_judge.eval(previous_comments)

            # 使用可能な行動集合の取得
            legal_actions = [base_prompt + tail_prompt_i
                            for i, tail_prompt_i in enumerate(self.tail_prompts)
                            if i in self.legal_prompts_dict[state]]

        # すべての行動をそれぞれ実行
        responses = await panelist.generate_wo_log(legal_actions)

        # 一番良い返答を見つける
        discussions = [previous_comments + [response_i] for response_i in responses]  # 複数の議論展開のリストを作成
        rewards = self.evaluator.eval(discussions)  # それぞれの議論展開を評価
        best_index = np.argmax(rewards)             # 最も良い展開になる応答のindexを取得
        best_response = responses[best_index]       # 最も良い展開になる応答を取得

        # ロギング
        trial_log = {
            action_i: {
                'response': response_i,
                'reward': float(reward_i)
            } for action_i, response_i, reward_i in zip(legal_actions, responses, rewards)
        }
        _LOGGER.debug('trial_log:\n%s', json.dumps(trial_log, indent=4, ensure_ascii=False))

        # 一番良い返答をした時のメッセージを覚えさせる
        # NOTE: panelist.logの中でもロギングが走る
        #       panelist.logは上のロギングのコードの実行後にしたほうが、ログが見やすい
        panelist.log(user_prompt=legal_actions[best_index], response=best_response)

        return best_response


class DiscussionStateJudge:
    """議論状態判断器。

    現在の議論の状態を判定するためのクラス。
    LLMに現在の議論の状態を尋ね、その応答が状態リストのどれに当たるかを判断する。
    """

    def __init__(
        self,
        state_names: list[str],
        state_judge_prompt: str,
        llm_client: BaseLLMClient,
        embedding_pipeline: str
    ):
        """コンストラクタ。

        コンストラクタでは、議論の状態名を埋め込みベクトルに変換する。
        変換した埋め込みベクトルは、インスタンス変数として保持し、evalに使用する。

        Args:
            state_names (list[str]): 議論の状態名のリスト。
            state_judge_prompt (str): 議論の状態を取得するためのプロンプト。
            llm_client (BaseLLMClient): 議論の状態を取得するためのLLMクライアント。
            embedding_pipeline (str): 議論の状態名やLLMの応答を埋め込みベクトルに変換するためのパイプライン。
        """
        self.state_names = state_names                # 状態の名前のリスト
        self.state_judge_prompt = state_judge_prompt  # 状態を判断するために使用するプロンプト
        self.llm_client = llm_client                  # 状態を判断するために使用するLLMクライアント
        self.embedding_pipeline = embedding_pipeline  # テキスト埋め込みのモデル

        # 状態の埋め込みを取得
        # NOTE: pipelineを使っているため、[テキスト番号][データ番号][トークン番号]を指定することで埋め込みが得られる形式で返される
        self.state_embeds = self.embedding_pipeline(self.state_names, return_tensors=True)
        self.state_embeds = [embeds[0][0].to('cpu').detach().numpy().copy() for embeds in self.state_embeds]

    async def eval(self, previous_comments: list[str]) -> str:
        """議論の状態を判定する。

        議論の状態は、LLMを使用して自然言語として回答させる。
        その回答をパイプラインを使用して埋め込みベクトルに変換する。
        その埋め込みベクトルと、議論の状態名の埋め込みベクトルとで、最も距離が近い状態名を取得する。
        取得した状態名を返却する。

        Args:
            previous_comments (list[str]): これまでの議論ログ。

        Returns:
            str: 議論の状態名。
        """
        # LLMに状態を聞く
        placeholder_map = {
            '__comments__': '\n'.join(['「' + comment + '」' for comment in previous_comments]),
            '__options__': '\n'.join(self.state_names),
        }
        prompt = string.Template(self.state_judge_prompt).safe_substitute(placeholder_map)
        request = [
            self.llm_client.format_system_message(''),    # システムプロンプトは何も設定しない
            self.llm_client.format_user_message(prompt),  # ユーザプロンプトで命令を設定
        ]
        response = await self.llm_client.generate(request)  # 回答を作成

        # LLMの回答の埋め込みを取得する
        response_embed = self.embedding_pipeline([response], return_tensors=True)
        response_embed = response_embed[0][0][0].to('cpu').detach().numpy().copy()

        # LLMの回答が一番近い状態を取得する
        distances = np.linalg.norm(self.state_embeds - response_embed)
        state_name = self.state_names[np.argmin(distances)]

        # 状態の名前を返す
        return state_name


class DiscussionEvaluator:
    """議論評価器。

    議論ログの評価を行うためのクラス。
    議論ログからいくつかの埋め込みベクトルを生成し、それらを利用して議論の展開を点数化する。
    """

    def __init__(self, embedding_pipeline):
        """コンストラクタ。

        Args:
            embedding_pipeline (str): 議論ログを埋め込みべクトルに変換するためのパイプライン。
        """
        self.embedding_pipeline = embedding_pipeline    # テキスト埋め込みのモデル

    def eval(self, discussions: list[list[tuple[str, Any] | ChatCompletion | str]]) -> float | list[float]:
        """議論を評価する。

        複数の議論ログを受け取り、それぞれ独立した点数を算出する。
        点数は、基本スコアとペナルティの積として算出する。
        基本スコアは、「議論の一番最後の発言が議論に与えた影響」によって算出される。
        ペナルティは、「議論の一番最後のコメントとその直前のコメントとの遠さ」によって算出される。

        - 基本スコアの「議論の一番最後の発言が議論に与えた影響」:
            「議論の一番最後の発言を抜いた議論ログ」と「議論の一番最後のコメントを抜かない議論ログ」の埋め込みベクトル間の距離によって算出される。
            埋め込みベクトルの距離が遠いほど良い点数とする。
        - ペナルティの「議論の一番最後のコメントとその直前のコメントとの遠さ」:
            それぞれの埋め込みベクトルの距離から算出される。
            0～1の値を取り、距離が遠いほど小さい値を取る。

        Args:
            discussion (list[list[tuple[str, Any] | ChatCompletion | str]]): 複数の議論ログ。

        Returns:
            float | list[float]: 議論の評価スコア。
        """
        # NOTE: いくつかある議論ログを一気に評価計算できるように実装している

        #### 基本スコアを計算 ####

        # 埋め込み計算のための最後のコメントを含まない/含む議論ログの文字列を取得
        prev_comments_strs = [''.join(discussion_i[:-1]) for discussion_i in discussions]   # 最後のコメントを付け加えるまでの議論ログのリスト
        all_comments_strs = [''.join(discussion_i) for discussion_i in discussions]        # 最後のコメントまですべて含めた議論ログのリスト

        # 埋め込み計算
        embeds = self.embedding_pipeline([*prev_comments_strs, *all_comments_strs], return_tensors=True)
        prev_embeds = np.vstack([embed_i[0][0].to('cpu').detach().numpy().copy()
                                 for embed_i in embeds[:len(prev_comments_strs)]])
        all_embeds = np.vstack([embed_i[0][0].to('cpu').detach().numpy().copy()
                                for embed_i in embeds[-len(all_comments_strs):]])

        # スコアを計算
        n_dims = np.array([embed_i.shape[-1] for embed_i in all_embeds])
        scores_origin = np.sqrt(np.sum((all_embeds - prev_embeds)**2, axis=-1) / n_dims)

        #### ペナルティスコアを計算 ####

        # 埋め込み計算のための「最後の発言」と「最後の一つ前の発言」の文字列を取得
        # NOTE: 議論ログが1件しかない場合は「最後の一つ前の発言」が存在しない
        #       この場合はペナルティがつかないように「最後の発言」と「最後の一つ前の発言」をどちらも空文字で置き換えている
        last_comment_strs = [''.join(discussion_i[-2]) if len(discussion_i) >= 2 else ''
                             for discussion_i in discussions]
        new_comment_strs = [''.join(discussion_i[-1]) if len(discussion_i) >= 2 else ''
                            for discussion_i in discussions]

        # 埋め込み計算
        embeds = self.embedding_pipeline([*last_comment_strs, *new_comment_strs], return_tensors=True)
        last_embeds = np.vstack([embed_i[0][0].to('cpu').detach().numpy().copy()
                                 for embed_i in embeds[:len(prev_comments_strs)]])
        new_embeds = np.vstack([embed_i[0][0].to('cpu').detach().numpy().copy()
                                for embed_i in embeds[-len(all_comments_strs):]])

        # スコアを計算
        n_dims = np.array([embed_i.shape[-1] for embed_i in new_embeds])
        distance = np.sqrt(np.sum((new_embeds - last_embeds)**2, axis=-1) / n_dims)
        penalty = np.exp(-distance)

        #### 最終スコアを計算 ####

        score = scores_origin * penalty
        return score
