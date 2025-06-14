from typing import Optional, List, Dict, Any
from src.core.database import DatabaseManager
from src.schemas.responses import GraphNodeResponse, GraphRelationshipResponse, GraphQueryResponse, GraphStatsResponse
from src.services.query_service import QueryService
import asyncio
import logging
import json
from enum import Enum

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)
handler = logging.StreamHandler()
formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
handler.setFormatter(formatter)
if not logger.handlers:
    logger.addHandler(handler)

class WalletSource(str, Enum):
    wallets = "wallets"
    lending_events = "lending_events"
    liquidations = "liquidations"
class GraphService:
    def __init__(self, db_manager: DatabaseManager):
        self.db_manager = db_manager
        self.query_service = QueryService(db_manager)

    async def build_graph_from_wallet_batch(
    self,
    limit: int = 100,
    offset: int = 0,
    source: str = WalletSource.wallets,
    chain_id: str = "0x1"
) -> Dict[str, Any]:
        logger.info(f"Starting build_graph_from_wallet_batch with limit={limit}, offset={limit}, chain_id={chain_id}")
        try:
            # Initialize result
            result = {
                "status": "success",
                "message": "Processed wallet batch successfully",
                "total_processed": 0,
                "successes": 0,
                "failures": 0,
                "errors": []
            }

            # Step 1: Fetch wallets from MongoDB
            if source == WalletSource.wallets:
                db = self.db_manager.get_mongodb_database("knowledge_graph")
                collection = db["wallets"]
                projection = {"_id": 0, "address": 1}
                cursor = collection.find({}, projection).skip(offset).limit(limit)
            else:
                if source == WalletSource.lending_events:
                    db = self.db_manager.get_mongodb_database("ethereum_blockchain_etl")
                    collection = db["lending_events"]
                    projection = {"_id": 0, "wallet": 1}
                    cursor = collection.find({}, projection).skip(offset).limit(limit)
                else:
                    if source == WalletSource.liquidations:
                        db = self.db_manager.get_mongodb_database("knowledge_graph")
                        collection = db["liquidates"]
                        projection = {"_id": 0, "debtBuyerWallet": 1}
                        cursor = collection.find({}, projection).skip(offset).limit(limit)
                    else:
                        raise ValueError(f"Invalid source: {source}")
            
            # Step 2: Deduplicate wallets by address
            unique_wallets = []
            seen_addresses = set()
            async for doc in cursor:
                if source == WalletSource.liquidations:
                    # Extract both wallet addresses
                    addresses = [doc.get("debtBuyerWallet")] 
                else:
                    # Single address field
                    address = doc.get("address") if source == WalletSource.wallets else doc.get("wallet")
                    addresses = [address]
                
                for address in addresses:
                    if address and address.lower() not in seen_addresses:
                        unique_wallets.append(address)
                        seen_addresses.add(address.lower())
            
            logger.info(f"Fetched {len(unique_wallets)} unique wallets after deduplication (from {offset} to {offset + limit})")
            if not unique_wallets:
                result["message"] = "No unique wallets found in the specified range"
                return result

            # Step 3: Process each wallet sequentially
            for wallet_address in unique_wallets:
                logger.debug(f"Processing wallet: {wallet_address}")
                try:
                    # Call existing build_graph_from_mongodb
                    graph_result = await self.build_graph_from_mongodb(
                        wallet_address=wallet_address,
                        chain_id=chain_id,
                        limit=20  # Use default limit from build_graph_from_mongodb
                    )
                    
                    if graph_result.get("status") == "success":
                        result["successes"] += 1
                        logger.debug(f"Successfully built graph for wallet: {wallet_address}")
                    else:
                        result["failures"] += 1
                        error_msg = f"Failed to build graph for wallet {wallet_address}: {graph_result.get('message')}"
                        result["errors"].append(error_msg)
                        logger.error(error_msg)
                
                except Exception as e:
                    result["failures"] += 1
                    error_msg = f"Error processing wallet {wallet_address}: {str(e)}"
                    result["errors"].append(error_msg)
                    logger.error(error_msg, exc_info=True)
                
                result["total_processed"] += 1

            # Step 4: Finalize result
            if result["failures"] > 0:
                result["status"] = "partial_success"
                result["message"] = f"Processed {result['total_processed']} wallets with {result['failures']} failures"
            
            logger.info(f"Completed batch processing: {result}")
            return result
        
        except Exception as e:
            logger.error(f"Error in build_graph_from_wallet_batch: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": f"Failed to process wallet batch: {str(e)}",
                "total_processed": 0,
                "successes": 0,
                "failures": 0,
                "errors": [str(e)]
            }
    
    async def build_graph_from_mongodb(
        self, 
        wallet_address: Optional[str] = None,
        chain_id: str = "0x1",
        limit: int = 1000
    ) -> Dict[str, Any]:
        """Build Neo4j graph from data fetched by QueryService based on provided schema"""
        logger.info(f"Starting build_graph_from_mongodb with wallet_address={wallet_address}, chain_id={chain_id}, limit={limit}")
        try:
            driver = self.db_manager.get_neo4j_driver()
            
            chain_id = chain_id or "0x1"
            # Fetch data from QueryService
            data = await self.query_service.get_wallet_graph_data(
                wallet_address=wallet_address,
                chain_id=chain_id,
                limit=limit
            )
            logger.info("Fetched data from QueryService successfully")
            
            # Extract contract_addresses for PART_OF relationships
            contract_addresses = [contract["address"] for contract in data["contracts"]]
            logger.debug(f"Extracted {len(contract_addresses)} contract addresses: {contract_addresses[:5]}")
            
            # Build graph components
            stats = {
                "projects_created": 0,
                "wallets_created": 0,
                "contracts_created": 0,
                "tokens_created": 0,
                "tweet_users_created": 0,
                "tweets_created": 0,
                "hashtags_created": 0,
                "relationships_created": 0
            }
            
            # Create nodes
            stats["projects_created"] = await self._create_project_nodes(data["projects"])
            stats["wallets_created"] = await self._create_wallet_nodes(data["wallets"], chain_id)
            stats["contracts_created"] = await self._create_contract_nodes(data["contracts"], chain_id)
            stats["tokens_created"] = await self._create_token_nodes(data["contracts"], chain_id)
            stats["tweet_users_created"] = await self._create_tweet_user_nodes(data["twitter_users"])
            stats["tweets_created"] = await self._create_tweet_nodes(data["tweets"])
            stats["hashtags_created"] = await self._create_hashtag_nodes(data["tweets"])
            
            # Create relationships
            stats["relationships_created"] += await self._create_lending_event_relationships(data["lending_events"], chain_id)
            stats["relationships_created"] += await self._create_transferred_to_relationships(data["token_transfers"], chain_id)
            stats["relationships_created"] += await self._create_liquidated_by_relationships(data["liquidations"], chain_id)
            stats["relationships_created"] += await self._create_part_of_relationships(data["projects"], chain_id, contract_addresses)
            stats["relationships_created"] += await self._create_has_account_relationships(data["project_social"])
            stats["relationships_created"] += await self._create_tweet_relationships(data["tweets"], data["twitter_users"])
            
            logger.info(f"Graph built successfully with stats: {stats}")
            return {
                "status": "success",
                "message": "Graph built successfully from QueryService data",
                "stats": stats
            }
            
        except Exception as e:
            logger.error(f"Error building graph: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "message": f"Error building graph: {str(e)}"
            }
    
    async def _create_project_nodes(self, projects: List[Dict]) -> int:
        logger.debug(f"Creating or updating project nodes for {len(projects)} projects")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for project in projects:
                project_id = str(project["_id"])
                # Ensure contractAddresses and tokenAddresses are dictionaries
                contract_addresses = project.get("contractAddresses", {})
                token_addresses = project.get("tokenAddresses", {})
                deployed_chains = project.get("deployedChains", [])  # Ensure it's a list
                if not isinstance(deployed_chains, list):
                    deployed_chains = [deployed_chains] if deployed_chains else []
                
                async with driver.session() as session:
                    await session.run("""
                        MERGE (p:Project {id: $id})
                        SET p += {
                            name: $name,
                            tvl: $tvl,
                            category: $category,
                            deployedChains: $deployedChains,
                            contractAddresses: $contractAddresses,
                            tokenAddresses: $tokenAddresses,
                            twitterId: $twitterId
                        }
                    """,
                    id=project_id,
                    name=project.get("name", ""),
                    tvl=project.get("tvl", 0.0),
                    category=project.get("category", ""),
                    deployedChains=deployed_chains,
                    contractAddresses=json.dumps(contract_addresses),  # Serialize to string
                    tokenAddresses=json.dumps(token_addresses),  # Serialize to string
                    twitterId=project.get("socialAccounts", {}).get("twitter", {}).get("id", "")
                    )
                count += 1
            
            logger.info(f"Processed {count} project nodes")
            if count > 0:
                logger.debug(f"Sample project node: {projects[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating or updating project nodes: {e}", exc_info=True)
            return 0

    async def _create_wallet_nodes(self, wallets: List[Dict], chain_id: str) -> int:
        """Create or update Wallet nodes using MERGE to avoid duplicates"""
        logger.debug(f"Creating or updating wallet nodes for {len(wallets)} wallets")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for wallet in wallets:
                wallet_id = f"{chain_id}_{wallet['address']}"
                # Serialize dictionary properties to JSON strings
                balance_change_logs = json.dumps(wallet.get("balanceChangeLogs", []))
                deposit_change_logs = json.dumps(wallet.get("depositChangeLogs", []))
                borrow_change_logs = json.dumps(wallet.get("borrowChangeLogs", []))
                daily_all_transactions = json.dumps(wallet.get("dailyAllTransactions", {}))
                daily_number_of_transactions = json.dumps(wallet.get("dailyNumberOfTransactions", {}))
                daily_transaction_amounts = json.dumps(wallet.get("dailyTransactionAmounts", {}))
                
                async with driver.session() as session:
                    await session.run("""
                        MERGE (w:Wallet {id: $id})
                        SET w += {
                            address: $address,
                            chainId: $chainId,
                            balanceInUSD: $balanceInUSD,
                            balanceChangeLogs: $balanceChangeLogs,
                            depositInUSD: $depositInUSD,
                            depositChangeLogs: $depositChangeLogs,
                            borrowInUSD: $borrowInUSD,
                            borrowChangeLogs: $borrowChangeLogs,
                            dailyAllTransactions: $dailyAllTransactions,
                            dailyNumberOfTransactions: $dailyNumberOfTransactions,
                            dailyTransactionAmounts: $dailyTransactionAmounts,
                            numberOfLiquidation: $numberOfLiquidation,
                            totalValueOfLiquidation: $totalValueOfLiquidation
                        }
                    """,
                    id=wallet_id,
                    address=wallet.get("address", ""),
                    chainId=wallet.get("chainId", chain_id),
                    balanceInUSD=wallet.get("balanceInUSD", 0.0),
                    balanceChangeLogs=balance_change_logs,
                    depositInUSD=wallet.get("depositInUSD", 0.0),
                    depositChangeLogs=deposit_change_logs,
                    borrowInUSD=wallet.get("borrowInUSD", 0.0),
                    borrowChangeLogs=borrow_change_logs,
                    dailyAllTransactions=daily_all_transactions,
                    dailyNumberOfTransactions=daily_number_of_transactions,
                    dailyTransactionAmounts=daily_transaction_amounts,
                    numberOfLiquidation=wallet.get("numberOfLiquidation", 0),
                    totalValueOfLiquidation=wallet.get("totalValueOfLiquidation", 0.0)
                    )
                count += 1
            
            logger.info(f"Processed {count} wallet nodes")
            if count > 0:
                logger.debug(f"Sample wallet node: {wallets[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating or updating wallet nodes: {e}", exc_info=True)
            return 0

    async def _create_contract_nodes(self, contracts: List[Dict], chain_id: str) -> int:
        """Create or update Contract nodes using MERGE to avoid duplicates"""
        logger.debug(f"Creating or updating contract nodes for {len(contracts)} contracts")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for contract in contracts:
                contract_id = f"{chain_id}_{contract['address']}"
                async with driver.session() as session:
                    await session.run("""
                        MERGE (c:Contract {id: $id})
                        SET c += {
                            address: $address,
                            chainId: $chainId,
                            tags: $tags,
                            numberOfDailyCalls: $numberOfDailyCalls,
                            numberOfDailyActiveUsers: $numberOfDailyActiveUsers
                        }
                    """,
                    id=contract_id,
                    address=contract.get("address", ""),
                    chainId=chain_id,
                    tags=contract.get("tags", []),
                    numberOfDailyCalls=contract.get("numberOfDailyCalls", 0),
                    numberOfDailyActiveUsers=contract.get("numberOfDailyActiveUsers", 0)
                    )
                count += 1
            
            logger.info(f"Processed {count} contract nodes")
            if count > 0:
                logger.debug(f"Sample contract node: {contracts[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating or updating contract nodes: {e}", exc_info=True)
            return 0

    async def _create_token_nodes(self, contracts: List[Dict], chain_id: str) -> int:
        """Create or update Token nodes from contracts with tag 'token' using MERGE to avoid duplicates"""
        logger.debug(f"Creating or updating token nodes from {len(contracts)} contracts")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for contract in contracts:
                if "token" in contract.get("tags", []):
                    token_id = f"{chain_id}_{contract['address']}"
                    # Serialize dictionary properties
                    price_change_logs = json.dumps(contract.get("priceChangeLogs", {}))
                    async with driver.session() as session:
                        await session.run("""
                            MERGE (t:Token {id: $id})
                            SET t += {
                                address: $address,
                                chainId: $chainId,
                                symbol: $symbol,
                                decimals: $decimals,
                                price: $price,
                                marketCap: $marketCap,
                                tradingVolume: $tradingVolume,
                                priceChangeLogs: $priceChangeLogs
                            }
                        """,
                        id=token_id,
                        address=contract.get("address", ""),
                        chainId=chain_id,
                        symbol=contract.get("symbol", ""),
                        decimals=contract.get("decimals", 18),
                        price=contract.get("price", 0.0),
                        marketCap=contract.get("marketCap", ""),
                        tradingVolume=contract.get("tradingVolume", "0"),
                        priceChangeLogs=price_change_logs
                        )
                    count += 1
            
            logger.info(f"Processed {count} token nodes")
            if count > 0:
                logger.debug(f"Sample token node: {contracts[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating or updating token nodes: {e}", exc_info=True)
            return 0

    async def _create_tweet_user_nodes(self, twitter_users: List[Dict]) -> int:
        """Create or update TweetUser nodes using MERGE to avoid duplicates"""
        logger.debug(f"Creating or updating tweet user nodes for {len(twitter_users)} users")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for user in twitter_users:
                user_id = str(user["_id"])
                async with driver.session() as session:
                    await session.run("""
                        MERGE (u:TweetUser {id: $id})
                        SET u += {
                            userName: $userName,
                            followersCount: $followersCount,
                            favouritesCount: $favouritesCount,
                            friendsCount: $friendsCount,
                            statusesCount: $statusesCount,
                            verified: $verified
                        }
                    """,
                    id=user_id,
                    userName=user.get("userName", ""),
                    followersCount=user.get("followersCount", 0),
                    favouritesCount=user.get("favouritesCount", 0),
                    friendsCount=user.get("friendsCount", 0),
                    statusesCount=user.get("statusesCount", 0),
                    verified=user.get("verified", False)
                    )
                count += 1
            
            logger.info(f"Processed {count} tweet user nodes")
            if count > 0:
                logger.debug(f"Sample tweet user node: {twitter_users[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating or updating tweet user nodes: {e}", exc_info=True)
            return 0

    async def _create_tweet_nodes(self, tweets: List[Dict]) -> int:
        """Create or update Tweet nodes using MERGE to avoid duplicates"""
        logger.debug(f"Creating or updating tweet nodes for {len(tweets)} tweets")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for tweet in tweets:
                tweet_id = str(tweet["id"])
                async with driver.session() as session:
                    await session.run("""
                        MERGE (t:Tweet {id: $id})
                        SET t += {
                            authorName: $authorName,
                            timestamp: $timestamp,
                            likes: $likes,
                            retweetCounts: $retweetCounts,
                            replyCounts: $replyCounts,
                            hashTags: $hashTags
                        }
                    """,
                    id=tweet_id,
                    authorName=tweet.get("authorName", ""),
                    timestamp=tweet.get("timestamp", 0),
                    likes=tweet.get("likes", 0),
                    retweetCounts=tweet.get("retweetCounts", 0),
                    replyCounts=tweet.get("replyCounts", 0),
                    hashTags=tweet.get("hashTags", [])
                    )
                count += 1
            
            logger.info(f"Processed {count} tweet nodes")
            if count > 0:
                logger.debug(f"Sample tweet node: {tweets[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating or updating tweet nodes: {e}", exc_info=True)
            return 0

    async def _create_hashtag_nodes(self, tweets: List[Dict]) -> int:
        """Create or update Hashtag nodes from tweet hashtags using MERGE to avoid duplicates"""
        logger.debug(f"Creating or updating hashtag nodes from {len(tweets)} tweets")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            hashtags_set = set()
            
            for tweet in tweets:
                hashtags = tweet.get("hashTags", []) or []
                for hashtag in hashtags:
                    hashtags_set.add(hashtag)
            
            for hashtag in hashtags_set:
                async with driver.session() as session:
                    await session.run("""
                        MERGE (h:Hashtag {id: $id})
                        SET h += {
                            tag: $tag
                        }
                    """,
                    id=hashtag,
                    tag=hashtag
                    )
                count += 1
            
            logger.info(f"Processed {count} hashtag nodes")
            if count > 0:
                logger.debug(f"Sample hashtag node: {list(hashtags_set)[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating or updating hashtag nodes: {e}", exc_info=True)
            return 0
    
    async def _create_lending_event_relationships(self, lending_events: List[Dict], chain_id: str) -> int:
        """Create DEPOSITED, BORROWED, REPAID, WITHDREW relationships"""
        logger.debug(f"Creating lending event relationships for {len(lending_events)} events")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for event in lending_events:
                event_id = str(event.get("_id", ""))
                wallet_id = f"{chain_id}_{event['wallet']}"
                contract_id = f"{chain_id}_{event['contract_address']}"
                event_type = event.get("event_type", "").upper()
                
                if event_type in ["DEPOSIT", "BORROW", "REPAY", "WITHDRAW"]:
                    edge_label = {
                        "DEPOSIT": "DEPOSITED",
                        "BORROW": "BORROWED",
                        "REPAY": "REPAID",
                        "WITHDRAW": "WITHDREW"
                    }[event_type]
                    
                    async with driver.session() as session:
                        result = await session.run(f"""
                            MATCH (w:Wallet {{id: $wallet_id}})
                            MATCH (c:Contract {{id: $contract_id}})
                            MERGE (w)-[r:{edge_label} {{_id: $event_id}}]->(c)
                            SET r += {{
                                amount: $amount,
                                timestamp: $timestamp
                            }}
                            RETURN COUNT(*) as created
                        """,
                        wallet_id=wallet_id,
                        contract_id=contract_id,
                        event_id=event_id,
                        amount=event.get("amount", 0.0),
                        timestamp=event.get("block_timestamp", 0)
                        )
                        record = await result.single()
                        if record and record["created"] > 0:
                            count += 1
            
            logger.info(f"Created {count} lending event relationships")
            if count > 0:
                logger.debug(f"Sample lending event relationship: {lending_events[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating lending event relationships: {e}", exc_info=True)
            return 0
    
    async def _create_transferred_to_relationships(self, token_transfers: List[Dict], chain_id: str) -> int:
        """Create TRANSFERRED_TO relationships"""
        logger.debug(f"Creating TRANSFERRED_TO relationships for {len(token_transfers)} transfers")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for transfer in token_transfers:
                from_wallet_id = f"{chain_id}_{transfer['from_address']}"
                to_wallet_id = f"{chain_id}_{transfer['to_address']}"
                async with driver.session() as session:
                    result = await session.run("""
                        MATCH (w1:Wallet {id: $from_wallet_id})
                        MATCH (w2:Wallet {id: $to_wallet_id})
                        MERGE (w1)-[:TRANSFERRED_TO {
                            value: $value,
                            block_number: $block_number
                        }]->(w2)
                        RETURN COUNT(*) as created
                    """,
                    from_wallet_id=from_wallet_id,
                    to_wallet_id=to_wallet_id,
                    value=transfer.get("value", "0"),
                    block_number=transfer.get("block_number", 0)
                    )
                    record = await result.single()
                    if record and record["created"] > 0:
                        count += 1
            
            logger.info(f"Created {count} TRANSFERRED_TO relationships")
            if count > 0:
                logger.debug(f"Sample TRANSFERRED_TO relationship: {token_transfers[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating TRANSFERRED_TO relationships: {e}", exc_info=True)
            return 0
    
    async def _create_liquidated_by_relationships(self, liquidations: List[Dict], chain_id: str) -> int:
        """Create LIQUIDATED_BY relationships"""
        logger.debug(f"Creating LIQUIDATED_BY relationships for {len(liquidations)} liquidations")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for liquidation in liquidations:
                liquidation_id = str(liquidation.get("_id", ""))
                liquidated_wallet_id = f"{chain_id}_{liquidation['liquidatedWallet']}"
                debt_buyer_wallet_id = f"{chain_id}_{liquidation['debtBuyerWallet']}"
                liquidation_logs = json.dumps(liquidation.get("liquidationLogs", []))
                async with driver.session() as session:
                    result = await session.run("""
                        MATCH (w1:Wallet {id: $liquidated_wallet_id})
                        MATCH (w2:Wallet {id: $debt_buyer_wallet_id})
                        MERGE (w1)-[r:LIQUIDATED_BY {_id: $liquidation_id}]->(w2)
                        SET r += {
                            liquidationLogs: $liquidationLogs
                        }
                        RETURN COUNT(*) as created
                    """,
                    liquidated_wallet_id=liquidated_wallet_id,
                    debt_buyer_wallet_id=debt_buyer_wallet_id,
                    liquidation_id=liquidation_id,
                    liquidationLogs=liquidation_logs
                    )
                    record = await result.single()
                    if record and record["created"] > 0:
                        count += 1
            
            logger.info(f"Created {count} LIQUIDATED_BY relationships")
            if count > 0:
                logger.debug(f"Sample LIQUIDATED_BY relationship: {liquidations[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating LIQUIDATED_BY relationships: {e}", exc_info=True)
            return 0
    
    async def _create_part_of_relationships(self, projects: List[Dict], chain_id: str, contract_addresses: List[str] = None) -> int:
        """Create PART_OF relationships for contracts and tokens, matching QueryService's project_query logic"""
        logger.debug(f"Creating PART_OF relationships for {len(projects)} projects with chain_id={chain_id}")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            # Prepare contract_addresses set for matching (mimics $or query)
            contract_addresses_set = set(contract_addresses or [])
            logger.debug(f"Matching against {len(contract_addresses_set)} contract addresses: {list(contract_addresses_set)[:5]}")
            
            # Collect relationships for batch processing
            contract_rels = []
            token_rels = []
            
            for project in projects:
                project_id = str(project["_id"])
                # Use contractAddresses and tokenAddresses directly as dictionaries
                contract_addresses_dict = project.get("contractAddresses", {})
                token_addresses_dict = project.get("tokenAddresses", {})
                
                # Contract -> Project (match QueryService's $or logic)
                for contract_key, value in contract_addresses_dict.items():
                    if "_" in contract_key:
                        contract_chain_id, address = contract_key.split("_", 1)
                        if contract_chain_id == chain_id and (not contract_addresses_set or address in contract_addresses_set):
                            contract_id = f"{chain_id}_{address}"
                            contract_rels.append({"contract_id": contract_id, "project_id": project_id})
                            logger.debug(f"Found Contract match: contract_id={contract_id}, project_id={project_id}")
                
                # Token -> Project
                for token_key, value in token_addresses_dict.items():
                    if "_" in token_key:
                        token_chain_id, address = token_key.split("_", 1)
                        if token_chain_id == chain_id:
                            token_id = f"{chain_id}_{address}"
                            token_rels.append({"token_id": token_id, "project_id": project_id})
                            logger.debug(f"Found Token match: token_id={token_id}, project_id={project_id}")
            
            # Batch create Contract -> Project relationships
            if contract_rels:
                async with driver.session() as session:
                    result = await session.run("""
                        UNWIND $rels AS rel
                        MATCH (c:Contract {id: rel.contract_id})
                        MATCH (p:Project {id: rel.project_id})
                        MERGE (c)-[:PART_OF]->(p)
                        RETURN count(*) AS created
                    """, rels=contract_rels)
                    record = await result.single()
                    created = record["created"]
                    count += created
                    logger.debug(f"Created {created} Contract->Project relationships")
                    if created == 0:
                        logger.warning("No Contract->Project relationships created, check contract_addresses")
            
            # Batch create Token -> Project relationships
            if token_rels:
                async with driver.session() as session:
                    result = await session.run("""
                        UNWIND $rels AS rel
                        MATCH (t:Token {id: rel.token_id})
                        MATCH (p:Project {id: rel.project_id})
                        MERGE (t)-[:PART_OF]->(p)
                        RETURN count(*) AS created
                    """, rels=token_rels)
                    record = await result.single()
                    created = record["created"]
                    count += created
                    logger.debug(f"Created {created} Token->Project relationships")
                    if created == 0:
                        logger.warning("No Token->Project relationships created, check token_addresses")
            
            logger.info(f"Created {count} PART_OF relationships")
            if count > 0 and projects:
                logger.debug(f"Sample contractAddresses: {projects[0].get('contractAddresses', '{}')}")
            elif count == 0:
                logger.debug("No PART_OF relationships created. Check contract_addresses, project data, or Contract/Token nodes")
            
            return count
        except Exception as e:
            logger.error(f"Error creating PART_OF relationships: {e}", exc_info=True)
            return 0
    
    async def _create_has_account_relationships(self, project_social: List[Dict]) -> int:
        """Create HAS_ACCOUNT relationships"""
        logger.debug(f"Creating HAS_ACCOUNT relationships for {len(project_social)} social records")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            for social in project_social:
                project_id = str(social["_id"])
                twitter_id = social.get("twitter", {}).get("id", "")
                if twitter_id:
                    async with driver.session() as session:
                        result = await session.run("""
                            MATCH (p:Project {id: $project_id})
                            MATCH (u:TweetUser {userName: $twitter_id})
                            MERGE (p)-[:HAS_ACCOUNT]->(u)
                            RETURN count(*) as created
                        """,
                        project_id=project_id,
                        twitter_id=twitter_id
                        )
                        record = await result.single()
                        if record and record["created"] > 0:
                            count += 1
            
            logger.info(f"Created {count} HAS_ACCOUNT relationships")
            if count > 0:
                logger.debug(f"Sample HAS_ACCOUNT: {project_social[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating HAS_ACCOUNT relationships: {e}", exc_info=True)
            return 0
    
    async def _create_tweet_relationships(self, tweets: List[Dict], twitter_users: List[Dict]) -> int:
        """Create TWEETED and MENTIONS relationships"""
        logger.debug(f"Creating tweet relationships for {len(tweets)} tweets")
        try:
            driver = self.db_manager.get_neo4j_driver()
            count = 0
            
            # Map userName to user _id
            user_map = {user["userName"]: str(user["_id"]) for user in twitter_users}
            
            for tweet in tweets:
                tweet_id = str(tweet["id"])
                author_name = tweet.get("authorName", "")
                
                # TWEETED
                if author_name in user_map:
                    author_id = user_map[author_name]
                    async with driver.session() as session:
                        result = await session.run("""
                            MATCH (u:TweetUser {id: $author_id})
                            MATCH (t:Tweet {id: $tweet_id})
                            MERGE (u)-[:TWEETED {
                                timestamp: $timestamp,
                                likes: $likes,
                                retweetCounts: $retweetCounts,
                                replyCounts: $replyCounts
                            }]->(t)
                            RETURN count(*) as created
                        """,
                        author_id=author_id,
                        tweet_id=tweet_id,
                        timestamp=tweet.get("timestamp", 0),
                        likes=tweet.get("likes", 0),
                        retweetCounts=tweet.get("retweetCounts", 0),
                        replyCounts=tweet.get("replyCounts", 0)
                        )
                        record = await result.single()
                        if record and record["created"] > 0:
                            count += 1
                
                # MENTIONS
                hashtags = tweet.get("hashTags", []) or []
                for hashtag in hashtags:
                    async with driver.session() as session:
                        result = await session.run("""
                            MATCH (t:Tweet {id: $tweet_id})
                            MATCH (h:Hashtag {id: $hashtag})
                            MERGE (t)-[:MENTIONS]->(h)
                            RETURN count(*) as created
                        """,
                        tweet_id=tweet_id,
                        hashtag=hashtag
                        )
                        record = await result.single()
                        if record and record["created"] > 0:
                            count += 1
            
            logger.info(f"Created {count} tweet relationships (TWEETED and MENTIONS)")
            if count > 0:
                logger.debug(f"Sample tweet relationship: {tweets[0]}")
            return count
        except Exception as e:
            logger.error(f"Error creating tweet relationships: {e}", exc_info=True)
            return 0