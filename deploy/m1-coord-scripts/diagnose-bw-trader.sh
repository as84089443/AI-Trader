#!/usr/bin/env bash
set +e  # don't bail on individual command failures — collect everything we can
echo "=== launchctl print api ==="
launchctl print "gui/$(id -u)/ai.bwstudio.bw-trader-api" 2>&1 | head -40

echo ""
echo "=== launchctl print scheduler ==="
launchctl print "gui/$(id -u)/ai.bwstudio.bw-trader-scheduler" 2>&1 | head -40

echo ""
echo "=== lsof port 8788 ==="
lsof -nP -iTCP:8788 -sTCP:LISTEN 2>&1 || echo "(nothing listening)"

echo ""
echo "=== last 50 lines api err log ==="
LOG_API_ERR=$(plutil -extract StandardErrorPath raw ~/Library/LaunchAgents/ai.bwstudio.bw-trader-api.plist 2>/dev/null || echo "")
if [ -n "$LOG_API_ERR" ] && [ -f "$LOG_API_ERR" ]; then
  tail -50 "$LOG_API_ERR"
else
  echo "(no err log path or file)"
fi

echo ""
echo "=== last 30 lines api out log ==="
LOG_API_OUT=$(plutil -extract StandardOutPath raw ~/Library/LaunchAgents/ai.bwstudio.bw-trader-api.plist 2>/dev/null || echo "")
if [ -n "$LOG_API_OUT" ] && [ -f "$LOG_API_OUT" ]; then
  tail -30 "$LOG_API_OUT"
else
  echo "(no out log path or file)"
fi

echo ""
echo "=== last 30 lines scheduler err ==="
LOG_SCHED_ERR=$(plutil -extract StandardErrorPath raw ~/Library/LaunchAgents/ai.bwstudio.bw-trader-scheduler.plist 2>/dev/null || echo "")
if [ -n "$LOG_SCHED_ERR" ] && [ -f "$LOG_SCHED_ERR" ]; then
  tail -30 "$LOG_SCHED_ERR"
else
  echo "(no scheduler err log)"
fi

echo ""
echo "=== Python version actually used by plist ==="
PY_PATH=$(plutil -extract ProgramArguments.0 raw ~/Library/LaunchAgents/ai.bwstudio.bw-trader-api.plist 2>/dev/null)
echo "ProgramArguments[0] = $PY_PATH"
if [ -n "$PY_PATH" ] && [ -x "$PY_PATH" ]; then
  "$PY_PATH" --version 2>&1
fi

echo ""
echo "=== Try manual run to capture import error ==="
cd ~/dev/AI-Trader/service 2>&1
echo "cwd: $(pwd)"
timeout 10 "$PY_PATH" -c "from server.main import app; print('app loaded OK')" 2>&1 | head -20

echo ""
echo "=== fastapi/uvicorn versions ==="
"$PY_PATH" -m pip show fastapi uvicorn 2>&1 | grep -E "Name:|Version:" | head -10

echo ""
echo "=== END diagnose ==="
