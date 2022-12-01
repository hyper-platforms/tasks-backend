import argon2 from 'argon2';
import { GraphQLError } from 'graphql';
import { schemaComposer } from '../schema-composer';
import { UserPassword } from '../users';

export const AuthLoginPayload = schemaComposer.createObjectTC({
  name: 'AuthLoginPayload',
  fields: {
    query: 'Query',
  },
});

export const AuthLogoutPayload = schemaComposer.createObjectTC({
  name: 'AuthLogoutPayload',
  fields: {
    query: 'Query',
  },
});

export const AuthLoginInput = schemaComposer.createInputTC({
  name: 'AuthLoginInput',
  fields: {
    username: {
      type: 'String!',
    },
    password: {
      type: UserPassword.NonNull,
    },
  },
});

schemaComposer.Mutation.addNestedFields({
  'auth.login': {
    type: AuthLoginPayload,
    args: {
      input: {
        type: AuthLoginInput.NonNull,
      },
    },
    resolve: async (s, { input }, { req, usersCollection }) => {
      const user = await usersCollection.findOne({ username: input.username });

      if (!user) {
        throw new GraphQLError(`User with username ${input.username} not found`);
      }

      const isPasswordValid = argon2.verify(user.password, input.password);

      if (!isPasswordValid) {
        throw new GraphQLError(`Wrong username or password`);
      }

      req.session.user = {
        id: user!._id,
        roles: user.roles,
      };

      return {
        query: {},
      };
    },
  },
  'auth.logout': {
    type: AuthLogoutPayload,
    resolve: (s, i, { req }) => {
      req.session.destroy(() => {});

      return {
        query: {},
      };
    },
  },
});
