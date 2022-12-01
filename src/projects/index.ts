import { ObjectId } from 'mongodb';
import { schemaComposer } from '../schema-composer';
import { ObjectID } from '../common/graphql/scalars/object-id';
import { isAuthenticated } from '../auth/rules';
import { User, UserId } from '../users';

export interface ProjectDocument {}

export const ProjectId = schemaComposer.createScalarTC(`ProjectID`).merge(ObjectID);

export const Project = schemaComposer.createObjectTC({
  name: 'Project',
  fields: {
    id: {
      description: 'Project ID',
      type: ProjectId,
      resolve: s => s._id,
    },
    name: {
      description: 'Project name',
      type: 'String!',
    },
    owner: {
      type: User.NonNull,
    },
    ownerId: {
      type: UserId.NonNull,
    },
  },
});

export const ProjectAddInput = schemaComposer.createInputTC({
  name: 'ProjectAddInput',
  fields: {
    name: {
      description: 'Project name',
      type: 'String!',
    },
  },
});

export const ProjectAddPayload = schemaComposer.createObjectTC({
  name: 'ProjectAddPayload',
  fields: {
    record: {
      type: Project,
    },
    recordId: {
      type: ProjectId,
    },
    query: {
      type: 'Query',
    },
  },
});

schemaComposer.Query.addFields({
  project: {
    type: Project.NonNull,
    args: {
      id: {
        description: 'Project ID',
        type: ProjectId.NonNull,
      },
    },
    resolve: async (s, { id }, { req, projectsCollection }) => {
      isAuthenticated(req);
      return projectsCollection.findOne({ _id: id, ownerId: new ObjectId(req.session.user!.id) });
    },
  },
  projectCollection: {
    type: Project.List,
    resolve: async (s, a, { req, projectsCollection }) => {
      isAuthenticated(req);
      return projectsCollection.find({ ownerId: new ObjectId(req.session.user!.id) }).toArray();
    },
  },
});

schemaComposer.Mutation.addNestedFields({
  'project.add': {
    type: ProjectAddPayload,
    args: {
      input: ProjectAddInput.NonNull,
    },
    resolve: async (s, { input }, { req, projectsCollection }) => {
      isAuthenticated(req);

      const projectInsertRes = await projectsCollection.insertOne({
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: new ObjectId(req.session.user!.id),
      });

      const createdProject = await projectsCollection.findOne({ _id: projectInsertRes.insertedId });

      return {
        record: createdProject,
        recordId: createdProject!._id,
        query: {},
      };
    },
  },
});
