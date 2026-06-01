"""
Align the bad corn cob so that its horizontal X position matches the good
image's cob X. Keep both images at the GOOD image's original dimensions —
the wipe will then show one continuous cob.

Approach:
  1. Detect cob cx in good (cx_g) and in bad (cx_b) — both resized to good's
     dimensions.
  2. Shift bad horizontally by (cx_g - cx_b) using mirror-pad on the new
     edge and cropping the opposite edge.

Outputs (overwrites previous aligned files):
  /app/frontend/public/corn-good-aligned@2x.png  (= original good, untouched)
  /app/frontend/public/corn-bad-aligned@2x.png   (= shifted bad)
"""

from pathlib import Path

from PIL import Image
import numpy as np

GOOD_SRC = Path("/app/frontend/public/corn-healthy@2x.png")
BAD_SRC = Path("/app/frontend/public/corn-bad-gen@2x.png")
GOOD_OUT = Path("/app/frontend/public/corn-good-aligned@2x.png")
BAD_OUT = Path("/app/frontend/public/corn-bad-aligned@2x.png")


def detect_cob_cx(img: Image.Image) -> int:
    rgb = np.asarray(img.convert("RGB"), dtype=np.float32) / 255.0
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    sat = np.where(mx > 1e-6, (mx - mn) / (mx + 1e-6), 0.0)
    col_score = sat.mean(axis=0)
    thresh = np.quantile(col_score, 0.70)
    mask = col_score >= thresh
    if not mask.any():
        return img.width // 2
    xs = np.arange(img.width)
    return int(round((xs[mask] * col_score[mask]).sum() / col_score[mask].sum()))


def mirror_pad_h(img: Image.Image, pad_left: int, pad_right: int) -> Image.Image:
    arr = np.asarray(img.convert("RGB"))
    out = arr
    if pad_left > 0:
        n = min(pad_left, arr.shape[1])
        mirror = np.flip(arr[:, :n, :], axis=1)
        if pad_left > n:
            mirror = np.concatenate([mirror, np.tile(mirror[:, -1:, :], (1, pad_left - n, 1))], axis=1)
        out = np.concatenate([mirror, out], axis=1)
    if pad_right > 0:
        n = min(pad_right, arr.shape[1])
        mirror = np.flip(arr[:, -n:, :], axis=1)
        if pad_right > n:
            mirror = np.concatenate([np.tile(mirror[:, :1, :], (1, pad_right - n, 1)), mirror], axis=1)
        out = np.concatenate([out, mirror], axis=1)
    return Image.fromarray(out)


def shift_image_h(img: Image.Image, dx: int) -> Image.Image:
    """Shift image horizontally by dx pixels. Positive dx → move right.
    The canvas size is preserved: pad new edge with mirror, crop opposite edge.
    """
    w, h = img.size
    if dx == 0:
        return img
    if dx > 0:
        # Add `dx` mirror-padding on the LEFT, crop `dx` from the RIGHT
        padded = mirror_pad_h(img, pad_left=dx, pad_right=0)
        return padded.crop((0, 0, w, h))
    # dx < 0 → mirror pad on right, crop from left
    dx = -dx
    padded = mirror_pad_h(img, pad_left=0, pad_right=dx)
    return padded.crop((dx, 0, dx + w, h))


def main() -> None:
    good = Image.open(GOOD_SRC).convert("RGB")
    bad = Image.open(BAD_SRC).convert("RGB")

    # Make bad's dimensions match good's exactly
    if bad.size != good.size:
        bad = bad.resize(good.size, Image.LANCZOS)

    cx_g = detect_cob_cx(good)
    cx_b = detect_cob_cx(bad)
    print(f"cob cx → good={cx_g}, bad={cx_b}, shift bad by dx={cx_g - cx_b}")

    bad_aligned = shift_image_h(bad, cx_g - cx_b)
    print(f"good: {good.size}, bad aligned: {bad_aligned.size}")

    good.save(GOOD_OUT, format="PNG", optimize=True)
    bad_aligned.save(BAD_OUT, format="PNG", optimize=True)
    print("saved.")


if __name__ == "__main__":
    main()
