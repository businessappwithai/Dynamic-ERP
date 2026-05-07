#!/bin/bash
# Setup script for gstack - AI development skills
# Run this script to install gstack for Claude Code

set -e

echo "🚀 Setting up gstack for Claude Code..."
echo ""

# Check if ~/.claude/skills/gstack already exists
if [ -d "$HOME/.claude/skills/gstack" ]; then
  echo "⚠️  gstack is already installed at ~/.claude/skills/gstack"
  read -p "Do you want to reinstall/update it? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "✅ Setup complete. You can use gstack skills immediately!"
    echo ""
    echo "Available skills:"
    echo "  /office-hours, /plan-ceo-review, /plan-eng-review, /plan-design-review"
    echo "  /design-consultation, /review, /ship, /browse, /qa, /qa-only"
    echo "  /design-review, /setup-browser-cookies, /retro, /investigate"
    echo "  /document-release, /codex, /careful, /freeze, /guard"
    echo "  /unfreeze, /gstack-upgrade, /land-and-deploy, /canary, /benchmark"
    echo "  /connect-chrome, /setup-deploy, /autoplan, /cso, /learn"
    echo ""
    exit 0
  fi
  echo "🔄 Removing existing installation..."
  rm -rf "$HOME/.claude/skills/gstack"
fi

# Clone gstack repository
echo "📥 Cloning gstack repository..."
git clone --single-branch --depth 1 https://github.com/garrytan/gstack.git ~/.claude/skills/gstack

# Run setup
echo "⚙️  Running gstack setup..."
cd ~/.claude/skills/gstack
./setup

echo ""
echo "✅ gstack setup complete!"
echo ""
echo "gstack provides powerful AI-assisted development skills for Claude Code."
echo "See CLAUDE.md for a complete list of available skills."
echo ""
echo "Quick reference:"
echo "  /browse     - Headless browser for web browsing and QA testing"
echo "  /review     - Code review before merge"
echo "  /qa         - Full QA testing of the app"
echo "  /ship       - Ready to deploy / create PR"
echo ""
