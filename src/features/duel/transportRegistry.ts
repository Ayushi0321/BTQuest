import type { DuelTransport } from './transport';

let activeTransport: DuelTransport | null = null;

export function setActiveDuelTransport(transport: DuelTransport): void {
  activeTransport = transport;
}

export function getActiveDuelTransport(): DuelTransport | null {
  return activeTransport;
}
