import { registerDecorator, ValidationOptions } from 'class-validator';

/**
 * Число кратне `step` (для ставки з кроком 0.5).
 * Порівняння через цілі «тіки», щоб уникнути похибок float: 1.5 / 0.5 = 3.
 */
export function IsStepOf(step: number, validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isStepOf',
      target: object.constructor,
      propertyName,
      constraints: [step],
      options: {
        message: `$property must be a multiple of ${step}`,
        ...validationOptions,
      },
      validator: {
        validate(value: unknown): boolean {
          if (typeof value !== 'number' || !Number.isFinite(value)) return false;
          const ticks = Math.round((value / step) * 1e6) / 1e6;
          return Number.isInteger(ticks);
        },
      },
    });
  };
}
