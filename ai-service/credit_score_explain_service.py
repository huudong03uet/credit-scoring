import time
from langchain.prompts import ChatPromptTemplate
from llm_config import get_llm_model
from json_helpers import clean_and_parse_json
from credit_score_explain_model import (
    CreditScoreExplainRequest,
    CreditScoreExplainResponse,
    CreditScoreExplainStatus
)
from neo4j import AsyncGraphDatabase

class CreditScoreExplainService:
    def __init__(self):
        # Load prompt template
        with open("credit_score_explain_template.txt", "r", encoding="utf-8") as f:
            prompt_template = f.read()
        self.prompt = ChatPromptTemplate.from_template(prompt_template)
        self.model = get_llm_model()
        self.chain = self.prompt | self.model
        # Neo4j driver (URL, AUTH lấy từ config)
        from llm_config import settings
        self.driver = AsyncGraphDatabase.driver(
            settings.NEO4J_URI, auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
        )

    async def explain_credit_score(self, request: CreditScoreExplainRequest) -> CreditScoreExplainResponse:
        start = time.time()
        try:
            #tra cứu field credit score từ  node Wallet trong Neo4j (Wallet có field score)
            # node nối với node Wallet và edge nối với node Wallet
            async with self.driver.session() as session:
                query = """
                MATCH (w:Wallet {id: $wallet_id})-[r]-(n)
                RETURN w, collect(r) AS edges, collect(n) AS nodes
                """
                result = await session.run(query, wallet_id=request.wallet_id)
                record = await result.single()
                nodes = [dict(n) for n in record["nodes"]]
                edges = [dict(r) for r in record["edges"]]
                
            async with self.driver.session() as session:
                result = await session.run(
                    "MATCH (w:Wallet {id: $wallet_id}) RETURN w.credit_score AS score",
                    wallet_id=request.wallet_id
                )
                # nếu không tìm thấy score, trả về 700
                record = await result.single()
                if not record:
                    score = 700
                else:
                    score = record["score"]

            print('12345566')

            # Kiểm tra credit score có hợp lệ không
            if not (300 <= score <= 850):
                raise ValueError("Credit score must be between 300 and 850.")
            if not nodes or not edges:
                raise ValueError("Nodes and edges data must not be empty.")
            # 1. Kiểm tra credit score có hợp lệ không
            if not (300 <= score <= 850):
                raise ValueError("Credit score must be between 300 and 850.")
            
            

            # 2. Chuẩn bị input cho LLM
            llm_input = {
                "credit_score": score,
                "wallet_id": request.wallet_id,
                "nodes": nodes,
                "edges": edges
            }

            # 3. Gọi LLM
            response = await self.chain.ainvoke(llm_input)
            content = response.content if hasattr(response, "content") else str(response)
            print(f"LLM raw response: {content}")

            # 4. Parse JSON output
            parsed = clean_and_parse_json(content)
            print(f"LLM response: {parsed}")
            elapsed = time.time() - start
            print(nodes)
            print(edges)
            return CreditScoreExplainResponse(
                status=CreditScoreExplainStatus.SUCCESS,
                explanation= parsed.get('summary', 'No explanation provided'),
                # data=parsed,
                # processing_time=round(elapsed, 3),
                # tokens_used=1
                score=score,
                nodes=nodes,
                edges=edges,
            
            )
        except Exception as e:
            elapsed = time.time() - start
            return CreditScoreExplainResponse(
                status=CreditScoreExplainStatus.ERROR,
                error_message=str(e),
                processing_time=round(elapsed, 3)
            )
