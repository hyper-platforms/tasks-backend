import { SchemaComposer } from 'graphql-compose';
import { Collection } from 'mongodb';
import { Request, Response } from 'express';
import { UserDocument } from './users';
import { TaskDocument } from './tasks';
import { ProjectDocument } from "./projects";

export interface GraphQLContext {
  req: Request;
  res: Response;
  dataloaders: WeakMap<any, any>;
  usersCollection: Collection<UserDocument>;
  projectsCollection: Collection<ProjectDocument>;
  tasksCollection: Collection<TaskDocument>;
}

export const schemaComposer = new SchemaComposer<GraphQLContext>();
