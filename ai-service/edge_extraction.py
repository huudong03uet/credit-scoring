from neo4j import GraphDatabase
import pandas as pd
import json

# ──────────────────────────────────────────────────────────────────────────────
# 1) Configure your Neo4j connection
from llm_config import settings
driver = GraphDatabase.driver(
            settings.NEO4J_URI, auth=(settings.NEO4J_USERNAME, settings.NEO4J_PASSWORD)
)

# ──────────────────────────────────────────────────────────────────────────────
# 2) Cypher to fetch raw liquidation logs
# ──────────────────────────────────────────────────────────────────────────────
CYpher = """
MATCH (w1:Wallet)-[r:LIQUIDATED_BY]->(w2:Wallet)
RETURN w1.id AS source, w2.id AS target, r.liquidationLogs AS logsJson
"""

# ──────────────────────────────────────────────────────────────────────────────
# 3) Pull data and parse JSON in Python
# ──────────────────────────────────────────────────────────────────────────────
def fetch_raw_liquidations(tx):
    return list(tx.run(CYpher))

records = []
with driver.session() as session:
    for rec in session.read_transaction(fetch_raw_liquidations):
        src = rec["source"]
        tgt = rec["target"]
        logs = json.loads(rec["logsJson"])
        # logs["liquidatedWallet"] is a dict: ts_str -> { debtAssetInUSD: ..., ... }
        for ts_str, detail in logs.get("liquidatedWallet", {}).items():
            weight = float(detail.get("debtAssetInUSD", 0.0))
            records.append({
                "source": src,
                "target": tgt,
                "weight": weight
            })

# ──────────────────────────────────────────────────────────────────────────────
# 4) Save to CSV
# ──────────────────────────────────────────────────────────────────────────────
df = pd.DataFrame(records)
df.to_csv("liquidated_edges.csv", index=False)
print(f"Exported {len(df)} liquidation edges to liquidated_edges.csv")
