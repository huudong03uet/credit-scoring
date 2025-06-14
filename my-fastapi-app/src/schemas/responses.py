from pydantic import BaseModel
from typing import Optional, Dict, List, Any
from datetime import datetime

# Knowledge Graph Schemas
class ProjectResponse(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    category: Optional[str] = None
    imgUrl: Optional[str] = None
    deployedChains: Optional[List[str]] = None
    socialAccounts: Optional[Dict[str, str]] = None
    tvl: Optional[float] = None
    tvlByChains: Optional[Dict[str, float]] = None
    tokenAddresses: Optional[Dict[str, str]] = None
    contractAddresses: Optional[Dict[str, str]] = None

class SmartContractResponse(BaseModel):
    id: str
    address: str
    chainId: str
    name: Optional[str] = None
    tags: Optional[List[str]] = None
    createdAt: Optional[int] = None
    numberOfLastDayCalls: Optional[int] = None
    numberOfLastDayActiveUsers: Optional[int] = None
    # Token specific fields
    symbol: Optional[str] = None
    decimals: Optional[int] = None
    price: Optional[float] = None
    marketCap: Optional[int] = None
    numberOfHolders: Optional[int] = None

class WalletResponse(BaseModel):
    id: str
    address: str
    chainId: str
    balanceInUSD: Optional[float] = None
    tokens: Optional[Dict[str, float]] = None
    depositInUSD: Optional[float] = None
    borrowInUSD: Optional[float] = None
    numberOfLiquidation: Optional[int] = None
    totalValueOfLiquidation: Optional[float] = None

class MultichainWalletResponse(BaseModel):
    id: str
    address: str
    balanceInUSD: Optional[float] = None
    tokens: Optional[Dict[str, float]] = None
    depositInUSD: Optional[float] = None
    borrowInUSD: Optional[float] = None

# CDP Data Schemas
class ProjectSocialResponse(BaseModel):
    id: str
    projectId: str
    discord: Optional[Dict[str, Any]] = None
    telegram: Optional[Dict[str, Any]] = None
    twitter: Optional[Dict[str, str]] = None
    website: Optional[str] = None

class TweetResponse(BaseModel):
    id: str
    author: str
    authorName: str
    created: str
    timestamp: int
    text: str
    views: Optional[int] = None
    likes: Optional[int] = None
    replyCounts: Optional[int] = None
    retweetCounts: Optional[int] = None
    hashTags: Optional[List[str]] = None
    userMentions: Optional[Dict[str, str]] = None

class TwitterUserResponse(BaseModel):
    id: str
    userName: str
    displayName: Optional[str] = None
    url: Optional[str] = None
    followersCount: Optional[int] = None
    friendsCount: Optional[int] = None
    statusesCount: Optional[int] = None
    verified: Optional[bool] = None
    blue: Optional[bool] = None
    location: Optional[str] = None
    country: Optional[str] = None
    rawDescription: Optional[str] = None

# ETL Data Schemas
class BlockResponse(BaseModel):
    number: int
    hash: str
    timestamp: int
    miner: Optional[str] = None
    gasLimit: Optional[str] = None
    gasUsed: Optional[str] = None
    transactionCount: Optional[int] = None
    difficulty: Optional[str] = None
    totalDifficulty: Optional[str] = None

class TransactionResponse(BaseModel):
    hash: str
    blockNumber: int
    blockTimestamp: int
    fromAddress: Optional[str] = None
    toAddress: Optional[str] = None
    value: Optional[str] = None
    gas: Optional[str] = None
    gasPrice: Optional[str] = None
    gasUsed: Optional[int] = None
    status: Optional[int] = None
    nonce: Optional[int] = None

class TokenTransferResponse(BaseModel):
    blockNumber: int
    contractAddress: str
    fromAddress: Optional[str] = None
    toAddress: Optional[str] = None
    value: Optional[float] = None
    transactionHash: str
    logIndex: int

class LendingEventResponse(BaseModel):
    id: str
    blockNumber: int
    blockTimestamp: int
    transactionHash: str
    contractAddress: str
    eventType: str
    user: Optional[str] = None
    wallet: Optional[str] = None
    onBehalfOf: Optional[str] = None
    reserve: Optional[str] = None
    amount: Optional[float] = None

class BalanceChangeResponse(BaseModel):
    address: str
    token: str
    timestamp: int
    value: Optional[float] = None
    income: Optional[float] = None
    numberTx: Optional[int] = None

# Graph Database Schemas
class GraphNodeResponse(BaseModel):
    id: str
    labels: List[str]
    properties: Dict[str, Any]

class GraphRelationshipResponse(BaseModel):
    id: str
    type: str
    start_node: str
    end_node: str
    properties: Dict[str, Any]

class GraphQueryResponse(BaseModel):
    nodes: List[GraphNodeResponse]
    relationships: List[GraphRelationshipResponse]

class GraphStatsResponse(BaseModel):
    total_nodes: int
    total_relationships: int
    node_labels: Dict[str, int]
    relationship_types: Dict[str, int]

class WalletGraphResponse(BaseModel):
    wallets: List[Dict[str, Any]]
    lending_events: List[LendingEventResponse]
    contracts: List[Dict[str, Any]]
    projects: List[Dict[str, Any]]
    project_social: List[Dict[str, Any]]
    twitter_users: List[Dict[str, Any]]
    tweets: List[TweetResponse]
    token_transfers: List[Dict[str, Any]]
    liquidations: List[Dict[str, Any]]