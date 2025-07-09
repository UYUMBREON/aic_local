"""汎用便利クラス・関数のパッケージ。"""
import collections
import dataclasses
import enum
import json
import logging
import os
import string
import typing
import yaml
import re


@dataclasses.dataclass
class Mappable:
    """データクラスを辞書に変換しやすくするための抽象クラス。"""

    def to_dict(self) -> collections.abc.Mapping[str, typing.Any]:
        """自身のフィールドを辞書に変換する。

        Returns:
            Mapping[str, Any]: 自身のフィールドから生成した辞書。フィールド名がキー、フィールドの値がバリュー。
        """
        return {f.name: getattr(self, f.name) for f in dataclasses.fields(self) if not f.metadata.get('__transient')}


def transient_field(
    default=dataclasses.MISSING,
    default_factory=dataclasses.MISSING,
    init: bool = False,
    repr_: bool = False,
    hash_: bool = False,
    compare: bool = False,
    metadata: collections.abc.Mapping[str, typing.Any] | None = None,
    kw_only: bool = False,
) -> typing.Any | dataclasses.Field:
    """データクラスを辞書に変換する時、辞書化の対象にならないフィールドを生成する。

    Javaのtransient修飾子の模倣。

    Args:
        default (Any): 生成するフィールドのデフォルト値。
        default_factory (Any): 生成するフィールドのデフォルト値を生成するための関数。
        init (bool): 生成するフィールドが__init__の引数として扱われるかどうか。
        repr_ (bool): 生成するフィールドが__repr__の引数として扱われるかどうか。
        hash_ (bool): 生成するフィールドが__hash__の引数として扱われるかどうか。
        compare (bool): 生成するフィールドが比較メソッド(__eq__や__lt__など)に使用されるかどうか。
        metadata (Mapping[str, Any] | None): 生成するフィールドに設定する任意のメタデータ。
        kw_only (bool): 生成するフィールドがキーワード専用引数として扱うかどうか。

    Returns:
        Any: フィールド。
    """
    metadata_ = {'__transient': True}
    if metadata is not None:
        metadata_.update(metadata)

    if default is dataclasses.MISSING and default_factory is dataclasses.MISSING:
        return dataclasses.field(
            init=init,
            repr=repr_,
            hash=hash_,
            compare=compare,
            metadata=metadata_,
            kw_only=kw_only,
        )
    elif default is dataclasses.MISSING:
        return dataclasses.field(
            default_factory=default_factory,
            init=init,
            repr=repr_,
            compare=compare,
            metadata=metadata_,
            kw_only=kw_only,
        )
    else:
        return dataclasses.field(
            default=default,
            init=init, repr=repr_,
            compare=compare,
            metadata=metadata_,
            kw_only=kw_only,
        )


class CustomJsonEncoder(json.JSONEncoder):
    """JSONのオブジェクトをダンプを簡単化するためのクラス。"""

    def default(self, o):
        """オブジェクトを指定の形式や型に変換する。

        Args:
            o: 変換対象のオブジェクト。

        Returns:
            str | dict | Any: 変換後のデータ。

        Examples:
            以下のようにjson.dumpsにクラスを渡す。
                json.dumps(self, cls=CustomJsonEncoder)
        """
        if isinstance(o, enum.Enum):
            return o.name.lower()               # 列挙型の場合、名前を小文字にして返却
        elif dataclasses.is_dataclass(o):
            return dataclasses.asdict(o)        # データクラスの場合、辞書に変換して返却
        elif isinstance(o, string.Template):
            return repr(o)                      # テンプレートの場合、文字列に変換して返却
        else:
            return super().default(o)           # どれでもない場合、上位クラスのデフォルト変換を実施して返却


class HasLogger:
    """ロギングの機能をクラスに付与するための抽象クラス。"""

    __logger: logging.Logger = transient_field()

    def __init_subclass__(cls, **kwargs):
        """具象クラスが継承のたびに呼ばれる特殊メソッド。"""
        cls.__logger = logging.getLogger(f"{cls.__module__}.{cls.__name__}")
        cls.__logger.addHandler(logging.NullHandler())

    def _log_d(self, msg: object, *args, **kwargs):
        """Debugログ。

        Args:
            msg (str): メッセージ。
        """
        self.__logger.debug(msg, *args, **kwargs)

    def _log_i(self, msg: object, *args, **kwargs):
        """Infoログ

        Args:
            msg (str): メッセージ。
        """
        self.__logger.info(msg, *args, **kwargs)

    def _log_w(self, msg: object, *args, **kwargs):
        """Warningログ

        Args:
            msg (str): メッセージ。
        """
        self.__logger.warning(msg, *args, **kwargs)

    def _log_e(self, msg: object, *args, **kwargs):
        """Errorログ

        Args:
            msg (str): メッセージ。
        """
        self.__logger.error(msg, *args, **kwargs)

    def _log_exc(self, msg: object, *args, **kwargs):
        """Exceptionログ

        Args:
            msg (str): メッセージ。
        """
        self.__logger.exception(msg, *args, **kwargs)


def yaml_ordered_dict_representer(dumper, data):
    """OrderedDictをYAMLに適した形式に変換する。

    与えられたダンパーを使用して、データをYAMLに適した形式に変換して返却する。
    ここでは、データがOrderedDictであることを前提とする。
    OrderedDictをダンプするには、この関数をリプレゼンターとしてダンパーに登録する必要がある。

    Args:
        dumper: yamlパッケージのダンパー。yaml.SafeDumperなど。
        data: 変換対象のデータ(OrderedDict)。

    Returns:
        Any: OrderedDictをYAML形式にダンプしたデータ。

    Examples:
        この関数自体は直接呼び出して使用するものではない。
        以下のようにyamlパッケージのダンパーにリプレゼンターとして登録し、振舞いを変えるために使用する。

            yaml.add_representer(OrderedDict, yaml_ordered_dict_representer, Dumper=yaml.SafeDumper)

        この例では、SageDumperがOrderedDictを変換する時に、このyaml_ordered_dict_representer関数を使用するように登録している。
    """
    return dumper.represent_mapping(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, data.items())


def yaml_multiline_string_representer(dumper, data):
    """改行を含む文字列をYAMLに適した形式に変換する。

    与えられたダンパーを使用して、データをYAMLに適した形式に変換して返却する。
    ここでは、データが文字列であることを前提としている。
    文字列に改行コードが含まれる場合は、パイプ「|」を用いた記法でYAMLに埋め込むようにする。
    改行コードを含む文字列をこの記法でダンプするには、この関数をリプレゼンターとしてダンパーに登録する必要がある。

    Args:
        dumper: yamlパッケージのダンパー。yaml.SafeDumperなど。
        data: 変換対象のデータ(文字列)。

    Returns:
        Any: 文字列をYAML形式に合うようにダンプしたデータ。

    Examples:
        この関数自体は直接呼び出して使用するものではない。
        以下のようにyamlパッケージのダンパーにリプレゼンターとして登録し、振舞いを変えるために使用する。

            yaml.add_representer(str, yaml_multiline_string_representer, Dumper=yaml.SafeDumper)

        この例では、SageDumperが文字列を変換する時に、このyaml_multiline_string_representer関数を使用するように登録している。
    """
    if "\n" in data or "\r" in data:
        # 改行コードをLFに統一する
        data = re.sub('\r\n', '\n', data)
        data = re.sub('\r', '\n', data)
        # yamlの仕様で改行コードの前にスペースが入ると、うまくパイプで書けないので置換する
        data = re.sub(' +\n', '\n', data)
        return dumper.represent_scalar(yaml.resolver.BaseResolver.DEFAULT_SCALAR_TAG, data, style='|')
    return dumper.represent_scalar(yaml.resolver.BaseResolver.DEFAULT_SCALAR_TAG, data)


def replace_env_variable(text: str) -> str:
    """テキスト内に埋め込まれた環境変数を値に置き換える。

    テキストには環境変数が以下の形式で含まれる。(ENV_VARが環境変数)

        ${ENV_VAR}

    または

        ${ENV_VAR:default_value}

    これらの`${ENV_VAR}`にOSに登録された環境変数ENV_VARの値を当てはめる。
    コロンが含まれる場合は、コロンの左側を環境変数、右側を初期値と見なす。
    初期値は環境変数がOSに存在していなかった時に用いられる。

    Args:
        text (str): 処理対象のテキスト。

    Returns:
        str: 環境変数置き換え後のテキスト。

    Examples:
        以下のように出力される。

            os.environ['API_KEY'] = 'xxxx'
            src_text = r'This is your API_KEY: ${API_KEY}!'
            dest_text = replace_env_variable(src_text)
            print(dest_text)
            # This is your API_KEY: xxxx!
    """
    # パターンにマッチした文字列を抽出
    pattern: re.Pattern[str] = re.compile(r'\${(.*?)}')
    matches: list[str] = pattern.findall(text)
    # 抽出した文字列ごとに環境変数を取得し、元のテキストに置換処理
    for match in matches:
        # 環境変数を取得(コロンが存在している場合は分割して初期値も取得)
        if ":" in match:
            env_var, default_value = match.split(":", 1)
            env_value = os.getenv(env_var, default_value)  # 環境変数が見つからない場合は初期値を利用
        else:
            env_value = os.getenv(match, f"${{{match}}}")  # 環境変数が見つからない場合は元の文字列のまま
        # 元のテキスト中の環境変数を値に置換
        text = text.replace(f"${{{match}}}", env_value)
    return text
