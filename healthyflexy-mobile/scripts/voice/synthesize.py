"""
Голос тренера: записує кожну фразу з phrases.json нейронним офлайн-синтезатором Piper у MP3
(assets/voice/<мова>/<хеш>.mp3) і генерує маніфест src/services/voice/clips.generated.ts.

Голоси (вільні ліцензії, дозволене комерційне використання):
  uk — uk_UA-mykyta-high   (Apache 2.0)     ru — ru_RU-dmitri-medium (CC0)
  pl — pl_PL-darkman-medium (CC0)           en — en_US-joe-medium    (CC0)

Запуск (один раз: python3 -m venv venv && venv/bin/pip install piper-tts lameenc):
  node scripts/voice/phrases.mjs
  venv/bin/python scripts/voice/synthesize.py --models <тека з .onnx> [--espeak <тека espeak-ng-data>]
Уже записані фрази пропускаються (після зміни налаштувань голосу видаліть assets/voice/<мова>);
зайві файли (фразу прибрали) видаляються.
"""
import argparse
import hashlib
import io
import json
import os
import wave
from pathlib import Path

import lameenc
import numpy as np
from piper import PiperVoice, SynthesisConfig

ROOT = Path(__file__).resolve().parents[2]
VOICES = {
    'uk': 'uk_UA-mykyta-high',
    'ru': 'ru_RU-dmitri-medium',
    'pl': 'pl_PL-darkman-medium',
    'en': 'en_US-joe-medium',
}
LENGTH_SCALE = {'uk': 0.9, 'ru': 1.0, 'pl': 0.97, 'en': 1.0}
BITRATE = 32  # кбіт/с, моно: для мовлення досить, файл ~4 КБ на секунду


def clip_name(lang: str, text: str) -> str:
    return hashlib.sha1(f'{lang}\n{text}'.encode()).hexdigest()[:12] + '.mp3'


def polish(samples: np.ndarray, rate: int) -> np.ndarray:
    """Обрізати тишу по краях, м'які fade (без клацань), вирівняти гучність до -1 dBFS"""
    x = samples.astype(np.float32) / 32768.0
    level = np.abs(x)
    loud = np.where(level > 0.02)[0]
    if loud.size:
        pad = int(rate * 0.03)
        x = x[max(0, loud[0] - pad): min(len(x), loud[-1] + pad * 2)]
    fade = min(int(rate * 0.012), len(x) // 4)
    if fade > 0:
        ramp = np.linspace(0, 1, fade, dtype=np.float32)
        x[:fade] *= ramp
        x[-fade:] *= ramp[::-1]
    peak = float(np.max(np.abs(x))) or 1.0
    x = x * (0.89 / peak)
    return (x * 32767).astype(np.int16)


def synth(voice: PiperVoice, text: str, config: SynthesisConfig) -> tuple[np.ndarray, int]:
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        voice.synthesize_wav(text, w, syn_config=config)
    buf.seek(0)
    with wave.open(buf, 'rb') as r:
        return np.frombuffer(r.readframes(r.getnframes()), dtype=np.int16), r.getframerate()


def to_mp3(samples: np.ndarray, rate: int) -> bytes:
    enc = lameenc.Encoder()
    enc.set_bit_rate(BITRATE)
    enc.set_in_sample_rate(rate)
    enc.set_channels(1)
    enc.set_quality(2)
    return enc.encode(samples.tobytes()) + enc.flush()


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--models', required=True)
    ap.add_argument('--espeak', default=None, help='espeak-ng-data (якщо стандартний шлях задовгий для espeak)')
    args = ap.parse_args()
    phrases = json.loads((ROOT / 'scripts/voice/phrases.json').read_text())
    manifest: dict[str, dict[str, str]] = {}
    for lang, texts in phrases.items():
        out_dir = ROOT / 'assets/voice' / lang
        out_dir.mkdir(parents=True, exist_ok=True)
        extra = {'espeak_data_dir': args.espeak} if args.espeak else {}
        voice = PiperVoice.load(os.path.join(args.models, VOICES[lang] + '.onnx'), **extra)
        # живіша інтонація — голос тренера, а не диктора новин; український голос від природи повільніший
        config = SynthesisConfig(length_scale=LENGTH_SCALE[lang], noise_scale=0.6, noise_w_scale=0.75)
        manifest[lang] = {}
        made = 0
        for text in texts:
            name = clip_name(lang, text)
            manifest[lang][text] = name
            target = out_dir / name
            if target.exists():
                continue
            samples, rate = synth(voice, text, config)
            target.write_bytes(to_mp3(polish(samples, rate), rate))
            made += 1
        keep = set(manifest[lang].values())
        for old in out_dir.glob('*.mp3'):
            if old.name not in keep:
                old.unlink()
        print(lang, 'phrases', len(texts), 'new', made)

    lines = [
        '// Згенеровано scripts/voice/synthesize.py — НЕ редагувати вручну.',
        '// Фраза голосового тренера (рівно як її формує застосунок) → запис нейронним голосом Piper.',
        'export const VOICE_CLIPS: Record<string, Record<string, number>> = {',
    ]
    for lang, items in manifest.items():
        lines.append(f'  {lang}: {{')
        for text, name in items.items():
            lines.append(f"    {json.dumps(text, ensure_ascii=False)}: require('../../../assets/voice/{lang}/{name}'),")
        lines.append('  },')
    lines.append('};')
    lines.append('')
    (ROOT / 'src/services/voice/clips.generated.ts').write_text('\n'.join(lines))
    print('manifest written')


if __name__ == '__main__':
    main()
