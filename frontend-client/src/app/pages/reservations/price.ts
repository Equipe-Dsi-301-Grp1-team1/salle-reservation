export function totalPrice(pricePerHour: number, hours: number): number {
    return Math.round(pricePerHour * hours * 100) / 100;
}

export function formatEuros(value: number): string {
    return value.toFixed(2).replace('.', ',') + ' €';
}
