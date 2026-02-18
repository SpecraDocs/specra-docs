declare global {
	namespace App {
		interface Locals {
			geo?: { country: string | null; detectedCurrency: 'usd' | 'kes' };
		}
	}
}

export {};
