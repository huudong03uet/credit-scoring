from pydantic import BaseModel

class ScoreCreate(BaseModel):
    user: str

class ScoreResponse(BaseModel):
    user: str
    score: int