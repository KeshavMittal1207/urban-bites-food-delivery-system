import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI

load_dotenv()

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
OPENROUTER_MODEL = os.getenv("OPENROUTER_MODEL_NAME")
OPENROUTER_BASE_URL = os.getenv("OPENROUTER_BASE_URL")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = os.getenv("GROQ_MODEL_NAME")


def get_openrouter_llm(temperature: float = 0.0) -> ChatOpenAI:
    """Instantiates the primary OpenRouter ChatOpenAI model."""
    return ChatOpenAI(
        model=OPENROUTER_MODEL,
        base_url=OPENROUTER_BASE_URL,
        api_key=OPENROUTER_API_KEY,
        temperature=temperature,
        max_retries=2,
        default_headers={
            "HTTP-Referer": "http://localhost:5174",
            "X-Title": "Urban Bites AI Microservice",
        },
    )


def get_fallback_llm(temperature: float = 0.0):
    """Instantiates the secondary Groq fallback model to guard against upstream rate-limits."""
    if GROQ_API_KEY and GROQ_API_KEY.strip():
        try:
            from langchain_groq import ChatGroq
            return ChatGroq(
                model=GROQ_MODEL,
                api_key=GROQ_API_KEY.strip(),
                temperature=temperature,
            )
        except Exception as e:
            print(f"Warning: Could not initialize Groq fallback: {e}")
    return None


def get_chat_llm(temperature: float = 0.0):
    """
    Returns the unified LLM instance.
    Primary is OpenRouter (google/gemma-4-31b-it:free).
    If OpenRouter free tier hits a temporary 429 rate limit, it automatically
    fails over to the secondary fallback model without breaking user requests.
    """
    primary = get_openrouter_llm(temperature=temperature)
    fallback = get_fallback_llm(temperature=temperature)
    if fallback:
        return primary.with_fallbacks([fallback])
    return primary


def get_structured_router_llm(schema_class):
    """
    Returns a structured output model chain with fallback support.
    """
    primary = get_openrouter_llm(temperature=0.0)
    primary_structured = primary.with_structured_output(schema_class)

    fallback = get_fallback_llm(temperature=0.0)
    if fallback:
        try:
            fallback_structured = fallback.with_structured_output(schema_class)
            return primary_structured.with_fallbacks([fallback_structured])
        except Exception as e:
            print(f"Warning: Could not bind structured fallback: {e}")

    return primary_structured
