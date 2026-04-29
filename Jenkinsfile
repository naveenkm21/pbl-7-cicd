pipeline {
    agent any

    environment {
        IMAGE_NAME    = "pbl7-app"
        IMAGE_TAG     = "${env.BUILD_NUMBER}"
        REGISTRY      = "docker.io/naveenkm21"
        FULL_IMAGE    = "${REGISTRY}/${IMAGE_NAME}:${IMAGE_TAG}"
        KUBE_NAMESPACE = "default"
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Install & Test') {
            steps {
                sh '''
                    python3 -m venv venv
                    . venv/bin/activate
                    pip install -r app/requirements.txt pytest
                    cd app && pytest -q
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t ${FULL_IMAGE} -t ${REGISTRY}/${IMAGE_NAME}:latest ."
            }
        }

        stage('Push Image') {
            steps {
                withCredentials([usernamePassword(credentialsId: 'dockerhub-creds',
                                                  usernameVariable: 'DH_USER',
                                                  passwordVariable: 'DH_PASS')]) {
                    sh '''
                        echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                        docker push ${FULL_IMAGE}
                        docker push ${REGISTRY}/${IMAGE_NAME}:latest
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                withCredentials([file(credentialsId: 'kubeconfig', variable: 'KUBECONFIG')]) {
                    sh '''
                        sed "s|REPLACE_ME_IMAGE:latest|${FULL_IMAGE}|g" k8s/deployment.yaml | kubectl apply -n ${KUBE_NAMESPACE} -f -
                        kubectl apply -n ${KUBE_NAMESPACE} -f k8s/service.yaml
                        kubectl rollout status deployment/pbl7-app -n ${KUBE_NAMESPACE} --timeout=120s
                    '''
                }
            }
        }

        stage('Smoke Test') {
            steps {
                sh '''
                    SVC_IP=$(kubectl get svc pbl7-app-svc -o jsonpath='{.spec.clusterIP}')
                    kubectl run smoke-${BUILD_NUMBER} --rm -i --restart=Never --image=curlimages/curl -- \
                        curl -sf http://${SVC_IP}/health
                '''
            }
        }
    }

    post {
        success { echo "Deployed ${FULL_IMAGE} successfully." }
        failure { echo "Pipeline failed. Check logs." }
        always  { sh 'docker logout || true' }
    }
}
