import { signal } from '@angular/core';
import { Subject } from 'rxjs';
import { vi } from 'vitest';
import type { MockedObject } from 'vitest';

import type { ServerMessage } from '@game/frenzy/types';

import type { FrenzySocketService, SocketStatus } from './frenzy-socket.service';

// A factory rather than a shared const: every spec gets its own Subject and spies, so tests stay independent.
// `messages$` is exposed as the Subject itself so specs can push server messages through it.
export function createFrenzySocketServiceMock() {
  return {
    messages$: new Subject<ServerMessage>(),
    status: signal<SocketStatus>('open'),
    stale: signal(false),
    connect: vi.fn(),
    disconnect: vi.fn(),
    send: vi.fn(),
  } as const satisfies MockedObject<Partial<FrenzySocketService>>;
}
