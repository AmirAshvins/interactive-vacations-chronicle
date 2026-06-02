export const SIGN_UP = /* GraphQL */ `
  mutation SignUp($email: String!, $password: String!, $displayName: String) {
    signUp(email: $email, password: $password, displayName: $displayName) {
      accessToken
      expiresIn
      user {
        id
        email
        displayName
      }
    }
  }
`;

export const SIGN_IN = /* GraphQL */ `
  mutation SignIn($email: String!, $password: String!) {
    signIn(email: $email, password: $password) {
      accessToken
      expiresIn
      user {
        id
        email
        displayName
      }
    }
  }
`;

export const SIGN_OUT = /* GraphQL */ `
  mutation SignOut {
    signOut
  }
`;

export const ME = /* GraphQL */ `
  query Me {
    me {
      id
      email
      displayName
      travelogues {
        id
        name
        role
        tripCount
        version
        updatedAt
      }
    }
  }
`;

export const TRAVELOGUE = /* GraphQL */ `
  query Travelogue($id: ID!) {
    travelogue(id: $id) {
      id
      name
      homeCityKey
      mapSettings {
        showFlightPaths
        highlightVisited
      }
      version
      updatedAt
      trips {
        id
        countryCode
        cityKey
        name
        lat
        lng
        description
        material
        startYear
        startMonth
        endYear
        endMonth
        version
        imageUrls
        updatedAt
      }
    }
  }
`;

export const CREATE_TRAVELOGUE = /* GraphQL */ `
  mutation CreateTravelogue($name: String!) {
    createTravelogue(name: $name) {
      id
      name
      role
      tripCount
      version
      updatedAt
    }
  }
`;

export const DELETE_TRAVELOGUE = /* GraphQL */ `
  mutation DeleteTravelogue($id: ID!) {
    deleteTravelogue(id: $id)
  }
`;

export const UPDATE_TRAVELOGUE = /* GraphQL */ `
  mutation UpdateTravelogue(
    $id: ID!
    $name: String
    $homeCityKey: String
    $mapSettings: MapSettingsInput
  ) {
    updateTravelogue(id: $id, name: $name, homeCityKey: $homeCityKey, mapSettings: $mapSettings) {
      id
      name
      homeCityKey
      mapSettings {
        showFlightPaths
        highlightVisited
      }
      version
      updatedAt
      trips {
        id
        countryCode
        cityKey
        name
        lat
        lng
        description
        material
        startYear
        startMonth
        endYear
        endMonth
        version
        imageUrls
        updatedAt
      }
    }
  }
`;

export const CREATE_TRIP = /* GraphQL */ `
  mutation CreateTrip($travelogueId: ID!, $input: TripInput!, $clientMutationId: String!) {
    createTrip(travelogueId: $travelogueId, input: $input, clientMutationId: $clientMutationId) {
      id
      countryCode
      cityKey
      name
      lat
      lng
      description
      material
      startYear
      startMonth
      endYear
      endMonth
      version
      imageUrls
      updatedAt
    }
  }
`;

export const UPDATE_TRIP = /* GraphQL */ `
  mutation UpdateTrip(
    $id: ID!
    $input: TripInput!
    $baseVersion: Int!
    $clientMutationId: String!
  ) {
    updateTrip(id: $id, input: $input, baseVersion: $baseVersion, clientMutationId: $clientMutationId) {
      id
      countryCode
      cityKey
      name
      lat
      lng
      description
      material
      startYear
      startMonth
      endYear
      endMonth
      version
      imageUrls
      updatedAt
    }
  }
`;

export const DELETE_TRIP = /* GraphQL */ `
  mutation DeleteTrip($id: ID!, $baseVersion: Int!, $clientMutationId: String!) {
    deleteTrip(id: $id, baseVersion: $baseVersion, clientMutationId: $clientMutationId)
  }
`;

export const REQUEST_IMAGE_UPLOAD = /* GraphQL */ `
  mutation RequestImageUpload($tripId: ID!, $mimeType: String!, $sizeBytes: Int!) {
    requestImageUpload(tripId: $tripId, mimeType: $mimeType, sizeBytes: $sizeBytes) {
      imageId
      uploadUrl
      publicUrl
      expiresAt
    }
  }
`;

export const ATTACH_IMAGE = /* GraphQL */ `
  mutation AttachImage($tripId: ID!, $imageId: ID!, $clientMutationId: String!) {
    attachImage(tripId: $tripId, imageId: $imageId, clientMutationId: $clientMutationId) {
      id
      version
      imageUrls
      updatedAt
    }
  }
`;

export const DETACH_IMAGE = /* GraphQL */ `
  mutation DetachImage($tripId: ID!, $imageId: ID!, $clientMutationId: String!) {
    detachImage(tripId: $tripId, imageId: $imageId, clientMutationId: $clientMutationId) {
      id
      version
      imageUrls
      updatedAt
    }
  }
`;

export const SYNC_DELTA = /* GraphQL */ `
  query SyncDelta($travelogueId: ID!, $sinceVersion: Int!) {
    syncDelta(travelogueId: $travelogueId, sinceVersion: $sinceVersion) {
      travelogueVersion
      patches {
        op
        tripId
        version
        trip {
          id
          countryCode
          cityKey
          name
          lat
          lng
          description
          material
          startYear
          startMonth
          endYear
          endMonth
          version
          imageUrls
          updatedAt
        }
      }
    }
  }
`;

export const PUSH_CHANGES = /* GraphQL */ `
  mutation PushChanges($travelogueId: ID!, $changes: [ChangeInput!]!) {
    pushChanges(travelogueId: $travelogueId, changes: $changes) {
      travelogueVersion
      conflicts
      idMappings {
        clientTripId
        serverTripId
      }
      patches {
        op
        tripId
        version
        trip {
          id
          countryCode
          cityKey
          name
          lat
          lng
          description
          material
          startYear
          startMonth
          endYear
          endMonth
          version
          imageUrls
          updatedAt
        }
      }
    }
  }
`;

export const CREATE_TV_SESSION = /* GraphQL */ `
  mutation CreateTvSession($displayLabel: String) {
    createTvSession(displayLabel: $displayLabel) {
      id
      pairingCode
      pairingUrl
      expiresAt
      claimed
      travelogueId
      displayLabel
    }
  }
`;

export const CLAIM_TV_SESSION = /* GraphQL */ `
  mutation ClaimTvSession($code: String!, $travelogueId: ID!) {
    claimTvSession(code: $code, travelogueId: $travelogueId) {
      id
      pairingCode
      claimed
      travelogueId
      displayLabel
    }
  }
`;

export const UNPAIR_TV_SESSION = /* GraphQL */ `
  mutation UnpairTvSession {
    unpairTvSession
  }
`;

export const TV_SESSION_UPDATED = /* GraphQL */ `
  subscription TvSessionUpdated($sessionId: ID!) {
    tvSessionUpdated(sessionId: $sessionId) {
      id
      claimed
      travelogueId
      deviceToken
      displayLabel
    }
  }
`;

export const TRAVELOGUE_UPDATED = /* GraphQL */ `
  subscription TravelogueUpdated($travelogueId: ID!) {
    travelogueUpdated(travelogueId: $travelogueId) {
      op
      tripId
      version
      trip {
        id
        countryCode
        cityKey
        name
        lat
        lng
        description
        material
        startYear
        startMonth
        endYear
        endMonth
        version
        imageUrls
        updatedAt
      }
    }
  }
`;
