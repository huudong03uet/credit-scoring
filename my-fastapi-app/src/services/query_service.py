import logging
from typing import Optional, List, Dict, Any
from src.core.database import DatabaseManager
from src.schemas.responses import *
from bson import ObjectId

# Configure logger
logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
if not logger.handlers:  # Avoid duplicate handlers
    logger.addHandler(handler)

class QueryService:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
    
    async def get_wallet_graph_data(
        self,
        wallet_address: Optional[str] = None,
        chain_id: str = "0x1",
        limit: int = 1  # Default limit to 1 record per collection
    ) -> Dict[str, Any]:
        """Fetch one record from each collection to link Wallet, Lending Events, Contracts, Projects, Social, Twitter"""
        try:
            result = {
                "wallets": [],
                "lending_events": [],
                "contracts": [],
                "projects": [],
                "project_social": [],
                "twitter_users": [],
                "tweets": [],
                "token_transfers": [],
                "liquidations": []
            }

            # Step 1: Query Wallets
            db = self.db_manager.get_mongodb_database("knowledge_graph")
            wallet_collection = db["wallets"]
            wallet_query = {"address": wallet_address} if wallet_address else {"chainId": chain_id}
            wallet_projection = {
                "_id": 0, "address": 1, "chainId": 1, "balanceInUSD": 1, "balanceChangeLogs": 1,
                "depositInUSD": 1, "depositChangeLogs": 1, "borrowInUSD": 1, "borrowChangeLogs": 1,
                "dailyAllTransactions": 1, "dailyNumberOfTransactions": 1, "dailyTransactionAmounts": 1,
                "numberOfLiquidation": 1, "totalValueOfLiquidation": 1
            }
            async for wallet in wallet_collection.find(wallet_query, wallet_projection).limit(limit):
                result["wallets"].append(wallet)
            logger.info(f"Step 1: Retrieved {len(result['wallets'])} wallet(s)")

            # Step 2: Query Lending Events
            lending_collection = self.db_manager.get_mongodb_database("blockchain_etl")["lending_events"]
            wallet_addresses = [wallet["address"] for wallet in result["wallets"]]
            lending_query = {"wallet": {"$in": wallet_addresses}} if wallet_addresses else {}
            lending_projection = {
                "_id": 0, "wallet": 1, "contract_address": 1, "amount": 1, "block_timestamp": 1, "event_type": 1
            }
            async for event in lending_collection.find(lending_query, lending_projection).limit(limit):
                result["lending_events"].append(event)
            logger.info(f"Step 2: Retrieved {len(result['lending_events'])} lending event(s)")

            # Step 3: Query Contracts
            contract_addresses = [event["contract_address"] for event in result["lending_events"]]
            contract_collection = db["smart_contracts"]
            contract_query = {"address": {"$in": contract_addresses}} if contract_addresses else {}
            contract_projection = {
                "_id": 0, "address": 1, "tags": 1, "numberOfDailyCalls": 1, "numberOfDailyActiveUsers": 1
            }
            async for contract in contract_collection.find(contract_query, contract_projection).limit(limit):
                active_users_count = len(contract["numberOfDailyActiveUsers"]) if contract.get("numberOfDailyActiveUsers") else 0
                daily_calls_count = len(contract["numberOfDailyCalls"]) if contract.get("numberOfDailyCalls") else 0
                logger.debug(f"Step 3: Counted {active_users_count} keys in numberOfDailyActiveUsers and {daily_calls_count} keys in numberOfDailyCalls for contract {contract['address']}")
                contract["numberOfDailyActiveUsers"] = active_users_count
                contract["numberOfDailyCalls"] = daily_calls_count
                result["contracts"].append(contract)
            logger.info(f"Step 3: Retrieved {len(result['contracts'])} contract(s)")

            # Step 4: Query Projects
            project_collection = db["projects"]
            project_query = {}
            if chain_id and contract_addresses:
                project_query = {
                    "$or": [{f"contractAddresses.{chain_id}_{addr}": {"$exists": True}} for addr in contract_addresses]
                }
            project_projection = {
                "_id": 1, "name": 1, "tvl": 1, "category": 1, "deployedChains": 1,
                "contractAddresses": 1, "tokenAddresses": 1, "socialAccounts.twitter.id": 1
            }
            async for project in project_collection.find(project_query, project_projection).limit(limit):
                result["projects"].append(project)
            logger.info(f"Step 4: Retrieved {len(result['projects'])} project(s)")

            # Step 5: Query Project Social
            project_ids = [project["_id"] for project in result["projects"]]
            social_collection = self.db_manager.get_mongodb_database("cdp_db")["projects_social_media"]
            social_projection = {"_id": 1, "twitter.id": 1}
            async for social in social_collection.find({"_id": {"$in": project_ids}}, social_projection).limit(limit):
                result["project_social"].append(social)
            logger.info(f"Step 5: Retrieved {len(result['project_social'])} project social record(s)")

            # Step 6: Query Twitter Users
            twitter_ids = [social["twitter"]["id"] for social in result["project_social"] if social.get("twitter")]
            twitter_user_collection = self.db_manager.get_mongodb_database("cdp_db")["twitter_users"]
            twitter_query = {"userName": {"$in": twitter_ids}} if twitter_ids else {}
            twitter_user_projection = {
                "_id": 1, "userName": 1, "followersCount": 1, "favouritesCount": 1,
                "friendsCount": 1, "statusesCount": 1, "verified": 1
            }
            async for user in twitter_user_collection.find(twitter_query, twitter_user_projection).limit(limit):
                result["twitter_users"].append(user)
            logger.info(f"Step 6: Retrieved {len(result['twitter_users'])} Twitter user(s)")

            # Step 7: Query Tweets
            tweet_collection = self.db_manager.get_mongodb_database("cdp_db")["tweets"]
            tweet_query = {"authorName": {"$in": twitter_ids}} if twitter_ids else {}
            tweet_projection = {
                "_id": 1, "authorName": 1, "timestamp": 1, "likes": 1,
                "retweetCounts": 1, "replyCounts": 1, "hashTags": 1
            }
            async for tweet in tweet_collection.find(tweet_query, tweet_projection).limit(limit):
                tweet_dict = {}
                for key, value in tweet.items():
                    if key == "_id":
                        tweet_dict["id"] = str(value)  # Convert ObjectId or string to string
                    else:
                        tweet_dict[key] = value
                result["tweets"].append(tweet_dict)
            logger.info(f"Step 7: Retrieved {len(result['tweets'])} tweet(s)")

            # # Step 8: Query Token Transfers (Cassandra)
            # logger.debug("Step 8: Querying token transfers")
            # if wallet_addresses:
            #     cassandra_session = self.db_manager.get_cassandra_session()

            #     # Query transfers theo from_address
            #     token_transfer_query_from = """
            #         SELECT block_number, from_address, to_address, value
            #         FROM token_transfer
            #         WHERE from_address IN ?
            #         LIMIT %s
            #         ALLOW FILTERING
            #     """
            #     prepared_from = cassandra_session.prepare(
            #         token_transfer_query_from % ( limit)
            #     )
            #     rows_from = cassandra_session.execute(
            #         prepared_from, [tuple(wallet_addresses)]
            #     )

            #     # Query transfers theo to_address
            #     token_transfer_query_to = """
            #         SELECT block_number, from_address, to_address, value
            #         FROM token_transfer
            #         WHERE to_address IN ?
            #         LIMIT %s
            #         ALLOW FILTERING
            #     """
            #     prepared_to = cassandra_session.prepare(
            #         token_transfer_query_to % (limit)
            #     )
            #     rows_to = cassandra_session.execute(
            #         prepared_to, [tuple(wallet_addresses)]
            #     )

            #     # Gộp và khử trùng
            #     unique = {
            #         (r.block_number, r.from_address, r.to_address, r.value): r
            #         for r in list(rows_from) + list(rows_to)
            #     }
            #     result["token_transfers"] = [r._asdict() for r in unique.values()]

            #     logger.info(f"Step 8: Retrieved {len(result['token_transfers'])} token transfer(s)")
            #     if result["token_transfers"]:
            #         logger.debug(f"Step 8: Sample token transfer: {result['token_transfers'][0]}")
            # else:
            #     logger.info("Step 8: Skipped token transfers query (no chain_id or wallet_addresses)")

            # Step 9: Query Liquidations
            liquidation_collection = db["liquidates"]
            liquidation_query = {
                "$or": [
                    {"liquidatedWallet": {"$in": wallet_addresses}},
                    {"debtBuyerWallet": {"$in": wallet_addresses}}
                ]
            } if wallet_addresses else {}
            liquidation_projection = {"_id": 0, "liquidatedWallet": 1, "debtBuyerWallet": 1, "liquidationLogs": 1}
            async for liquidation in liquidation_collection.find(liquidation_query, liquidation_projection).limit(limit):
                result["liquidations"].append(liquidation)
            logger.info(f"Step 9: Retrieved {len(result['liquidations'])} liquidation(s)")

            return result
        except Exception as e:
            logger.error(f"Error fetching wallet graph data: {e}")
            # Return result with empty lists to satisfy Pydantic model
            return {
                "wallets": [],
                "lending_events": [],
                "contracts": [],
                "projects": [],
                "project_social": [],
                "twitter_users": [],
                "tweets": [],
                "token_transfers": [],
                "liquidations": []
            }
    