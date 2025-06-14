from neo4j import GraphDatabase
uri = "neo4j+s://470cde68.databases.neo4j.io"
user = "neo4j"
password = "Z456d17M4q4EGQju5_xLT8vS4G-bb21D67SkjEV256M"

class WalletFeatureExporter:
    def __init__(self, uri, user, password):
        self.driver = GraphDatabase.driver(uri, auth=(user, password))

    def close(self):
        self.driver.close()

    def update_wallet_features(self):
        queries = [
            # DEPOSIT
            """
            MATCH (w:Wallet)-[r:DEPOSIT]->()
            WITH w, count(r) AS num_deposit, sum(r.amount) AS total_deposit
            SET w.num_deposit = num_deposit, w.total_deposit = total_deposit
            """,
            # BORROW
            """
            MATCH (w:Wallet)-[r:BORROW]->()
            WITH w, count(r) AS num_borrow, sum(r.amount) AS total_borrow
            SET w.num_borrow = num_borrow, w.total_borrow = total_borrow
            """,
            # REPAID
            """
            MATCH (w:Wallet)-[r:REPAID]->()
            WITH w, count(r) AS num_repay, sum(r.amount) AS total_repay
            SET w.num_repay = num_repay, w.total_repay = total_repay
            """,
            # WITHDRAW
            """
            MATCH (w:Wallet)-[r:WITHDRAW]->()
            WITH w, count(r) AS num_withdraw, sum(r.amount) AS total_withdraw
            SET w.num_withdraw = num_withdraw, w.total_withdraw = total_withdraw
            """,
            # TRANSFERS (outgoing and incoming)
            """
            MATCH (w:Wallet)-[r:TRANSFERRED_TO]->()
            WITH w, count(r) AS num_outgoing, sum(r.value) AS total_outgoing
            SET w.num_outgoing = num_outgoing, w.total_outgoing = total_outgoing
            """,
            """
            MATCH ()-[r:TRANSFERRED_TO]->(w:Wallet)
            WITH w, count(r) AS num_incoming, sum(r.value) AS total_incoming
            SET w.num_incoming = num_incoming, w.total_incoming = total_incoming
            """,
            # LIQUIDATIONS
            """
            MATCH (w:Wallet)<-[r:LIQUIDATED_BY]-()
            WITH w, count(r) AS num_liquidated, sum(r.amount) AS total_liquidated
            SET w.num_liquidated = num_liquidated, w.total_liquidated = total_liquidated
            """,
            """
            MATCH (w:Wallet)-[r:LIQUIDATED_BY]->()
            WITH w, count(r) AS num_liquidating, sum(r.amount) AS total_liquidating
            SET w.num_liquidating = num_liquidating, w.total_liquidating = total_liquidating
            """,
            # CONTRACTS and PROJECTS
            """
            MATCH (w:Wallet)-[:DEPOSIT|BORROW|REPAID|WITHDRAW]->(c:Contract)
            WITH w, count(DISTINCT c) AS num_contracts
            SET w.num_contracts = num_contracts
            """,
            """
            MATCH (w:Wallet)-[:DEPOSIT|BORROW|REPAID|WITHDRAW]->(:Contract)-[:PART_OF]->(p:Project)
            WITH w, count(DISTINCT p) AS num_projects
            SET w.num_projects = num_projects
            """,
            # TWEET METRICS
            """
            MATCH (w:Wallet)-[:DEPOSIT|BORROW|REPAID|WITHDRAW]->(:Contract)-[:PART_OF]->(:Project)-[:HAS_ACCOUNT]->(:TweetUser)-[:TWEETED]->(t:Tweet)
            WITH w, count(t) AS num_tweets, avg(t.likes) AS avg_likes, avg(t.retweetCounts) AS avg_retweets
            SET w.num_tweets = num_tweets, w.avg_likes = avg_likes, w.avg_retweets = avg_retweets
            """,
            # HASHTAG METRICS
            """
            MATCH (w:Wallet)-[:DEPOSIT|BORROW|REPAID|WITHDRAW]->(:Contract)-[:PART_OF]->(:Project)-[:HAS_ACCOUNT]->(:TweetUser)-[:TWEETED]->(:Tweet)-[:MENTIONS]->(h:Hashtag)
            WITH w, count(DISTINCT h) AS num_hashtags
            SET w.num_hashtags = num_hashtags
            """
        ]

        with self.driver.session() as session:
            for query in queries:
                session.run(query)
                print("Executed:", query.strip().splitlines()[0])

    def export_to_csv(self, filename="wallet_features.csv"):
        export_query = """
        CALL apoc.export.csv.query(
        "MATCH (w:Wallet)
        RETURN 
            w.address AS address,
            coalesce(w.num_deposit, 0) AS num_deposit,
            coalesce(w.total_deposit, 0.0) AS total_deposit,
            coalesce(w.num_borrow, 0) AS num_borrow,
            coalesce(w.total_borrow, 0.0) AS total_borrow,
            coalesce(w.num_repay, 0) AS num_repay,
            coalesce(w.total_repay, 0.0) AS total_repay,
            coalesce(w.num_withdraw, 0) AS num_withdraw,
            coalesce(w.total_withdraw, 0.0) AS total_withdraw,
            coalesce(w.num_outgoing, 0) AS num_outgoing,
            coalesce(w.total_outgoing, 0.0) AS total_outgoing,
            coalesce(w.num_incoming, 0) AS num_incoming,
            coalesce(w.total_incoming, 0.0) AS total_incoming,
            coalesce(w.num_liquidated, 0) AS num_liquidated,
            coalesce(w.total_liquidated, 0.0) AS total_liquidated,
            coalesce(w.num_liquidating, 0) AS num_liquidating,
            coalesce(w.total_liquidating, 0.0) AS total_liquidating,
            coalesce(w.num_contracts, 0) AS num_contracts,
            coalesce(w.num_projects, 0) AS num_projects,
            coalesce(w.num_tweets, 0) AS num_tweets,
            coalesce(w.avg_likes, 0.0) AS avg_likes,
            coalesce(w.avg_retweets, 0.0) AS avg_retweets,
            coalesce(w.num_hashtags, 0) AS num_hashtags",
        null,
        {stream:true}
        )
        YIELD data
        RETURN data
        """

        with self.driver.session() as session:
            result = session.run(export_query)
            csv_data = ""
            for record in result:
                csv_data += record["data"]
            with open(filename, "w", encoding="utf-8") as f:
                f.write(csv_data)
            print(f"Exported to {filename}")

if __name__ == "__main__":
    exporter = WalletFeatureExporter(uri, user, password)
    try:
        exporter.update_wallet_features()
        exporter.export_to_csv("wallet_features.csv")
    finally:
        exporter.close()
