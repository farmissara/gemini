import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import {
  enqueueOfflineAction,
  flushOfflineQueue,
  getOfflineQueue,
  getOfflineQueueForUser,
  saveOfflineQueue,
} from './offlineSync';

const storage = new Map<string, string>();
const originalWindow = globalThis.window;
const originalLocalStorage = globalThis.localStorage;

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
      dispatchEvent: () => true,
    },
  });
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, value),
      removeItem: (key: string) => storage.delete(key),
    },
  });
});

afterEach(() => {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: originalLocalStorage });
});

describe('offline action ownership', () => {
  it('keeps identical actions from different accounts separate', () => {
    const first = enqueueOfflineAction({
      actionType: 'health_visit', userId: 'account-a', schoolId: 'school-a',
      description: 'case', payload: { id: 'visit-1' },
    });
    const second = enqueueOfflineAction({
      actionType: 'health_visit', userId: 'account-b', schoolId: 'school-a',
      description: 'case', payload: { id: 'visit-1' },
    });

    assert.notEqual(first.id, second.id);
    assert.equal(getOfflineQueueForUser('account-a').length, 1);
    assert.equal(getOfflineQueueForUser('account-b').length, 1);
  });

  it('syncs only the active account queue and preserves other users’ items', async () => {
    saveOfflineQueue([
      { id: 'a1', userId: 'account-a', actionType: 'grade', schoolId: 'school-a', description: 'a', payload: {}, createdAt: new Date().toISOString(), retryCount: 0, status: 'pending' },
      { id: 'b1', userId: 'account-b', actionType: 'grade', schoolId: 'school-a', description: 'b', payload: {}, createdAt: new Date().toISOString(), retryCount: 0, status: 'pending' },
    ]);
    const handled: string[] = [];

    await flushOfflineQueue(async (item) => { handled.push(item.userId || ''); return true; }, 'account-a');

    assert.deepEqual(handled, ['account-a']);
    assert.deepEqual(getOfflineQueue().map((item) => item.id), ['b1']);
  });
});
