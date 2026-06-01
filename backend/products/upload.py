"""
Image upload helper for products gallery + descriptions.

Uses the same constraints as the blog uploader (10MB, common image types).
Files are stored on disk under UPLOAD_DIR and exposed publicly via
StaticFiles at PUBLIC_UPLOAD_BASE.
"""
from __future__ import annotations

import os
import uuid
from pathlib import Path

import aiofiles
from fastapi import HTTPException, UploadFile

UPLOAD_DIR = Path(os.environ.get("PRODUCTS_UPLOAD_DIR", "/app/backend/uploads/products"))
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
PUBLIC_UPLOAD_BASE = "/api/uploads/products"

MAX_UPLOAD_BYTES = 10 * 1024 * 1024
ALLOWED_MIMES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/svg+xml": ".svg",
}


async def save_image(file: UploadFile) -> dict:
    content_type = (file.content_type or "").lower()
    ext = ALLOWED_MIMES.get(content_type)
    if not ext:
        raise HTTPException(
            status_code=400,
            detail=f"Непідтримуваний тип файлу: {content_type}. Дозволено: JPG, PNG, WEBP, GIF, SVG.",
        )

    body = await file.read()
    if len(body) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="Розмір файлу > 10МБ")

    fname = f"{uuid.uuid4().hex}{ext}"
    fpath = UPLOAD_DIR / fname
    async with aiofiles.open(fpath, "wb") as fh:
        await fh.write(body)

    return {
        "url": f"{PUBLIC_UPLOAD_BASE}/{fname}",
        "filename": fname,
        "size": len(body),
        "content_type": content_type,
    }
