from typing import Any, List, Literal
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import os
import asyncio
import json
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
        try:
            messages = payload.messages
            action = await decide_action(messages)

            if action["type"] == "call_function":
                func_name = action["function"]
                args = action.get("args", {})

                print(f"\nCALLING `{func_name}` with:\n{args}\n")

                if func_name == "get_wallet_graph":
                    result = await get_wallet_graph(**args)
                elif func_name == "get_credit_score":
                    result = await get_credit_score(**args)
                else:
                    result = {"error": f"Hàm không tồn tại: {func_name}"}

                system_msg = Message(
                    role="system",
                    content=f"Kết quả từ `{func_name}`:\n{json.dumps(result, indent=2)}",
                )
                messages.append(system_msg)

            stream = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[m.model_dump() for m in messages],
                stream=True,
            )

            async for chunk in stream:
                text = chunk.choices[0].delta.content or ""
                if text:
                    yield text
                    await asyncio.sleep(0)

        except Exception as e:
            yield f"[Error] {str(e)}\n\n"

    return StreamingResponse(event_generator(), media_type="text/plain; charset=utf-8")


async def get_wallet_graph(wallet_address: str, chain_id: str = "0x1", limit: int = 20):
    return {
        "wallet": wallet_address,
        "chain": chain_id,
        "limit": limit,
        "summary": f"Ví {wallet_address} trên chain {chain_id} có {limit} tương tác.",
    }


async def get_credit_score(wallet_address: str, chain_id: str = "0x1"):
    return {
        "wallet": wallet_address,
        "chain": chain_id,
        "credit_score": 72,
        "grade": "B+",
    }


async def decide_action(messages: List[Message]) -> dict:
    prompt = f"""
Bạn là một AI nội bộ có quyền truy cập các hàm thực thi dữ liệu thật như `get_wallet_graph`, `get_credit_score`, v.v.
Chỉ cần phát hiện người dùng yêu cầu thông tin cụ thể (như địa chỉ ví, chain ID...) thì hãy tạo yêu cầu gọi hàm tương ứng.

- Nếu cần → trả về JSON kiểu: 
  {{
    "type": "call_function",
    "function": "get_wallet_graph",
    "args": {{
      "wallet_address": "0xabc",
      "chain_id": "0x1",
      "limit": 20
    }}
  }}

- Nếu không cần → trả về:
  {{ "type": "chat" }}

Hội thoại:
{json.dumps([m.model_dump() for m in messages], indent=2)}
"""

    completion = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": "Bạn là một AI quyết định gọi hàm backend."},
            {"role": "user", "content": prompt},
        ],
    )
    try:
        return json.loads(completion.choices[0].message.content)
    except Exception as e:
        return {"type": "chat"}


# async def chat_stream(messages: List[Message]):
#     try:
#         action = await decide_action(messages)

#         if action["type"] == "call_function":
#             func_name = action["function"]
#             args = action.get("args", {})

#             print(f"\nCALLLLLL `{func_name}` with:\n{args}\n")

#             if func_name == "get_wallet_graph":
#                 result = await get_wallet_graph(**args)
#             elif func_name == "get_credit_score":
#                 result = await get_credit_score(**args)
#             else:
#                 result = {"error": f"Hàm không tồn tại: {func_name}"}

#             system_msg = Message(
#                 role="system",
#                 content=f"Kết quả từ `{func_name}`:\n{json.dumps(result, indent=2)}",
#             )
#             messages.append(system_msg)
#         stream = await client.chat.completions.create(
#             model="gpt-4o-mini",
#             messages=[m.model_dump() for m in messages],
#             stream=True,
#         )

#         async for chunk in stream:
#             text = chunk.choices[0].delta.content or ""
#             if text:
#                 print(text, end="", flush=True)
#                 await asyncio.sleep(0)

#     except Exception as e:
#         print(f"\nError: {str(e)}")
