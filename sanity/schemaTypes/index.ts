import type { SchemaTypeDefinition } from "sanity";

import { dateIdea } from "./dateIdea";
import { game } from "./game";
import { objectTypes } from "./objects";
import { recipe } from "./recipe";

export const schemaTypes: SchemaTypeDefinition[] = [recipe, dateIdea, game, ...objectTypes];
