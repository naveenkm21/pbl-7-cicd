# PBL-7: CI/CD Pipeline to Deploy Dockerized Application on Kubernetes using Jenkins

End-to-end pipeline that builds a Python Flask app, packages it into a Docker image, pushes to Docker Hub, and deploys to Kubernetes — all orchestrated by Jenkins.

## Architecture

```
Developer ──git push──> Git Repo ──webhook──> Jenkins
                                                │
                              ┌─────────────────┼──────────────────┐
                              ▼                 ▼                  ▼
                          pytest           docker build       kubectl apply
                                          docker push          (Deployment + Service)
                                              │
                                              ▼
                                         Docker Hub ──pull──> Kubernetes Cluster
```

## Repository Layout

```
PBL-7-CICD-Jenkins-K8s/
├── app/                    # Flask app + tests
│   ├── app.py
│   ├── requirements.txt
│   └── test_app.py
├── Dockerfile              # Container image definition
├── k8s/
│   ├── deployment.yaml     # 3-replica Deployment with probes
│   └── service.yaml        # NodePort service
├── Jenkinsfile             # Declarative CI/CD pipeline
└── README.md
```

## Prerequisites

| Tool       | Version  | Purpose                          |
|------------|----------|----------------------------------|
| Jenkins    | 2.4+ LTS | CI/CD server                     |
| Docker     | 20+      | Image build & push               |
| kubectl    | 1.27+    | Cluster control                  |
| Kubernetes | 1.27+    | Minikube / kind / EKS / GKE      |
| Python     | 3.12     | App runtime                      |

### Required Jenkins Plugins
- Pipeline, Docker Pipeline, Kubernetes CLI, Credentials Binding, Git

### Required Jenkins Credentials
- `dockerhub-creds` — Username + Password for Docker Hub
- `kubeconfig` — Secret file: your `~/.kube/config`

## Local Quick Start

```bash
# 1. Build & run locally
docker build -t pbl7-app:local .
docker run -p 5000:5000 pbl7-app:local
curl http://localhost:5000/health

# 2. Run tests
cd app && pip install -r requirements.txt pytest && pytest -q
```

## Deploy via Jenkins

1. Create a Jenkins **Pipeline** job pointing to this repo.
2. Update `REGISTRY` in `Jenkinsfile` to your Docker Hub ID.
3. Trigger build — pipeline runs: Checkout → Test → Build → Push → Deploy → Smoke test.
4. Access app: `http://<node-ip>:30070`

## Manual K8s Deploy (without Jenkins)

```bash
docker build -t yourid/pbl7-app:1.0 .
docker push yourid/pbl7-app:1.0
sed -i 's|REPLACE_ME_IMAGE:latest|yourid/pbl7-app:1.0|' k8s/deployment.yaml
kubectl apply -f k8s/
kubectl get pods,svc
```

## Pipeline Stages Explained

| Stage              | Purpose                                              |
|--------------------|------------------------------------------------------|
| Checkout           | Pull latest source from SCM                          |
| Install & Test     | Run pytest unit tests                                |
| Build Docker Image | Tag with build number + `latest`                     |
| Push Image         | Authenticate & push to Docker Hub                    |
| Deploy to K8s      | `kubectl apply` Deployment + Service, wait rollout   |
| Smoke Test         | Hit `/health` from within cluster                    |

## Verification

```bash
kubectl get deploy pbl7-app
kubectl get pods -l app=pbl7-app
kubectl logs -l app=pbl7-app --tail=20
curl http://<node-ip>:30070/
```

## Outcome

- Automated build, test, containerization, and deployment on every commit.
- Zero manual intervention from `git push` to running pods.
- Rolling updates handled by Kubernetes Deployment controller.
