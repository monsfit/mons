export interface CatalogSource {
  readonly label: string
  readonly verified: boolean
  readonly abbreviation?: string
  readonly fullName?: string
}

const catalogSources: Readonly<Record<string, CatalogSource>> = {
  australian_food_composition: {
    label: 'Australian Food Composition Database',
    abbreviation: 'AFCD',
    verified: true,
  },
  canadian_nutrient_file: { label: 'Canadian Nutrient File', abbreviation: 'CNF', verified: true },
  cofid: { label: 'CoFID', fullName: 'Composition of Foods Integrated Dataset', verified: true },
  fastfoodnutrition_org: { label: 'FastFoodNutrition.org', abbreviation: 'FFN', verified: false },
  integration_test: { label: 'Integration fixture', verified: false },
  mons_sample: { label: 'Mons sample', verified: false },
  nevo2025: {
    label: 'NEVO',
    fullName: 'Nederlands Voedingsstoffenbestand — Dutch Food Composition Database',
    verified: true,
  },
  new_zealand_food_composition: {
    label: 'New Zealand Food Composition Data',
    abbreviation: 'NZFCD',
    verified: true,
  },
  open_food_facts: { label: 'Open Food Facts', abbreviation: 'OFF', verified: false },
  usda_fooddata_central_branded: {
    label: 'USDA Branded Foods',
    abbreviation: 'USDA Branded',
    verified: false,
  },
  usda_fooddata_central_foundation: {
    label: 'USDA Foundation Foods',
    abbreviation: 'USDA Foundation',
    verified: true,
  },
  usda_fooddata_central_sr_legacy: {
    label: 'USDA SR Legacy',
    abbreviation: 'USDA SR',
    verified: true,
  },
  usda_fooddata_central_survey: {
    label: 'USDA Food Surveys',
    abbreviation: 'USDA Surveys',
    verified: true,
  },
}

export function getCatalogSource(source: string): CatalogSource {
  return (
    catalogSources[source] ??
    Object.values(catalogSources).find((item) => item.label === source) ?? {
      label: source.replaceAll('_', ' '),
      verified: false,
    }
  )
}
