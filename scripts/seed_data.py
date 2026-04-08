#!/usr/bin/env python3
"""Seed script: run initial data ingestion from public APIs."""

import sys
import os
import logging

# Add pipeline to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
logger = logging.getLogger("seed")


def main():
    from pipeline.src.ingesta.socrata_client import sync_all
    from pipeline.src.ingesta.ckan_client import sync_actas_catalog
    from pipeline.src.embeddings.generator import ensure_collection

    logger.info("=== Step 1: Sync municipios + cargos electos from Municat ===")
    result = sync_all()
    logger.info(f"Municat sync: {result}")

    logger.info("=== Step 2: Sync actas catalog from CKAN (last 5 years) ===")
    inserted = sync_actas_catalog(years_back=5)
    logger.info(f"CKAN sync: {inserted} new actas")

    logger.info("=== Step 3: Ensure Qdrant collection exists ===")
    ensure_collection()
    logger.info("Qdrant collection ready")

    logger.info("=== Seed complete! ===")
    logger.info("Start the pipeline worker to begin processing: docker compose up -d pipeline-worker pipeline-beat")


if __name__ == "__main__":
    main()
