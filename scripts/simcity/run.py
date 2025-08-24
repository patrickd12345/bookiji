#!/usr/bin/env python3
import argparse, time, json, sys

SCENARIOS = {
    "SLOW_CONFIRM": {"latency_ms": 9000, "timeout_ms": 8000, "expected": "auto_cancel_refund"},
    "TIMEOUT": {"latency_ms": 60000, "timeout_ms": 8000, "expected": "auto_cancel_refund"},
    "FLAKY_WEBHOOK": {"redeliveries": 3, "expected": "idempotent_no_double_charge"},
    "GATEWAY_502": {"retries": [1,2,4], "expected": "eventual_success_once"},
}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--scenario", required=True, choices=SCENARIOS.keys())
    args = ap.parse_args()

    cfg = SCENARIOS[args.scenario]
    print(json.dumps({"scenario": args.scenario, "config": cfg}))
    # TODO: invoke domain services; for now just exit 0
    sys.exit(0)

if __name__ == "__main__":
    main()
