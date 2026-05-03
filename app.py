from flask import Flask, render_template, request

app = Flask(__name__)

@app.route("/")
def home():
    return render_template("home.html", title="Home")

@app.route("/about")
def about():
    return render_template("about.html", title="About")

@app.route("/contact", methods=["GET", "POST"])
def contact():
    message = None
    if request.method == "POST":
        name = request.form.get("name", "Friend")
        message = f"Thanks, {name}! Your message has been received."
    return render_template("contact.html", title="Contact", message=message)

@app.route("/health")
def health():
    return {"status": "ok"}, 200

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
