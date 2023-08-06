import {
  EventSourceMessage,
  FetchEventSourceInit,
  fetchEventSource,
} from "@fortaine/fetch-event-source";

export type StreamEventSourceInit = Omit<FetchEventSourceInit, "body"> &
  (
    | {
        json?: any;
        body?: undefined;
      }
    | {
        json?: undefined;
        body?: BodyInit | null;
      }
  );

type EventSourceQueueItem =
  | {
      event: EventSourceMessage;
      done?: undefined;
      error?: undefined;
    }
  | {
      event?: undefined;
      done: true;
      error?: undefined;
    }
  | {
      event?: undefined;
      done?: undefined;
      error: Error;
    };

const JSON_MEDIA_TYPE = "application/json";

export async function* streamEventSource(
  url: string,
  { json, ...init }: StreamEventSourceInit = {}
): AsyncGenerator<EventSourceMessage> {
  const events: Promise<EventSourceQueueItem>[] = [];
  let resolve: (x: EventSourceQueueItem) => void;
  events.push(
    new Promise((r) => {
      resolve = r;
    })
  );

  const fetchInit: FetchEventSourceInit = { ...init };
  if (json) {
    if (!fetchInit.method) {
      fetchInit.method = "POST";
    }
    fetchInit.headers = {
      ...fetchInit.headers,
      "Content-Type": JSON_MEDIA_TYPE,
    };
    fetchInit.body = JSON.stringify(json);
  }
  if (!fetchInit.openWhenHidden) {
    fetchInit.openWhenHidden = true;
  }
  if (!fetchInit.onerror) {
    fetchInit.onerror = (error) => {
      throw error;
    };
  }

  fetchEventSource(url, {
    ...fetchInit,
    async onopen(response) {
      await fetchInit.onopen?.(response);
      if (!response.ok) {
        throw new Error(
          `Error opening event source to ${url}: ${
            response.status
          } - ${await response.text()}`
        );
      }
    },
    onmessage: (event: EventSourceMessage) => {
      fetchInit.onmessage?.(event);
      resolve({ event });
      events.push(
        new Promise((r) => {
          resolve = r;
        })
      );
    },
  })
    .then(() => resolve({ done: true }))
    .catch((error) => {
      resolve({ error });
    });

  for await (const event of events) {
    if (event.done) {
      return;
    }
    if (event.error) {
      throw event.error;
    }
    yield event.event!;
  }
}
