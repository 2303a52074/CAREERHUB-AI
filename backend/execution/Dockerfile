FROM python:3.12-slim

RUN apt-get update \
    && apt-get install -y --no-install-recommends g++ default-jdk-headless nodejs \
    && rm -rf /var/lib/apt/lists/* \
    && useradd --uid 10001 --create-home --shell /usr/sbin/nologin runner

COPY execute.py /usr/local/bin/careerhub-execute
RUN chmod 0555 /usr/local/bin/careerhub-execute

USER 10001:10001
WORKDIR /tmp
ENTRYPOINT ["python3", "/usr/local/bin/careerhub-execute"]
