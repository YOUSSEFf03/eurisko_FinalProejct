import { Kafka } from 'kafkajs';

async function main(): Promise<void> {
  const kafka = new Kafka({
    clientId: 'test-publisher',
    brokers: ['localhost:9093'],
  });

  const producer = kafka.producer();
  await producer.connect();

  const event = {
    userId: '507f1f77bcf86cd799439011',
    email: 'yousseffarah102@gmail.com', // ← put your real email
    name: 'Test User',
    otp: '847291',
    expiresInMinutes: 10,
  };

  await producer.send({
    topic: 'notification.otp.send',
    messages: [
      {
        key: event.userId,
        value: JSON.stringify(event),
      },
    ],
  });

  console.log('✅ Event published to Kafka successfully');
  await producer.disconnect();
}

main().catch(console.error);
