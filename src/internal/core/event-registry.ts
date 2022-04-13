import { Event, EventErrorCallback, EventListener, EventType } from '../../public/event';
import { Logging } from '../../public/logger';

const logger = Logging.getLogger('themis.event');

type EventListenerEntry<T> = {
  listener: EventListener<T>;
  errorCallback?: EventErrorCallback<T>;
};

/**
 * @internal
 */
export class EventRegistry {
  private readonly eventListenerMap: Map<EventType<Event>, EventListenerEntry<Event>[]>;
  private readonly queuedEvents: Array<{ eventType: EventType<Event>; event: Event }>;

  constructor() {
    this.eventListenerMap = new Map<EventType<Event>, EventListenerEntry<Event>[]>();
    this.queuedEvents = [];
  }

  public update(): void {
    let pop = this.queuedEvents.pop();
    while (pop !== undefined) {
      this.notifyListeners(pop.eventType, pop.event);
      pop = this.queuedEvents.pop();
    }
  }

  public registerListener<T extends Event>(
    eventType: EventType<T>,
    listener: EventListener<T>,
    errorCallback?: EventErrorCallback<T>
  ): void {
    let eventListener = this.eventListenerMap.get(eventType);
    if (eventListener === undefined) {
      eventListener = [];
      this.eventListenerMap.set(eventType, eventListener);
    }
    const entry: EventListenerEntry<T> = {
      listener,
      errorCallback
    };
    eventListener.push(entry as EventListenerEntry<Event>);
  }

  public submit<T extends Event>(eventType: EventType<T>, event: T, instant = false): void {
    if (instant) {
      this.notifyListeners(eventType, event);
    } else {
      this.queuedEvents.push({ eventType, event });
    }
  }

  private notifyListeners(eventType: EventType<Event>, event: Event): void {
    this.eventListenerMap.get(eventType)?.forEach((entry) => {
      try {
        entry.listener(event);
      } catch (error) {
        if (entry.errorCallback) {
          entry.errorCallback(event, error);
        } else {
          logger.error(error);
        }
      }
    });
  }
}