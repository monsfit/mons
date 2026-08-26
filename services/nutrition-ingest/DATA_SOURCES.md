# Data-source provenance and redistribution gate

The Mons code is Apache-2.0. Input datasets and derived outputs remain subject to each
provider's terms. A generated dataset is not approved for publication until every included
source has a reviewed license/terms record marked `approved` below.

| Source | Provider | Upstream location | Local role | Redistribution review |
|---|---|---|---|---|
| Australian Food Composition Database | Food Standards Australia New Zealand | <https://www.foodstandards.gov.au/science-data/food-nutrient-databases/afcd/data-files> | Raw foods | Pending |
| Canadian Nutrient File | Health Canada | <https://www.canada.ca/en/health-canada/services/food-nutrition/healthy-eating/nutrient-data/canadian-nutrient-file-2015-download-files.html> | Raw foods | Pending |
| CoFID | UK Government | <https://www.gov.uk/government/publications/composition-of-foods-integrated-dataset-cofid> | Raw foods | Pending |
| NEVO | RIVM | <https://www.rivm.nl/en/dutch-food-composition-database> | Raw foods | Pending |
| New Zealand FOODfiles | New Zealand Institute for Public Health and Forensic Science | <https://www.foodcomposition.co.nz/foodfiles/concise-tables/> | Raw foods | Pending |
| USDA FoodData Central | U.S. Department of Agriculture | <https://fdc.nal.usda.gov/> | Raw and branded foods | Pending |
| Open Food Facts | Open Food Facts | <https://world.openfoodfacts.org/data> | Branded foods | Pending |

For each input release, retain its original filename, release date, source URL, downloaded
terms/license, and SHA-256 hash. Successful Mons manifests record the local filename and hash.

Changing `Pending` to `Approved` requires recording the reviewer, review date, applicable
terms/version, intended publication, attribution requirements, and any share-alike or
database-rights obligations.
