import argon2 from 'argon2';
import validator from 'validator';
import { GraphQLError, Kind, ValueNode } from 'graphql';
import { schemaComposer } from '../schema-composer';
import { ObjectID } from '../common/graphql/scalars/object-id';
import { Role } from '../auth/role';
import { isAdmin } from '../auth/rules';

export interface UserDocument {
  username: string;
  password: string;
  roles: Role[];
}

export const UserId = schemaComposer.createScalarTC(`UserID`).merge(ObjectID);

export const UserPassword = schemaComposer.createScalarTC({
  name: 'UserPassword',
  serialize: v => v,
  parseValue: v => {
    const isStrongPassword = validator.isStrongPassword(v as string);
    if (!isStrongPassword) {
      throw new GraphQLError(`Password too weak`);
    }

    return v;
  },
  parseLiteral(ast: ValueNode): string {
    if (ast.kind !== Kind.STRING) {
      throw new GraphQLError(`Can only validate strings as password but got a: ${ast.kind}`);
    }

    const isStrongPassword = validator.isStrongPassword(ast.value as string);
    if (!isStrongPassword) {
      throw new GraphQLError(`Password too weak.`);
    }

    return ast.value;
  },
});

export const User = schemaComposer.createObjectTC({
  name: 'User',
  fields: {
    id: {
      type: UserId.NonNull,
      description: 'User ID',
      resolve: s => s._id,
    },
  },
});

export const UserSignUpPayload = schemaComposer.createObjectTC({
  name: 'UserSignUpPayload',
  fields: {
    record: {
      type: User,
    },
    recordId: {
      type: UserId,
    },
    query: {
      type: 'Query',
    },
  },
});

export const UserSignUpInput = schemaComposer.createInputTC({
  name: 'UserSignUpInput',
  fields: {
    username: {
      type: 'String!',
      description: 'User username',
    },
    password: {
      type: UserPassword.NonNull,
      description: 'User password',
    },
  },
});

schemaComposer.Query.addFields({
  user: {
    type: User,
    args: {
      id: {
        type: UserId.NonNull,
      },
    },
    resolve: async (s, { input }, { req, usersCollection }) => {
      if (req.session.user!.id !== input.id) {
        throw new GraphQLError('You have no rights for this action');
      }

      return usersCollection.findOne({ _id: input.id });
    },
  },
  userCollection: {
    type: User.List,
    resolve: async (s, i, { req, usersCollection }) => {
      if (!isAdmin(req)) {
        throw new GraphQLError('You have no rights for this action');
      }

      return usersCollection.find().toArray();
    },
  },
});

schemaComposer.Mutation.addNestedFields({
  'user.signUp': {
    type: UserSignUpPayload.NonNull,
    args: {
      input: {
        type: UserSignUpInput.NonNull,
      },
    },
    resolve: async (s, { input }, { usersCollection }) => {
      const { password, ...doc } = input;

      const isUsernameTaken = await usersCollection.findOne({ username: doc.username });

      if (isUsernameTaken) {
        throw new GraphQLError(`Username already taken`);
      }

      const hashedPassword = await argon2.hash(password);
      const insertRes = await usersCollection.insertOne({
        ...doc,
        password: hashedPassword,
      });

      const createdUser = await usersCollection.findOne({ _id: insertRes.insertedId });

      return {
        record: createdUser,
        recordId: createdUser!._id,
        query: {},
      };
    },
  },
});
