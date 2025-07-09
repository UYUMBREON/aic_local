FROM nvidia/cuda:12.1.1-cudnn8-devel-ubuntu22.04

ENV LANG C.UTF-8
ENV LC_ALL C.UTF-8
ENV SHELL /bin/bash

ARG tmp_dir=/tmp/docker_work
ARG python_version=3.10.13
ARG fastchat_dir=FastChat
ARG tsuzumi_dir=.

# 環境の最新化
RUN apt update -y && \
    apt upgrade -y
RUN apt reinstall -y glibc-source
RUN apt reinstall -y language-pack-ja-base language-pack-ja

# 環境変数指定
RUN locale-gen ja_JP.UTF-8
ENV LANG="ja_JP.UTF-8" \
    LANGUAGE="ja_JP:ja" \
    LC_ALL="ja_JP.UTF-8" \
    TZ=Asia/Tokyo \
    LD_LIBRARY_PATH=${richidx_home}/lib:/usr/local/lib \
    PYTHONPATH=$PYTHONPATH:${richidx_home}/lib \
    PATH=/usr/local/bin:${PATH:-}:${richidx_home}/bin
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone

RUN apt update -y \
    && apt upgrade -y \
    && apt clean \
    && apt install -y \
        libbz2-dev \
        libdb-dev \
        libffi-dev \
        libgdbm-dev \
        liblzma-dev \
        libncursesw5-dev \
        libreadline-dev \
        libsqlite3-dev \
        libssl-dev \
        uuid-dev \
        zlib1g-dev \
        tk-dev \
        build-essential \
        curl \
        automake \
        libtool \
    && rm -rf /var/cache/apt/*

# Pythonビルド
RUN curl -SL https://www.python.org/ftp/python/${python_version}/Python-${python_version}.tgz \
        | tar xz \
    && cd Python-${python_version} \
    && CFLAGS=$(pkg-config --cflags openssl11) LDFLAGS=$(pkg-config --libs openssl11) ./configure --enable-shared  --with-lto \
    && make \
    && make install \
    && ldconfig /usr/local/lib \
    && cd - \
    && rm ./Python-${python_version} -r \
    && python3.10 -m pip install --upgrade pip

RUN python3 -m pip install --upgrade pip
RUN pip install --upgrade pip

RUN apt install -y --no-install-recommends tzdata && \
    rm -f /etc/localtime && \
    cp -f /usr/share/zoneinfo/Japan /etc/localtime

COPY ${fastchat_dir} /FastChat
RUN cd FastChat \
    && pip install -e ".[model_worker]" \
    && cd -

COPY ${tsuzumi_dir}/requirements.for_tsuzumi.txt /
RUN pip install -r /requirements.for_tsuzumi.txt
RUN pip install flash-attn@https://github.com/Dao-AILab/flash-attention/releases/download/v2.5.9.post1/flash_attn-2.5.9.post1+cu122torch2.3cxx11abiFALSE-cp310-cp310-linux_x86_64.whl
RUN mkdir /model /output /.cache && chmod 777 /.cache

WORKDIR /FastChat
