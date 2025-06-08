from celery import Celery
from app.config import settings
from web3 import Web3
from app import crud, models
from app.database import SessionLocal

celery = Celery(__name__, broker=settings.redis_url, backend=settings.redis_url)

w3 = Web3(Web3.HTTPProvider(settings.rpc_url))
abi = []  # load ABI

@celery.on_after_configure.connect
def setup_periodic_tasks(sender, **kwargs):
    sender.add_periodic_task(60.0, fetch_onchain.s(), name='fetch on-chain each minute')

@celery.task
def fetch_onchain():
    contract = w3.eth.contract(address=settings.contract_address, abi=abi)
    db = SessionLocal()
    for rec in db.query(models.CreditRecord).all():
        score = contract.functions.getScore(rec.user).call()
        crud.update_score(db, rec.user, score)
    db.close()