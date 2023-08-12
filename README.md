# stream-event-source

A simple API for consuming server-sent events (SSE) using an AsyncGenerator

Example usage, printing out events on the Wikimedia recent changes stream for 5 seconds:

```js
const stream = streamEventSource(
  "https://stream.wikimedia.org/v2/stream/recentchange"
);

const now = Date.now();

for await (const event of stream) {
  console.log(event.event);
  console.log(event.data);

  if (Date.now() - now > 5000) {
    break;
  }
}
```
