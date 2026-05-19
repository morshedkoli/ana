#!/usr/bin/env python3
"""
edge-tts wrapper - generates Bangla voice via Microsoft Edge TTS (free, unlimited).

Install: pip install edge-tts
Usage:   python3 tts.py --text "হ্যালো" --voice bn-BD-NabanitaNeural --output out.mp3
"""

import argparse
import asyncio
import sys

try:
    import edge_tts
except ImportError:
    print("ERROR: edge-tts not installed. Run: pip install edge-tts", file=sys.stderr)
    sys.exit(2)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--text", required=True)
    parser.add_argument("--voice", default="bn-BD-NabanitaNeural")
    parser.add_argument("--rate", default="+0%")
    parser.add_argument("--pitch", default="+0Hz")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    communicate = edge_tts.Communicate(
        text=args.text,
        voice=args.voice,
        rate=args.rate,
        pitch=args.pitch,
    )
    await communicate.save(args.output)
    print(f"OK {args.output}", file=sys.stderr)


if __name__ == "__main__":
    asyncio.run(main())
