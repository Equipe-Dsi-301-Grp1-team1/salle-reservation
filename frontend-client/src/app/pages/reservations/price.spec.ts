import { describe, it, expect } from 'vitest';
import { totalPrice, formatEuros } from './price';

describe('totalPrice', () => {
    it('calcule 30 € × 10 h = 300 €', () => {
        expect(totalPrice(30, 10)).toBe(300);
    });

    it('garde deux décimales', () => {
        expect(totalPrice(12.5, 3)).toBe(37.5);
    });

    it('accepte une heure seulement', () => {
        expect(totalPrice(45, 1)).toBe(45);
    });

    it('formate le total en euros', () => {
        expect(formatEuros(300)).toBe('300,00 €');
    });
});
