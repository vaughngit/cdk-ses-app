/* eslint-disable no-new */
import { Queue } from 'aws-cdk-lib/aws-sqs';
import { Subscription, SubscriptionProtocol, Topic } from 'aws-cdk-lib/aws-sns';
import { SqsSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { CfnPipe, CfnPipeProps } from 'aws-cdk-lib/aws-pipes';
import { EventBus } from 'aws-cdk-lib/aws-events';
import { PolicyDocument, Role, ServicePrincipal, PolicyStatement, Effect, ArnPrincipal } from 'aws-cdk-lib/aws-iam';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';
import { Stack, CfnOutput, StackProps, Duration, RemovalPolicy, Tags } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { testEmailAddress, solutionName, costcenter, environment } from '../config';

interface IStackProps extends StackProps {

}

/**
 * Configures SES domain and verified email addresses.
 * A Route53 Domain in the same Account is required.
 *
 * @param {Construct} scope
 * @param {string} id
 * @param {StackProps=} props
 */
export class MessageQueueStack extends Stack {
   

    constructor(scope: Construct, id: string, props: IStackProps) {
        super(scope, id, props);

   // const target = new EventBus(this, 'event-bus');

         // Create the SQS queue
    const queue = new Queue(this, 'EmailQueue', {
        queueName: 'email-queue',
        visibilityTimeout: Duration.seconds(30),
        retentionPeriod: Duration.days(7),

        removalPolicy: RemovalPolicy.DESTROY
      });

    // Attach an IAM policy to the SQS queue to only allow access from the same AWS account
    const queuePolicy = new PolicyStatement({
        effect: Effect.ALLOW,
        principals: [
          new ArnPrincipal(`arn:aws:iam::${this.account}:root`)
        ],
        actions: [
          'sqs:SendMessage',
          'sqs:ReceiveMessage',
          'sqs:DeleteMessage',
          'sqs:GetQueueAttributes',
          'sqs:GetQueueUrl'
        ],
        resources: [queue.queueArn]
      });
      queue.addToResourcePolicy(queuePolicy);

  
      // Create the SNS topic
      const snstopic = new Topic(this, 'SnSTopicSQSSubscriber', {
        topicName: 'email-topic',
        displayName: 'Email Topic',
      });
  
      // Subscribe the SQS queue to the SNS topic
    //  snstopic.addSubscription(new SqsSubscription(queue));

          // Subscribe an email address to the SNS topic
    const emailAddress = testEmailAddress;
    const emailSubscription = new Subscription(this, 'MyEmailSubscription', {
      topic: snstopic,
      protocol: SubscriptionProtocol.EMAIL,
      //rawMessageDelivery: true, //Raw message delivery can only be enabled for HTTP, HTTPS, SQS, and Firehose subscriptions.
      endpoint: emailAddress
    });

    const sourcePolicy = new PolicyDocument({
        statements: [
          new PolicyStatement({
            resources: [queue.queueArn],
            actions: [
              'sqs:ReceiveMessage', 
              'sqs:DeleteMessage', 
              'sqs:GetQueueAttributes'
          ],
            effect: Effect.ALLOW,
          }),
        ],
      });
  
      const targetPolicy = new PolicyDocument({
        statements: [
            // create policy statement to target sns topic only
          new PolicyStatement({
            resources: [snstopic.topicArn],
            actions: ['sns:Publish'],
            effect: Effect.ALLOW,
          }),

        //   new PolicyStatement({
        //     resources: [target.eventBusArn],
        //     actions: ['events:PutEvents'],
        //     effect: Effect.ALLOW,
        //   })
        ],
      });
  
      const pipeRole = new Role(this, 'role', {
        assumedBy: new ServicePrincipal('pipes.amazonaws.com'),
        inlinePolicies: {
          sourcePolicy,
          targetPolicy,
        },
      });
  
      // Create new Pipe
      const pipe = new CfnPipe(this, 'pipe', {
        roleArn: pipeRole.roleArn,
        source: queue.queueArn,
        sourceParameters: {
          sqsQueueParameters: {
            batchSize: 5,
            maximumBatchingWindowInSeconds: 120,
          },
        },
        target: snstopic.topicArn,
        targetParameters: {
            inputTemplate: `{
                "messageId": "<$.messageId>",
                "body": "<$.body>"
            }`,
        },
       // target: target.eventBusArn,
        // targetParameters: {
        //   eventBridgeEventBusParameters: {
        //     detailType: 'OrderCreated',
        //     source: 'myapp.orders',
        //   },
        //   inputTemplate: `{
        //     "orderId": "<$.body.orderId>",
        //     "customerId": "<$.body.customerId>"
        //   }`,
        // },
      });

      Tags.of(this).add('Solution', solutionName);
      Tags.of(this).add('CostCenter', costcenter);   
      Tags.of(this).add("environment", environment)

    // create cfn output for the sqs queue
    new CfnOutput(this, 'EmailQueueURL', { value: queue.queueUrl, description: 'SQS Queue URL'  });

    }
}