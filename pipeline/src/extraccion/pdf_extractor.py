"""Extrae texto de PDFs: primero intenta nativo (pdfplumber), fallback a OCR (Tesseract)."""

import logging
from pathlib import Path

import pdfplumber

from ..config import config
from ..db import get_db, get_cursor

logger = logging.getLogger(__name__)

MIN_CHARS_THRESHOLD = 200


def extract_native(pdf_path: str) -> tuple[str, int]:
    """Extrae texto de un PDF nativo con pdfplumber."""
    text_parts = []
    num_pages = 0
    with pdfplumber.open(pdf_path) as pdf:
        num_pages = len(pdf.pages)
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n\n".join(text_parts), num_pages


def extract_ocr(pdf_path: str) -> tuple[str, int]:
    """Extrae texto de un PDF escaneado usando Tesseract OCR."""
    try:
        import pytesseract
        from PIL import Image
        import subprocess
        import tempfile
        import os

        tmpdir = tempfile.mkdtemp()
        # Convert PDF to images using pdftoppm (poppler)
        subprocess.run(
            ["pdftoppm", "-png", "-r", "300", pdf_path, f"{tmpdir}/page"],
            check=True, capture_output=True, timeout=300
        )

        text_parts = []
        page_files = sorted(Path(tmpdir).glob("page-*.png"))
        for page_file in page_files:
            img = Image.open(page_file)
            text = pytesseract.image_to_string(img, lang="cat+spa")
            if text.strip():
                text_parts.append(text)
            page_file.unlink()

        os.rmdir(tmpdir)
        return "\n\n".join(text_parts), len(page_files)

    except Exception as e:
        logger.error(f"OCR failed for {pdf_path}: {e}")
        return "", 0


def detect_language(text: str) -> str:
    """Heurística simple para detectar idioma (catalán vs castellano)."""
    cat_words = {"i", "el", "la", "de", "del", "amb", "per", "que", "una", "aquest", "aquesta", "els", "les"}
    esp_words = {"y", "el", "la", "de", "del", "con", "por", "que", "una", "este", "esta", "los", "las"}

    words = set(text.lower().split()[:500])
    cat_count = len(words & cat_words)
    esp_count = len(words & esp_words)

    if cat_count > esp_count * 1.5:
        return "ca"
    elif esp_count > cat_count * 1.5:
        return "es"
    return "mixed"


def process_extraction(acta_id: int):
    """Extrae texto de un acta descargada."""
    with get_db() as conn:
        with get_cursor(conn) as cur:
            cur.execute(
                "SELECT id, storage_path FROM actas WHERE id = %s AND status = 'downloaded'",
                (acta_id,)
            )
            acta = cur.fetchone()
            if not acta:
                return False

            pdf_path = acta["storage_path"]
            if not pdf_path or not Path(pdf_path).exists():
                cur.execute(
                    "UPDATE actas SET status = 'failed_extraction', error_message = 'File not found' WHERE id = %s",
                    (acta_id,)
                )
                return False

            try:
                # Try native extraction first
                text, num_pages = extract_native(pdf_path)
                method = "native"

                # Fallback to OCR if insufficient text
                if len(text) < MIN_CHARS_THRESHOLD:
                    logger.info(f"Native extraction insufficient for acta {acta_id} ({len(text)} chars), trying OCR")
                    ocr_text, ocr_pages = extract_ocr(pdf_path)
                    if len(ocr_text) > len(text):
                        text = ocr_text
                        num_pages = ocr_pages or num_pages
                        method = "ocr"
                    else:
                        method = "native_low"

                idioma = detect_language(text) if text else "unknown"

                cur.execute("""
                    UPDATE actas SET
                        status = 'extracted',
                        texto = %s,
                        metodo_extraccion = %s,
                        num_paginas = %s,
                        num_caracteres = %s,
                        idioma = %s,
                        extracted_at = NOW()
                    WHERE id = %s
                """, (text, method, num_pages, len(text), idioma, acta_id))

                logger.info(f"Extracted acta {acta_id}: {len(text)} chars, {num_pages} pages, method={method}")
                return True

            except Exception as e:
                logger.error(f"Extraction failed for acta {acta_id}: {e}")
                cur.execute("""
                    UPDATE actas SET
                        status = 'failed_extraction',
                        error_message = %s,
                        retry_count = retry_count + 1
                    WHERE id = %s
                """, (str(e)[:500], acta_id))
                return False
