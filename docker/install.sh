#!/usr/bin/env bash

set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "root required: sudo $0" >&2; exit 1; }

curl -fsSL https://get.docker.com -o get-docker.sh

DOWNLOAD_URL=https://mirrors.ustc.edu.cn/docker-ce sh get-docker.sh

rm -f get-docker.sh

usermod -aG docker "${SUDO_USER:-$USER}"

echo "User added to docker group. Re-login or run: newgrp docker"
