import Dexie, { type Table } from 'dexie';
import { normalizeHabitIcon } from '../lib/icons';
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
    this.version(2).upgrade((tx) =>
      tx
        .table<Habit, string>('habits')
        .toCollection()
        .modify((h) => {
          h.icon = normalizeHabitIcon(h.icon);
        }),
    );
    // An earlier release could save a check-in for a habit deleted in another
    // tab. Such rows are unreachable and would make every backup unimportable.
    this.version(3).upgrade(async (tx) => {
      const ids = new Set(await tx.table<Habit, string>('habits').toCollection().primaryKeys());
      await tx
        .table<CheckIn>('checkIns')
        .filter((c) => !ids.has(c.habitId))
        .delete();
    });
  }
}

export const db = new HabitsDB();
