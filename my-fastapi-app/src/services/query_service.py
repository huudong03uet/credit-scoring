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
        chain_id = chain_id or "0x1"
        """Fetch one record from each collection to link Wallet, Lending Events, Contracts, Projects, Social, Twitter"""
        logger.info(f"Fetching graph data for wallet_address={wallet_address}, chain_id={chain_id}, limit={limit}")
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
                "_id": 1, "address": 1, "chainId": 1, "balanceInUSD": 1, "balanceChangeLogs": 1,
                "depositInUSD": 1, "depositChangeLogs": 1, "borrowInUSD": 1, "borrowChangeLogs": 1,
                "dailyAllTransactions": 1, "dailyNumberOfTransactions": 1, "dailyTransactionAmounts": 1,
                "numberOfLiquidation": 1, "totalValueOfLiquidation": 1
            }
            async for wallet in wallet_collection.find(wallet_query, wallet_projection).limit(limit):
                result["wallets"].append(wallet)
            logger.info(f"Step 1: Retrieved {len(result['wallets'])} wallet(s)")
            if result["wallets"]:
                logger.debug(f"Sample wallet: {result['wallets'][0]}")
            else:
                logger.debug("No wallets retrieved")

            # Step 2: Query Lending Events
            wallet_addresses = [wallet["address"] for wallet in result["wallets"]]
            if wallet_addresses:
                lending_collection = self.db_manager.get_mongodb_database("ethereum_blockchain_etl")["lending_events"]
                lending_query = {"user": {"$in": wallet_addresses}}
                logger.debug(f"Step 2: Lending event query: {lending_query}")
                lending_projection = {
                    "_id": 1, "wallet": 1, "contract_address": 1, "amount": 1, "block_timestamp": 1, "event_type": 1
                }
                async for event in lending_collection.find(lending_query, lending_projection).limit(limit):
                    result["lending_events"].append(event)
                logger.info(f"Step 2: Retrieved {len(result['lending_events'])} lending event(s)")
                if result["lending_events"]:
                    logger.debug(f"Sample lending event: {result['lending_events'][0]}")
            else:
                logger.debug("Step 2: Skipped lending events query (no wallet addresses)")

            # Step 3: Query Contracts
            contract_addresses = list(set(event["contract_address"] for event in result["lending_events"]))
            if contract_addresses:
                contract_collection = db["smart_contracts"]
                contract_query = {"address": {"$in": contract_addresses}}
                logger.debug(f"Step 3: Contract query: {contract_query}")
                contract_projection = {
                    "_id": 1, "address": 1, "tags": 1, "numberOfDailyCalls": 1, "numberOfDailyActiveUsers": 1
                }
                async for contract in contract_collection.find(contract_query, contract_projection).limit(limit):
                    active_users_count = len(contract.get("numberOfDailyActiveUsers", {}))
                    daily_calls_count = len(contract.get("numberOfDailyCalls", {}))
                    logger.debug(f"Step 3: Counted {active_users_count} keys in numberOfDailyActiveUsers and {daily_calls_count} keys in numberOfDailyCalls for contract {contract['address']}")
                    contract["numberOfDailyActiveUsers"] = active_users_count
                    contract["numberOfDailyCalls"] = daily_calls_count
                    result["contracts"].append(contract)
                logger.info(f"Step 3: Retrieved {len(result['contracts'])} contract(s)")
                if result["contracts"]:
                    logger.debug(f"Sample contract: {result['contracts'][0]}")
            else:
                logger.debug("Step 3: Skipped contracts query (no contract addresses)")

            # Step 4: Query Projects
            if contract_addresses:
                project_collection = db["projects"]
                project_query = {
                    "$or": [{f"contractAddresses.{chain_id}_{addr}": {"$exists": True}} for addr in contract_addresses]
                }
                logger.debug(f"Step 4: Project query: {project_query}")
                project_projection = {
                    "_id": 1, "name": 1, "tvl": 1, "category": 1, "deployedChains": 1,
                    "contractAddresses": 1, "tokenAddresses": 1, "socialAccounts.twitter.id": 1
                }
                async for project in project_collection.find(project_query, project_projection).limit(limit):
                    result["projects"].append(project)
                logger.info(f"Step 4: Retrieved {len(result['projects'])} project(s)")
                if result["projects"]:
                    logger.debug(f"Sample project: {result['projects'][0]}")
            else:
                logger.debug("Step 4: Skipped projects query (no contract addresses or chain_id)")

            # Step 5: Query Project Social
            project_ids = [project["_id"] for project in result["projects"]]
            if project_ids:
                social_collection = self.db_manager.get_mongodb_database("cdp_db")["projects_social_media"]
                social_query = {"_id": {"$in": project_ids}}
                logger.debug(f"Step 5: Social query: {social_query}")
                social_projection = {"_id": 1, "twitter.id": 1}
                async for social in social_collection.find(social_query, social_projection).limit(limit):
                    result["project_social"].append(social)
                logger.info(f"Step 5: Retrieved {len(result['project_social'])} project social record(s)")
                if result["project_social"]:
                    logger.debug(f"Sample project social: {result['project_social'][0]}")
            else:
                logger.debug("Step 5: Skipped project social query (no project IDs)")

            # Step 6: Query Twitter Users
            twitter_ids = [social["twitter"]["id"] for social in result["project_social"] if social.get("twitter", {}).get("id")]
            if twitter_ids:
                twitter_user_collection = self.db_manager.get_mongodb_database("cdp_db")["twitter_users"]
                twitter_query = {"userName": {"$in": twitter_ids}}
                logger.debug(f"Step 6: Twitter user query: {twitter_query}")
                twitter_user_projection = {
                    "_id": 1, "userName": 1, "followersCount": 1, "favouritesCount": 1,
                    "friendsCount": 1, "statusesCount": 1, "verified": 1
                }
                async for user in twitter_user_collection.find(twitter_query, twitter_user_projection).limit(limit):
                    result["twitter_users"].append(user)
                logger.info(f"Step 6: Retrieved {len(result['twitter_users'])} Twitter user(s)")
                if result["twitter_users"]:
                    logger.debug(f"Sample Twitter user: {result['twitter_users'][0]}")
            else:
                logger.debug("Step 6: Skipped Twitter users query (no Twitter IDs)")

            # Step 7: Query Tweets
            if twitter_ids:
                tweet_collection = self.db_manager.get_mongodb_database("cdp_db")["tweets"]
                tweet_query = {"authorName": {"$in": twitter_ids}}
                logger.debug(f"Step 7: Tweet query: {tweet_query}")
                tweet_projection = {
                    "_id": 1, "authorName": 1, "timestamp": 1, "likes": 1,
                    "retweetCounts": 1, "replyCounts": 1, "hashTags": 1
                }
                async for tweet in tweet_collection.find(tweet_query, tweet_projection).limit(limit):
                    tweet_dict = {
                        "id": str(tweet["_id"]),  # Convert ObjectId to string
                        "authorName": tweet.get("authorName"),
                        "timestamp": tweet.get("timestamp"),
                        "likes": tweet.get("likes"),
                        "retweetCounts": tweet.get("retweetCounts"),
                        "replyCounts": tweet.get("replyCounts"),
                        "hashTags": tweet.get("hashTags")
                    }
                    result["tweets"].append(tweet_dict)
                logger.info(f"Step 7: Retrieved {len(result['tweets'])} tweet(s)")
                if result["tweets"]:
                    logger.debug(f"Sample tweet: {result['tweets'][0]}")
            else:
                logger.debug("Step 7: Skipped tweets query (no Twitter IDs)")

            # Step 8: Query Liquidations
            if wallet_addresses:
                liquidation_collection = db["liquidates"]
                liquidation_query = {
                    "$or": [
                        {"liquidatedWallet": {"$in": wallet_addresses}},
                        {"debtBuyerWallet": {"$in": wallet_addresses}}
                    ]
                }
                logger.debug(f"Step 8: Liquidation query: {liquidation_query}")
                liquidation_projection = {"_id": 1, "liquidatedWallet": 1, "debtBuyerWallet": 1, "liquidationLogs": 1}
                async for liquidation in liquidation_collection.find(liquidation_query, liquidation_projection).limit(limit):
                    result["liquidations"].append(liquidation)
                logger.info(f"Step 8: Retrieved {len(result['liquidations'])} liquidation(s)")
                if result["liquidations"]:
                    logger.debug(f"Sample liquidation: {result['liquidations'][0]}")
            else:
                logger.debug("Step 8: Skipped liquidations query (no wallet addresses)")

            logger.info("Graph data fetched successfully")
            return result
        except Exception as e:
            logger.error(f"Error fetching wallet graph data: {str(e)}", exc_info=True)
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