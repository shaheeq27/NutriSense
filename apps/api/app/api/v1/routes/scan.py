from fastapi import APIRouter, File, UploadFile

from app.api.deps import DB
from app.schemas.scan import ScanResponse
from app.services.scan_service import MAX_IMAGE_BYTES, ScanService

router = APIRouter(prefix="/scan", tags=["scan"])


@router.post("/identify", response_model=ScanResponse)
async def identify(db: DB, image: UploadFile = File(...)):
    data = await image.read(MAX_IMAGE_BYTES + 1)
    return ScanService(db).identify(data, image.filename, image.content_type)
