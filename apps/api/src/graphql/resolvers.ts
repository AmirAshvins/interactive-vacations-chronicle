import { GraphQLScalarType, Kind } from 'graphql';
import type { AppContext } from '../context.js';
import { getUserId } from '../context.js';
import { requireAuth } from '../lib/errors.js';
import * as authService from '../services/auth.js';
import * as travelogueService from '../services/travelogue.js';
import * as tripService from '../services/trip.js';
import * as syncPublish from '../services/syncPublish.js';
import { traveloguePubSub } from '../pubsub/travelogue.js';
import { getMemberRole, requireRole } from '../services/travelogue.js';
import {
  mapTravelogueSummaryToGraphql,
  mapTravelogueToGraphql,
  mapTripToGraphql,
  mapUserToGraphql,
} from './mappers.js';

const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  serialize(value) {
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') return value;
    throw new TypeError('DateTime must be a Date or ISO string');
  },
  parseValue(value) {
    if (typeof value === 'string') return value;
    throw new TypeError('DateTime must be a string');
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) return ast.value;
    return null;
  },
});

export const resolvers = {
  DateTime: DateTimeScalar,

  User: {
    travelogues: async (parent: { id: string }, _args: unknown, ctx: AppContext) => {
      const summaries = await travelogueService.listTravelogueSummariesForUser(ctx.db, parent.id);
      return summaries.map(mapTravelogueSummaryToGraphql);
    },
  },

  Query: {
    me: async (_parent: unknown, _args: unknown, ctx: AppContext) => {
      const userId = getUserId(ctx);
      if (!userId) return null;
      const user = await travelogueService.getUserById(ctx.db, userId);
      if (!user) return null;
      return mapUserToGraphql(user);
    },

    travelogue: async (_parent: unknown, args: { id: string }, ctx: AppContext) => {
      const userId = getUserId(ctx);
      requireAuth(userId);
      const { travelogue, trips } = await travelogueService.getTravelogueById(
        ctx.db,
        args.id,
        userId,
      );
      return mapTravelogueToGraphql(travelogue, trips);
    },
  },

  Mutation: {
    signUp: async (
      _parent: unknown,
      args: { email: string; password: string; displayName?: string | null },
      ctx: AppContext,
    ) => {
      const payload = await authService.signUp(ctx, args.email, args.password, args.displayName);
      return {
        ...payload,
        user: mapUserToGraphql(payload.user),
      };
    },

    signIn: async (
      _parent: unknown,
      args: { email: string; password: string },
      ctx: AppContext,
    ) => {
      const payload = await authService.signIn(ctx, args.email, args.password);
      return {
        ...payload,
        user: mapUserToGraphql(payload.user),
      };
    },

    signOut: async (_parent: unknown, _args: unknown, ctx: AppContext) => {
      return authService.signOut(ctx);
    },

    refreshAccessToken: async (_parent: unknown, _args: unknown, ctx: AppContext) => {
      const payload = await authService.refreshAccessToken(ctx);
      return {
        ...payload,
        user: mapUserToGraphql(payload.user),
      };
    },

    createTravelogue: async (_parent: unknown, args: { name: string }, ctx: AppContext) => {
      const userId = getUserId(ctx);
      requireAuth(userId);
      const summary = await travelogueService.createTravelogue(ctx.db, userId, args.name);
      return mapTravelogueSummaryToGraphql(summary);
    },

    updateTravelogue: async (
      _parent: unknown,
      args: {
        id: string;
        name?: string;
        homeCityKey?: string;
        mapSettings?: { showFlightPaths?: boolean; highlightVisited?: boolean };
      },
      ctx: AppContext,
    ) => {
      const userId = getUserId(ctx);
      requireAuth(userId);
      const updated = await travelogueService.updateTravelogue(ctx.db, args.id, userId, {
        name: args.name,
        homeCityKey: args.homeCityKey,
        mapSettings: args.mapSettings,
      });
      const { trips } = await travelogueService.getTravelogueById(ctx.db, args.id, userId);
      return mapTravelogueToGraphql(updated, trips);
    },

    deleteTravelogue: async (_parent: unknown, args: { id: string }, ctx: AppContext) => {
      const userId = getUserId(ctx);
      requireAuth(userId);
      return travelogueService.deleteTravelogue(ctx.db, args.id, userId);
    },

    createTrip: async (
      _parent: unknown,
      args: {
        travelogueId: string;
        input: tripService.TripInput;
        clientMutationId: string;
      },
      ctx: AppContext,
    ) => {
      void args.clientMutationId;
      const userId = getUserId(ctx);
      requireAuth(userId);
      const trip = await tripService.createTrip(ctx.db, args.travelogueId, userId, args.input);
      const gqlTrip = mapTripToGraphql(trip);
      syncPublish.publishTripCreated(args.travelogueId, trip);
      return gqlTrip;
    },

    updateTrip: async (
      _parent: unknown,
      args: {
        id: string;
        input: tripService.TripInput;
        baseVersion: number;
        clientMutationId: string;
      },
      ctx: AppContext,
    ) => {
      void args.clientMutationId;
      const userId = getUserId(ctx);
      requireAuth(userId);
      const trip = await tripService.updateTrip(
        ctx.db,
        args.id,
        userId,
        args.baseVersion,
        args.input,
      );
      const gqlTrip = mapTripToGraphql(trip);
      syncPublish.publishTripUpdated(trip.travelogueId, trip);
      return gqlTrip;
    },

    deleteTrip: async (
      _parent: unknown,
      args: { id: string; baseVersion: number; clientMutationId: string },
      ctx: AppContext,
    ) => {
      void args.clientMutationId;
      const userId = getUserId(ctx);
      requireAuth(userId);
      const deleted = await tripService.deleteTrip(ctx.db, args.id, userId, args.baseVersion);
      syncPublish.publishTripDeleted(deleted.travelogueId, deleted.tripId, deleted.version);
      return true;
    },
  },

  Subscription: {
    travelogueUpdated: {
      subscribe: async (
        _parent: unknown,
        args: { travelogueId: string },
        ctx: AppContext,
      ) => {
        const userId = getUserId(ctx);
        requireAuth(userId);
        const role = await getMemberRole(ctx.db, args.travelogueId, userId);
        requireRole(role, 'viewer');
        return traveloguePubSub.subscribe('travelogue-updated', args.travelogueId);
      },
      resolve: (payload: import('../pubsub/travelogue.js').TripPatchPayload) => payload,
    },
  },
};
