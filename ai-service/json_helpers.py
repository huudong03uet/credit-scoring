import json
import re
from typing import Dict, Any, Union


def clean_and_parse_json(text: str) -> Dict[str, Any]:
    """Clean and parse JSON from model response.
    
    Args:
        text: The text response from the model
        
    Returns:
        Dictionary containing parsed JSON or raw text
    """
    # First, try to find JSON in code blocks
    json_match = re.search(r'```(?:json)?\s*([\s\S]*?)\s*```', text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1).strip()
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass  # Fall through to other methods
    
    # Try to extract JSON with curly braces
    json_match = re.search(r'(\{[\s\S]*\})', text, re.DOTALL)
    if json_match:
        json_str = json_match.group(1).strip()
        try:
            return json.loads(json_str)
        except json.JSONDecodeError:
            pass  # Fall through to other methods
            
    # If all else fails, try to parse the whole text
    try:
        return json.loads(text.strip())
    except json.JSONDecodeError:
        # Return the text as-is if we can't parse it
        return {"raw_text": text} 