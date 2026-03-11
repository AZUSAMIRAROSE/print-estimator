import { Machine, MachineValidationResult, MachineValidationError, MachineValidationWarning } from './machine.types';

export function validateMachine(machine: Machine): MachineValidationResult {
    const errors: MachineValidationError[] = [];
    const warnings: MachineValidationWarning[] = [];

    if (machine.hourlyRate < 0) {
        errors.push({ field: 'hourlyRate', code: 'NEGATIVE_RATE', message: 'Hourly rate cannot be negative', severity: 'CRITICAL' });
    }

    if (machine.ratedSpeed <= 0) {
        errors.push({ field: 'ratedSpeed', code: 'INVALID_SPEED', message: 'Machine rated speed must be positive', severity: 'CRITICAL' });
    }

    if (machine.effectiveSpeed > machine.ratedSpeed) {
        errors.push({ field: 'effectiveSpeed', code: 'SPEED_EXCEEDS_RATED', message: 'Effective speed cannot exceed rated speed', severity: 'ERROR' });
    }

    if (machine.minimumJobCharge < 0) {
        errors.push({ field: 'minimumJobCharge', code: 'NEGATIVE_CHARGE', message: 'Minimum job charge cannot be negative', severity: 'CRITICAL' });
    }

    // Warnings
    if (machine.hourlyRate === 0) {
        warnings.push({ field: 'hourlyRate', code: 'ZERO_RATE', message: 'Hourly rate is zero. Ensure this is intentional.', suggestedValue: 100 });
    }

    return {
        isValid: errors.filter((e) => e.severity === 'CRITICAL').length === 0,
        errors,
        warnings
    };
}
