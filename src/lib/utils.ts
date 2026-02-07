import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
    }).format(amount);
}

export function formatRUT(rut: string): string {
    if (!rut) return '';
    let clean = rut.replace(/[^0-9kK]/g, '');
    if (clean.length < 2) return clean;

    let body = clean.slice(0, -1);
    const dv = clean.slice(-1).toUpperCase();

    // Pad with leading zero if body is less than 8 digits as requested
    if (body.length < 8) {
        body = body.padStart(8, '0');
    }

    let formatted = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return `${formatted}-${dv}`;
}

export function formatPhone(phone: string): string {
    if (!phone) return '';
    const digits = phone.replace(/\D/g, '');

    // Assume it's a Chilean number if it has 9 or 11 digits
    // 9 digits: 9 9918 8701
    // 11 digits: 56 9 9918 8701
    let cleanDigits = digits;
    if (digits.length === 9) {
        cleanDigits = '56' + digits;
    }

    if (cleanDigits.length === 11) {
        const country = cleanDigits.slice(0, 3); // 569
        const part1 = cleanDigits.slice(3, 7);   // 9918
        const part2 = cleanDigits.slice(7);      // 8701
        return `+${country} ${part1} ${part2}`;
    }

    return phone; // Return as is if format unrecognized
}

export function formatName(name: string): string {
    if (!name) return '';
    return name
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}
