## Intro

This repository provides an example setup for using AWS Batch to run multiple parallel processing jobs. It showcases examples of running jobs as Docker containers on both EC2 instances and Fargate. The entire infrastructure is implemented using AWS CDK.

The composition is made of two stacks:

- [batchStack](https://github.com/DNakevski/aws-batch-processing/blob/master/lib/batchStack.ts) - Represents the conventional way of running batch jobs using EC2 as the underlying infrastructure.
- [batchStack_Fargate](https://github.com/DNakevski/aws-batch-processing/blob/master/lib/batchStack_Fargate.ts) - Defines how to run jobs using Fargate.

The "batch jobs" in this example are simple Python scripts used for demonstration purposes, but you can replace them with any job processing logic you prefer. The Python processing logic is packaged as a Docker container hosted in the AWS ECR container repository. This means that whenever you update the logic, you only need to push a new container version to ECR. Each subsequent job instance will automatically pick up the latest version.

### Motivation

I needed this kind of setup for a project I was working on, where I had to process eye-tracking and facial encoding data from many customers simultaneously. I spent hours doing online research, analyzing GitHub repositories, and reviewing AWS documentation, but I couldn't find an "out-of-the-box" infrastructure solution for this type of problem. After days of experimenting and assembling the right components, I developed the setup represented in this repo. I decided to share and document it in the hope that it might be useful to someone else and save them a few hours—or even days—of work.

## Prerequisites

### Docker

Docker installation is required on the local machine.
Installation files and guide can be found here: [docker installation](https://docs.docker.com/get-docker/)

### AWS CLI setup

Because the entire infrastructure is running on AWS and we are using CDK to deploy it, we need to have AWS account setup as well as AWS CLI on the local machine.
More info on how to configure the CLI can be found here: [Configure AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)

### Conda

In the usage context of the Python script we are using conda environments. More on conda environments can be found here: [conda environments](https://docs.conda.io/projects/conda/en/latest/user-guide/concepts/environments.html#)
The local conda environment is created from the file environment.yml which can be found in the root of the repo.
Execute the following commands in the root of the repo to create and activate the conda environment:

To create the conda environment from file:

    conda env create --file=environment.yml

To activate the conda environment:

    conda activate impala-processing-env

## Local run of the python script

To run the python processing script locally execute the following command from the root of the repo:

    python ./src/process_files.py test-arg-1 test-arg-2 --optional test-arg-optional

The command expects two mandatory arguments (test-arg1, test-arg-2) and one optional parameter (test-arg-optional).

## Build and Run the docker image

The definition of the docker image can be found in the **Dockerfile** in the root of the repo.

The image needs to run on AWS Batch environment. Therefore, the image needs to be build for **amd64** architecture. If you are running Windows or Linux machine you should be fine. But if you are using the Apple M1 chip the build and run commands are slightly different. Basically the **buildx** tool need to be used to _build/run_ the image for the proper environment.
More info on that note can be found here: [docker build](https://docs.docker.com/build/)

#### Building the image

Windows/Linux command:

    docker build aws-batch/batch-processing-image .

Apple M1 command:

    docker buildx build --platform=linux/amd64 -t aws-batch/batch-processing-image .

#### Running the containers

**NOTE:** _test1, test2_ and _opt1_ are python command parameters.

Windows/Linux command:

    docker run -it -d aws-batch/batch-processing-image test1 test2 --optional opt1

Apple M1 command:

    docker run -it -d --platform=linux/amd64 aws-batch/batch-processing-image test1 test2 --optional opt1

## Deploying the stack

For deployment we are using CDK. Therefore make sure to run the _npm install_ command so the necessary CDK packages can be installed.

More on CDK can be found here: [AWS CDK](https://aws.amazon.com/cdk/)

Once AWS CLI has been setup, you can deploy the stack with the following command:

    cdk deploy
