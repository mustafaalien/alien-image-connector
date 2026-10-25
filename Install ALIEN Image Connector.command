#!/bin/bash
# 👽 ALIEN Image Connector by @mustafaalien — installer for Claude Desktop.
cd "$(dirname "$0")"
export PATH="$HOME/Library/Application Support/AlienX/codex/node_modules/.bin:/opt/homebrew/bin:/usr/local/bin:$PATH"
DEST="$HOME/Library/Application Support/ALIEN-Image-Connector"
echo "👽  Installing ALIEN Image Connector…"

NODE="$(command -v node)"
if [ -z "$NODE" ]; then echo "❌ Node.js not found. Install it from https://nodejs.org (LTS), then double-click this again."; read -p "Press Enter to close"; exit 1; fi

if ! command -v codex >/dev/null; then
  echo "• Installing OpenAI Codex (the ChatGPT connection)…"; npm install -g @openai/codex || { echo "❌ Codex install failed."; read -p "Press Enter"; exit 1; }
fi
if ! codex login status 2>&1 | grep -qi "logged in"; then
  echo "• Sign in with your ChatGPT account in the browser window that opens…"; codex login
fi
codex login status

mkdir -p "$DEST" && cp server.js "$DEST/server.js"

# Add it to every Claude Desktop config that already has your free-image tool (or the default one).
"$NODE" - "$NODE" "$DEST/server.js" <<'JS'
const fs = require('fs'), path = require('path'), os = require('os');
const [node, server] = process.argv.slice(2), H = os.homedir();
const cands = [path.join(H, 'Library/Application Support/Claude/claude_desktop_config.json')];
const walk = (d, n) => { if (n > 4) return; let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; }
  for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, n + 1); else if (e.name === 'claude_desktop_config.json') cands.push(p); } };
walk(path.join(H, 'ClaudeProfiles'), 0);
const withFree = cands.filter((f) => { try { return /free-image/.test(fs.readFileSync(f, 'utf8')); } catch (e) { return false; } });
const targets = [...new Set(withFree.length ? withFree : [cands[0]])];
for (const f of targets) {
  let c = {}; try { c = JSON.parse(fs.readFileSync(f, 'utf8')); } catch (e) {}
  if (fs.existsSync(f)) fs.copyFileSync(f, f + '.backup-' + Date.now());
  c.mcpServers = c.mcpServers || {};
  delete c.mcpServers['chatgpt-image']; // older test version
  c.mcpServers['alien-image'] = { command: node, args: [server] };
  fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(c, null, 2));
  console.log('✅ Added to ' + f);
}
JS

echo ""
echo "✅ Done. Quit Claude completely (Cmd+Q) and open it again."
echo "   Then tell Claude: \"make an image with ALIEN of …\""
read -p "Press Enter to close"
