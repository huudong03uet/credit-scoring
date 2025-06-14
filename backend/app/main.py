from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from web3 import Web3
import requests
from app import crud, models, schemas
from app.database import SessionLocal, engine
from app.config import settings

models.Base.metadata.create_all(bind=engine)
app = FastAPI()

w3 = Web3(Web3.HTTPProvider(settings.rpc_url))
abi = []  # load ABI

def get_db():
    db = SessionLocal()
    try: yield db
    finally: db.close()

@app.post('/score/predict', response_model=schemas.ScoreResponse)
def predict_and_update(data: schemas.ScoreCreate, db: Session = Depends(get_db)):
    ai = requests.post('http://ai-service:8001/predict', json={'user': data.user})
    score = ai.json().get('score')
    acct = w3.eth.account.from_key(settings.private_key)
    contract = w3.eth.contract(address=settings.contract_address, abi=abi)
    tx = contract.functions.updateScore(data.user, score).buildTransaction({ 'from': acct.address, 'nonce': w3.eth.get_transaction_count(acct.address) })
    signed = acct.sign_transaction(tx)
    w3.eth.send_raw_transaction(signed.rawTransaction)
    rec = crud.update_score(db, data.user, score)
    return schemas.ScoreResponse(user=rec.user, score=rec.score)

@app.get('/score/{user}', response_model=schemas.ScoreResponse)
def read_score(user: str, db: Session = Depends(get_db)):
    rec = crud.get_record(db, user)
    if not rec:
        raise HTTPException(404, 'User not found')
    return schemas.ScoreResponse(user=rec.user, score=rec.score)