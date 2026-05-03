# PBL-7: CI/CD Pipeline to Deploy a Dockerized Application on Kubernetes using Jenkins

End-to-end pipeline that builds **DevOps Toolkit** — a multi-page Python Flask web app — packages it as a Docker image, pushes to Docker Hub, and rolls out to Kubernetes. All orchestrated by Jenkins on a single Windows 11 host running Docker Desktop and a `kind` cluster.

> **Live demo:** the footer of every page prints the pod hostname that served the request — refresh the page to watch traffic load-balance across the 2 replicas.

---

## Architecture

```
Developer ── git push ──> GitHub ─┐
                                  │ (poll SCM, every 2 min)
                                  ▼
                               Jenkins ── docker build ──> Docker Hub
                                  │                            │
                                  │           kubectl apply    │ pull image
                                  ▼                            ▼
                          deployment.yaml ───────────► Kubernetes (kind)
                                                         │     │
                                                         ▼     ▼
                                                       pod-A  pod-B
                                                         └──┬──┘
                                                            ▼
                                                     NodePort 30007
                                                  (kubectl port-forward)
                                                            │
                                                            ▼
                                                http://localhost:30007
```

---

## What's inside the app

DevOps Toolkit is a small, **stateless** utility site — perfect for demonstrating multiple replicas because every endpoint is a pure function.

| Route | Tool |
|-------|------|
| `/` | Home (cards linking to each tool) |
| `/json` | JSON formatter / validator |
| `/base64` | Base64 encode / decode |
| `/hash` | MD5 / SHA-1 / SHA-256 / SHA-512 generator |
| `/generators` | UUID v4 + cryptographic password generator |
| `/about` | Stack & pipeline overview |
| `/health` | JSON liveness probe (used by K8s) |

---

## Repository Layout

```
PBL-7-CICD-Jenkins-K8s/
├── app.py                       # Flask routes + /health endpoint
├── requirements.txt             # Flask 3.0.3
├── Dockerfile                   # python:3.9-slim, port 5000
├── deployment.yaml              # 2-replica Deployment + NodePort Service
├── Jenkinsfile                  # Declarative pipeline (Linux sh)
├── templates/                   # Jinja templates (Bootstrap 5)
│   ├── base.html
│   ├── home.html
│   ├── json_tool.html
│   ├── base64_tool.html
│   ├── hash_tool.html
│   ├── generators.html
│   └── about.html
├── static/css/style.css         # Gradient theme + glass cards
└── docs/
    ├── build-lab-doc.js         # Generates the lab report
    └── PBL-7-Lab-Report.docx    # Submission-ready Word document
```

---

## Prerequisites

| Tool | Tested version | Purpose |
|------|---------------|---------|
| Windows 11 | 23H2 | Host OS |
| Docker Desktop | latest | Container runtime |
| `kind` | v0.23+ | Local Kubernetes cluster |
| `kubectl` | v1.30+ | Cluster control |
| Jenkins LTS | 2.555+ | CI/CD server (run as Docker container) |
| Docker Hub | — | Image registry |
| Git for Windows | 2.47 | Source control |

### Required Jenkins plugins
`Docker Pipeline`, `Pipeline: Stage View`, `Credentials Binding`, `Workspace Cleanup`, `Resource Disposer`, `Jackson 3 API`.

### Required Jenkins credential
- **ID:** `docker-creds` (Username with password) — Docker Hub username and a personal access token.

---

## Quick Start

### 1. Run locally (no containers)

```powershell
pip install -r requirements.txt
python app.py
# Browse http://localhost:5000
```

### 2. Build & run as a container

```powershell
docker build -t flask-web:test .
docker run --rm -p 5000:5000 flask-web:test
```

### 3. Push to Docker Hub

```powershell
docker login -u <your-dockerhub-user>
docker tag flask-web:test <your-dockerhub-user>/flask-web:1
docker push <your-dockerhub-user>/flask-web:1
```

### 4. Deploy to Kubernetes manually

```powershell
(Get-Content deployment.yaml) -replace 'IMAGE_PLACEHOLDER', '<your-dockerhub-user>/flask-web:1' | Set-Content deployment-out.yaml
kubectl apply -f deployment-out.yaml
kubectl rollout status deployment/flask-web-deployment
kubectl port-forward svc/flask-web-service 30007:80
# Browse http://localhost:30007
```

---

## CI/CD via Jenkins

### One-time setup

Jenkins runs in a Docker container with the host docker socket mounted. Two prerequisites must be satisfied **inside the container**:

```powershell
# Allow the jenkins user to talk to the docker socket
docker exec -u 0 jenkins chmod 666 /var/run/docker.sock

# Copy a kubeconfig that points at the kind API server from inside the container
$kc = Get-Content "$env:USERPROFILE\.kube\config" -Raw
$kc = $kc -replace '127\.0\.0\.1', 'host.docker.internal'
$kc = $kc -replace 'certificate-authority-data:[^\r\n]+', 'insecure-skip-tls-verify: true'
[System.IO.File]::WriteAllText("$env:TEMP\kc-jenkins", $kc)

docker exec -u 0 jenkins mkdir -p /var/jenkins_home/.kube
docker cp $env:TEMP\kc-jenkins jenkins:/var/jenkins_home/.kube/config
docker exec -u 0 jenkins chown -R jenkins:jenkins /var/jenkins_home/.kube
docker exec jenkins kubectl get nodes      # verify
```

### Pipeline job configuration

| Field | Value |
|-------|-------|
| Definition | Pipeline script from SCM |
| SCM | Git |
| Repository URL | `https://github.com/naveenkm21/pbl-7-cicd.git` |
| Branch Specifier | `*/main` |
| Script Path | `Jenkinsfile` |
| Build Triggers | Poll SCM — `H/2 * * * *` |

### Pipeline stages

| Stage | What it does |
|-------|--------------|
| Checkout SCM | Pulls the latest commit on `main` |
| Build Docker Image | Tags as `<user>/flask-web:<BUILD_NUMBER>` and `:latest` |
| Login & Push to Docker Hub | Authenticates with `docker-creds` and pushes both tags |
| Deploy to Kubernetes | Substitutes `IMAGE_PLACEHOLDER`, runs `kubectl apply`, waits for rollout |
| Post (always) | `docker logout` and workspace cleanup |

### Trigger the loop

```powershell
# Make any change, then
git add -A
git commit -m "Test CI/CD"
git push
```

Within ~2 minutes Jenkins detects the push, builds, pushes, and rolls out a new revision. Refresh the browser — the change is live with zero downtime.

---

## Verification

```powershell
kubectl get deployment flask-web-deployment
kubectl get pods -l app=flask-web
kubectl describe deployment flask-web-deployment | findstr Image
kubectl rollout history deployment/flask-web-deployment
```

The footer of every rendered page shows the pod that served the request — refresh repeatedly to watch K8s round-robin between replicas.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `permission denied … docker.sock` in Jenkins | jenkins user can't access mounted socket | `docker exec -u 0 jenkins chmod 666 /var/run/docker.sock` |
| `kubectl … Authentication required` (HTML response) | Jenkins has no kubeconfig — defaulting to `localhost:8080` | See "One-time setup" above |
| `Batch scripts can only be run on Windows nodes` | Jenkinsfile uses `bat` but agent is Linux | Use `sh` (already done in this repo) |
| `localhost:30007 refused to connect` | `kind` doesn't map NodePorts to host | `kubectl port-forward svc/flask-web-service 30007:80` |
| Plugin install fails with missing dependencies | Jenkins plugin index out-of-sync | Install `Resource Disposer` and `Jackson 3 API` first, then retry |

---

## Outcome

- `git push` is the only manual step from code change to running pods.
- Kubernetes performs a rolling update, so the application stays reachable throughout the deployment.
- The same pipeline runs unchanged against any Kubernetes cluster (EKS / GKE / AKS) by swapping the kubeconfig and registry.

---

## Documentation

A complete lab report — with screenshot placeholders ready to fill in — is in
[`docs/PBL-7-Lab-Report.docx`](docs/PBL-7-Lab-Report.docx).
Regenerate it any time with:

```powershell
cd docs
node build-lab-doc.js
```
