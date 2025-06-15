from fastapi import FastAPI, Depends, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional, List, Dict, Any
import uvicorn
from src.core.database import DatabaseManager
from src.schemas.responses import *
from src.services.query_service import QueryService
from src.services.graph_service import GraphService, WalletSource
import asyncio

app = FastAPI(
    title="Centic Data API",
    description="API for querying Centic's blockchain data across MongoDB, Cassandra, PostgreSQL, and Neo4j",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

db_manager = DatabaseManager()
query_service = QueryService(db_manager)
graph_service = GraphService(db_manager)

@app.on_event("startup")
async def startup_event():
    """Initialize database connections on startup"""
    try:
        await db_manager.connect_all()
    except Exception as e:
        print(f"Startup error: {e}")
        # Continue even if some databases fail to connect

@app.on_event("shutdown")
async def shutdown_event():
    """Close database connections on shutdown"""
    await db_manager.close_all()

@app.get("/")
async def root():
    """Root endpoint with database status"""
    return {
        "message": "Centic Data API",
        "status": "running",
        "databases": {
            "mongodb": db_manager.is_mongodb_connected(),
            "cassandra": db_manager.is_cassandra_connected(),
            "postgres": db_manager.is_postgres_connected(),
            "neo4j": db_manager.is_neo4j_connected()
        }
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "databases": {
            "mongodb": db_manager.is_mongodb_connected(),
            "cassandra": db_manager.is_cassandra_connected(),
            "postgres": db_manager.is_postgres_connected(),
            "neo4j": db_manager.is_neo4j_connected()
        }
    }

@app.get("/wallet-graph")
async def get_wallet_graph(
    wallet_address: str = Query(..., description="Wallet address to query"),
    chain_id: Optional[str] = Query(None, description="Blockchain chain ID (e.g., 0x38)"),
    limit: int = Query(20, ge=1, le=1000, description="Limit for records per collection")
):
    """Get wallet-centric graph data linking Wallet, Lending Events, Contracts, Projects, Social, and Twitter"""
    if not db_manager.is_mongodb_connected():
        raise HTTPException(status_code=503, detail="MongoDB not available")
    if chain_id and not db_manager.is_cassandra_connected():
        raise HTTPException(status_code=503, detail="Cassandra not available")

    try:
        data = await query_service.get_wallet_graph_data(
            wallet_address=wallet_address,
            chain_id=chain_id,
            limit=limit
        )
        return data
    except Exception as e:
        # Log the error with more detail
        import traceback
        error_detail = str(e)
        error_traceback = traceback.format_exc()
        print(f"Error in get_wallet_graph: {error_detail}")
        print(error_traceback)
        
        # Return a more informative error to the client
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch wallet graph data: {error_detail}"
        )

@app.get("/build-graph")
async def get_wallet_graph(
    wallet_address: str = Query(..., description="Wallet address to query"),
    chain_id: Optional[str] = Query(None, description="Blockchain chain ID (e.g., 0x38)"),
    limit: int = Query(100, ge=1, le=1000, description="Limit for records per collection")
):
    """Get wallet-centric graph data linking Wallet, Lending Events, Contracts, Projects, Social, and Twitter"""
    if not db_manager.is_mongodb_connected():
        raise HTTPException(status_code=503, detail="MongoDB not available")
    if chain_id and not db_manager.is_cassandra_connected():
        raise HTTPException(status_code=503, detail="Cassandra not available")

    try:
        data = await graph_service.build_graph_from_mongodb(
            wallet_address=wallet_address,
            chain_id=chain_id,
            limit=limit
        )
        return data
    except Exception as e:
        # Log the error with more detail
        import traceback
        error_detail = str(e)
        error_traceback = traceback.format_exc()
        print(f"Error in get_wallet_graph: {error_detail}")
        print(error_traceback)
        
        # Return a more informative error to the client
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch wallet graph data: {error_detail}"
        )
@app.get("/build-wallet-batch")
async def build_wallet_batch(
    limit: int = Query(100, ge=1, le=10000000, description="Number of wallets to process per batch"),
    offset: int = Query(0, ge=0, description="Starting offset for wallet batch"),
    source: WalletSource = Query(WalletSource.wallets, description="Source collection for wallets: wallets, lending_transactions, or liquidations"),
    chain_id: Optional[str] = Query("0x1", description="Blockchain chain ID (e.g., 0x38)")
):
    """Build Neo4j graphs for a batch of wallets with pagination and deduplication"""
    if not db_manager.is_mongodb_connected():
        raise HTTPException(status_code=503, detail="MongoDB not available")
    if not db_manager.is_neo4j_connected():
        raise HTTPException(status_code=503, detail="Neo4j not available")
    if chain_id and not db_manager.is_cassandra_connected():
        raise HTTPException(status_code=503, detail="Cassandra not available")

    try:
        result = await graph_service.build_graph_from_wallet_batch(
            limit=limit,
            offset=offset,
            source=source,
            chain_id=chain_id
        )
        return result
    except Exception as e:
        # Log the error with more detail
        import traceback
        error_detail = str(e)
        error_traceback = traceback.format_exc()
        print(f"Error in build_wallet_batch: {error_detail}")
        print(error_traceback)
        
        # Return a more informative error to the client
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process wallet batch: {error_detail}"
        )

if __name__ == "__main__":
    uvicorn.run("src.main:app", host="0.0.0.0", port=8000, reload=True)