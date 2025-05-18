# AidonComm

A TypeScript library for communicating with an Aidon energy meter over its HAN (Home Area Network) interface. It abstracts serial communication, CRC‑checking, and data parsing, emitting structured events for easy integration.

For full protocol details, see the official manual:
[AIDON HAN Interface (PDF)](https://aidon.com/wp-content/uploads/2023/06/AIDONFD_RJ12_HAN_Interface_FI.pdf)

---

## Features

* Connects to an Aidon meter via serial port
* Optional simulation mode for development (controlled via `SIMULATE`)
* Automatic CRC‑16 validation of frames
* Watchdog to detect and recover from timeouts
* Emits `data` events with parsed readings and `error` events on failure
* **Supports forwarding measurement data to an MQTT broker**

## Getting started

I have designed and manufactured a batch of HAN-RS485 converters (send DM if you are interested). 
On the CPU end I use Waveshare Industrial USB to RS485 Converter.
Software is tested on Raspberry Pi 4 (Raspbian OS ver 12 “Bookworm”).

1. Clone the repository:

```bash
git clone <repository-url>
cd <repository-folder>
```

2. Copy the example environment file and configure:

```bash
cp .env.example .env.production
# then edit .env.production to match your settings
```

3. Modify `deploy.sh` to suit your deployment configuration.

4. On the target device, build and start the Docker containers:

```bash
docker compose build
docker compose up -d
```

5. By default, application logs are written to `logs/app.log`.

## Configuration

Set the following environment variables as needed:

| Variable                 | Description                                         | Default               |
| ------------------------ | --------------------------------------------------- | --------------------- |
| `NODE_ENV`               | runtime environment (`development` or `production`) | `development`         |
| `LOG_DIR`                | directory path where logs are stored                | `./logs`              |
| `SIMULATE`               | enable simulation mode (`true` to simulate data)    | `false`               |
| `SERIAL_DEVICE`          | serial port device path                             | `/dev/serial0`        |
| `SERIAL_BAUD_RATE`       | serial port communication speed                     | `115200`              |
| `SIMULATION_INTERVAL_MS` | interval between simulated frames (in milliseconds) | `10000`               |
| `WATCHDOG_TIMEOUT_MS`    | timeout for missing data recovery (in milliseconds) | `11000`               |
| `MQTT_IN_USE`            | enable publishing parsed data to MQTT broker        | `false`               |
| `MQTT_BROKER_URL`        | URL of the MQTT broker (including protocol)         | `mqtt://localhost`    |
| `MQTT_BROKER_PORT`       | port for connecting to the MQTT broker              | `1883`                |
| `MQTT_TOPIC`             | MQTT topic to publish real-time meter readings      | `energy/realtimedata` |

## Usage Example

```ts
import { AidonComm, Aidon7534Data } from 'aidon-comm';

const comm = new AidonComm();

comm.on('data', (reading: Aidon7534Data) => {
  console.log('Meter reading:', reading);
});

comm.on('error', (err: Error) => {
  console.error('Communication error:', err.message);
});
```

## Example Data Frame

Raw frames received from the meter follow this structure. For example:

```
/ADN9 7534

0-0:1.0.0(221219170900W)        Meter’s time and date and normal time indication (X=W meaning YYMMDDhhmmssX wintertime, X=S meaning summertime)
1-0:1.8.0(00005996.149*kWh)     Cumulative hourly active import energy (A+) (Q1+Q4) kWh 
1-0:2.8.0(00003209.076*kWh)     Cumulative hourly active export energy (A-) (Q2+Q3) kWh 
1-0:3.8.0(00000028.442*kVArh)   Cumulative hourly reactive import energy (R+) (Q1+Q2) kVArh 
1-0:4.8.0(00000963.522*kVArh)   Cumulative hourly reactive export energy (R-) (Q3+Q4) kVArh 
1-0:1.7.0(0002.227*kW)          Momentary Active power+ (Q1+Q4) kW 
1-0:2.7.0(0000.000*kW)          Momentary Active power- (Q2+Q3) kW 
1-0:3.7.0(0000.000*kVAr)        Momentary Reactive power+ (Q1+Q2) kVAr 
1-0:4.7.0(0000.776*kVAr)        Momentary Reactive power- (Q3+Q4) kVAr
1-0:21.7.0(0001.620*kW)         Momentary Active power+ (L1) kW 
1-0:22.7.0(0000.000*kW)         Momentary Active power- (L1) kW 
1-0:41.7.0(0000.122*kW)         Momentary Active power+ (L2) * kW 
1-0:42.7.0(0000.000*kW)         Momentary Active power- (L2) * kW 
1-0:61.7.0(0000.478*kW)         Momentary Active power+ (L3) * kW 
1-0:62.7.0(0000.000*kW)         Momentary Active power- (L3) * kW 
1-0:23.7.0(0000.000*kVAr)       Momentary Reactive power+ (L1) kVAr 
1-0:24.7.0(0000.340*kVAr)       Momentary Reactive power- (L1) kVAr 
1-0:43.7.0(0000.000*kVAr)       Momentary Reactive power+ (L2) * kVAr 
1-0:44.7.0(0000.086*kVAr)       Momentary Reactive power- (L2) * kVAr 
1-0:63.7.0(0000.000*kVAr)       Momentary Reactive power+ (L3) * kVAr 
1-0:64.7.0(0000.332*kVAr)       Momentary Reactive power- (L3) * kVAr 
1-0:32.7.0(236.3*V)             Momentary RMS Phase voltage L1 V 
1-0:52.7.0(237.0*V)             Momentary RMS Phase voltage L2* V 
1-0:72.7.0(236.5*V)             Momentary RMS Phase voltage L3* V 
1-0:31.7.0(007.0*A)             Momentary RMS Current phase L1 A 
1-0:51.7.0(000.6*A)             Momentary RMS Current phase L2* A 
1-0:71.7.0(002.3*A)             Momentary RMS Current phase L3* A 
!8365                           CRC checksum
```

## License

This project is licensed under the [MIT License](./LICENSE). Feel free to use and modify as needed.
