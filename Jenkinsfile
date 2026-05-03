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
        stage('Checkout') {
            steps {
                checkout scm
            }
        }

        stage('Build Docker Image') {
            steps {
                bat "docker build -t %FULL_IMAGE% -t %IMAGE_NAME%:latest ."
            }
        }

        stage('Login & Push to Docker Hub') {
            steps {
                withCredentials([usernamePassword(
                    credentialsId: 'docker-creds',
                    usernameVariable: 'DH_USER',
                    passwordVariable: 'DH_PASS'
                )]) {
                    bat 'echo %DH_PASS% | docker login -u %DH_USER% --password-stdin'
                    bat "docker push %FULL_IMAGE%"
                    bat "docker push %IMAGE_NAME%:latest"
                }
            }
        }

        stage('Deploy to Kubernetes') {
            steps {
                bat """
                    powershell -Command "(Get-Content deployment.yaml) -replace 'IMAGE_PLACEHOLDER', '%FULL_IMAGE%' | Set-Content deployment-out.yaml"
                """
                bat "kubectl apply -f deployment-out.yaml"
                bat "kubectl rollout status deployment/flask-web-deployment --timeout=120s"
                bat "kubectl get svc flask-web-service"
            }
        }
    }

    post {
        always {
            bat 'docker logout || exit 0'
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
