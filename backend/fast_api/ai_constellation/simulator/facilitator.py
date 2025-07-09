"""AI-Constellationシミュレータのうちのファシリテータのモジュール。

DebateContextとFaicilitatorを定義する。
FacilitatorはDebateContextで議論の状態を保持する。
"""
import dataclasses
import json
import logging
import pathlib
import string
from typing import Any
import re
import yaml

from openai.types.chat import ChatCompletion

from ai_constellation.common.utils import Mappable
from ai_constellation.llm_clients.base_client import BaseLLMClient
from ai_constellation.llm_clients.simple_client import SimpleLLMClient
from ai_constellation.simulator.panelist import Panelist
from ai_constellation.tech.discussion_strategist import DiscussionStrategist

_LOGGER = logging.getLogger(__name__)
_LOGGER.addHandler(logging.NullHandler())


@dataclasses.dataclass
class DiscussionLog(Mappable):
    """議論ログ。

    議題、コメントしたパネリスト、コメント等の情報を保持する。

    Attributes:
        agenda (str): 議題。
        panelist_id (str): パネリストID。
        panelist_name (str): パネリスト名。
        panelist_persona (str): パネリストのペルソナ。
        commnet (ChatCompletion): コメント。LLMからの応答が格納される。
    """
    agenda: str
    panelist_id: str
    panelist_name: str
    panelist_persona: str
    comment: ChatCompletion | Any


@dataclasses.dataclass
class DebateContext:
    """議論の文脈。

    パネリストの構成、各種プロンプト、議題、現在のターン数、議論ログなど、現在の議論を構成するデータをまとめて保持する。

    Attributes:
        panelists (list[Panelist]): パネリスト一覧。
        panelist_names (list[str]): パネリストの名前一覧。
        panelist_personas (list[str]): パネリストのペルソナ一覧。
        panelist_characteristics (list[str]): パネリストのキャラクター一覧。
        panelist_models (list[str]): パネリストの使用するLLM。
        system_prompt (str): システムプロンプト。
        first_user_prompt (str): 議論の1人目のユーザプロンプト。
        subsequent_user_prompt (str): 議論の2人目以降のユーザプロンプト。
        additional_first_user_prompt (str): 追加議論の1人目のユーザプロンプト。
        additional_subsequent_user_prompt (str): 追加議論の2人目以降のユーザプロンプト。
        additional_last_user_prompt (str): 追加議論の最後のユーザプロンプト。
        num_discussion_turn (int): 議論のターン数。
        agendas (list[str]): 議題リスト。
        use_strategy: 議論戦略構成器を使用するか否か。
        lang: 言語。日本語(ja)か英語(en)か。
        discussion_log (list[DiscussionLog]): 議論ログ。
    """
    panelists: list[Panelist] = dataclasses.field(default_factory=list)
    panelist_names: list[str] = dataclasses.field(default=list)
    panelist_personas: list[str] = dataclasses.field(default_factory=list)
    panelist_characteristics: list[str] = dataclasses.field(default_factory=list)
    panelist_models: list[str] = dataclasses.field(default_factory=list)
    system_prompt: str = ''
    first_user_prompt: str = ''
    subsequent_user_prompt: str = ''
    additional_first_user_prompt: str = ''
    additional_subsequent_user_prompt: str = ''
    additional_last_user_prompt: str = ''
    num_discussion_turn: int = 1
    agendas: list[str] = dataclasses.field(default_factory=list)
    use_strategy: bool = False
    lang: str = 'en'
    discussion_log: list[DiscussionLog] = dataclasses.field(default_factory=list)

    @property
    def current_agenda(self) -> str:
        """現在の議題を取得する。

        Returns:
            str: 現在の議題。
        """
        if self.agendas:
            return self.agendas[-1]
        else:
            return ''

    @property
    def last_agenda(self) -> str:
        """最後の議題を取得する。

        Returns:
            str: 最後の議題。
        """
        if len(self.agendas) > 1:
            return self.agendas[-2]
        else:
            return ''


class Facilitator:
    """ファシリテータ。

    議論の進行を担う。
    基本動作として、議論の開始と共に、各パネリストに議題に対する発言を求める。
    条件によっては、議論戦略構成器を使用した議論への介入も行う。
    それらの発言を議論ログとして、DebateContext内で保持する。
    """

    def __init__(
        self,
        panelist_names: list[str],
        panelist_personas: list[str],
        panelist_characteristics: list[str],
        panelist_models: list[str],
        system_prompt: str,
        first_user_prompt: str,
        subsequent_user_prompt: str,
        additional_first_user_prompt: str,
        additional_subsequent_user_prompt: str,
        additional_last_user_prompt: str,
        num_discussion_turn: int,
    ):
        """コンストラクタ。

        議論進行に必要な各種モジュールを生成する。

        - LLMクライアント
        - パネリスト
        - DebateContext
        - 議論戦略構成器

        これらをインスタンス変数として保持し、start_discussionで使用する。

        Args:
            panelist_personas (list[str]): パネリストのペルソナ一覧。
            panelist_names (list[str]): パネリストの名前一覧。
            panelist_characteristics (list[str]): パネリストのキャラクター一覧。
            panelist_models (list[str]): パネリストの使用するLLM。
            system_prompt (str): システムプロンプト。
            first_user_prompt (str): 議論の1人目のユーザプロンプト。
            subsequent_user_prompt (str): 議論の2人目以降のユーザプロンプト。
            additional_first_user_prompt (str): 追加議論の1人目のユーザプロンプト。
            additional_subsequent_user_prompt (str): 追加議論の2人目以降のユーザプロンプト。
            additional_last_user_prompt (str): 追加議論の最後のユーザプロンプト。
            num_discussion_turn (int): 議論のターン数。
        """
        # 出力ファイルを設定
        self.result_dir = pathlib.Path("./logs")

        # モデル情報を取得
        model_list = list(set(panelist_models))
        model_config_path = pathlib.Path('./ai_constellation/llm_clients/models.yml')
        if not model_config_path.exists():
            raise FileNotFoundError('models.ymlが見つかりません')
        with model_config_path.open('r', encoding='utf-8') as f:
            model_config: dict = yaml.safe_load(f)

        # クライアントを作成
        self.clients: dict[str, BaseLLMClient] = {}
        for model_tag in model_list:
            model_dict: dict = model_config.get(model_tag, None)
            if model_dict is not None:
                self.clients[model_tag] = self.create_client(model_tag, model_dict)

        # OpenAIのクライアントが無い場合は生成する（議論戦略構成器で使用するため）
        if 'OpenAI' not in self.clients:
            self.clients['OpenAI'] = self.create_client('OpenAI', model_config.get('OpenAI', None))

        # 設定値を作成
        self.context = DebateContext(
            panelists=[],
            panelist_names=panelist_names,
            panelist_personas=panelist_personas,
            panelist_characteristics=panelist_characteristics,
            panelist_models=panelist_models,
            system_prompt=system_prompt,
            first_user_prompt=first_user_prompt,
            subsequent_user_prompt=subsequent_user_prompt,
            additional_first_user_prompt=additional_first_user_prompt,
            additional_subsequent_user_prompt=additional_subsequent_user_prompt,
            additional_last_user_prompt=additional_last_user_prompt,
            num_discussion_turn=num_discussion_turn,
        )

        # パネリストを作成し、コンテキストに設定
        for i, (name, persona, characteristic, model_tag) in enumerate(zip(
            self.context.panelist_names,
            self.context.panelist_personas,
            self.context.panelist_characteristics,
            self.context.panelist_models
        )):
            # システムプロンプトを作成
            placeholder_map = {'__persona__': persona, '__characteristics__': characteristic}  # 代入する値を設計（${__persona__}, ${__characteristics__}）
            system_prompt = string.Template(self.context.system_prompt).safe_substitute(placeholder_map)  # システムプロンプトに代入

            # パネリストを作成し、コンテキストのリストに追加
            panelist_i = Panelist(
                id=str(i),                       # IDを設定
                name=name,                       # パネリスト名
                persona=persona,                 # ペルソナ
                client=self.clients[model_tag],  # OpenAIのクライアントを設定
                system_prompt=system_prompt,     # システムプロンプトを設定
            )
            self.context.panelists.append(panelist_i)

        # 議論戦略構成器の作成
        self.strategist = DiscussionStrategist.from_yaml(
            path='./ai_constellation/tech/strategist_config.yml',
            llm_client=self.clients['OpenAI'],
        )

    # クライアントのインスタンスを生成
    def create_client(self, model_tag: str, model_dict: dict) -> BaseLLMClient:
        """LLMクライアントを生成する。

        Args:
            model_tag (str): モデルの種類を示すタグ。
            model_dict (dict): モデルの情報が格納された辞書。

        Returns:
            BaseLLMClient: LLMクライアントのインスタンス。
        """
        _model_dict = {k: v for k, v in model_dict.items()}  # 副作用を避けて元の辞書からコピーした辞書を使う
        model_version = _model_dict.pop("version")  # "version"だけ取り出す
        return SimpleLLMClient(
            model_tag=model_tag,
            model_version=model_version,
            **_model_dict
        )

    async def start_discussion(
        self,
        agenda: str,
        is_continue: bool,
        use_strategy: bool | None = None,
        lang: str = None
    ):
        """議論を開始する。

        非同期ジェネレータとして、1ターンずつ議論ログを返却する。
        議論ログは、発言の種別、発言したパネリストのパネリスト名、発言の内容で構成されている。

        Args:
            agenda (str): 議題。
            is_continue (bool): 追加議論か否か。
            use_strategy (bool | None): 議論戦略構成器を使用するか否か。
            lang (str): 言語。日本語(ja)か英語(en)か。

        Yields:
            tuple[str, str, str] : 発言の種別、発言したパネリストのパネリスト名、発言内容のタプル。
        """
        # 議題（指示文）の変更
        self.context.agendas.append(agenda)
        # 議論戦略構成器の使用可否を変更
        if use_strategy is not None:
            self.context.use_strategy = use_strategy
        # 言語の変更
        if lang is not None:
            self.context.lang = lang

        # ラウンドを実行
        for turn in range(1, self.context.num_discussion_turn + 1):
            # ラウンドのログを出力
            yield 'system_info', 'system', f'======== ターン{turn} ========'

            # 各パネリストに発言をさせる
            for panelist_no, panelist in enumerate(self.context.panelists):

                # テンプレートを選択、プレイスホルダ置換
                prompt_template = self.get_prompt_template(is_continue, turn, panelist_no)
                user_prompt = self.substitute_placeholder(prompt_template, panelist.id)

                # LLMの回答を取得
                # NOTE: 各ラウンドで2ターン目の発言者から介入が入るように設計している
                if self.context.use_strategy and panelist_no >= 1:
                    _LOGGER.info("facilitator.start_discussion getting response by strategist: " +
                                 f"use_strategy={ self.context.use_strategy}, panelist_no={panelist_no}")
                    # 「介入中」の議論ログを一時返却
                    intervening_text = 'ファシリテータAIの議論への介入中' \
                        if self.context.lang == "ja" else 'Intervening in the discussion by a facilitator AI'
                    yield 'opt_info', 'optimizer', intervening_text
                    # 各介入を実施し、一番良い返答を取得
                    response = await self.strategist.get_best_response(
                        previous_comments=[log.comment for log in self.context.discussion_log],
                        base_prompt=user_prompt,
                        panelist=panelist,
                    )
                else:
                    _LOGGER.info("facilitator.start_discussion getting response by panelist: " +
                                 f"use_strategy={self.context.use_strategy}, panelist_no={panelist_no}")
                    response = await panelist.generate(user_prompt)

                # 議論ログに格納
                response_log = DiscussionLog(
                    agenda=agenda,
                    panelist_id=panelist.id,
                    panelist_name=panelist.name,
                    panelist_persona=panelist.persona,
                    comment=response
                )
                self.context.discussion_log.append(response_log)

                # ロギング
                _LOGGER.debug('discussion_response_log:\n%s', json.dumps(response_log.to_dict(), indent=4, ensure_ascii=False))

                # 返却
                yield 'message', panelist.name, response

        # ロギング
        _LOGGER.debug(
            'discussion_history_log:\n%s',
            json.dumps([log.to_dict() for log in self.context.discussion_log], indent=4, ensure_ascii=False)
        )

        yield None, None, None  # AsyncGenratorでreturnを使用するとエラーになるのでyieldで返却する

    ################ プロンプト作成のための関数 ################

    def get_prompt_template(self, is_continue: bool, turn: int, panelist_no: int) -> string.Template:
        """条件に応じたプロンプトテンプレートを取得する。

        Args:
            is_continue (bool): 追加議論か否か。
            turn (int): ターン数。
            panelist_no (int): パネリストの順番。

        Returns:
            Template: プロンプトテンプレート。
        """
        # ユーザの入力が2回目以降の場合
        if is_continue:
            # 議題が切り替わった直後
            if turn == 1:
                if panelist_no == 0:
                    prompt_template = self.context.additional_first_user_prompt  # 最初の人
                elif panelist_no == len(self.context.panelists) - 1:
                    prompt_template = self.context.additional_last_user_prompt  # 最後の人
                else:
                    prompt_template = self.context.additional_subsequent_user_prompt  # 他の人
            # 議題が切り替わって時間がたった後
            else:
                prompt_template = self.context.subsequent_user_prompt

        # ユーザの入力が1回目の場合
        else:
            if panelist_no == 0:
                prompt_template = self.context.first_user_prompt     # 最初の人
            else:
                prompt_template = self.context.subsequent_user_prompt   # 他の人

        return string.Template(prompt_template)

    def substitute_placeholder(self, prompt_template: string.Template, panelist_id: str) -> str:
        """プロンプトテンプレートのプレイスホルダをそれぞれの値に置換する。

        Args:
            prompt_template (Template): プロンプトテンプレート。
            panelist_id (str): パネリストのID。

        Returns:
            str: 置換後の文字列。
        """
        prefix = "「"
        suffix = "」"
        current_agenda = self.context.current_agenda
        last_agenda = self.context.last_agenda

        # プレイスホルダのマッピングの辞書
        placeholder_mapping = {}

        # 2個重なっているprefix, suffixを1個分に調整する関数を作成
        redundant_prefix_pattern = re.compile(rf'^{prefix}{prefix}')
        redundant_suffix_pattern = re.compile(rf'{suffix}{suffix}$')

        def clean_redundant(target: str):
            ret = redundant_prefix_pattern.sub(prefix, target)
            ret = redundant_suffix_pattern.sub(suffix, ret)
            return ret

        # panelist_idのパネリストがまだ見ていない、特定の議題に対する発言履歴を構成する関数
        # NOTE: 各議題で1人1回は話している想定の実装
        def extract_unseen_comments(agenda: str):
            # panelist_idが以前に発言した後のログ（つまり見ていない部分）をすべて取り出す
            tgt_logs: list[DiscussionLog] = []
            for log in self.context.discussion_log[::-1]:
                if panelist_id == log.panelist_id:
                    break
                tgt_logs.append(log)
            tgt_logs = tgt_logs[::-1]

            # 特定の議題のログだけ取り出す
            tgt_logs = [log for log in tgt_logs if log.agenda == agenda]

            # 発言履歴を作成
            comments = []
            for log in tgt_logs:
                panelist_name = log.panelist_name
                comment = clean_redundant(f'{prefix}{log.comment}{suffix}')
                comments.append(f'{panelist_name} : {comment}')
            comments_str = '\n'.join(comments)

            # 返却
            return comments_str

        # 「一つ前の議題で自分の後に発言したパネリストの発言履歴」のプレイスホルダ（${__opponents_comments_on_last_agenda__}）の値を作成
        if '${__opponents_comments_on_last_agenda__}' in prompt_template.template:
            if not last_agenda:
                raise Exception('${__opponents_comments_on_last_agenda__} is used. but last_agenda is None.')
            placeholder_mapping['__opponents_comments_on_last_agenda__'] = extract_unseen_comments(last_agenda)

        # 「現在の議題で自分より前に発言したパネリストの発言履歴」のプレイスホルダ（${__opponents_comments_on_current_agenda__}）の値を作成
        if '${__opponents_comments_on_current_agenda__}' in prompt_template.template:
            if not current_agenda:
                raise Exception('${__opponents_comments_on_current_agenda__} is used. but current_agenda is None.')
            placeholder_mapping['__opponents_comments_on_current_agenda__'] = extract_unseen_comments(current_agenda)

        # 「現在の議題」「一つ前の議題」のプレイスホルダの値を作成
        placeholder_mapping['__last_agenda__'] = last_agenda  # ${__last_agenda__}の代入
        placeholder_mapping['__current_agenda__'] = current_agenda  # ${__current_agenda__}の代入

        # テンプレートに代入
        prompt = prompt_template.safe_substitute(placeholder_mapping)

        return prompt
