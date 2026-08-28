from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

from nutrition_ingest.common.postgres import ingest
from nutrition_ingest.release import CATALOG_PARQUET, RELEASE_MANIFEST, sha256_file

BUCKET_NAME = "mons-nutrition"
RELEASE_ID_PATTERN = re.compile(r"^\d{4}-\d{2}-\d{2}-[a-f0-9]{8}$")


def _required_environment(name: str) -> str:
    value = os.environ.get(name)
    if not value:
        raise RuntimeError(f"{name} is required")
    return value


def client():
    import boto3
    from botocore.config import Config

    account_id = _required_environment("CLOUDFLARE_DEFAULT_ACCOUNT_ID")
    return boto3.client(
        "s3",
        endpoint_url=f"https://{account_id}.r2.cloudflarestorage.com",
        aws_access_key_id=_required_environment("CLOUDFLARE_ACCESS_KEY_ID"),
        aws_secret_access_key=_required_environment("CLOUDFLARE_SECRET_ACCESS_KEY"),
        config=Config(signature_version="s3v4", retries={"max_attempts": 5, "mode": "standard"}),
        region_name="auto",
    )


def _head(s3, key: str) -> dict[str, Any] | None:
    from botocore.exceptions import ClientError

    try:
        return s3.head_object(Bucket=BUCKET_NAME, Key=key)
    except ClientError as exc:
        status = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
        if status == 404:
            return None
        raise


def _verified_source_path(record: dict[str, Any]) -> Path:
    path = Path(record["path"])
    if not path.is_file():
        raise RuntimeError(f"Missing release source: {path}")
    actual = sha256_file(path)
    if actual != record["sha256"]:
        raise RuntimeError(f"Source changed after build: {path}")
    return path


def _upload_verified(s3, path: Path, key: str, expected_hash: str) -> None:
    existing = _head(s3, key)
    if existing is not None:
        metadata_hash = existing.get("Metadata", {}).get("sha256")
        if metadata_hash != expected_hash or existing.get("ContentLength") != path.stat().st_size:
            raise RuntimeError(f"R2 object conflicts with the verified local artifact: {key}")
        return
    s3.upload_file(
        str(path),
        BUCKET_NAME,
        key,
        ExtraArgs={"Metadata": {"sha256": expected_hash}},
    )


def publish_release(manifest_path: Path = RELEASE_MANIFEST) -> dict[str, Any]:
    with manifest_path.open("r", encoding="utf-8") as handle:
        manifest = json.load(handle)
    if not isinstance(manifest, dict) or manifest.get("status") != "success":
        raise RuntimeError(f"Release manifest is not successful: {manifest_path}")

    release_id = manifest.get("release_id")
    if not isinstance(release_id, str) or not release_id:
        raise RuntimeError(f"Release manifest has no release ID: {manifest_path}")
    s3 = client()
    s3.head_bucket(Bucket=BUCKET_NAME)
    manifest_key = f"releases/{release_id}/manifest.json"
    if _head(s3, manifest_key) is not None:
        remote = json.loads(s3.get_object(Bucket=BUCKET_NAME, Key=manifest_key)["Body"].read())
        if remote != manifest:
            raise RuntimeError(f"Completed R2 release conflicts with local release: {release_id}")
        return {"release_id": release_id, "published": False}

    for source in manifest["sources"]:
        path = _verified_source_path(source)
        key = f"sources/{source['sha256']}/{path.name}"
        _upload_verified(s3, path, key, source["sha256"])

    artifact = manifest["artifact"]
    path = manifest_path.parent / artifact["filename"]
    if not path.is_file() or sha256_file(path) != artifact["sha256"]:
        raise RuntimeError(f"Release artifact changed after build: {path}")
    key = f"releases/{release_id}/{artifact['filename']}"
    _upload_verified(s3, path, key, artifact["sha256"])

    manifest_bytes = manifest_path.read_bytes()
    s3.put_object(
        Bucket=BUCKET_NAME,
        Key=manifest_key,
        Body=manifest_bytes,
        ContentType="application/json",
        Metadata={"sha256": sha256_file(manifest_path)},
    )
    return {"release_id": release_id, "published": True}


def download_release_file(s3, release_id: str, filename: str, destination: Path) -> None:
    s3.download_file(BUCKET_NAME, f"releases/{release_id}/{filename}", str(destination))


def load_release(
    release_id: str,
    *,
    database_url: str | None = None,
    runtime_role: str | None = None,
    active_schema: str = "mons_catalog",
) -> dict[str, Any]:
    if RELEASE_ID_PATTERN.fullmatch(release_id) is None:
        raise RuntimeError(f"Invalid release ID: {release_id}")
    runtime_role = runtime_role or os.environ.get("MONS_DATABASE_RUNTIME_USER")
    if not runtime_role:
        raise RuntimeError("MONS_DATABASE_RUNTIME_USER or --runtime-role is required")

    s3 = client()
    with tempfile.TemporaryDirectory(prefix="mons-release-load-") as directory:
        workspace = Path(directory)
        manifest_path = workspace / "manifest.json"
        download_release_file(s3, release_id, "manifest.json", manifest_path)
        with manifest_path.open("r", encoding="utf-8") as handle:
            manifest = json.load(handle)
        if not isinstance(manifest, dict) or manifest.get("release_id") != release_id:
            raise RuntimeError(f"R2 manifest does not describe release {release_id}")

        artifact = manifest.get("artifact")
        if not isinstance(artifact, dict):
            raise RuntimeError("R2 manifest has no catalog artifact")
        filename = artifact.get("filename")
        if filename != CATALOG_PARQUET.name:
            raise RuntimeError("R2 manifest has an invalid catalog filename")
        catalog_path = workspace / filename
        download_release_file(s3, release_id, filename, catalog_path)

        return ingest(
            catalog_path=catalog_path,
            manifest_path=manifest_path,
            database_url=database_url,
            runtime_role=runtime_role,
            active_schema=active_schema,
        )


def register_subparsers(subparsers) -> None:
    publish = subparsers.add_parser("publish", help="Publish the current verified release to R2")
    publish.add_argument("--manifest", type=Path, default=RELEASE_MANIFEST)
    publish.set_defaults(handler=_run_publish)

    load = subparsers.add_parser("load", help="Load an immutable R2 release into PostgreSQL")
    load.add_argument("--release", required=True)
    load.add_argument("--database-url")
    load.add_argument("--runtime-role")
    load.add_argument("--schema", default="mons_catalog")
    load.set_defaults(handler=_run_load)


def _run_publish(args) -> None:
    print(json.dumps(publish_release(args.manifest), indent=2))


def _run_load(args) -> None:
    print(
        json.dumps(
            load_release(
                args.release,
                database_url=args.database_url,
                runtime_role=args.runtime_role,
                active_schema=args.schema,
            ),
            indent=2,
        )
    )
