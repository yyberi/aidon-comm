import { SerialPort } from "serialport";
import EventEmitter from "events";
import Logger, { LogLevel } from "@yyberi/logger";
import moment from "moment-timezone";
import crc16 from "crc/calculators/crc16";

const SIMULATE = process.env.SIMULATE === "true";

const rootLog = Logger("aidon-comm");
const log = rootLog.child({ name: "aidon-comm.ts" });
log.setLogLevel(LogLevel.INFO);

export type Aidon7534Data = {
  meterDateTime: string;
  cumulativeActiveEnergyIn: number;
  cumulativeActiveEnergyOut: number;
  cumulativeReactiveEnergyIn: number;
  cumulativeReactiveEnergyOut: number;
  activePowerIn: number;
  activePowerOut: number;
  reactivePowerIn: number;
  reactivePowerOut: number;
  l1activePowerIn: number;
  l1activePowerOut: number;
  l2activePowerIn: number;
  l2activePowerOut: number;
  l3activePowerIn: number;
  l3activePowerOut: number;
  l1reactivePowerIn: number;
  l1reactivePowerOut: number;
  l2reactivePowerIn: number;
  l2reactivePowerOut: number;
  l3reactivePowerIn: number;
  l3reactivePowerOut: number;
  l1RmsVoltage: number;
  l2RmsVoltage: number;
  l3RmsVoltage: number;
  l1RmsCurrent: number;
  l2RmsCurrent: number;
  l3RmsCurrent: number;
};

/**
 * AidonComm reads data from Aidon energy meter and emits events for data and errors.
 */
export class AidonComm extends EventEmitter {
  private port: SerialPort | null = null;
  private dataBuf: Buffer = Buffer.alloc(0);
  private rxTimeout: NodeJS.Timeout | null = null;
  private portWatchdog: NodeJS.Timeout | null = null;

  constructor() {
    super();
    const env = process.env.NODE_ENV || "development";
    log.info(`AidonComm init - env: ${env}, simulate: ${SIMULATE}`);
    if (!SIMULATE) {
      this.initSerial();
    } else {
      this.initSimulation();
    }
  }

  /**
   * Close the serial port
   */
  public close(): void {
    if (this.port) {
      this.port.close();
    }
  }

  /**
   * Initialize real serial port
   */
  private initSerial(): void {
    log.info("Init serial port");
    const device = process.env.SERIAL_DEVICE || "/dev/serial0";
    const baudRate = parseInt(process.env.SERIAL_BAUD_RATE || "115200", 10);
    this.port = new SerialPort({ path: device, baudRate, autoOpen: false });

    this.port.open(err => {
      if (err) {
        log.error(`Serial port open error: ${err.message}`);
        this.emit('error', err);
        return;
      }
      log.info(`Serial port opened on ${device}@${baudRate}`);
      this.resetPortWatchdog();

      this.port!.on('data', (chunk: Buffer) => {
        this.fillBuffer(chunk);
      });

      this.port!.on('close', () => {
        this.port = null;
        log.info("Serial port closed");
      });

      this.port!.on('error', error => {
        log.error(`Serial port error: ${error.message}`);
        this.emit('error', error);
      });
    });
  }

  /**
   * Reinitialize serial port on error or timeout
   */
  private reInitSerial(): void {
    if (this.port) {
      this.port.close(() => this.initSerial());
    } else {
      this.initSerial();
    }
  }

  /**
   * Watchdog to detect missing data
   */
  private resetPortWatchdog(): void {
    if (this.portWatchdog) clearTimeout(this.portWatchdog);
    const timeoutMs = parseInt(process.env.WATCHDOG_TIMEOUT_MS || "11000", 10);
    this.portWatchdog = setTimeout(() => {
      log.info("No data received - re-init serial port.");
      this.reInitSerial();
      this.emit('error', new Error('Serial port timeout'));
    }, timeoutMs);
  }

  /**
   * Simulate data for development
   */
  private initSimulation(): void {
    const interval = parseInt(process.env.SIMULATION_INTERVAL_MS || "10000", 10);
    setInterval(() => {
      // Original full simulation frame with correct CRC
      const sampleHex = "2f41444e3920373533340d0a0d0a302d303a312e302e302832323132323931373232343057290d0a312d303a312e382e302830303030363430352e3430332a6b5768290d0a312d303a322e382e302830303030333230392e3037362a6b5768290d0a312d303a332e382e302830303030303033302e3237342a6b56417268290d0a312d303a342e382e302830303030313030352e3435312a6b56417268290d0a312d303a312e372e3028303030322e3635352a6b57290d0a312d303a322e372e3028303030302e3030302a6b57290d0a312d303a332e372e3028303030302e3030302a6b564172290d0a312d303a342e372e3028303030302e3639362a6b564172290d0a312d303a32312e372e3028303030302e3230322a6b57290d0a312d303a32322e372e3028303030302e3030302a6b57290d0a312d303a34312e372e3028303030302e3636312a6b57290d0a312d303a34322e372e3028303030302e3030302a6b57290d0a312d303a36312e372e3028303030312e3830322a6b57290d0a312d303a36322e372e3028303030302e3030302a6b57290d0a312d303a32332e372e3028303030302e3036382a6b564172290d0a312d303a32342e372e3028303030302e3030302a6b564172290d0a312d303a34332e372e3028303030302e3030302a6b564172290d0a312d303a34342e372e3028303030302e3235332a6b564172290d0a312d303a36332e372e3028303030302e3030302a6b564172290d0a312d303a36342e372e3028303030302e3439322a6b564172290d0a312d303a33322e372e30283233332e372a56290d0a312d303a35322e372e30283233332e312a56290d0a312d303a37322e372e30283233332e312a56290d0a312d303a33312e372e30283030302e392a41290d0a312d303a35312e372e30283030332e302a41290d0a312d303a37312e372e30283030372e392a41290d0a21353338430d0a";
      this.fillBuffer(Buffer.from(sampleHex, 'hex'));
    }, interval);
  }

  /**
   * Buffer incoming data until full frame
   */
  private fillBuffer(chunk: Buffer): void {
    this.dataBuf = Buffer.concat([this.dataBuf, chunk]);

    // Start timeout on first chunk
    if (this.rxTimeout === null) {
      this.rxTimeout = setTimeout(() => {
        const msg = `Timeout, buffer: ${this.dataBuf.toString()}`;
        log.error(msg);
        this.emit('error', new Error(msg));
        this.dataBuf = Buffer.alloc(0);
        this.rxTimeout = null;
      }, 2000);
    }

    // Check for frame header and length
    if (this.dataBuf.length >= 10) {
      const start = this.dataBuf.indexOf(Buffer.from('/ADN9'));
      if (start !== -1 && this.dataBuf.length >= start + 10) {
        const deviceId = this.dataBuf.subarray(start, start + 10).toString();
        if (deviceId === '/ADN9 7534') {
          const expectedLength = 705;
          if (this.dataBuf.length >= expectedLength) {
            clearTimeout(this.rxTimeout!);
            this.rxTimeout = null;
            const frame = this.dataBuf;
            this.dataBuf = Buffer.alloc(0);

            if (this.checkCRC(frame)) {
              this.parseAidon7534(frame);
            } else {
              this.emit('error', new Error('CRC check failed'));
              this.resetPortWatchdog();
            }
          }
        }
      }
    }
  }

  /**
   * CRC-16 check for frame integrity
   */
  private checkCRC(data: Buffer): boolean {
    const start = data.indexOf(Buffer.from('/ADN9'));
    const end = data.indexOf(Buffer.from('!'));
    if (start === -1 || end === -1) return false;

    const dataCRC = data.subarray(end + 1, end + 5).toString();
    const calcCRC = crc16(data.subarray(start, end + 1)).toString(16).toUpperCase().padStart(4, '0');

    if (dataCRC !== calcCRC) {
      log.error(`CRC Error: Read ${dataCRC}, Calc ${calcCRC}`);
      return false;
    }
    return true;
  }

  /**
   * Parse Aidon7534 frame and emit data event
   */
  private async parseAidon7534(data: Buffer): Promise<void> {
    try {
      const tsStart = data.indexOf(Buffer.from('0-0:1.0.0(')) + 10;
      const meterDateTime = data.subarray(tsStart, tsStart + 12).toString();
      const year = 2000 + +meterDateTime.slice(0, 2);
      const month = +meterDateTime.slice(2, 4) - 1;
      const day = +meterDateTime.slice(4, 6);
      const hour = +meterDateTime.slice(6, 8);
      const minute = +meterDateTime.slice(8, 10);
      const second = +meterDateTime.slice(10, 12);
      const local = new Date(year, month, day, hour, minute, second);
      const ts = new Date(moment(local).utc().toISOString());

      const extract = (tagHex: string, len: number) => {
        const idx = data.indexOf(Buffer.from(tagHex, 'hex')) + tagHex.length / 2;
        return parseFloat(data.subarray(idx + 1, idx + 1 + len).toString());
      };

      const meter: Aidon7534Data = {
        meterDateTime,
        cumulativeActiveEnergyIn: extract('312d303a312e382e30', 12),
        cumulativeActiveEnergyOut: extract('312d303a322e382e30', 12),
        cumulativeReactiveEnergyIn: extract('312d303a332e382e30', 12),
        cumulativeReactiveEnergyOut: extract('312d303a342e382e30', 12),
        activePowerIn: extract('312d303a312e372e30', 8),
        activePowerOut: extract('312d303a322e372e30', 8),
        reactivePowerIn: extract('312d303a332e372e30', 8),
        reactivePowerOut: extract('312d303a342e372e30', 8),
        l1activePowerIn: extract('312d303a32312e372e30', 8),
        l1activePowerOut: extract('312d303a32322e372e30', 8),
        l2activePowerIn: extract('312d303a34312e372e30', 8),
        l2activePowerOut: extract('312d303a34322e372e30', 8),
        l3activePowerIn: extract('312d303a36312e372e30', 8),
        l3activePowerOut: extract('312d303a36322e372e30', 8),
        l1reactivePowerIn: extract('312d303a32332e372e30', 8),
        l1reactivePowerOut: extract('312d303a32342e372e30', 8),
        l2reactivePowerIn: extract('312d303a34332e372e30', 8),
        l2reactivePowerOut: extract('312d303a34342e372e30', 8),
        l3reactivePowerIn: extract('312d303a36332e372e30', 8),
        l3reactivePowerOut: extract('312d303a36342e372e30', 8),
        l1RmsVoltage: extract('312d303a33322e372e30', 5),
        l2RmsVoltage: extract('312d303a35322e372e30', 5),
        l3RmsVoltage: extract('312d303a37322e372e30', 5),
        l1RmsCurrent: extract('312d303a33312e372e30', 5),
        l2RmsCurrent: extract('312d303a35312e372e30', 5),
        l3RmsCurrent: extract('312d303a37312e372e30', 5)
      };

      this.emit('data', meter);
      log.debug(`Parsed data: ${JSON.stringify(meter)}`);
      this.resetPortWatchdog();
    } catch (err) {
      log.error(`Parse error: ${err}`);
      this.emit('error', err as Error);
    }
  }
}
