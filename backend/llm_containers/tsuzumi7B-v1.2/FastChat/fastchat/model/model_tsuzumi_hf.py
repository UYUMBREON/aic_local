"""
Inference code for hugging face transfomers by tsuzumi.
"""
from typing import Iterable, Optional, Dict
from threading import Thread
from transformers import TextIteratorStreamer
from fastapi.exceptions import RequestValidationError
import torch
import gc

def get_response_json(message,status,completion_tokens_len=0,input_echo_len=0):
    return {
        "text": message,
        "usage": {
            "prompt_tokens": input_echo_len,
            "completion_tokens": completion_tokens_len,
            "total_tokens": input_echo_len + completion_tokens_len,
        },
        "finish_reason": status
    }

#HFのモデルの推論パラメータを作る
def make_gen_params(tokenizer, params):
    temperature = float(params.get("temperature", 0.7))
    repetition_penalty = float(params.get("repetition_penalty", 1.15))
    top_p = float(params.get("top_p", 0.9))
    top_k = int(params.get("top_k", 0))
    max_new_tokens = int(params.get("max_new_tokens",500))
    min_new_tokens = int(params.get("min_new_tokens",1))
    no_repeat_ngram_size = int(params.get("no_repeat_ngram_size",0))
    do_sample = params.get("do_sample", True)
    use_cache = params.get("use_cache", True)
    early_stopping = params.get("early_stopping", False)
    gen_params = {
        "temperature": temperature,
        "num_beams": 1,
        "top_p": top_p,
        "top_k": top_k,
        "max_new_tokens": max_new_tokens,
        "min_new_tokens": min_new_tokens,
        "repetition_penalty": repetition_penalty,
        "no_repeat_ngram_size": no_repeat_ngram_size,
        "do_sample": do_sample,
        "use_cache": use_cache,
        "early_stopping": early_stopping,
    }

    if(tokenizer.pad_token_id != None):
        gen_params["pad_token_id"] = tokenizer.pad_token_id
    else:
        gen_params["pad_token_id"] = tokenizer.eos_token_id
    if(tokenizer.eos_token_id != None):
        gen_params["eos_token_id"] = tokenizer.eos_token_id

    return gen_params

def generate_stream_tsuzumi_hf(
    model,
    tokenizer,
    params: Dict,
    device: str,
    context_len: int,
    stream_interval: int = 2,
    judge_sent_end: bool = False,
):
    # パラメータ取得
    prompt = params["prompt"]
    gen_params = make_gen_params(tokenizer, params)
    stop_list = params["stop"]

    try:
        # ストリーム生成
        streamer,thread,input_echo_len = get_streamer(model, tokenizer, prompt, gen_params)
        if input_echo_len > context_len:
            raise RequestValidationError("Input tokens {} exceeds limit of {}".format(input_echo_len, context_len))
    except Exception as e:
        # 例外処理
        print("[ERROR] hf get_streamer:", str(e))
        raise e
    else:
        try:
            # ストリーム処理
            thread.start()
            for response in make_response_stream(streamer, tokenizer, stop_list, input_echo_len):
                yield response
        except Exception as e:
            # 例外処理
            print("[ERROR] hf make_response_stream:", str(e))
            raise e
    finally:
        # キャッシュ解放
        gc.collect()
        torch.cuda.empty_cache()
        if device == "xpu":
            torch.xpu.empty_cache()
        if device == "npu":
            torch.npu.empty_cache()


#ストリーミング表示用にレスポンスを作成する
def make_response_stream(streamer, tokenizer, stop_list, input_echo_len):
    text = ""
    completion_tokens_len=0
    # ストリーミングで生成結果を取得する
    stoped = False
    for output in streamer:
        # stop済みの場合
        if stoped:
            break
        if not output:
            continue
        if "Internal Server Error" in output:
            text += output.replace("Internal Server Error"+":","")
            response = get_response_json(
                    text,"stop",
                    completion_tokens_len=completion_tokens_len,
                    input_echo_len=input_echo_len)
        else:
            text += output
            response = get_response_json(
                    text,None,
                    completion_tokens_len=completion_tokens_len,
                    input_echo_len=input_echo_len)

        for stop in stop_list:
            # 文字列がトークン単位ではないため、フレーズと全体の双方をチェック
            # 後方のみでは、
            #   stop=「と」
            #   output=「ということは」
            #   text=「というこ」
            # のように複数同じもを含む場合に、位置が正しくなくなる
            stop_pos = output.find(stop, 0)
            if stop_pos > -1:
                text = text[0:len(text) - len(output) + stop_pos]
            else:
                stop_pos = text.rfind(stop, 0)
                if stop_pos > -1:
                    text = text[0:stop_pos]

            if (stop_pos > -1):
                stoped = True
                completion_tokens_len = len(tokenizer(text).input_ids)
                if "<|endoftext|>" == stop:
                    # 予約の終了トークンの場合
                    completion_tokens_len -= 1
                response = get_response_json(text ,"stop",
                                            completion_tokens_len=completion_tokens_len,
                                            input_echo_len=input_echo_len
                                            )
        yield response


#HF版のモデルを使用しストリーミング表示をした時にErrorをRaiseする仕組み
def wrapper_generatiton(model, gen_params):
    try:
        model.generate(**gen_params)
    except Exception as e:
        gen_params["streamer"].on_finalized_text("{}:{}".format("Internal Server Error" ,str(e)),stream_end=True)

#HFのモデルを使用して推論しストリーミング表示で結果を得る処理
@torch.no_grad()
def get_streamer(model, tokenizer, prompt, gen_params):
    text = prompt
    text_len = len(text)
    generate_len = 0
    use_attention_flag = True
    token_ids = tokenizer(text, padding=True, return_tensors="pt")
    input_echo_len = len(token_ids["input_ids"][0])
    #streamerを推論パラメータに仕込むことによって、1tokenずつ取得する口を作る
    streamer = TextIteratorStreamer(tokenizer=tokenizer,skip_prompt=True)
    gen_params["input_ids"]=token_ids['input_ids'].to(model.device)
    gen_params["streamer"] = streamer
    if use_attention_flag:
        gen_params["attention_mask"]=token_ids['attention_mask'].to(model.device)
    else:
        pass
    thread_params = {
        "model": model,
        "gen_params": gen_params
    }
    thread = Thread(target=wrapper_generatiton, kwargs=thread_params)
    return streamer,thread,input_echo_len
