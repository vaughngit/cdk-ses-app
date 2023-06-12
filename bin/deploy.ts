/* eslint-disable no-new */
import 'source-map-support/register';
import { App } from 'aws-cdk-lib';
import { SesConfigStack } from '../lib/ses-config-stack';
import { sesAttr, domainAttr } from '../config';
import {MessageQueueStack} from '../lib/sqs-sns-stack'; 
import { EbSqsEcsStack } from '../lib/eb-sqs-ecs-stack';

const app = new App();

// Use account details from default AWS CLI credentials:
const account = process.env.CDK_DEFAULT_ACCOUNT;
const region = process.env.CDK_DEFAULT_REGION;
const env = { account, region };

// Create SES Configuration Stack
new SesConfigStack(app, 'SesConfigStack', {
    description: 'SES Domain Configuration Stack',
    env,
    sesAttr,
    domainAttr,
});

new MessageQueueStack(app, 'queue', {
    description: 'Message Queue Stack',
    env,
}); 

new EbSqsEcsStack(app, 'sqsecs', { 
    description: 'SQS ECS Stack',
    env
});