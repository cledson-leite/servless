import { Context, SQSEvent } from "aws-lambda";

export async function handler(event: SQSEvent, context: Context): Promise<void> {
  event.Records.forEach(async (record) => {
    console.log("Processing order event:", JSON.parse(record.body));
  });
}
