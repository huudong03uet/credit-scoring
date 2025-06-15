from pydantic import BaseSettings

class Settings(BaseSettings):
    rpc_url: str
    contract_address: str
    private_key: str
    database_url: str
    redis_url: str
    class Config:
        env_file = '.env'

settings = Settings()