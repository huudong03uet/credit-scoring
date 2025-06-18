from typing import List, Literal
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import openai
import logging
import asyncio

router = APIRouter()
openai.api_key = os.getenv("OPENAI_API_KEY")
logger = logging.getLogger(__name__)

class Message(BaseModel):
    role: Literal["system", "user", "assistant"]
    content: str

class ChatRequest(BaseModel):
    messages: List[Message]

@router.post("/chatbot/message/stream")
async def chat_stream(payload: ChatRequest):
    if not payload.messages:
        raise HTTPException(status_code=400, detail="messages must not be empty")

    async def event_generator():
        try:
            # gọi OpenAI với stream=True
            resp = await openai.ChatCompletion.acreate(
                model="gpt-4o-mini",
                messages=[m.model_dump() for m in payload.messages],
                stream=True
            )
            # resp là một async iterator
            async for chunk in resp:
                # chunk.choices[0].delta có thể có 'content' hoặc chỉ role ở lần đầu
                delta = chunk.choices[0].delta
                text = delta.get("content", "")
                if text:
                    # chunked transfer: mỗi phần là một text nhỏ
                    yield text
                    await asyncio.sleep(0)  # nhường event loop
        except openai.error.OpenAIError as oe:
            logger.error("OpenAI API error: %s", oe, exc_info=True)
            yield f"\n[ERROR] OpenAI API error: {oe}"
        except Exception as e:
            logger.exception("Unexpected error in stream")
            yield f"\n[ERROR] Internal error: {e}"

    # Trả về StreamingResponse, media_type text/plain (hoặc text/event-stream nếu SSE)
    return StreamingResponse(event_generator(), media_type="text/plain; charset=utf-8")
