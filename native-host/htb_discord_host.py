#!/usr/bin/env python3
import json
import struct
import sys
import traceback
from typing import Any, Dict, Optional

from pypresence import Presence


class DiscordRPC:
    def __init__(self) -> None:
        self.client_id: Optional[str] = None
        self.rpc: Optional[Presence] = None

    def connect(self, client_id: str) -> None:
        if self.rpc is not None and self.client_id == client_id:
            return

        self.close()
        self.rpc = Presence(client_id)
        self.rpc.connect()
        self.client_id = client_id

    def update(self, payload: Dict[str, Any]) -> None:
        client_id = str(payload.get("discordClientId") or "").strip()
        if not client_id:
            raise ValueError("discordClientId is required")

        self.connect(client_id)

        args: Dict[str, Any] = {
            "details": str(payload.get("details") or "Browsing Hack The Box")[:128],
            "state": str(payload.get("state") or "On platform")[:128],
        }

        start_ts = payload.get("startTimestamp")
        if isinstance(start_ts, int):
            args["start"] = start_ts

        large_image_key = str(payload.get("largeImageKey") or "").strip()
        if large_image_key:
            args["large_image"] = large_image_key
            large_image_text = str(payload.get("largeImageText") or "Hack The Box")
            args["large_text"] = large_image_text[:128]

        if self.rpc is None:
            raise RuntimeError("RPC client is not connected")

        self.rpc.update(**args)

    def clear(self, payload: Dict[str, Any]) -> None:
        client_id = str(payload.get("discordClientId") or "").strip()
        if client_id:
            self.connect(client_id)

        if self.rpc is not None:
            self.rpc.clear()

    def close(self) -> None:
        if self.rpc is not None:
            try:
                self.rpc.close()
            except Exception:
                pass
        self.rpc = None
        self.client_id = None


def read_native_message() -> Optional[Dict[str, Any]]:
    raw_len = sys.stdin.buffer.read(4)
    if not raw_len:
        return None
    if len(raw_len) < 4:
        return None

    msg_len = struct.unpack("<I", raw_len)[0]
    data = sys.stdin.buffer.read(msg_len)
    if len(data) != msg_len:
        return None

    try:
        return json.loads(data.decode("utf-8"))
    except json.JSONDecodeError:
        return {"command": "invalid"}


def send_native_message(message: Dict[str, Any]) -> None:
    payload = json.dumps(message).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(payload)))
    sys.stdout.buffer.write(payload)
    sys.stdout.buffer.flush()


def main() -> int:
    rpc = DiscordRPC()
    send_native_message({"type": "ready"})

    while True:
        message = read_native_message()
        if message is None:
            break

        command = (message.get("command") or "").strip().lower()

        try:
            if command == "update":
                rpc.update(message)
                send_native_message({"type": "ok", "command": "update"})
            elif command == "clear":
                rpc.clear(message)
                send_native_message({"type": "ok", "command": "clear"})
            elif command == "ping":
                send_native_message({"type": "pong"})
            else:
                send_native_message({"type": "error", "message": f"Unknown command: {command}"})
        except Exception as err:
            send_native_message({"type": "error", "message": str(err)})

    rpc.close()
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception:
        traceback.print_exc(file=sys.stderr)
        raise
