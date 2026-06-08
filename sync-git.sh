#!/usr/bin/env bash

mkdir -p ~/.config/git ~/.ssh

cp -r /mnt/c/Users/User/.config/git/* ~/.config/git/ 2>/dev/null
cp -r /mnt/c/Users/User/.ssh/* ~/.ssh/ 2>/dev/null

chmod 700 ~/.ssh
chmod 600 ~/.ssh/* 2>/dev/null
chmod 644 ~/.ssh/*.pub 2>/dev/null
