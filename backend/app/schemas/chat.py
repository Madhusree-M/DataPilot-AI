from pydantic import BaseModel
from typing import List, Dict, Any, Optional

class ChatMessage(BaseModel):
    role: str  # 'user' or 'assistant'
    content: str

class ChatQueryRequest(BaseModel):
    dataset_id: str
    message: str
    history: Optional[List[ChatMessage]] = None

class DataInsight(BaseModel):
    type: str  # 'stat', 'correlation', 'outlier', 'recommendation'
    title: str
    description: str

class ChatQueryResponse(BaseModel):
    reply: str
    insights: Optional[List[DataInsight]] = None
    chart_suggestion: Optional[Dict[str, Any]] = None  # {type: 'bar'|'scatter'|'line', x: '...', y: '...', title: '...'}
    computed_data: Optional[Dict[str, Any]] = None
