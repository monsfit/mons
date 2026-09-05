export interface CatalogSource {
  readonly label: string
  readonly verified: boolean
}

const catalogSources: Readonly<Record<string, CatalogSource>> = {
  australian_food_composition: {
    label: 'Australian Food Composition Database',
    verified: true,
  },
  canadian_nutrient_file: { label: 'Canadian Nutrient File', verified: true },
  cofid: { label: 'CoFID', verified: true },
  fastfoodnutrition_org: { label: 'FastFoodNutrition.org', verified: false },
  integration_test: { label: 'Integration fixture', verified: false },
  mons_sample: { label: 'Mons sample', verified: false },
  nevo2025: { label: 'NEVO', verified: true },
  new_zealand_food_composition: { label: 'New Zealand Food Composition Data', verified: true },
  open_food_facts: { label: 'Open Food Facts', verified: false },
  usda_fooddata_central_branded: { label: 'USDA Branded Foods', verified: false },
  usda_fooddata_central_foundation: { label: 'USDA Foundation Foods', verified: true },
  usda_fooddata_central_sr_legacy: { label: 'USDA SR Legacy', verified: true },
  usda_fooddata_central_survey: { label: 'USDA Food Surveys', verified: true },
}

export function getCatalogSource(source: string): CatalogSource {
  return (
    catalogSources[source] ?? {
      label: source.replaceAll('_', ' '),
      verified: false,
    }
  )
}
