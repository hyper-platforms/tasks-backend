import { DateTimeResolver } from 'graphql-scalars';
import { schemaComposer } from '../../../schema-composer';

export const DateTime = schemaComposer.createScalarTC(DateTimeResolver);
