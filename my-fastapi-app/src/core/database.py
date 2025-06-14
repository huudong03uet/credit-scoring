import os
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import asyncpg
from neo4j import AsyncGraphDatabase
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from cassandra.policies import DCAwareRoundRobinPolicy
from dotenv import load_dotenv

load_dotenv()
class DatabaseManager:
    def __init__(self):
        self.mongodb_client = None
        self.postgres_pool = None
        self.neo4j_driver = None
        self.cassandra_cluster = None
        self.cassandra_session = None

    async def connect_all(self):
        """Connect to all available databases"""
        await self.connect_mongodb()
        await self.connect_postgres()
        await self.connect_neo4j()
        await self.connect_cassandra()
        print("✅ Database connection check completed")

    async def close_all(self):
        """Close all database connections"""
        try:
            if self.mongodb_client:
                self.mongodb_client.close()
            if self.postgres_pool:
                await self.postgres_pool.close()
            if self.neo4j_driver:
                await self.neo4j_driver.close()
            if self.cassandra_cluster:
                self.cassandra_cluster.shutdown()
            print("✅ All database connections closed")
        except Exception as e:
            print(f"❌ Error closing database connections: {e}")

    async def connect_mongodb(self):
        try:
            url = os.getenv("MONGODB_URL")
            if not url:
                print("⚠️ MongoDB URL not found")
                return
            self.mongodb_client = AsyncIOMotorClient(url)
            await self.mongodb_client.admin.command('ping')
            print("✅ MongoDB connected successfully")
        except Exception as e:
            print(f"❌ MongoDB connection failed: {e}")
            self.mongodb_client = None

    async def connect_postgres(self):
        try:
            url = os.getenv("POSTGRES_URL")
            if not url:
                print("⚠️ PostgreSQL URL not found")
                return
            self.postgres_pool = await asyncpg.create_pool(url)
            async with self.postgres_pool.acquire() as conn:
                await conn.fetchval('SELECT 1')
            print("✅ PostgreSQL connected successfully")
        except Exception as e:
            print(f"❌ PostgreSQL connection failed: {e}")
            self.postgres_pool = None

    async def connect_neo4j(self):
        try:
            uri = os.getenv("NEO4J_URI")
            user = os.getenv("NEO4J_USERNAME")
            pwd = os.getenv("NEO4J_PASSWORD")
            if not uri:
                print("⚠️ Neo4j URI not found")
                return
            self.neo4j_driver = AsyncGraphDatabase.driver(
                uri, auth=(user, pwd) if user and pwd else None
            )
            await self.neo4j_driver.verify_connectivity()
            print("✅ Neo4j connected successfully")
        except Exception as e:
            print(f"❌ Neo4j connection failed: {e}")
            self.neo4j_driver = None

    async def connect_cassandra(self):
        """Connect to Cassandra asynchronously via thread executor"""
        try:
            hosts = os.getenv("CASSANDRA_HOSTS", "").split(',')
            port = int(os.getenv("CASSANDRA_PORT", 9042))
            user = os.getenv("CASSANDRA_USERNAME")
            pwd = os.getenv("CASSANDRA_PASSWORD")
            keyspace = os.getenv("CASSANDRA_KEYSPACE")
            if not hosts or not user or not pwd or not keyspace:
                print("⚠️ Cassandra config missing")
                return
            auth = PlainTextAuthProvider(username=user, password=pwd)
            lbp = DCAwareRoundRobinPolicy(local_dc=os.getenv("CASSANDRA_DATACENTER", "datacenter-1"))
            self.cassandra_cluster = Cluster(
                contact_points=hosts,
                port=port,
                auth_provider=auth,
                load_balancing_policy=lbp
            )
            # Connect in executor to avoid blocking event loop
            loop = asyncio.get_event_loop()
            self.cassandra_session = await loop.run_in_executor(
                None,
                lambda: self.cassandra_cluster.connect(keyspace)
            )
            print("✅ Cassandra connected successfully")
            self.cassandra_session.default_timeout = 6000000
        except Exception as e:
            print(f"❌ Cassandra connection failed: {e}")
            self.cassandra_cluster = None
            self.cassandra_session = None

    def get_mongodb_database(self, name: str):
        if not self.mongodb_client:
            raise Exception("MongoDB not connected")
        return self.mongodb_client[name]

    def get_postgres_pool(self):
        if not self.postgres_pool:
            raise Exception("PostgreSQL not connected")
        return self.postgres_pool

    def get_neo4j_driver(self):
        if not self.neo4j_driver:
            raise Exception("Neo4j not connected")
        return self.neo4j_driver

    def get_cassandra_session(self):
        if not self.cassandra_session:
            raise Exception("Cassandra not connected")
        return self.cassandra_session

    def is_mongodb_connected(self) -> bool:
        return self.mongodb_client is not None

    def is_postgres_connected(self) -> bool:
        return self.postgres_pool is not None

    def is_neo4j_connected(self) -> bool:
        return self.neo4j_driver is not None

    def is_cassandra_connected(self) -> bool:
        return self.cassandra_session is not None
