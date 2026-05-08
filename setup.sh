#!/usr/bin/env bash
set -e

echo "====================================================="
echo " AI Agent Orchestration Platform — Setup"
echo "====================================================="

# ── Backend ───────────────────────────────────────────────────────────────────
echo ""
echo "→ Setting up Python backend..."
cd backend

if [ ! -f ".env" ]; then
  cp .env.example .env
  echo "  Created backend/.env — please fill in ANTHROPIC_API_KEY"
fi

python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt
echo "  Backend dependencies installed ✓"

# ── Frontend ──────────────────────────────────────────────────────────────────
echo ""
echo "→ Setting up frontend..."
cd ../frontend
npm install --silent
echo "  Frontend dependencies installed ✓"
cd ..

# ── Done ──────────────────────────────────────────────────────────────────────
echo ""
echo "====================================================="
echo " Setup complete!"
echo "====================================================="
echo ""
echo "Before starting, edit backend/.env and set:"
echo "  ANTHROPIC_API_KEY=your_key_here"
echo "  TELEGRAM_BOT_TOKEN=your_token (optional)"
echo ""
echo "To run the platform:"
echo "  Terminal 1 (backend):"
echo "    cd backend && source .venv/bin/activate && python main.py"
echo ""
echo "  Terminal 2 (frontend):"
echo "    cd frontend && npm run dev"
echo ""
echo "  Then open http://localhost:3000"
echo ""
