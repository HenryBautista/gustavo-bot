#!/usr/bin/env bash
# Usage: ./scripts/setup-runner.sh <REGISTRATION_TOKEN>
# Run this on 192.168.0.130 as a user with sudo access.
set -euo pipefail

TOKEN="${1:?Usage: $0 <REGISTRATION_TOKEN>}"
REPO_URL="https://github.com/HenryBautista/gustavo-bot"
RUNNER_DIR="/home/$(logname)/actions-runner"
RUNNER_VERSION="2.335.1"

mkdir -p "$RUNNER_DIR" && cd "$RUNNER_DIR"

curl -fsSL \
  "https://github.com/actions/runner/releases/download/v${RUNNER_VERSION}/actions-runner-linux-x64-${RUNNER_VERSION}.tar.gz" \
  | tar -xz

./config.sh \
  --url "$REPO_URL" \
  --token "$TOKEN" \
  --name "$(hostname)-gustavo" \
  --labels "self-hosted,linux,x64" \
  --unattended

sudo ./svc.sh install
sudo ./svc.sh start

RUNNER_USER="$(logname)"
sudo usermod -aG docker "$RUNNER_USER"
echo "Runner installed and running."
echo "Docker group will take effect on next login."
echo "Verify with: sudo $RUNNER_DIR/svc.sh status"
