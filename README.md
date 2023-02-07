# Welcome to AWS Batch example project

This is a example project for AWS batch using CDK

## Prerequisites

- AWS CLI setup - with user that have permissions to execute all the necessary actions.
- ECR repo created upfront

## Useful commands

- `npm run build` compile typescript to js
- `npm run watch` watch for changes and compile
- `npm run test` perform the jest unit tests
- `cdk deploy` deploy this stack to your default AWS account/region
- `cdk diff` compare deployed stack with current state
- `cdk synth` emits the synthesized CloudFormation template

### Login to ECR

aws ecr get-login-password --region eu-west-1 | docker login --username AWS --password-stdin <account-number>.dkr.ecr.eu-west-1.amazonaws.com

### Push the docker image

docker push <account-number>.dkr.ecr.eu-west-1.amazonaws.com/<ecr-repo-name>:latest
docker tag <local-docker-image-id> <account-number>.dkr.ecr.eu-west-1.amazonaws.com/<ecr-repo-name>:latest

### Docker build/run for M1 chip

docker buildx build --platform=linux/amd64 -t dnakevski/batch-python-conda-test .
docker run -it -d --platform=linux/amd64 dnakevski/batch-python-conda-test

### Docker RUN with command parameters

docker run -it -d --platform=linux/amd64 dnakevski/batch-python-conda-test test1 test2 --optional opt1
