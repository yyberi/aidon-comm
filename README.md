# AidonComm

TypeScript library for reading Aidon 7534 smart meter data from the HAN (Home Area Network) interface over a serial connection. The library handles serial input buffering, CRC-16 validation and frame parsing, then emits structured readings through Node.js events.

For protocol details, see the official manual:
[AIDON HAN Interface (PDF)](https://aidon.com/wp-content/uploads/2023/06/AIDONFD_RJ12_HAN_Interface_FI.pdf)

## Features

* Connects to an Aidon meter via serial port
* Supports Aidon 7534 frames with `/ADN9 7534` header
* Optional simulation mode for development through `SIMULATE=true`
* Validates received frames with CRC-16
* Reinitializes the serial port when the watchdog detects missing data
* Emits `data` events with parsed meter readings
* Emits `error` events for serial, timeout, CRC and parse failures

## Installation

```bash
npm install @yyberi/aidon-comm
```

## Usage

```ts
import { AidonComm, type Aidon7534Data } from '@yyberi/aidon-comm';

const comm = new AidonComm();

comm.on('data', (reading: Aidon7534Data) => {
  console.log('Meter reading:', reading);
});

comm.on('error', (err: Error) => {
  console.error('Communication error:', err.message);
});

// Close the serial port when your application shuts down.
comm.close();
```

## Configuration

The library reads configuration from environment variables.

| Variable                 | Description                                            | Default        |
| ------------------------ | ------------------------------------------------------ | -------------- |
| `NODE_ENV`               | Runtime environment name used in logging               | `development`  |
| `SIMULATE`               | Enable simulation mode when set to `true`              | `false`        |
| `SERIAL_DEVICE`          | Serial port device path                                | `/dev/serial0` |
| `SERIAL_BAUD_RATE`       | Serial port communication speed                        | `115200`       |
| `SIMULATION_INTERVAL_MS` | Interval between simulated frames in milliseconds      | `10000`        |
| `WATCHDOG_TIMEOUT_MS`    | Timeout for missing data recovery in milliseconds      | `11000`        |

## Emitted Data

The `data` event emits an `Aidon7534Data` object:

```ts
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
```

## Example Data Frame

Raw Aidon 7534 frames follow this structure:

```text
/ADN9 7534

0-0:1.0.0(221219170900W)        Meter date and time
1-0:1.8.0(00005996.149*kWh)     Cumulative active import energy
1-0:2.8.0(00003209.076*kWh)     Cumulative active export energy
1-0:3.8.0(00000028.442*kVArh)   Cumulative reactive import energy
1-0:4.8.0(00000963.522*kVArh)   Cumulative reactive export energy
1-0:1.7.0(0002.227*kW)          Active import power
1-0:2.7.0(0000.000*kW)          Active export power
1-0:3.7.0(0000.000*kVAr)        Reactive import power
1-0:4.7.0(0000.776*kVAr)        Reactive export power
1-0:21.7.0(0001.620*kW)         L1 active import power
1-0:22.7.0(0000.000*kW)         L1 active export power
1-0:41.7.0(0000.122*kW)         L2 active import power
1-0:42.7.0(0000.000*kW)         L2 active export power
1-0:61.7.0(0000.478*kW)         L3 active import power
1-0:62.7.0(0000.000*kW)         L3 active export power
1-0:23.7.0(0000.000*kVAr)       L1 reactive import power
1-0:24.7.0(0000.340*kVAr)       L1 reactive export power
1-0:43.7.0(0000.000*kVAr)       L2 reactive import power
1-0:44.7.0(0000.086*kVAr)       L2 reactive export power
1-0:63.7.0(0000.000*kVAr)       L3 reactive import power
1-0:64.7.0(0000.332*kVAr)       L3 reactive export power
1-0:32.7.0(236.3*V)             L1 RMS voltage
1-0:52.7.0(237.0*V)             L2 RMS voltage
1-0:72.7.0(236.5*V)             L3 RMS voltage
1-0:31.7.0(007.0*A)             L1 RMS current
1-0:51.7.0(000.6*A)             L2 RMS current
1-0:71.7.0(002.3*A)             L3 RMS current
!8365                           CRC checksum
```

## Development

```bash
npm run build
```

## License

This project is licensed under the [MIT License](./LICENSE).
