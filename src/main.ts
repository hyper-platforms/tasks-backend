import 'dotenv/config';
import express from 'express';
import session, { SessionOptions } from 'express-session';
import MongoStore from 'connect-mongo';
import { ApolloServer } from 'apollo-server-express';
import {
  ApolloServerPluginLandingPageGraphQLPlayground,
  ApolloServerPluginLandingPageDisabled,
} from 'apollo-server-core';
import { express as voyagerMiddleware } from 'graphql-voyager/middleware';
import { GraphQLContext, schemaComposer } from './schema-composer';
import { MongoClient, ObjectId } from 'mongodb';
import { UserDocument } from './users';
import { ProjectDocument } from './projects';
import { TaskDocument } from './tasks';
import { Role } from './auth/role';

declare module 'express-session' {
  interface SessionData {
    user: {
      id: ObjectId;
      roles: Role[];
    };
  }
}

require('./users');
require('./auth');
require('./projects');
require('./tasks');

const isProduction = process.env.NODE_ENV === 'production';

const main = async () => {
  const mongoClient = new MongoClient(process.env.MONGODB_URI!);
  await mongoClient.connect();

  const app = express();
  app.use(express.static('public'));
  app.use('/voyager', voyagerMiddleware({ endpointUrl: '/graphql' }));

  const sessionConfig: SessionOptions = {
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI!,
      collectionName: 'sessions',
    }),
    secret: process.env.SESSIONS_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {},
    name: 'sid',
  };

  if (isProduction) {
    app.set('trust proxy', 1); // trust first proxy
    sessionConfig!.cookie!.secure = true; // serve secure cookies
    sessionConfig!.cookie!.httpOnly = true;
    sessionConfig!.cookie!.sameSite = 'none';
  }

  app.use(session(sessionConfig));

  const apolloServer = new ApolloServer({
    schema: schemaComposer.buildSchema(),
    plugins: [
      isProduction
        ? ApolloServerPluginLandingPageDisabled()
        : ApolloServerPluginLandingPageGraphQLPlayground({
            settings: {
              'request.credentials': 'include',
              'editor.theme': 'light',
            },
          }),
    ],
    context: ({ req, res }): GraphQLContext => {
      const db = mongoClient.db('main');
      const dataloaders = new WeakMap();
      const usersCollection = db.collection<UserDocument>('users');
      const projectsCollection = db.collection<ProjectDocument>('projects');
      const tasksCollection = db.collection<TaskDocument>('tasks');
      return { req, res, dataloaders, usersCollection, projectsCollection, tasksCollection };
    },
  });
  await apolloServer.start();
  apolloServer.applyMiddleware({
    app,
    cors: {
      origin: process.env.CORS_ORIGINS!.split(','),
      credentials: true,
    },
  });
  app.listen({ port: 4000 });
};

main();
