export const typeDefs = /* GraphQL */ `
  scalar DateTime

  enum Material {
    brass
    copper
  }

  enum MemberRole {
    owner
    editor
    viewer
  }

  type User {
    id: ID!
    email: String!
    displayName: String
    travelogues: [TravelogueSummary!]!
  }

  type TravelogueSummary {
    id: ID!
    name: String!
    role: MemberRole!
    tripCount: Int!
    updatedAt: DateTime!
    version: Int!
  }

  type Travelogue {
    id: ID!
    name: String!
    homeCityKey: String!
    mapSettings: MapSettings!
    version: Int!
    trips: [Trip!]!
    updatedAt: DateTime!
  }

  type MapSettings {
    showFlightPaths: Boolean!
    highlightVisited: Boolean!
  }

  type Trip {
    id: ID!
    countryCode: String!
    cityKey: String
    name: String!
    lat: Float!
    lng: Float!
    description: String!
    material: Material!
    startYear: Int
    startMonth: Int
    endYear: Int
    endMonth: Int
    version: Int!
    imageUrls: [String!]!
    updatedAt: DateTime!
  }

  type AuthPayload {
    user: User!
    accessToken: String!
    expiresIn: Int!
  }

  enum PatchOp {
    CREATED
    UPDATED
    DELETED
  }

  type TripPatch {
    op: PatchOp!
    tripId: ID!
    version: Int!
    trip: Trip
  }

  type Query {
    me: User
    travelogue(id: ID!): Travelogue
  }

  type Mutation {
    signUp(email: String!, password: String!, displayName: String): AuthPayload!
    signIn(email: String!, password: String!): AuthPayload!
    signOut: Boolean!
    refreshAccessToken: AuthPayload!

    createTravelogue(name: String!): TravelogueSummary!
    updateTravelogue(
      id: ID!
      name: String
      homeCityKey: String
      mapSettings: MapSettingsInput
    ): Travelogue!
    deleteTravelogue(id: ID!): Boolean!

    createTrip(travelogueId: ID!, input: TripInput!, clientMutationId: String!): Trip!
    updateTrip(id: ID!, input: TripInput!, baseVersion: Int!, clientMutationId: String!): Trip!
    deleteTrip(id: ID!, baseVersion: Int!, clientMutationId: String!): Boolean!
  }

  type Subscription {
    travelogueUpdated(travelogueId: ID!): TripPatch!
  }

  input MapSettingsInput {
    showFlightPaths: Boolean
    highlightVisited: Boolean
  }

  input TripInput {
    countryCode: String!
    cityKey: String
    name: String!
    lat: Float!
    lng: Float!
    description: String
    material: Material
    startYear: Int
    startMonth: Int
    endYear: Int
    endMonth: Int
  }
`;
