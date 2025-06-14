from enum import Enum
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

class CreditScoreExplainStatus(str, Enum):
    SUCCESS = "success"
    ERROR = "error"

class CreditScoreExplainRequest(BaseModel):
    wallet_id: str = Field(..., description="ID ví trong Neo4j")

    class Config:
        json_schema_extra = {
            "example": {

                "wallet_id": "0xAbC1234Def5678"
            }
        }

class CreditScoreExplainResponse(BaseModel):
    status: CreditScoreExplainStatus
    explanation: Optional[str] = Field(None, description="Giải thích ảnh hưởng tới credit score")
    processing_time: Optional[float] = Field(None, description="Thời gian xử lý (giây)")
    tokens_used: Optional[int] = Field(None, description="Số token LLM đã dùng")
    error_message: Optional[str] = None
