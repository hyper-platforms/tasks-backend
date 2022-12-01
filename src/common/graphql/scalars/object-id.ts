import { Kind, GraphQLError, ValueNode } from 'graphql';
import { ObjectId } from 'mongodb';
import { schemaComposer } from '../../../schema-composer';

export const ObjectID = schemaComposer.createScalarTC({
  name: 'ObjectID',

  description:
    'A field whose value conforms with the standard mongodb object ID as described here: https://docs.mongodb.com/manual/reference/method/ObjectId/#ObjectId. Example: 5e5677d71bdc2ae76344968c',

  // @ts-expect-error
  serialize(value: ObjectId): string {
    if (!ObjectId.isValid(value)) {
      throw new TypeError(`Value is not a valid mongodb object id of form: ${value}`);
    }

    return value.toHexString();
  },

  // @ts-expect-error
  parseValue(value: string): ObjectId {
    if (!ObjectId.isValid(value)) {
      throw new TypeError(`Value is not a valid mongodb object id of form: ${value}`);
    }

    return new ObjectId(value);
  },

  parseLiteral(ast: ValueNode): ObjectId {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError(
        `Can only validate strings as mongodb object id but got a: ${ast.kind}`
      );
    }

    if (!ObjectId.isValid(ast.value)) {
      throw new TypeError(`Value is not a valid mongodb object id of form: ${ast.value}`);
    }

    return new ObjectId(ast.value);
  },
});
