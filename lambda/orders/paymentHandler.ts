import { SNSEvent, Context } from "aws-lambda";

export async function handler(event: SNSEvent, context: Context): Promise<void> {
  event.Records.forEach(async (record) => {
    const message = record.Sns.Message;
    const messageAttributes = record.Sns.MessageAttributes;
    const eventType = messageAttributes?.eventType?.Value;

    console.log(`Processing event type: ${eventType}`);
    console.log(`Message: ${message}`);
  });
}
