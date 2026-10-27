from fastapi import APIRouter, HTTPException
from app.services.chat_service import ChatService
from app.schemas.chat import ChatQueryRequest, ChatQueryResponse

router = APIRouter(prefix="/api/chat", tags=["chat"])

@router.post("", response_model=ChatQueryResponse)
def query_dataset(request: ChatQueryRequest):
    """Ask natural language questions about a dataset."""
    try:
        return ChatService.answer_query(request)
    except FileNotFoundError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Query error: {str(e)}")
