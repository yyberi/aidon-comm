import mqtt, {
  MqttClient,
  IClientOptions,
  IClientPublishOptions,
  IClientSubscribeOptions,
  Packet
} from 'mqtt';
import Logger, { LogLevel } from "@yyberi/logger";

export { IClientOptions } from 'mqtt';

const rootLog = Logger('fronius-comm');
const log = rootLog.child({ name: 'mqttService.ts' });
log.setLogLevel(LogLevel.INFO);

export class MqttService {
  private client: MqttClient;
  private readonly brokerUrl: string;
  private readonly options: IClientOptions;

  constructor(brokerUrl: string, options: IClientOptions = {}) {
    this.brokerUrl = brokerUrl;
    this.options = options;

    // Luo MQTT-asiakas
    log.debug(`Client options: ${JSON.stringify(options)} brokerUrl: ${brokerUrl}`);
    this.client = mqtt.connect(this.brokerUrl, this.options);
  }

  /**
   * Connects to the MQTT broker.
   * 
   * @returns 
   */
  public connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Tyyppi 'connect' -eventille ei tarvitse erikseen parametriä.
      this.client.on('connect', () => {
        log.debug(`Connected to broker.`);
        resolve();
      });

      this.client.on('error', (error: Error) => {
        log.error(`Connection error: ${error}`);
        reject(error);
      });
    });
  }

  /**
   * Publishes a message to the specified topic.
   * 
   * @param topic 
   * @param message 
   * @param options 
   * @returns 
   */
  public publish(topic: string, message: string | Buffer, options?: IClientPublishOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, options || {}, (error?: Error, packet?: Packet) => {
        if (error) {
          log.error(`publish() : ${error}`);
          return reject(error);
        }
        log.debug(`publish(): topic: "${topic}", message: "${message}"`);
        resolve();
      });
    });
  }

  /**
   * Subscribes to the specified topic.
   * 
   * @param topic 
   * @param options 
   * @returns 
   */
  public subscribe(topic: string, options?: IClientSubscribeOptions): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, options ?? {}, (error, granted) => {
        if (error) {
          log.error(`subscribe(): error: ${error}`);
          return reject(error);
        }
        log.debug(`subscribe() topic: "${topic}" (granted: ${JSON.stringify(granted)})`);
        resolve();
      });
    });
  }

  /**
   * 
   * @param callback 
   */
  public onMessage(callback: (topic: string, message: Buffer) => void): void {
    this.client.on('message', (topic: string, message: Buffer) => {
      callback(topic, message);
    });
  }

  /**
   * Disconnects from the MQTT broker.
   * 
   * @returns 
   */
  public disconnect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.client.end(false, {}, (error?: Error) => {
        if (error) {
          log.error(`disconnect(): ${error}`);
          return reject(error);
        }
        log.debug(`disconnect(): Connection closed from broker: ${this.brokerUrl}`);
        resolve();
      });
    });
  }
}
