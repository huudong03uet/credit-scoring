from sqlalchemy.orm import Session
from app import models

def get_record(db: Session, user: str):
    return db.query(models.CreditRecord).filter(models.CreditRecord.user == user).first()

def update_score(db: Session, user: str, score: int):
    rec = get_record(db, user)
    if rec:
        rec.score = score
        db.commit(); db.refresh(rec)
    else:
        rec = models.CreditRecord(user=user, score=score)
        db.add(rec); db.commit(); db.refresh(rec)
    return rec