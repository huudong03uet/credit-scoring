from sqlalchemy import Column, Integer, String
from app.database import Base

class CreditRecord(Base):
    __tablename__ = 'credit_records'
    id = Column(Integer, primary_key=True, index=True)
    user = Column(String, unique=True, index=True)
    score = Column(Integer, default=0)