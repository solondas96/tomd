"""Run tests via Chrome DevTools Protocol against Edge headless."""
from __future__ import annotations

import json
import logging
import time
import urllib.request

import websocket

logging.basicConfig(level=logging.INFO, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

CDP_URL = "http://localhost:9222/json"
TEST_URL = "http://localhost:3001/tests/index.html"
POLL_WAIT_SECONDS = 10


def get_debugger_url() -> str:
    """Find the first page-type tab and return its WebSocket debugger URL."""
    tabs: list[dict] = json.loads(urllib.request.urlopen(CDP_URL).read())
    target = next((t for t in tabs if t.get("type") == "page"), tabs[0])
    return target["webSocketDebuggerUrl"]


def send_and_receive(ws: websocket.WebSocket, cmd_id: int, method: str, params: dict | None = None) -> dict:
    """Send a CDP command and wait for the matching response."""
    payload: dict = {"id": cmd_id, "method": method}
    if params:
        payload["params"] = params
    ws.send(json.dumps(payload))
    for _ in range(50):
        msg = json.loads(ws.recv())
        if msg.get("id") == cmd_id:
            return msg
    raise TimeoutError(f"No response for command {cmd_id}")


def run_tests() -> None:
    """Navigate to the test page, wait for results, and print output."""
    ws_url = get_debugger_url()
    ws = websocket.create_connection(ws_url, timeout=30)

    try:
        send_and_receive(ws, 1, "Page.navigate", {"url": TEST_URL})
        logger.info("Navigated to %s, waiting %ds for tests...", TEST_URL, POLL_WAIT_SECONDS)
        time.sleep(POLL_WAIT_SECONDS)

        result = send_and_receive(ws, 2, "Runtime.evaluate", {
            "expression": 'document.getElementById("results") ? document.getElementById("results").innerText : "NO RESULTS ELEMENT"',
            "returnByValue": True,
        })
        value = result.get("result", {}).get("result", {}).get("value", "")
        if value:
            print(value[:8000])
        else:
            logger.warning("No output. Response: %s", json.dumps(result)[:500])

        title_result = send_and_receive(ws, 3, "Runtime.evaluate", {
            "expression": "document.title",
            "returnByValue": True,
        })
        title = title_result.get("result", {}).get("result", {}).get("value", "")
        logger.info("Page title: %s", title)
    finally:
        ws.close()


if __name__ == "__main__":
    run_tests()
