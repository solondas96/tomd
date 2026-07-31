"""Run tests via Chrome DevTools Protocol against Edge headless."""
import urllib.request, json, time, websocket

# Get an available tab
tabs = json.loads(urllib.request.urlopen('http://localhost:9222/json').read())
target = next((t for t in tabs if t.get('type') == 'page'), tabs[0])
ws_url = target['webSocketDebuggerUrl']

ws = websocket.create_connection(ws_url, timeout=30)

# Navigate to test page
ws.send(json.dumps({'id': 1, 'method': 'Page.navigate', 'params': {
    'url': 'http://localhost:3001/tests/index.html'
}}))
# Drain responses until we get our navigation ack
for _ in range(20):
    msg = json.loads(ws.recv())
    if msg.get('id') == 1:
        break

# Wait for tests to complete
time.sleep(10)

# Extract results
ws.send(json.dumps({'id': 2, 'method': 'Runtime.evaluate', 'params': {
    'expression': 'document.getElementById("results") ? document.getElementById("results").innerText : "NO RESULTS ELEMENT"',
    'returnByValue': True
}}))

msg = json.loads(ws.recv())
while msg.get('id') != 2:
    msg = json.loads(ws.recv())

val = msg.get('result', {}).get('result', {}).get('value', '')
if val:
    print(val[:8000])
else:
    print('No output. Response:', json.dumps(msg)[:500])

# Get title
ws.send(json.dumps({'id': 3, 'method': 'Runtime.evaluate', 'params': {
    'expression': 'document.title',
    'returnByValue': True
}}))
msg = json.loads(ws.recv())
while msg.get('id') != 3:
    msg = json.loads(ws.recv())
print('\n=== TITLE:', msg.get('result', {}).get('result', {}).get('value', ''))

ws.close()
