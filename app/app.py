from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route("/")
def home():
    return jsonify(
        message="Hello from PBL-7 CI/CD Pipeline!",
        version=os.getenv("APP_VERSION", "1.0.0"),
        host=os.getenv("HOSTNAME", "unknown"),
    )

@app.route("/health")
def health():
    return jsonify(status="ok"), 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
