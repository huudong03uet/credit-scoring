from pydantic_settings import BaseSettings
from typing import Optional

# LangChain chat model imports
from langchain_community.chat_models import ChatOpenAI, ChatGooglePalm


class Settings(BaseSettings):
    """
    Application settings for LLM configuration and database connections.
    Loaded from environment variables.
    """
    # LLM provider configuration
    LLM_PROVIDER: str = "openai"  # Options: "openai" or "google"
    OPENAI_API_KEY: Optional[str]
    GOOGLE_API_KEY: Optional[str] = None
    MODEL_NAME: Optional[str] = None
    TEMPERATURE: float = 0.7
    MAX_TOKENS: int = 1024

    # Neo4j connection settings
    NEO4J_URI: str
    NEO4J_USERNAME: str
    NEO4J_PASSWORD: str

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Instantiate settings once for application
settings = Settings()


def get_llm_model():
    """
    Returns a configured LangChain chat model based on the provider.
    """
    provider = settings.LLM_PROVIDER.lower()

    if provider == "openai":
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY must be set for OpenAI provider.")
        return ChatOpenAI(
            openai_api_key=settings.OPENAI_API_KEY,
            model_name=settings.MODEL_NAME or "gpt-3.5-turbo",
            temperature=settings.TEMPERATURE,
            max_tokens=settings.MAX_TOKENS
        )

    if provider == "google":
        if not settings.GOOGLE_API_KEY:
            raise ValueError("GOOGLE_API_KEY must be set for Google provider.")
        return ChatGooglePalm(
            google_api_key=settings.GOOGLE_API_KEY,
            model=settings.MODEL_NAME or "chat-bison-001",
            temperature=settings.TEMPERATURE,
            max_output_tokens=settings.MAX_TOKENS
        )

    raise ValueError(f"Unsupported LLM_PROVIDER: {settings.LLM_PROVIDER}")
