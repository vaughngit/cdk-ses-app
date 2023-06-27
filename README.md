

## Testing

Send custom events to Amazon EventBridge so that they can be matched to rules using put-events command

For an example, an event in event.json file is as follows- 
[
    {
      "EventBusName": "test-bus-cdk",
      "Source": "eb-sqs-ecs",
      "DetailType": "message-for-queue",
      "Detail": "{\"message\":\"Hello CDK world!\"}"
    }
  ]

- python .\event_converter.py  `updates event.json file ` 

Execute the following command to put event on EventBridge-


- aws events put-events --entries file://event.json --profile demo 



After execution, you see output similar to following in the command line-
{
    "FailedEntryCount": 0,
    "Entries": [
        {
            "EventId": "<Event ID created>"
        }
    ]
}

In the AWS Management Console, you’ll notice a new EventBridge event bus, a SQS queue, an ECS cluster and a task. You can monitor CloudWatch logs and notice the log for queue reading, messages read and deleted messages.  


