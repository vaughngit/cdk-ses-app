import json

input_data = [
    {
        "EventBusName": "test-bus-cdk",
        "Source": "eb-sqs-ecs",
        "DetailType": "message-for-queue",
        "Detail": {
            "sender": "awsalvin@amazon.com",
            "recipient": "alvin@amazon.com",
            "subject": "Test within source object",
            "body": "Hello world Object converter!"
        }
    }
]

output_data = []
for item in input_data:
    detail = json.dumps(item["Detail"])
    item["Detail"] = detail
    output_data.append(item)

output_file = "event.json"
with open(output_file, "w") as f:
    json.dump(output_data, f, indent=4)

print(f"Output written to {output_file}")
