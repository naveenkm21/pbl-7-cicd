pipeline {
    agent any

    environment {
        DOCKER_HUB_USER = 'naveenkm21'
        IMAGE_NAME      = "${DOCKER_HUB_USER}/flask-web"
        IMAGE_TAG       = "${BUILD_NUMBER}"
        FULL_IMAGE      = "${IMAGE_NAME}:${IMAGE_TAG}"
    }

    options {
        timestamps()
        buildDiscarder(logRotator(numToKeepStr: '10'))
    }

    stages {
        stage('Build Docker Image') {
            steps {
                sh 'docker build -t $FULL_IMAGE -t $IMAGE_NAME:latest .'
            }
        }

        stage('Login & Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-creds',
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                )]) {
                    sh '''
                        echo "$DH_PASS" | docker login -u "$DH_USER" --password-stdin
                        docker push $FULL_IMAGE
                        docker push $IMAGE_NAME:latest
                    '''
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                sh '''
                    sed "s|IMAGE_PLACEHOLDER|$FULL_IMAGE|g" deployment.yaml > deployment-out.yaml
                    kubectl apply -f deployment-out.yaml
                    kubectl rollout status deployment/flask-web-deployment --timeout=120s
                    kubectl get svc flask-web-service
                '''
            }
        }
    }

    post {
        always {
            sh 'docker logout || true'
            cleanWs()
        }
        success {
            echo "Deployed ${FULL_IMAGE} - visit http://localhost:30007"
        }
        failure {
            echo "Pipeline failed. Check the stage logs above."
        }
    }
}
