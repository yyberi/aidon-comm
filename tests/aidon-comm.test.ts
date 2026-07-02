import { readFileSync } from 'node:fs';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Aidon7534Data } from '../src/aidon-comm.js';

vi.mock('serialport', () => {
  class MockSerialPort {
    constructor(public readonly options: unknown) {}

    open(callback: (error: Error | null) => void): void {
      callback(null);
    }

    close(callback?: () => void): void {
      callback?.();
    }

    on(_event: string, _listener: (...args: unknown[]) => void): this {
      return this;
    }
  }

  return { SerialPort: MockSerialPort };
});

type AidonCommModule = typeof import('../src/aidon-comm.js');

let AidonComm: AidonCommModule['AidonComm'];
let previousSimulate: string | undefined;

const loadSimulationFrame = (): Buffer => {
  const source = readFileSync(new URL('./simuframe.txt', import.meta.url), 'utf8');
  const hex = Array.from(source.matchAll(/"([0-9a-fA-F]+)"/g), match => match[1]).join('');

  return Buffer.from(hex, 'hex');
};

describe('AidonComm', () => {
  beforeAll(async () => {
    previousSimulate = process.env.SIMULATE;
    process.env.SIMULATE = 'false';
    ({ AidonComm } = await import('../src/aidon-comm.js'));
  });

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.clearAllTimers();
    vi.useRealTimers();
  });

  afterAll(() => {
    if (previousSimulate === undefined) {
      delete process.env.SIMULATE;
    } else {
      process.env.SIMULATE = previousSimulate;
    }
  });

  it('parses a valid Aidon 7534 frame and emits structured meter data', async () => {
    const comm = new AidonComm();
    const frame = loadSimulationFrame();

    const data = new Promise<Aidon7534Data>((resolve, reject) => {
      comm.once('data', resolve);
      comm.once('error', reject);
    });

    (comm as unknown as { fillBuffer(chunk: Buffer): void }).fillBuffer(frame);

    await expect(data).resolves.toEqual({
      meterDateTime: '221229172240W',
      cumulativeActiveEnergyIn: 6405.403,
      cumulativeActiveEnergyOut: 3209.076,
      cumulativeReactiveEnergyIn: 30.274,
      cumulativeReactiveEnergyOut: 1005.451,
      activePowerIn: 2.655,
      activePowerOut: 0,
      reactivePowerIn: 0,
      reactivePowerOut: 0.696,
      l1activePowerIn: 0.202,
      l1activePowerOut: 0,
      l2activePowerIn: 0.661,
      l2activePowerOut: 0,
      l3activePowerIn: 1.802,
      l3activePowerOut: 0,
      l1reactivePowerIn: 0.068,
      l1reactivePowerOut: 0,
      l2reactivePowerIn: 0,
      l2reactivePowerOut: 0.253,
      l3reactivePowerIn: 0,
      l3reactivePowerOut: 0.492,
      l1RmsVoltage: 233.7,
      l2RmsVoltage: 233.1,
      l3RmsVoltage: 233.1,
      l1RmsCurrent: 0.9,
      l2RmsCurrent: 3,
      l3RmsCurrent: 7.9
    });

    comm.close();
  });
});
