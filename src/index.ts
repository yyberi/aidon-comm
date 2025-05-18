import 'dotenv/config';
import { AidonComm, Aidon7534Data } from './aidon-comm.js';
import { MqttService, IClientOptions } from './mqttService.js';
import Logger, { LogLevel } from "@yyberi/logger";

const rootLog = Logger('aidon-comm');
const log = rootLog.child({ name: 'index.ts' });
log.setLogLevel(LogLevel.INFO);

const SIMULATE = process.env.SIMULATE === "true";
const MQTT_TOPIC = process.env.MQTT_TOPIC ?? "energy/realtimedata";

let mqttService: MqttService | undefined = undefined;
const brokerUrl = process.env.MQTT_BROKER_URL ?? "mqtt://127.0.0.1";
const mqttPort = parseInt(process.env.MQTT_PORT ?? "1883", 10);
const mqttCommOptions: IClientOptions = {
    port: mqttPort,
    protocolVersion: 5,
    keepalive: 60,
    properties: {
        requestResponseInformation: true,
        requestProblemInformation: true,
    },
};

/**
 * Initialize MQTT connection if enabled
 * @returns {Promise<void>}
 */
async function initMqtt() {
    if (process.env.MQTT_IN_USE === "true") {
        mqttService = new MqttService(brokerUrl, mqttCommOptions);
        try {
            await mqttService.connect();
            log.info("Connected to MQTT broker");
        } catch (error) {
            log.error(`Failed to connect to MQTT broker: ${error}`);
        }
    }
}


log.info(`Starting..`);
await initMqtt();
const comm = new AidonComm();

// Subscribe to meter data events
comm.on('data', (data: Aidon7534Data) => {
    if (!SIMULATE) {
        mqttService?.publish(MQTT_TOPIC, JSON.stringify(data), { retain: true });
    } else {
        log.info(`Simulated data: ${JSON.stringify(data)}`);
    }
});

// Subscribe to error events
comm.on('error', (err: Error) => {
    log.error('AidonComm error:', err);
});

log.info(`aidonInterface initialized`);




// process.stdin.resume();
process.on("exit", (code) => {
    log.info(`main exit with code ${code}`);
    process.exit();
});

async function exitHandler(sig: string) {
    log.info(`exit handler ${sig}`);
    comm.close();
    setTimeout(() => {
        process.exit(0);
    }, 1000);
}

process.on('SIGINT', () => exitHandler('SIGINT'));
process.on('SIGQUIT', () => exitHandler('SIGQUIT'));
// process.on('SIGTERM', () => exitHandler('SIGTERM'));