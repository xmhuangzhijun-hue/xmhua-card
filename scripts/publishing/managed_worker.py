"""Foreground task host with private UTF-8 logs; Windows owns restart policy."""
import argparse
import json
from pathlib import Path
import sys

from worker import Worker

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True)
    args = parser.parse_args()
    config = json.loads(Path(args.config).read_text(encoding="utf-8-sig"))
    state = Path(config["privateDir"])
    sys.stdout = (state / "worker-task.stdout.log").open("a", encoding="utf-8", buffering=1)
    sys.stderr = (state / "worker-task.stderr.log").open("a", encoding="utf-8", buffering=1)
    try:
        Worker(config).loop()
    except Exception as error:
        print("Worker stopped:", type(error).__name__, file=sys.stderr, flush=True)
        raise SystemExit(1)
