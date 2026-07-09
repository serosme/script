#!/bin/bash

CONFIG="[interop]
enabled=false
appendWindowsPath=false
"

show_config() {
    [[ -f "/etc/wsl.conf" ]] && echo "--- /etc/wsl.conf ---" && cat /etc/wsl.conf || echo "File /etc/wsl.conf does not exist."
}

# 检查配置是否已存在
if [[ -f "/etc/wsl.conf" ]] && grep -qF "[interop]" /etc/wsl.conf; then
    echo "Configuration already exists. Current content:"
    echo
    show_config
    exit 0
fi

show_config
echo
read -p "Add configuration to /etc/wsl.conf? (y/N): " -r response

if [[ ${response,,} =~ ^y(es)?$ ]]; then
    echo "$CONFIG" | sudo tee -a /etc/wsl.conf > /dev/null
    echo "Done. Updated content:"
    echo
    show_config
else
    echo "Cancelled."
fi
