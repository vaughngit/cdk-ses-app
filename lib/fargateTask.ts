import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecspatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as events from 'aws-cdk-lib/aws-events';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as iam from "aws-cdk-lib/aws-iam";




export class ECSCronTaskStack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    
    const node = 'scheduledtaskapp' //hostname 
    const serviceName = `${node}`;

    //Setup the VPC 
     const vpc = ec2.Vpc.fromLookup(this, `default-import-vpc`, { 
       isDefault: true, 
      // subnetGroupNameTag: "private-subnet-1",
      
      });

    // Create an ECS cluster
    const cluster = new ecs.Cluster(this, 'scheduled-task-cluster', {
      clusterName: 'scheduled-task-cluster',
      containerInsights: true,
      vpc: vpc,
    });

    // Create a Fargate container image
    const image = ecs.ContainerImage.fromRegistry('amazonlinux:2');
    //const image = ecs.ContainerImage.fromRegistry('technetcentral/solardata');
    const taskLogGroup = logs.LogGroup.fromLogGroupName(this, "import-log-group", "/aws/ecs/scheduledTaskApp" )

   //task execution role ― is a general role that grants permissions to start the containers defined in a task. 
   //Those permissions are granted to the ECS agent so it can call AWS APIs on your behalf.
    const executionRole = new iam.Role(this, `${serviceName}-ecsAgentTaskExecutionRole`, {
      roleName: `${serviceName}EcsAgentTaskExecutionRole`,
      description: "a general role that grants permissions to start the containers defined in a task. ",
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchLogsFullAccess"),
       // iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess"),
       iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryReadOnly"),
       iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"),
     //iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryPowerUser")
      ]
    });


  // task role ― grants permissions to the actual application once the containers are started.
    const taskRole = new iam.Role(this, "ecsContainerRole", {
      roleName: `${serviceName}-ECSContainerTaskRole`,
      description: "grants permissions to the actual application once the containers are started.",
      assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName("CloudWatchFullAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSXRayDaemonWriteAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("service-role/AmazonECSTaskExecutionRolePolicy"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSAppMeshEnvoyAccess"),
        iam.ManagedPolicy.fromAwsManagedPolicyName("AWSAppMeshPreviewEnvoyAccess"),
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonEC2ContainerRegistryPowerUser"),
      iam.ManagedPolicy.fromAwsManagedPolicyName("AmazonDynamoDBFullAccess")
      ]
    });


    const taskDef = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 2048,
      cpu: 1024,
      ephemeralStorageGiB: 50,
      executionRole: executionRole,
      taskRole: taskRole, //The IAM role that grants containers in the task permission to call AWS APIs on your behalf. The role will be used to retrieve container images from ECR and create CloudWatch log groups.
      family: `${serviceName}`,
      //executionRole: this.createTaskExecutionRole()
    
    });

    taskDef.addContainer('AppContainer', {
      containerName: 'app',
      image: image,
      essential: true,
      environment: {
        // DB_HOST: '127.0.0.1',
        // DB_PORT: '3306',
        // DB_DATABASE: 'my_database',
        // DB_USERNAME: 'password',
        //couchdbResource:'http://admin:solardb@3.128.151.37:5984',
        couchdbResource:'http://admin:solardb@172.31.17.107:5984',
        couchdbTable:"solarthing",
        region:"us-east-2",
        profile:"testrole"
      },
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: id,
       // logRetention: logs.RetentionDays.ONE_YEAR,    
        logGroup: taskLogGroup      
      }),
      
      secrets: {
        // Retrieved from AWS Secrets Manager or AWS Systems Manager Parameter Store at container start-up.
        // SECRET: ecs.Secret.fromSecretsManager(secret),
        // DB_PASSWORD: ecs.Secret.fromSecretsManager(dbSecret, 'password'), // Reference a specific JSON field, (requires platform version 1.4.0 or later for Fargate tasks)
        // PARAMETER: ecs.Secret.fromSsmParameter(parameter),
      },
    });

/*     taskDef.addContainer('MysqlContainer', {
      containerName: 'mysql',
      // Use an image from DockerHub
      image: ecs.ContainerImage.fromRegistry('bitnami/mysql:5.7.21'),
      essential: true,
      environment: {
        ALLOW_EMPTY_PASSWORD: 'yes',
        MYSQL_DATABASE: 'my_database'
      }
    }); */

    // Create higher level construct containing a scheduled fargate task
    const schedTask = new ecspatterns.ScheduledFargateTask(this, 'amazon-linux-sleep-task', {
      cluster: cluster,
      platformVersion: ecs.FargatePlatformVersion.LATEST,
      scheduledFargateTaskDefinitionOptions:  {
        taskDefinition: taskDef,
      },
      schedule: events.Schedule.cron({
        minute: '*/30',
        hour: '*',
        day: '*',
        month: '*',
      }),
      subnetSelection: {
        subnetType: ec2.SubnetType.PUBLIC
      },
    //   scheduledFargateTaskImageOptions: {

    //     logDriver: ecs.LogDrivers.awsLogs({
    //       streamPrefix: id,
    //       logRetention: logs.RetentionDays.ONE_WEEK,    
    //       logGroup: taskLogGroup      
    //     }),
    //     image: image,
    //     command: ['sh', '-c', 'sleep 5'],
    //     environment: {
    //       APP_NAME: id,
    //     },
    //      //memoryLimitMiB: 1024,
    //      //cpu: 512,
    //   },
    });
    
    
  }
}
