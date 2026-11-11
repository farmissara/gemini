import { SchoolPeriodTime } from '../types';

export const DEFAULT_SCHOOL_PERIODS: SchoolPeriodTime[] = [
  { periodNumber: 1, startTime: '08:30', endTime: '09:20' },
  { periodNumber: 2, startTime: '09:20', endTime: '10:10' },
  { periodNumber: 3, startTime: '10:20', endTime: '11:10' },
  { periodNumber: 4, startTime: '11:10', endTime: '12:00' },
  { periodNumber: 0, startTime: '12:00', endTime: '13:00', isBreak: true },
  { periodNumber: 5, startTime: '13:00', endTime: '13:50' },
  { periodNumber: 6, startTime: '13:50', endTime: '14:40' },
  { periodNumber: 7, startTime: '14:40', endTime: '15:30' },
];
