import { describe, expect, test } from 'vitest'

import { calculateNutritionPlan } from './nutrition.ts'

describe('calculateNutritionPlan', () => {
  test('calculates a deterministic expenditure and loss target', () => {
    const plan = calculateNutritionPlan(
      {
        birthDate: '1998-02-18',
        currentWeightKg: 56.7,
        dailyActivity: 'mostly_sedentary',
        exerciseFrequency: 'none',
        heightCm: 160,
        metabolicSex: 'female',
        targetWeightKg: 52,
        weeklyWeightChangePercent: 0.5,
        weightGoal: 'lose',
      },
      new Date('2026-08-04T12:00:00Z'),
    )

    expect(plan).toMatchObject({
      calorieTargetKcal: 1_460,
      estimatedExpenditureKcal: 1_772,
      estimatedWeeks: 16.6,
      rateLimited: false,
      restingEnergyKcal: 1_266,
    })
  })

  test('clamps dangerously low targets to the NIH minimum', () => {
    const plan = calculateNutritionPlan(
      {
        birthDate: '1998-02-18',
        currentWeightKg: 45,
        dailyActivity: 'mostly_sedentary',
        exerciseFrequency: 'none',
        heightCm: 150,
        metabolicSex: 'female',
        targetWeightKg: 35,
        weeklyWeightChangePercent: 1.25,
        weightGoal: 'lose',
      },
      new Date('2026-08-04T12:00:00Z'),
    )

    expect(plan.calorieTargetKcal).toBe(1_000)
    expect(plan.rateLimited).toBe(true)
  })

  test('rejects goals in the wrong direction', () => {
    expect(() =>
      calculateNutritionPlan(
        {
          birthDate: '1998-02-18',
          currentWeightKg: 56.7,
          dailyActivity: 'mostly_sedentary',
          exerciseFrequency: 'none',
          heightCm: 160,
          metabolicSex: 'female',
          targetWeightKg: 60,
          weeklyWeightChangePercent: 0.5,
          weightGoal: 'lose',
        },
        new Date('2026-08-04T12:00:00Z'),
      ),
    ).toThrow(/loss goal/)
  })
})
