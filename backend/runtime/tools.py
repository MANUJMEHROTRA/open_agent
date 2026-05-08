from langchain_core.tools import tool
from datetime import datetime, timezone
import httpx
import math


@tool
def web_search(query: str) -> str:
    """Search the web for information using DuckDuckGo."""
    try:
        from duckduckgo_search import DDGS
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                results.append(f"**{r['title']}**\n{r['body']}\nSource: {r['href']}")
        return "\n\n---\n\n".join(results) if results else "No results found."
    except Exception as e:
        return f"Search failed: {str(e)}"


@tool
def calculator(expression: str) -> str:
    """Evaluate a mathematical expression. Supports basic arithmetic and math functions."""
    try:
        safe_globals = {
            "__builtins__": {},
            "abs": abs, "round": round, "min": min, "max": max,
            "sum": sum, "pow": pow, "sqrt": math.sqrt, "log": math.log,
            "sin": math.sin, "cos": math.cos, "tan": math.tan,
            "pi": math.pi, "e": math.e,
        }
        result = eval(expression, safe_globals)
        return f"Result: {result}"
    except Exception as e:
        return f"Calculation error: {str(e)}"


@tool
def get_current_time() -> str:
    """Get the current date and time in UTC."""
    now = datetime.now(timezone.utc)
    return f"Current UTC time: {now.strftime('%Y-%m-%d %H:%M:%S %Z')}"


@tool
def http_request(url: str, method: str = "GET", body: str = "") -> str:
    """Make an HTTP request to an external URL. method: GET or POST."""
    try:
        with httpx.Client(timeout=10) as client:
            if method.upper() == "POST":
                resp = client.post(url, content=body, headers={"Content-Type": "application/json"})
            else:
                resp = client.get(url)
            return f"Status: {resp.status_code}\nResponse: {resp.text[:2000]}"
    except Exception as e:
        return f"Request failed: {str(e)}"


@tool
def summarize_text(text: str, max_sentences: int = 3) -> str:
    """Summarize a long text to a specified number of key sentences."""
    sentences = [s.strip() for s in text.replace("\n", " ").split(".") if s.strip()]
    if len(sentences) <= max_sentences:
        return text
    step = max(1, len(sentences) // max_sentences)
    summary = ". ".join(sentences[i] for i in range(0, len(sentences), step)[:max_sentences])
    return summary + "."


ALL_TOOLS = {
    "web_search": web_search,
    "calculator": calculator,
    "get_current_time": get_current_time,
    "http_request": http_request,
    "summarize_text": summarize_text,
}


def get_tools_for_agent(tool_names: list[str]) -> list:
    return [ALL_TOOLS[name] for name in tool_names if name in ALL_TOOLS]
