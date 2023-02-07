import * as cdk from "aws-cdk-lib";
import {
  Vpc,
  SubnetType,
  SecurityGroup,
  Peer,
  Port,
} from "aws-cdk-lib/aws-ec2";
import {
  PolicyStatement,
  Effect,
  Role,
  ServicePrincipal,
  ManagedPolicy,
  CfnInstanceProfile,
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

    // const vpc = cdk.aws_ec2.Vpc.fromLookup(this, "default-vpc", {
    //   isDefault: true,
    // });

    // console.log("Vpc: " + vpc.vpcId);
    // console.log("Subnets: " + JSON.stringify(vpc.selectSubnets().subnetIds));

    // vpc and security group in which the batch processes will run
    // const vpc = new Vpc(this, "vpc", {
    //   maxAzs: 3,
    // });

    // const sg = new SecurityGroup(this, "sg", {
    //   securityGroupName: "test-batch-sg",
    //   vpc,
    // });

    // sg-fe531a8d
    // subnet-0caa1e56,subnet-84dab1e2,subnet-f0b0cab8

    const vpc = new Vpc(this, "batch-vpc", {
      cidr: "10.0.0.0/16",
      natGateways: 0,
      maxAzs: 3,
      subnetConfiguration: [
        {
          name: "batch-public-subnet",
          subnetType: SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    const batchSecurityGroup = new SecurityGroup(this, "batch-sg", {
      vpc,
      allowAllOutbound: true,
      description: "security group for batch",
    });

    batchSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.allTraffic());

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

    const instanceRole = new Role(this, "instance-role", {
      assumedBy: new ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AmazonEC2ContainerServiceforEC2Role"
        ),
      ],
    });
    instanceRole.addToPolicy(stsAssumeRoleStatement);

    const instanceProfile = new CfnInstanceProfile(this, "instance-profile", {
      instanceProfileName: "instance-profile",
      roles: [instanceRole.roleName],
    });

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
          vcpus: 2,
          memory: 4096,
          executionRoleArn: batchExecutionRole.roleArn,
        },
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
          minvCpus: 0,
          desiredvCpus: 15,
          maxvCpus: 25,
          type: "SPOT",
          allocationStrategy: "SPOT_CAPACITY_OPTIMIZED",
          instanceTypes: ["optimal"],
          instanceRole: instanceProfile.attrArn,
          subnets: vpc.publicSubnets.map((x) => x.subnetId), //vpc.selectSubnets().subnetIds,
          securityGroupIds: [batchSecurityGroup.securityGroupId], //["sg-fe531a8d"],
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
          order: 0,
          computeEnvironment:
            computeEnvironemnt.computeEnvironmentName as string,
        },
      ],
    });
    jobQueue.addDependsOn(computeEnvironemnt);
  }
}
