import Dexie, { type Table } from 'dexie';
import type { CheckIn, Habit } from '../lib/types';

export interface MetaRow {
  key: string;
  value: unknown;
}

export class HabitsDB extends Dexie {
  habits!: Table<Habit, string>;
  checkIns!: Table<CheckIn, [string, string]>;
  meta!: Table<MetaRow, string>;

  constructor(name = 'habits-lol') {
    super(name);
    this.version(1).stores({
      habits: 'id, order',
      checkIns: '[habitId+day], habitId, day',
      meta: 'key',
    });
  }
}

export const db = new HabitsDB();
