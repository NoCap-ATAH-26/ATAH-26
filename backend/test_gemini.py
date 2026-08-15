import os

from dotenv import load_dotenv
from google import genai

load_dotenv()

api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    raise ValueError("No Gemini API key was found in the .env file.")

client = genai.Client(api_key=api_key)

response = client.interactions.create(
    model="gemini-3.5-flash",
    input="Reply with exactly: NoCap is connected to Gemini."
)

print(response.output_text)