#!/usr/bin/env bash

set -euo pipefail

[ "$(id -u)" = 0 ] || { echo "root required: sudo $0" >&2; exit 1; }

echo "Removing all existing APT sources..."
rm -f /etc/apt/sources.list.d/*

echo "Setting USTC mirror for Debian trixie..."

printf '%s' 'Types: deb
URIs: http://mirrors.ustc.edu.cn/debian
Suites: trixie trixie-updates
Components: main contrib non-free non-free-firmware
Signed-By: /usr/share/keyrings/debian-archive-keyring.gpg
' | tee /etc/apt/sources.list.d/debian.sources > /dev/null

echo "Done. Run 'sudo apt update' to refresh package lists."
