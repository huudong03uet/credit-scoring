from openai import AsyncOpenAI
import os
import json


def build_schema_description() -> str:
    return """
# Mô tả Kiến thức Đồ thị (Knowledge Graph)

## Wallet
- id: str
- address: str
- chainId: str
- balanceInUSD: float
- depositInUSD: float
- borrowInUSD: float
- numberOfLiquidation: int
- totalValueOfLiquidation: float
- credit_score: float
- total_deposit: float
- total_borrow: float
- total_repay: float
- total_liquidated: int
- num_borrow: int
- num_repay: int
- num_liquidated: int

## Project
- id: str
- name: str
- category: str
- tvl: float
- tokenAddresses: str
- contractAddresses: str
- deployedChains: [str]
- twitterId: str

## Contract
- id: str
- address: str
- chainId: str
- tags: [str]
- numberOfDailyCalls: int
- numberOfDailyActiveUsers: int

## Token
- id: str
- address: str
- chainId: str
- symbol: str
- price: float
- marketCap: float
- decimals: int
- tradingVolume: str

## Tweet
- id: str
- authorName: str
- likes: int
- retweetCounts: int
- replyCounts: int
- hashTags: [str]
- timestamp: int

## TweetUser
- id: str
- userName: str
- verified: bool
- followersCount: int
- friendsCount: int
- statusesCount: int
- favouritesCount: int

## Hashtag
- id: str
- tag: str

---

## Relationships:

- (Wallet)-[:BORROWED]->(Contract)
- (Wallet)-[:REPAID]->(Contract)
- (Wallet)-[:LIQUIDATED_BY]->(Contract)
- (Wallet)-[:DEPOSITED]->(Contract)
- (Wallet)-[:WITHDREW]->(Contract)
- (Wallet)-[:PART_OF]->(Project)
- (Wallet)-[:MENTIONS]->(Hashtag)
- (Wallet)-[:HAS_ACCOUNT]->(TweetUser)
- (TweetUser)-[:TWEETED]->(Tweet)
"""


client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))


async def generate_kg_query_via_openai(question: str, schema_description: str) -> str:
    system_prompt = f"""
Bạn là một trợ lý sinh truy vấn Cypher (Neo4j) từ câu hỏi người dùng.

Hãy sử dụng các thông tin dưới đây làm schema tham khảo:

{schema_description}

Trả về **chỉ câu truy vấn Cypher**, KHÔNG thêm giải thích, KHÔNG có markdown hoặc ```.
"""

    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": question},
    ]

    response = await client.chat.completions.create(
        model="gpt-4o-mini", messages=messages
    )

    return response.choices[0].message.content.strip()


from neo4j import GraphDatabase
from typing import List, Dict

NEO4J_URI = "neo4j+s://9d8667c9.databases.neo4j.io"
NEO4J_USER = "neo4j"
NEO4J_PASSWORD = "dnw0HLFXPYFmCxRwG1cj_BmKeRDT-trsWNJSfpm16M8"


def run_cypher_query(query: str) -> List[Dict]:
    driver = GraphDatabase.driver(NEO4J_URI, auth=(NEO4J_USER, NEO4J_PASSWORD))
    results = []

    with driver.session() as session:
        cypher_result = session.run(query)
        for record in cypher_result:
            results.append(record.data())

    driver.close()
    return results


import asyncio

if __name__ == "__main__":
    schema_text = build_schema_description()
    query = "Cho tôi danh sách các ví có số dư trên 1000 USD và đã từng vay trong lending_events."

    result = asyncio.run(generate_kg_query_via_openai(query, schema_text))
    print("Cypher Query được sinh:\n", result)

    result = run_cypher_query(result)
    print("cypher result:", result)
