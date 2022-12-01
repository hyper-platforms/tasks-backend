import { ObjectId, Sort } from 'mongodb';
import { startOfDay, endOfDay } from 'date-fns';
import { schemaComposer } from '../schema-composer';
import { ObjectID } from '../common/graphql/scalars/object-id';
import { User, UserId } from '../users';
import { isAuthenticated } from '../auth/rules';
import { DateTime } from '../common/graphql/scalars/date-time';
import { DateScalar } from '../common/graphql/scalars/date';
import { Project, ProjectId } from '../projects';
import DataLoader from 'dataloader';

export interface TaskDocument {}

export const TaskId = schemaComposer.createScalarTC(`TaskID`).merge(ObjectID);

export const Task = schemaComposer.createObjectTC({
  name: 'Task',
  fields: {
    id: {
      type: TaskId.NonNull,
      description: 'Task ID',
      resolve: s => s._id,
    },
    title: {
      type: 'String!',
    },
    isCompleted: {
      type: 'Boolean!',
    },
    isRemoved: {
      type: 'Boolean!',
    },
    dueDate: {
      type: DateTime,
    },
    project: {
      type: Project.NonNull,
      resolve: (source, args, { dataloaders, projectsCollection }, info) => {
        let dl = dataloaders.get(info.fieldNodes);
        if (!dl) {
          dl = new DataLoader(async ids => {
            const projects = await projectsCollection.find({ _id: { $in: ids } }).toArray();
            return ids.map(id => projects.find(x => x._id.equals(id as ObjectId)));
          });
          dataloaders.set(info.fieldNodes, dl);
        }

        return dl.load(source.projectId);
      },
    },
    projectId: {
      type: ProjectId.NonNull,
    },
    owner: {
      type: User.NonNull,
      resolve: (source, args, { dataloaders, usersCollection }, info) => {
        let dl = dataloaders.get(info.fieldNodes);
        if (!dl) {
          dl = new DataLoader(async ids => {
            const users = await usersCollection.find({ _id: { $in: ids as ObjectId[] } }).toArray();
            return ids.map(id => users.find(x => x._id.equals(id as ObjectId)));
          });
          dataloaders.set(info.fieldNodes, dl);
        }

        return dl.load(source.ownerId);
      },
    },
    ownerId: {
      type: UserId.NonNull,
    },
  },
});

export const TaskAddPayload = schemaComposer.createObjectTC({
  name: 'TaskAddPayload',
  fields: {
    record: {
      type: Task,
    },
    recordId: {
      type: TaskId,
    },
    query: {
      type: 'Query',
    },
  },
});

export const TaskAddInput = schemaComposer.createInputTC({
  name: 'TaskAddInput',
  fields: {
    title: {
      type: 'String!',
    },
    projectId: {
      type: ProjectId.NonNull,
    },
    isCompleted: {
      type: 'Boolean',
      defaultValue: false,
    },
    isRemoved: {
      type: 'Boolean',
      defaultValue: false,
    },
    dueDate: {
      type: DateTime,
    },
  },
});

export const TaskEditPayload = schemaComposer.createObjectTC({
  name: 'TaskEditPayload',
  fields: {
    record: {
      type: Task,
    },
    recordId: {
      type: TaskId,
    },
    recordCollection: {
      type: Task.List,
    },
    recordIdCollection: {
      type: TaskId.List,
    },
    query: {
      type: 'Query',
    },
  },
});

export const TaskEditInput = schemaComposer.createInputTC({
  name: 'TaskEditInput',
  fields: {
    id: {
      type: TaskId.NonNull,
    },
    title: {
      type: 'String',
    },
    isCompleted: {
      type: 'Boolean',
    },
    isRemoved: {
      type: 'Boolean',
    },
    dueDate: {
      type: DateTime,
    },
    projectId: {
      type: ProjectId,
    },
  },
});

export const TaskRemovePayload = schemaComposer.createObjectTC({
  name: 'TaskRemovePayload',
  fields: {
    record: {
      type: Task,
    },
    recordId: {
      type: TaskId,
    },
    query: {
      type: 'Query',
    },
  },
});

export const TaskRemoveInput = schemaComposer.createInputTC({
  name: 'TaskRemoveInput',
  fields: {
    id: {
      type: TaskId.NonNull,
    },
  },
});

export const TaskDeletePayload = schemaComposer.createObjectTC({
  name: 'TaskDeletePayload',
  fields: {
    record: {
      type: Task,
    },
    recordId: {
      type: TaskId,
    },
    query: {
      type: 'Query',
    },
  },
});

export const TaskDeleteInput = schemaComposer.createInputTC({
  name: 'TaskDeleteInput',
  fields: {
    id: {
      type: TaskId.NonNull,
    },
  },
});

export const TaskFilter = schemaComposer.createInputTC({
  name: 'TaskFilter',
  fields: {
    isCompleted: {
      type: 'Boolean',
    },
    isRemoved: {
      type: 'Boolean',
    },
    dueDate: {
      type: DateScalar,
    },
    project: {
      type: ProjectId,
    },
  },
});

export const TaskSort = schemaComposer.createEnumTC({
  name: 'TaskSort',
  values: {
    DUE_DATE_ASC: {
      value: 'DUE_DATE_ASC',
    },
    DUE_DATE_DESC: {
      value: 'DUE_DATE_DESC',
    },
  },
});

schemaComposer.Query.addFields({
  task: {
    type: Task,
    args: {
      id: {
        type: TaskId.NonNull,
        description: 'Task ID',
      },
    },
    resolve: async (s, { id }, { req, tasksCollection }) => {
      isAuthenticated(req);
      return tasksCollection.findOne({ _id: id, ownerId: new ObjectId(req.session.user!.id) });
    },
  },
  taskCollection: {
    type: Task.List,
    args: {
      filter: {
        type: TaskFilter,
      },
      sort: {
        type: TaskSort,
      },
    },
    resolve: async (s, { filter, sort }, { req, tasksCollection }) => {
      isAuthenticated(req);

      const filterQuery: { [key: string]: any } = {
        ownerId: new ObjectId(req.session.user!.id),
      };

      if (filter?.isCompleted !== undefined) {
        filterQuery.isCompleted = filter.isCompleted;
      }

      if (filter?.isRemoved !== undefined) {
        filterQuery.isRemoved = filter.isRemoved;
      }

      if (filter?.dueDate) {
        filterQuery.dueDate = {
          $gte: startOfDay(filter.dueDate),
          $lt: endOfDay(filter.dueDate),
        };
      }

      if (filter?.project) {
        filterQuery.projectId = filter.project;
      }

      // console.log(filter);
      // console.log(filterQuery);

      const sortQuery: Sort = {};

      if (filter.sort !== undefined) {
        if (filter.sort === 'DUE_DATE_ASC') {
          sortQuery.dueDate = 1;
        }

        if (filter.sort === 'DUE_DATE_DESC') {
          sortQuery.dueDate = -1;
        }
      }

      return tasksCollection.find(filterQuery).sort(sortQuery).toArray();
    },
  },
});

schemaComposer.Mutation.addNestedFields({
  'task.add': {
    type: TaskAddPayload,
    args: {
      input: TaskAddInput.NonNull,
    },
    resolve: async (s, { input }, { req, tasksCollection }) => {
      isAuthenticated(req);

      const taskInsertRes = await tasksCollection.insertOne({
        ...input,
        createdAt: new Date(),
        updatedAt: new Date(),
        ownerId: new ObjectId(req.session.user!.id),
      });

      const createdTask = await tasksCollection.findOne({ _id: taskInsertRes.insertedId });

      return {
        record: createdTask,
        recordId: createdTask!._id,
        query: {},
      };
    },
  },
  'task.edit': {
    type: TaskEditPayload,
    args: {
      input: {
        type: TaskEditInput.NonNull.List.NonNull,
      },
    },
    resolve: async (s, { input }, { req, tasksCollection }) => {
      isAuthenticated(req);

      const { id, ...doc } = input;

      if (Array.isArray(input)) {
        await tasksCollection.bulkWrite(
          input.map(value => {
            return {
              updateOne: {
                filter: {
                  _id: value.id,
                  ownerId: new ObjectId(req.session.user!.id),
                },
                update: {
                  $set: value,
                },
              },
            };
          })
        );

        const recordIdCollection = input.map(v => v.id);
        const recordCollection = await tasksCollection
          .find({ _id: { $in: recordIdCollection } })
          .toArray();

        return { recordCollection, recordIdCollection, query: {} };
      }

      const taskUpdateResponse = await tasksCollection.updateOne(
        { _id: id, ownerId: new ObjectId(req.session.user!.id) },
        { $set: { ...doc } }
      );

      const updatedTask = await tasksCollection.findOne({
        _id: id,
        ownerId: new ObjectId(req.session.user!.id),
      });

      return {
        record: updatedTask,
        recordId: updatedTask!._id,
        query: {},
      };
    },
  },
  'task.remove': {
    type: TaskRemovePayload,
    args: {
      input: {
        type: TaskRemoveInput.NonNull,
      },
    },
    resolve: async (s, { input }, { req, tasksCollection }) => {
      isAuthenticated(req);

      const { id, ...doc } = input;

      const taskUpdateResponse = await tasksCollection.updateOne(
        { _id: id, ownerId: new ObjectId(req.session.user!.id) },
        { $set: { isRemoved: true } }
      );

      const updatedTask = await tasksCollection.findOne({
        _id: id,
        ownerId: new ObjectId(req.session.user!.id),
      });

      return {
        record: updatedTask,
        recordId: updatedTask!._id,
        query: {},
      };
    },
  },
  'task.delete': {
    type: TaskDeletePayload,
    args: {
      input: {
        type: TaskDeleteInput.NonNull,
      },
    },
    resolve: async (s, { input }, { req, tasksCollection }) => {
      isAuthenticated(req);

      const task = await tasksCollection.findOne({
        _id: input.id,
        ownerId: new ObjectId(req.session.user!.id),
      });

      await tasksCollection.deleteOne({
        _id: input.id,
        ownerId: new ObjectId(req.session.user!.id),
      });

      return {
        record: task,
        recordId: task!._id,
        query: {},
      };
    },
  },
});
