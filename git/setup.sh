#!/bin/bash

REPO_URL="git@github.com:serosme/script.git"
REPO_PATH="$HOME/workspace/script"
SSH_KEY_PATH="$HOME/.ssh/id_ed25519"
GIT_CONFIG_DIR="$HOME/.config/git"
GIT_CONFIG_GLOBAL="$GIT_CONFIG_DIR/config"

generate_ssh_key() {
    if [[ -f "$SSH_KEY_PATH" && -f "$SSH_KEY_PATH.pub" ]]; then
        echo "SSH key already exists at $SSH_KEY_PATH, skipping generation."
        return
    fi
    ssh-keygen -t ed25519 -f "$SSH_KEY_PATH" -N "" -q
}

confirm_ssh_setup() {
    cat "$SSH_KEY_PATH.pub"
    echo
    read -p "Add the above SSH key to GitHub, then confirm (y/N): " -r response
    [[ ${response,,} =~ ^y(es)?$ ]] || { echo "Aborted."; exit 1; }
}

clone_repository() {
    [[ -d "$REPO_PATH" ]] && echo "$REPO_PATH already exists." || GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=accept-new" git clone "$REPO_URL" "$REPO_PATH" || return 1
}

copy_configuration_files() {
    [[ -d "$REPO_PATH" ]] || return 1

    [[ ! -f "$GIT_CONFIG_GLOBAL" ]] && cp "$REPO_PATH/git/config-git" "$GIT_CONFIG_GLOBAL"
    [[ ! -f "$HOME/.ssh/config" ]] && [[ -f "$REPO_PATH/git/config-ssh" ]] && cp "$REPO_PATH/git/config-ssh" "$HOME/.ssh/config"
}

setup_workspace_git_config() {
    read -p "Your name: " user_name
    read -p "Your email: " user_email
    [[ -n "$user_name" && -n "$user_email" ]] || { echo "Name and email are required."; return 1; }

    cat > "$GIT_CONFIG_DIR/config-workspace" << EOF
[user]
    name = $user_name
    email = $user_email
EOF

    cat >> "$GIT_CONFIG_GLOBAL" << EOF
[includeIf "gitdir:~/workspace/"]
    path = "~/.config/git/config-workspace"
EOF
}

main() {
    mkdir -p "$(dirname "$REPO_PATH")" "$GIT_CONFIG_DIR"

    if [[ -d "$HOME/.ssh" || -d "$GIT_CONFIG_DIR" ]]; then
        read -p "Existing SSH keys or git config found. Remove them and start fresh? (y/N): " -r response
        if [[ ${response,,} =~ ^y(es)?$ ]]; then
            echo "Removing $HOME/.ssh and $GIT_CONFIG_DIR ..."
            rm -rf "$HOME/.ssh" "$GIT_CONFIG_DIR"
            mkdir -p "$GIT_CONFIG_DIR"
        fi
    fi

    generate_ssh_key
    confirm_ssh_setup
    clone_repository || return 1
    copy_configuration_files || return 1
    setup_workspace_git_config
}

main || exit $?
