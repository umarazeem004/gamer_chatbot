from flask import Flask, render_template, request, jsonify, send_from_directory
from google import genai
import os
import uuid
from dotenv import load_dotenv

# =========================================================
# LOAD ENVIRONMENT VARIABLES
# =========================================================

load_dotenv()

API_KEY = os.getenv("API_KEY")
SECRET_KEY = os.getenv("SECRET_KEY")

# Check API key
if not API_KEY:
    raise ValueError("❌ API_KEY not found! Add API_KEY to your .env file.")

# Check secret key
if not SECRET_KEY:
    raise ValueError("❌ SECRET_KEY not found! Add SECRET_KEY to your .env file.")

# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)
app.secret_key = SECRET_KEY

# =========================================================
# GEMINI
# =========================================================

client = genai.Client(api_key=API_KEY)

MODEL = "gemini-3.6-flash"

# Store user sessions
user_sessions = {}


# =========================================================
# HOME PAGE
# =========================================================

@app.route("/")
def index():
    return render_template("index.html")


# =========================================================
# CSS
# =========================================================

@app.route("/css/<path:filename>")
def serve_css(filename):
    return send_from_directory("static/css", filename)


# =========================================================
# JAVASCRIPT
# =========================================================

@app.route("/js/<path:filename>")
def serve_js(filename):
    return send_from_directory("static/js", filename)


# =========================================================
# CHAT API
# =========================================================

@app.route("/api/chat", methods=["POST"])
def chat():

    data = request.get_json(silent=True) or {}

    user_message = data.get("message", "").strip()
    session_id = data.get("session_id")

    # Create session ID
    if not session_id:
        session_id = str(uuid.uuid4())

    # Create user session
    if session_id not in user_sessions:

        user_sessions[session_id] = {
            "name": None,
            "waiting_for_name": True,
            "history": []
        }

    session = user_sessions[session_id]

    # Empty message
    if not user_message:
        return jsonify({
            "response": "Please say something, cosmic traveler! 🌌",
            "session_id": session_id
        })

    # =====================================================
    # ASK FOR NAME
    # =====================================================

    if session["waiting_for_name"]:

        session["name"] = user_message
        session["waiting_for_name"] = False

        response = (
            f"🌟 Cosmic welcome! Hi admin Umar, "
            f"<strong>{session['name']}</strong>!<br><br>"
            "I am <strong>GAMER</strong>, your AI gaming assistant. 🎮<br><br>"
            "You can ask me about Roblox, Minecraft, Python, "
            "anime, coding, games, and much more!"
        )

    else:

        response = ask_gemini(
            user_message,
            session
        )

    # Save history
    session["history"].append({
        "user": user_message,
        "bot": response
    })

    return jsonify({
        "response": response,
        "session_id": session_id
    })


# =========================================================
# GEMINI AI
# =========================================================

def ask_gemini(message, session):

    name = session.get("name") or "Star-Player"

    system_prompt = f"""
You are GAMER, a friendly AI gaming assistant.

The user's name is {name}.

Your personality:
- Friendly
- Helpful
- Fun
- Good at gaming
- Good at Python
- Good at Roblox Lua
- Good at Minecraft
- Good at coding
- Explain things simply for beginners
- Use emojis sometimes
- You can call the user bro when appropriate
- You can tell the user about games
- Answer questions helpfully

You can help with:
- Python
- Flask
- HTML
- CSS
- JavaScript
- Roblox
- Minecraft
- Pygame
- Game development
- Anime
- General questions
- Games
- Coding

If the user asks for code, provide working code.
If the user asks for an explanation, explain it simply.
Do not constantly repeat the same response.
"""

    try:

        prompt = f"""
{system_prompt}

User message:
{message}
"""

        result = client.models.generate_content(
            model=MODEL,
            contents=prompt
        )

        if not result.text:
            return "⚠️ Gemini returned an empty response."

        response = result.text

        # Convert code blocks
        response = response.replace(
            "```python",
            "<pre><code>"
        )

        response = response.replace(
            "```",
            "</code></pre>"
        )

        # Convert new lines
        response = response.replace(
            "\n",
            "<br>"
        )

        return response

    except Exception as e:

        print("====================================")
        print("GEMINI ERROR:")
        print(e)
        print("====================================")

        return (
            "❌ <strong>Gemini Error</strong><br><br>"
            "<code>Something went wrong while contacting Gemini.</code>"
        )


# =========================================================
# START SERVER
# =========================================================

if __name__ == "__main__":

    print("=" * 50)
    print("        🎮 GAMER AI CHATBOT 🎮")
    print("=" * 50)

    print("✅ API KEY LOADED")
    print("✅ SECRET KEY LOADED")

    print("🤖 Gemini Model:", MODEL)
    print("🌐 Open: http://127.0.0.1:5000")
    print("=" * 50)

    app.run(
        debug=True,
        host="0.0.0.0",
        port=5000
    )