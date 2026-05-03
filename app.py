import base64
import hashlib
import json
import secrets
import string
import socket
import uuid
from flask import Flask, render_template, request

app = Flask(__name__)

POD_NAME = socket.gethostname()


@app.context_processor
def inject_pod():
    return {"pod_name": POD_NAME}


@app.route("/")
def home():
    return render_template("home.html", title="Home")


@app.route("/json", methods=["GET", "POST"])
def json_tool():
    formatted = error = None
    raw = ""
    if request.method == "POST":
        raw = request.form.get("payload", "")
        try:
            parsed = json.loads(raw)
            formatted = json.dumps(parsed, indent=2, sort_keys=True)
        except json.JSONDecodeError as e:
            error = f"Invalid JSON: {e}"
    return render_template("json_tool.html", title="JSON Formatter",
                           formatted=formatted, error=error, raw=raw)


@app.route("/base64", methods=["GET", "POST"])
def base64_tool():
    output = error = None
    raw = ""
    mode = "encode"
    if request.method == "POST":
        raw = request.form.get("payload", "")
        mode = request.form.get("mode", "encode")
        try:
            if mode == "encode":
                output = base64.b64encode(raw.encode("utf-8")).decode("ascii")
            else:
                output = base64.b64decode(raw.encode("ascii")).decode("utf-8")
        except Exception as e:
            error = f"Failed to {mode}: {e}"
    return render_template("base64_tool.html", title="Base64 Tool",
                           output=output, error=error, raw=raw, mode=mode)


@app.route("/hash", methods=["GET", "POST"])
def hash_tool():
    results = None
    raw = ""
    if request.method == "POST":
        raw = request.form.get("payload", "")
        data = raw.encode("utf-8")
        results = {
            "MD5": hashlib.md5(data).hexdigest(),
            "SHA-1": hashlib.sha1(data).hexdigest(),
            "SHA-256": hashlib.sha256(data).hexdigest(),
            "SHA-512": hashlib.sha512(data).hexdigest(),
        }
    return render_template("hash_tool.html", title="Hash Generator",
                           results=results, raw=raw)


@app.route("/generators", methods=["GET", "POST"])
def generators():
    uuids = []
    password = None
    length = 16
    if request.method == "POST":
        action = request.form.get("action")
        if action == "uuid":
            count = max(1, min(int(request.form.get("count", 5)), 50))
            uuids = [str(uuid.uuid4()) for _ in range(count)]
        elif action == "password":
            length = max(8, min(int(request.form.get("length", 16)), 64))
            alphabet = string.ascii_letters + string.digits + "!@#$%^&*()-_=+"
            password = "".join(secrets.choice(alphabet) for _ in range(length))
    return render_template("generators.html", title="Generators",
                           uuids=uuids, password=password, length=length)


@app.route("/about")
def about():
    return render_template("about.html", title="About")


@app.route("/health")
def health():
    return {"status": "ok", "pod": POD_NAME}, 200


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
