import { DateResolver } from "graphql-scalars";
import { schemaComposer } from "../../../schema-composer";

export const DateScalar = schemaComposer.createScalarTC(DateResolver);
