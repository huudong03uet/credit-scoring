from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import random
import uvicorn

from credit_score_explain_model import (
    CreditScoreExplainRequest,
    CreditScoreExplainResponse
)
from fastapi.middleware.cors import CORSMiddleware
from credit_score_explain_service import CreditScoreExplainService

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
class Item(BaseModel):
    user: str

@app.post("/credit_score_explain", response_model=CreditScoreExplainResponse)
async def credit_score_explain(request: CreditScoreExplainRequest):
    service = CreditScoreExplainService()
    try:
        result = await service.explain_credit_score(request)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/predict')
def predict(item: Item):
    return {
        'score': random.randint(300, 850),
        "explanation": "This is a mock score generated for demonstration purposes."
    }

if __name__ == '__main__':
    uvicorn.run("app:app", host='0.0.0.0', port=7999, reload=True)