from fastapi import FastAPI
from pydantic import BaseModel
import random
import uvicorn

class Item(BaseModel):
    user: str

app = FastAPI()

@app.post('/predict')
def predict(item: Item):
    return {'score': random.randint(300,850)}

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8000)