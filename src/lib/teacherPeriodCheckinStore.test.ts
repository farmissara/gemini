import test from 'node:test';
import assert from 'node:assert/strict';
import {
  findTeacherPeriodCheckin,
  loadTeacherPeriodCheckins,
  recordTeacherPeriodCheck,
} from './teacherPeriodCheckinStore';

function createMemoryStorage() {
  const store = new Map<string, string>();
  return {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, value);
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

function installMockWindow(onDispatch?: () => void) {
  const originalWindow = (globalThis as { window?: unknown }).window;
  const localStorage = createMemoryStorage();
  (globalThis as { window?: unknown }).window = {
    localStorage,
    dispatchEvent: () => {
      onDispatch?.();
      return true;
    },
    CustomEvent: class {
      type: string;
      detail: unknown;
      constructor(type: string, init?: { detail?: unknown }) {
        this.type = type;
        this.detail = init?.detail;
      }
    },
  };
  return () => {
    if (originalWindow === undefined) {
      delete (globalThis as { window?: unknown }).window;
    } else {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  };
}

test('teacherPeriodCheckinStore records teacher check-in and subsequent check-out for a specific period', () => {
  let dispatchCount = 0;
  const restore = installMockWindow(() => {
    dispatchCount += 1;
  });

  try {
    const checkInRec = recordTeacherPeriodCheck({
      schoolId: 'sch-1',
      teacherId: 'tch-1',
      teacherName: 'ครูสมศรี',
      courseId: 'crs-101',
      courseCode: 'TH101',
      periodNumber: 2,
      date: '2026-11-26',
      checkType: 'check_in',
      time: '09:25',
    });

    assert.equal(checkInRec.checkInTime, '09:25');
    assert.equal(checkInRec.checkOutTime, undefined);

    const foundAfterIn = findTeacherPeriodCheckin({
      schoolId: 'sch-1',
      teacherId: 'tch-1',
      courseId: 'crs-101',
      courseCode: 'TH101',
      periodNumber: 2,
      date: '2026-11-26',
    });
    assert.equal(foundAfterIn?.checkInTime, '09:25');

    const checkOutRec = recordTeacherPeriodCheck({
      schoolId: 'sch-1',
      teacherId: 'tch-1',
      teacherName: 'ครูสมศรี',
      courseId: 'crs-101',
      courseCode: 'TH101',
      periodNumber: 2,
      date: '2026-11-26',
      checkType: 'check_out',
      time: '10:15',
    });

    assert.equal(checkOutRec.checkInTime, '09:25');
    assert.equal(checkOutRec.checkOutTime, '10:15');
    assert.equal(loadTeacherPeriodCheckins('sch-1').length, 1);
    assert.equal(dispatchCount, 2);
  } finally {
    restore();
  }
});

test('teacherPeriodCheckinStore matches by courseCode fallback and scopes separately by periodNumber and date', () => {
  const restore = installMockWindow();

  try {
    recordTeacherPeriodCheck({
      schoolId: 'sch-2',
      teacherId: 'tch-9',
      teacherName: 'ครูวิชัย',
      courseId: 'crs-m1',
      courseCode: 'MA201',
      periodNumber: 3,
      date: '2026-11-26',
      checkType: 'check_in',
      time: '10:20',
    });

    const matchByCode = findTeacherPeriodCheckin({
      schoolId: 'sch-2',
      teacherId: 'tch-9',
      courseCode: 'ma201',
      periodNumber: 3,
      date: '2026-11-26',
    });
    assert.equal(matchByCode?.checkInTime, '10:20');

    const otherPeriod = findTeacherPeriodCheckin({
      schoolId: 'sch-2',
      teacherId: 'tch-9',
      courseCode: 'MA201',
      periodNumber: 4,
      date: '2026-11-26',
    });
    assert.equal(otherPeriod, undefined);
  } finally {
    restore();
  }
});
