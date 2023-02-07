import * as cdk from "aws-cdk-lib";
import { Vpc, SecurityGroup, SubnetType } from "aws-cdk-lib/aws-ec2";
import {
  PolicyStatement,
  Effect,
  Role,
  ServicePrincipal,
  ManagedPolicy,
} from "aws-cdk-lib/aws-iam";
import * as batch from "aws-cdk-lib/aws-batch";
import { Construct } from "constructs";

const jobDefinitionName = "test-batch-job-definition";
const computeEnvironmentName = "test-batch-compute-environment";
const jobQueueName = "test-batch-job-queue";
const accountId = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_ACCOUNT;

export class BatchStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    console.log(`AccontId: ${accountId}; Region: ${region}`);

    // vpc and security group in which the batch processes will run
    const vpc = new Vpc(this, "vpc", {
      maxAzs: 3,
    });

    const sg = new SecurityGroup(this, "sg", {
      securityGroupName: "test-batch-sg",
      vpc,
    });

    const stsAssumeRoleStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["sts:AssumeRole"],
      resources: ["*"],
    });

    // used by lambda that will invoke submit job
    const jobSubmitStatement = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: ["batch:SubmitJob"],
      resources: ["*"],
    });

    const batchServiceRole = new Role(this, "test-batch-service-role", {
      assumedBy: new ServicePrincipal("batch.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSBatchServiceRole"
        ),
        ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess"),
      ],
    });
    batchServiceRole.addToPolicy(stsAssumeRoleStatement);

    const batchExecutionRole = new Role(this, "test-batch-execution-role", {
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
    });
    const batchExecutionPolicy = new PolicyStatement({
      effect: Effect.ALLOW,
      actions: [
        "ecr:GetAuthorizationToken",
        "ecr:BatchCheckLayerAvailability",
        "ecr:GetDownloadUrlForLayer",
        "ecr:BatchGetImage",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
      ],
      resources: ["*"],
    });
    batchExecutionRole.addToPolicy(batchExecutionPolicy);

    // for more info see: https://docs.aws.amazon.com/batch/latest/userguide/job_definitions.html
    const jobDefinition = new batch.CfnJobDefinition(
      this,
      "batch-test-job-definition",
      {
        jobDefinitionName,
        type: "Container",
        containerProperties: {
          environment: [{ name: "MY_TEST_VAR", value: "This is test var" }], //example test environment variable
          image:
            accountId + ".dkr.ecr.eu-west-1.amazonaws.com/test-ecr-repo:latest",
          resourceRequirements: [
            {
              value: "4096",
              type: "MEMORY",
            },
            {
              value: "2",
              type: "VCPU",
            },
          ],
          executionRoleArn: batchExecutionRole.roleArn,
        },
        //needs to corelate to the compute environment compute resource type
        platformCapabilities: ["FARGATE"],
        retryStrategy: {
          attempts: 3,
        },
      }
    );

    // for more info see: https://docs.aws.amazon.com/batch/latest/userguide/compute_environments.html
    const computeEnvironemnt = new batch.CfnComputeEnvironment(
      this,
      "compute-environment",
      {
        computeEnvironmentName,
        computeResources: {
          maxvCpus: 25,
          type: "FARGATE_SPOT",
          subnets: vpc.privateSubnets.map((x) => x.subnetId),
          securityGroupIds: [sg.securityGroupId],
        },
        serviceRole: batchServiceRole.roleArn,
        type: "MANAGED",
        state: "ENABLED",
      }
    );

    // job queue is needed in order to trigger the compute environment
    // can be mapped to more than one compute environment
    const jobQueue = new batch.CfnJobQueue(this, "test-batch-job-queue", {
      jobQueueName,
      priority: 1,
      state: "ENABLED",
      computeEnvironmentOrder: [
        {
          order: 1,
          computeEnvironment:
            computeEnvironemnt.computeEnvironmentName as string,
        },
      ],
    });
    jobQueue.addDependsOn(computeEnvironemnt);
  }
}
