import { test, describe, expect} from 'vitest';
import { isSameDay } from './isSameDay';

describe('isSameDay', () => {
    test('returns true when they are same day different times', () => {
        const a = '2020-01-01T00:00:00.000Z';
        const b = '2020-01-01T02:02:00.000Z';

        expect(isSameDay(a, b)).toBeTruthy();
    })

    test('returns false when the are not the same day', () => {
        const a = '2020-01-01T00:00:00.000Z';
        const b = '2020-01-14T02:02:00.000Z';

        expect(isSameDay(a, b)).toBeFalsy();
    })
})