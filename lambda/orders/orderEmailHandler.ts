import { Context, SNSMessage, SQSEvent } from "aws-lambda";
import { AWSError, SES } from "aws-sdk";
import { PromiseResult } from "aws-sdk/lib/request";
import { OrderEvent, OrderEventData } from "/opt/nodejs/orderEventsLayer";

const SESClient = new SES({ region: 'us-east-1' });

export async function handler(event: SQSEvent, context: Context): Promise<void> {
  const promises: Promise<PromiseResult<SES.SendEmailResponse, AWSError>>[] = [];
  event.Records.forEach(async (record) => {
    const body = JSON.parse(record.body) as SNSMessage;
    promises.push(sendEmail(body));
  });
  await Promise.all(promises);
}
function sendEmail(body: SNSMessage) {
  const orderEvent = JSON.parse(body.Message) as OrderEvent;
  const data = orderEvent.data as OrderEventData;
  return SESClient.sendEmail({
    Destination: {
      ToAddresses: [data.email],
    },
    Message: {
      Body: {
        Text: {
          Data: `Your order with ID ${data.orderId} has been received and is being processed.`,
        },
      },
      Subject: {
        Data: `Order Confirmation - ${data.orderId}`,
      },
    },
    Source: 'csbetsonline@gmail.com'
}).promise();
}

