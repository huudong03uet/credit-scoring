from typing import Any, List, Literal
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import asyncio
from openai import AsyncOpenAI

router = APIRouter()
client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

@router.post("/message/stream")
async def chat_stream(payload: ChatRequest, graph: Any = None) -> StreamingResponse:
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages must not be empty")

    async def event_generator():
        stream = await client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[m.model_dump() for m in payload.messages],
            stream=True,
        )
        async for chunk in stream:
            text = chunk.choices[0].delta.content or ""
            if text:
                yield text
                await asyncio.sleep(0)

    return StreamingResponse(event_generator(), media_type="text/plain; charset=utf-8")
