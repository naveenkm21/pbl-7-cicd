const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, LevelFormat, HeadingLevel, BorderStyle,
  WidthType, ShadingType, PageNumber, PageBreak, TabStopType, TabStopPosition,
} = require('docx');

const FONT = "Calibri";
const PAGE_W = 12240;
const PAGE_H = 15840;
const MARGIN = 1440;
const CONTENT_W = PAGE_W - MARGIN * 2;

const border = { style: BorderStyle.SINGLE, size: 4, color: "B0B0B0" };
const cellBorders = { top: border, bottom: border, left: border, right: border };
const cellMargin = { top: 100, bottom: 100, left: 140, right: 140 };

function p(text, opts = {}) {
  const { bold, italic, size, color, align, spacingBefore, spacingAfter } = opts;
  return new Paragraph({
    alignment: align,
    spacing: { before: spacingBefore ?? 80, after: spacingAfter ?? 80 },
    children: [new TextRun({ text, bold, italics: italic, size, color, font: FONT })],
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    children: [new TextRun({ text, bold: true, size: 32, color: "1F3864", font: FONT })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, size: 26, color: "2E75B6", font: FONT })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 200, after: 100 },
    children: [new TextRun({ text, bold: true, size: 22, color: "404040", font: FONT })],
  });
}

function bullet(text) {
  return new Paragraph({
    numbering: { reference: "bullets", level: 0 },
    spacing: { before: 40, after: 40 },
    children: [new TextRun({ text, size: 22, font: FONT })],
  });
}

function num(text) {
  return new Paragraph({
    numbering: { reference: "numbers", level: 0 },
    spacing: { before: 60, after: 60 },
    children: [new TextRun({ text, size: 22, font: FONT })],
  });
}

function code(text) {
  const lines = text.split('\n');
  return lines.map((line, i) => new Paragraph({
    spacing: { before: i === 0 ? 100 : 0, after: i === lines.length - 1 ? 120 : 0, line: 260 },
    shading: { fill: "F2F2F2", type: ShadingType.CLEAR },
    indent: { left: 200, right: 200 },
    children: [new TextRun({ text: line || " ", font: "Consolas", size: 20, color: "1A1A1A" })],
  }));
}

function ssPlaceholder(num, caption) {
  return [
    new Paragraph({
      spacing: { before: 200, after: 60 },
      alignment: AlignmentType.CENTER,
      shading: { fill: "FFF2CC", type: ShadingType.CLEAR },
      border: {
        top: { style: BorderStyle.DASHED, size: 8, color: "BF8F00", space: 4 },
        bottom: { style: BorderStyle.DASHED, size: 8, color: "BF8F00", space: 4 },
        left: { style: BorderStyle.DASHED, size: 8, color: "BF8F00", space: 4 },
        right: { style: BorderStyle.DASHED, size: 8, color: "BF8F00", space: 4 },
      },
      children: [
        new TextRun({ text: `[ Screenshot ${num} placeholder ]`, bold: true, size: 22, color: "BF8F00", font: FONT }),
      ],
    }),
    new Paragraph({
      spacing: { after: 200 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `Figure ${num}: ${caption}`, italics: true, size: 20, color: "595959", font: FONT })],
    }),
  ];
}

function tableRow(cells, header = false) {
  return new TableRow({
    tableHeader: header,
    children: cells.map(c => new TableCell({
      borders: cellBorders,
      margins: cellMargin,
      width: { size: c.w, type: WidthType.DXA },
      shading: header ? { fill: "1F3864", type: ShadingType.CLEAR } : undefined,
      children: [new Paragraph({
        children: [new TextRun({ text: c.t, bold: header, color: header ? "FFFFFF" : "000000", size: 22, font: FONT })],
      })],
    })),
  });
}

function buildTable(columns, rows) {
  const totalW = columns.reduce((s, w) => s + w, 0);
  const headerRow = tableRow(rows[0].map((t, i) => ({ t, w: columns[i] })), true);
  const dataRows = rows.slice(1).map(r => tableRow(r.map((t, i) => ({ t, w: columns[i] }))));
  return new Table({
    width: { size: totalW, type: WidthType.DXA },
    columnWidths: columns,
    rows: [headerRow, ...dataRows],
  });
}

const titlePage = [
  new Paragraph({
    spacing: { before: 2400, after: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Lab 7", size: 56, bold: true, color: "1F3864", font: FONT })],
  }),
  new Paragraph({
    spacing: { after: 240 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: "CI/CD Pipeline to Deploy a Dockerized Application on Kubernetes using Jenkins",
      size: 36, bold: true, color: "2E75B6", font: FONT,
    })],
  }),
  new Paragraph({
    spacing: { after: 1200 },
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: "DevOps Toolkit — a multi-page Flask web application",
      size: 26, italics: true, color: "595959", font: FONT,
    })],
  }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 1200, after: 120 },
    children: [new TextRun({ text: "Submitted by", size: 22, color: "595959", font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 240 },
    children: [new TextRun({ text: "Naveen K M", size: 28, bold: true, font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 240, after: 120 },
    children: [new TextRun({ text: "Repository", size: 22, color: "595959", font: FONT })] }),
  new Paragraph({ alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "https://github.com/naveenkm21/pbl-7-cicd", size: 22, color: "0563C1", font: FONT })] }),
  new Paragraph({ children: [new PageBreak()] }),
];

const aim = [
  h1("1. Aim"),
  p("Design and implement a complete Continuous Integration / Continuous Deployment (CI/CD) pipeline that automatically builds, packages, and deploys a multi-page Python Flask web application to a Kubernetes cluster every time source code is pushed to GitHub. The pipeline is orchestrated by Jenkins, the artifact is a Docker image stored on Docker Hub, and the runtime environment is a local kind-based Kubernetes cluster on Windows 11."),

  h1("2. Objectives"),
  bullet("Develop a small but realistic multi-page Flask web application (DevOps Toolkit — JSON formatter, Base64 encoder, hash generator, UUID and password generators)."),
  bullet("Containerize the application with a clean, layered Dockerfile."),
  bullet("Author Kubernetes manifests for a 2-replica Deployment with readiness and liveness probes, fronted by a NodePort Service."),
  bullet("Configure a Jenkins pipeline that checks out the repository, builds the image, pushes it to Docker Hub, and rolls out the new version on Kubernetes."),
  bullet("Demonstrate the end-to-end loop: a single git push results in an updated, load-balanced application visible in the browser — with zero manual intervention."),

  h1("3. Tools and Technologies"),
  buildTable(
    [2400, 2200, CONTENT_W - 4600],
    [
      ["Tool", "Version", "Role in the lab"],
      ["Windows 11", "23H2", "Host operating system"],
      ["Docker Desktop", "Latest", "Local container runtime"],
      ["kind", "v0.23+", "Kubernetes-in-Docker single-node cluster"],
      ["kubectl", "v1.30+", "Kubernetes CLI"],
      ["Python / Flask", "3.9 / 3.0.3", "Web application runtime"],
      ["Bootstrap", "5.3", "Front-end styling"],
      ["Jenkins LTS", "2.555.1", "CI/CD orchestrator (running in Docker)"],
      ["Docker Hub", "—", "Public image registry"],
      ["GitHub", "—", "Source control and webhook source"],
      ["Git for Windows", "2.47", "Local source control client"],
    ]
  ),

  h1("4. Architecture and Workflow"),
  p("The pipeline is intentionally linear so each stage can be inspected independently. A developer commits a change locally and pushes it to GitHub. Jenkins, polling the SCM every two minutes, detects the new commit and triggers the pipeline. The image is rebuilt, tagged with the Jenkins build number, and pushed to Docker Hub under naveenkm21/flask-web. The Deploy stage substitutes the new image tag into deployment.yaml and runs kubectl apply. The Kubernetes Deployment controller performs a rolling update across the two replicas, after which kubectl rollout status confirms the new revision is healthy. The application is reached through a NodePort service exposed via kubectl port-forward to localhost:30007."),

  ...ssPlaceholder(1, "End-to-end pipeline architecture diagram (developer → GitHub → Jenkins → Docker Hub → Kubernetes)."),
];

const setup = [
  h1("5. Environment Setup"),
  h2("5.1 Project Structure"),
  ...code(
`PBL-7-CICD-Jenkins-K8s/
├── app.py
├── requirements.txt
├── Dockerfile
├── deployment.yaml
├── Jenkinsfile
├── templates/
│   ├── base.html
│   ├── home.html
│   ├── json_tool.html
│   ├── base64_tool.html
│   ├── hash_tool.html
│   ├── generators.html
│   └── about.html
└── static/css/style.css`
  ),
  ...ssPlaceholder(2, "Project folder layout in the file explorer / VS Code."),

  h2("5.2 Prerequisites Verification"),
  p("Before starting, the following commands were used to confirm the local environment was ready:"),
  ...code(
`docker --version
kubectl get nodes
git --version
node --version`),
  ...ssPlaceholder(3, "Output of `kubectl get nodes` showing the kind cluster control-plane node in Ready state."),
];

const flask = [
  h1("6. The Flask Application — DevOps Toolkit"),
  p("The application is intentionally stateless so it can run safely behind multiple replicas. Each request is handled in isolation; no session affinity is required. The footer of every page prints the hostname of the pod that served the request, which doubles as a live demonstration of Kubernetes load-balancing."),

  h2("6.1 Routes"),
  buildTable(
    [2200, CONTENT_W - 2200],
    [
      ["Route", "Purpose"],
      ["/", "Home page with cards linking to each tool"],
      ["/json", "Validate and pretty-print JSON payloads"],
      ["/base64", "Encode or decode Base64 text (e.g. K8s secrets)"],
      ["/hash", "Compute MD5, SHA-1, SHA-256 and SHA-512 digests"],
      ["/generators", "Generate UUIDs and cryptographic passwords"],
      ["/about", "Documentation of the stack and pipeline"],
      ["/health", "Liveness/readiness JSON endpoint used by K8s"],
    ]
  ),
  ...ssPlaceholder(4, "Home page of the DevOps Toolkit running locally at http://localhost:5000."),

  h2("6.2 Local Run"),
  p("To validate the application before containerizing it, the Flask server was launched directly:"),
  ...code(
`python app.py
# Browse to http://localhost:5000`),
];

const docker = [
  h1("7. Containerization"),
  p("A minimal multi-stage-friendly Dockerfile is used. The dependencies file is copied first so that pip install is cached when only application source changes."),
  ...code(
`FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["python", "app.py"]`),

  h2("7.1 Local Build and Run"),
  ...code(
`docker build -t flask-web:test .
docker run --rm -p 5000:5000 flask-web:test`),
  ...ssPlaceholder(5, "Successful `docker build` output ending with `naming to docker.io/library/flask-web:test`."),
  ...ssPlaceholder(6, "Browser at http://localhost:5000 served by the running container."),

  h2("7.2 Push to Docker Hub"),
  p("A personal access token with Read/Write/Delete permissions was created on Docker Hub and used as the password for docker login."),
  ...code(
`docker login -u naveenkm21
docker tag flask-web:test naveenkm21/flask-web:1
docker push naveenkm21/flask-web:1`),
  ...ssPlaceholder(7, "Docker Hub repository page showing the pushed `naveenkm21/flask-web` tags."),
];

const k8s = [
  h1("8. Kubernetes Deployment"),
  h2("8.1 Manifest"),
  p("deployment.yaml declares a Deployment with two replicas and a NodePort Service. The image field is set to the placeholder IMAGE_PLACEHOLDER, which Jenkins replaces at deploy time using sed."),
  ...code(
`apiVersion: apps/v1
kind: Deployment
metadata:
  name: flask-web-deployment
spec:
  replicas: 2
  selector:
    matchLabels: { app: flask-web }
  template:
    metadata:
      labels: { app: flask-web }
    spec:
      containers:
        - name: flask-web
          image: IMAGE_PLACEHOLDER
          imagePullPolicy: Always
          ports: [{ containerPort: 5000 }]
          readinessProbe:
            httpGet: { path: /health, port: 5000 }
            initialDelaySeconds: 5
          livenessProbe:
            httpGet: { path: /health, port: 5000 }
            initialDelaySeconds: 15
---
apiVersion: v1
kind: Service
metadata:
  name: flask-web-service
spec:
  type: NodePort
  selector: { app: flask-web }
  ports:
    - port: 80
      targetPort: 5000
      nodePort: 30007`),

  h2("8.2 Manual First Deploy"),
  ...code(
`(Get-Content deployment.yaml) -replace 'IMAGE_PLACEHOLDER', 'naveenkm21/flask-web:1' | Set-Content deployment-out.yaml
kubectl apply -f deployment-out.yaml
kubectl rollout status deployment/flask-web-deployment
kubectl get pods
kubectl get svc flask-web-service`),
  ...ssPlaceholder(8, "`kubectl get pods` output showing 2/2 pods Running."),
  ...ssPlaceholder(9, "`kubectl get svc` output showing the flask-web-service exposed on NodePort 30007."),

  h2("8.3 Accessing the Service from Windows"),
  p("Because the cluster runs inside a kind container, NodePorts are not directly mapped to the host. A port-forward bridges the gap:"),
  ...code(`kubectl port-forward svc/flask-web-service 30007:80`),
  ...ssPlaceholder(10, "Browser at http://localhost:30007 showing the DevOps Toolkit served by Kubernetes — note the pod hostname in the footer."),
];

const jenkins = [
  h1("9. Jenkins Setup"),
  p("Jenkins is run as a Docker container with the host Docker socket bind-mounted, so that docker build / push from inside Jenkins reuses the host daemon."),

  h2("9.1 Required Plugins"),
  bullet("Docker Pipeline"),
  bullet("Pipeline: Stage View"),
  bullet("Credentials Binding"),
  bullet("Workspace Cleanup"),

  h2("9.2 Granting Docker Socket Access"),
  p("The default jenkins user inside the container does not have permission to talk to /var/run/docker.sock. A one-line chmod inside the container resolves this for the duration of the lab:"),
  ...code(`docker exec -u 0 jenkins chmod 666 /var/run/docker.sock`),

  h2("9.3 Mounting a Working kubeconfig"),
  p("The Jenkins container also needs to reach the Kubernetes API. The host kubeconfig is rewritten to use host.docker.internal in place of 127.0.0.1, TLS verification is skipped, and the result is copied into /var/jenkins_home/.kube/config:"),
  ...code(
`$kc = Get-Content "$env:USERPROFILE\\.kube\\config" -Raw
$kc = $kc -replace '127\\.0\\.0\\.1', 'host.docker.internal'
$kc = $kc -replace 'certificate-authority-data:[^\\r\\n]+', 'insecure-skip-tls-verify: true'
[System.IO.File]::WriteAllText("$env:TEMP\\kc-jenkins", $kc)

docker exec -u 0 jenkins mkdir -p /var/jenkins_home/.kube
docker cp $env:TEMP\\kc-jenkins jenkins:/var/jenkins_home/.kube/config
docker exec -u 0 jenkins chown -R jenkins:jenkins /var/jenkins_home/.kube
docker exec jenkins kubectl get nodes`),
  ...ssPlaceholder(11, "Successful `kubectl get nodes` executed from inside the Jenkins container."),

  h2("9.4 Credentials"),
  p("A Username with Password credential was added in Manage Jenkins → Credentials with ID docker-creds. The username is the Docker Hub account and the password is the personal access token."),
  ...ssPlaceholder(12, "Jenkins Credentials page showing `docker-creds` (Username with password)."),

  h2("9.5 Pipeline Job"),
  p("A Pipeline job named flask-k8s-pipeline was created with the following configuration:"),
  buildTable(
    [3000, CONTENT_W - 3000],
    [
      ["Field", "Value"],
      ["Definition", "Pipeline script from SCM"],
      ["SCM", "Git"],
      ["Repository URL", "https://github.com/naveenkm21/pbl-7-cicd.git"],
      ["Branch Specifier", "*/main"],
      ["Script Path", "Jenkinsfile"],
      ["Build Triggers", "Poll SCM — H/2 * * * *"],
    ]
  ),
  ...ssPlaceholder(13, "Jenkins job configuration page (`flask-k8s-pipeline`)."),
];

const pipeline = [
  h1("10. The Jenkins Pipeline"),
  p("The Jenkinsfile uses the declarative syntax. All shell steps run on the Linux Jenkins agent, so sh is used throughout."),
  ...code(
`pipeline {
  agent any
  environment {
    DOCKER_HUB_USER = 'naveenkm21'
    IMAGE_NAME = "\${DOCKER_HUB_USER}/flask-web"
    IMAGE_TAG  = "\${BUILD_NUMBER}"
    FULL_IMAGE = "\${IMAGE_NAME}:\${IMAGE_TAG}"
  }
  options { timestamps(); buildDiscarder(logRotator(numToKeepStr: '10')) }
  stages {
    stage('Build Docker Image') {
      steps { sh 'docker build -t \$FULL_IMAGE -t \$IMAGE_NAME:latest .' }
    }
    stage('Login & Push to Docker Hub') {
      steps {
        withCredentials([usernamePassword(credentialsId: 'docker-creds',
            usernameVariable: 'DH_USER', passwordVariable: 'DH_PASS')]) {
          sh '''
            echo "\$DH_PASS" | docker login -u "\$DH_USER" --password-stdin
            docker push \$FULL_IMAGE
            docker push \$IMAGE_NAME:latest
          '''
        }
      }
    }
    stage('Deploy to Kubernetes') {
      steps {
        sh '''
          sed "s|IMAGE_PLACEHOLDER|\$FULL_IMAGE|g" deployment.yaml > deployment-out.yaml
          kubectl apply -f deployment-out.yaml
          kubectl rollout status deployment/flask-web-deployment --timeout=120s
          kubectl get svc flask-web-service
        '''
      }
    }
  }
  post {
    always { sh 'docker logout || true'; cleanWs() }
    success { echo "Deployed \${FULL_IMAGE} - visit http://localhost:30007" }
    failure { echo "Pipeline failed. Check the stage logs above." }
  }
}`),

  h2("10.1 Stage Summary"),
  buildTable(
    [3000, CONTENT_W - 3000],
    [
      ["Stage", "Outcome"],
      ["Checkout SCM", "Clones the repository at the latest main commit"],
      ["Build Docker Image", "Produces naveenkm21/flask-web:<BUILD_NUMBER> and :latest"],
      ["Login & Push to Docker Hub", "Authenticates with docker-creds and pushes both tags"],
      ["Deploy to Kubernetes", "Substitutes the tag, applies manifest, waits for rollout"],
      ["Post (always)", "Logs out of Docker and cleans the Jenkins workspace"],
    ]
  ),
];

const exec = [
  h1("11. Pipeline Execution"),
  ...ssPlaceholder(14, "Jenkins Stage View showing all four stages green for build #4."),
  ...ssPlaceholder(15, "Console output of the Build Docker Image stage — `naming to docker.io/naveenkm21/flask-web:4 done`."),
  ...ssPlaceholder(16, "Console output of the Deploy to Kubernetes stage — `deployment \"flask-web-deployment\" successfully rolled out`."),
  ...ssPlaceholder(17, "Docker Hub `naveenkm21/flask-web` repository showing the new build-number tag."),

  h1("12. Verification"),
  h2("12.1 Cluster State"),
  ...code(
`kubectl get pods
kubectl get deployment flask-web-deployment
kubectl describe deployment flask-web-deployment | findstr Image`),
  ...ssPlaceholder(18, "Cluster state after rollout — pods Running, deployment AVAILABLE 2/2, image tag matches the latest build."),

  h2("12.2 Live Application"),
  p("With the port-forward active the application was opened in a browser. Refreshing the page changed the pod hostname displayed in the footer, confirming that traffic is being load-balanced across the two replicas."),
  ...ssPlaceholder(19, "Browser refresh #1 — footer shows pod `flask-web-deployment-...-aaaaa`."),
  ...ssPlaceholder(20, "Browser refresh #2 — footer shows pod `flask-web-deployment-...-bbbbb`."),

  h2("12.3 Continuous Deployment Loop"),
  p("To prove that subsequent commits flow through the pipeline automatically, the home page headline was changed to “DevOps Toolkit v2”, committed, and pushed:"),
  ...code(
`git add templates/home.html
git commit -m "Test CI/CD: bump headline to v2"
git push`),
  ...ssPlaceholder(21, "Jenkins Stage View for the auto-triggered build, started by SCM poll."),
  ...ssPlaceholder(22, "Browser at http://localhost:30007 showing the new “DevOps Toolkit v2” headline."),
];

const conclusion = [
  h1("13. Conclusion"),
  p("This lab exercises every link in a modern delivery chain: source control, automated CI, image registry, container orchestration, and zero-downtime rollouts. With the pipeline in place, a developer’s only manual step is git push — everything from build to deployment, including health-checked rollouts and load-balancing across replicas, is handled by Jenkins and Kubernetes. The same architecture scales unchanged to a managed Kubernetes service (EKS, GKE, AKS) by swapping kubeconfig and registry, demonstrating that the patterns learned here are directly applicable to production environments."),

  h1("14. References"),
  bullet("Flask documentation — https://flask.palletsprojects.com/"),
  bullet("Docker documentation — https://docs.docker.com/"),
  bullet("Kubernetes documentation — https://kubernetes.io/docs/"),
  bullet("Jenkins LTS — https://www.jenkins.io/doc/"),
  bullet("kind — https://kind.sigs.k8s.io/"),
  bullet("Lab repository — https://github.com/naveenkm21/pbl-7-cicd"),

  new Paragraph({ children: [new PageBreak()] }),

  h1("Appendix A — Screenshot Checklist"),
  p("Insert the screenshots in the order below, replacing each yellow [ Screenshot N placeholder ] block in the body of the document. The figure caption beneath each placeholder is the text that should accompany the screenshot."),
];

const screenshotList = [
  ["1", "Pipeline architecture diagram"],
  ["2", "Project folder layout in the file explorer / VS Code"],
  ["3", "kubectl get nodes — kind cluster Ready"],
  ["4", "DevOps Toolkit home page on http://localhost:5000 (local Flask run)"],
  ["5", "Successful `docker build` output"],
  ["6", "Browser served by the local Docker container"],
  ["7", "Docker Hub repository page (naveenkm21/flask-web tags)"],
  ["8", "kubectl get pods — 2/2 Running"],
  ["9", "kubectl get svc — NodePort 30007"],
  ["10", "Browser at http://localhost:30007 (port-forwarded)"],
  ["11", "kubectl get nodes from inside the Jenkins container"],
  ["12", "Jenkins Credentials page showing docker-creds"],
  ["13", "Jenkins job configuration (flask-k8s-pipeline)"],
  ["14", "Jenkins Stage View — all stages green"],
  ["15", "Build Docker Image console output"],
  ["16", "Deploy to Kubernetes console output (rollout success)"],
  ["17", "Docker Hub repository with the new build-number tag"],
  ["18", "Cluster state — pods, deployment, image tag"],
  ["19", "Browser refresh #1 (pod hostname A in footer)"],
  ["20", "Browser refresh #2 (pod hostname B in footer)"],
  ["21", "Jenkins Stage View for SCM-triggered build"],
  ["22", "Browser showing “DevOps Toolkit v2” headline"],
];

const appendix = [
  buildTable(
    [1200, CONTENT_W - 1200],
    [
      ["Figure #", "Caption"],
      ...screenshotList,
    ]
  ),
];

const allChildren = [
  ...titlePage,
  ...aim,
  ...setup,
  ...flask,
  ...docker,
  ...k8s,
  ...jenkins,
  ...pipeline,
  ...exec,
  ...conclusion,
  ...appendix,
];

const doc = new Document({
  creator: "Naveen K M",
  title: "PBL-7 CI/CD Pipeline Lab Report",
  description: "Lab 7 — CI/CD with Jenkins, Docker, and Kubernetes",
  styles: {
    default: { document: { run: { font: FONT, size: 22 } } },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 32, bold: true, color: "1F3864", font: FONT },
        paragraph: { spacing: { before: 320, after: 160 }, outlineLevel: 0 } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 26, bold: true, color: "2E75B6", font: FONT },
        paragraph: { spacing: { before: 240, after: 120 }, outlineLevel: 1 } },
      { id: "Heading3", name: "Heading 3", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { size: 22, bold: true, color: "404040", font: FONT },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets",
        levels: [{ level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
      { reference: "numbers",
        levels: [{ level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 360 } } } }] },
    ],
  },
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: { top: MARGIN, right: MARGIN, bottom: MARGIN, left: MARGIN },
      },
    },
    headers: {
      default: new Header({
        children: [new Paragraph({
          alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text: "PBL-7 — CI/CD with Jenkins, Docker & Kubernetes", italics: true, size: 18, color: "808080", font: FONT })],
        })],
      }),
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: "Page ", size: 18, color: "808080", font: FONT }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "808080", font: FONT }),
            new TextRun({ text: " of ", size: 18, color: "808080", font: FONT }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: "808080", font: FONT }),
          ],
        })],
      }),
    },
    children: allChildren,
  }],
});

Packer.toBuffer(doc).then(buf => {
  const out = path.join(__dirname, 'PBL-7-Lab-Report.docx');
  fs.writeFileSync(out, buf);
  console.log("Wrote " + out);
});
