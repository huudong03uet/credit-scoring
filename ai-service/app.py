from fastapi import FastAPI
from pydantic import BaseModel
import random

class Item(BaseModel):
    user: str

app = FastAPI()

@app.post('/predict')
def predict(item: Item):
    return {'score': random.randint(300,850)}