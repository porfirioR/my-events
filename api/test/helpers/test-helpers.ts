// test/helpers/test-helpers.ts
import { JwtService } from '@nestjs/jwt';

import {
  CreateCollaboratorRequest,
  UpdateCollaboratorRequest
} from '../../src/manager/models/collaborators';
import { AuthUserModel } from 'src/access/auth/contracts/auth-user-model';
import { CollaboratorAccessModel, CreateCollaboratorAccessRequest, UpdateCollaboratorAccessRequest } from 'src/access/contract/collaborators';
import { CreateCollaboratorApiRequest } from 'src/host/models/collaborators/create-collaborator-api-request';
import { UpdateCollaboratorApiRequest } from 'src/host/models/collaborators/update-collaborator-api-request';
import { CollaboratorType } from 'src/utility/types';

export class TestHelpers {
  // Auth helpers
  static async createMockAuthToken(
    jwtService: JwtService,
    userId: number = 1
  ): Promise<string> {
    const mockUser = new AuthUserModel(
      userId,
      `user${userId}@test.com`,
      'hashed-password'
    );
    return await jwtService.signAsync({
      id: mockUser.id,
      email: mockUser.email
    });
  }

  static createMockAuthUser(
    overrides: Partial<{ id: number; email: string; passwordHash: string }> = {}
  ): AuthUserModel {
    return new AuthUserModel(
      overrides.id ?? 1,
      overrides.email ?? 'test@example.com',
      overrides.passwordHash ?? 'hashed-password'
    );
  }

  // Collaborator model helpers
  static createMockCollaboratorAccessModel(
    overrides: Partial<{
      id: number;
      name: string;
      surname: string;
      email: string | null;
      userId: number;
      isActive: boolean;
      dateCreated: Date;
      type: CollaboratorType;
    }> = {}
  ): CollaboratorAccessModel {
    return new CollaboratorAccessModel(
      overrides.id ?? 1,
      overrides.name ?? 'John',
      overrides.surname ?? 'Doe',
      overrides.email ?? 'john@example.com',
      overrides.userId ?? 1,
      overrides.isActive ?? true,
      overrides.dateCreated ?? new Date(),
      overrides.type ?? 'UNLINKED'
    );
  }

  // Request helpers - Access Layer
  static createMockCreateAccessRequest(
    overrides: Partial<{
      name: string;
      surname: string;
      email: string | null;
      userId: number;
    }> = {}
  ): CreateCollaboratorAccessRequest {
    return new CreateCollaboratorAccessRequest(
      overrides.name ?? 'John',
      overrides.surname ?? 'Doe',
      overrides.userId ?? 1
    );
  }

  static createMockUpdateAccessRequest(
    overrides: Partial<{
      id: number;
      name: string;
      surname: string;
      email: string | null;
      userId: number;
    }> = {}
  ): UpdateCollaboratorAccessRequest {
    return new UpdateCollaboratorAccessRequest(
      overrides.id ?? 1,
      overrides.name ?? 'John Updated',
      overrides.surname ?? 'Doe Updated',
      overrides.userId ?? 1
    );
  }

  // Request helpers - Manager Layer
  static createMockCreateManagerRequest(
    overrides: Partial<{
      name: string;
      surname: string;
      email: string | null;
      userId: number;
    }> = {}
  ): CreateCollaboratorRequest {
    return new CreateCollaboratorRequest(
      overrides.name ?? 'John',
      overrides.surname ?? 'Doe',
      overrides.userId ?? 1
    );
  }

  static createMockUpdateManagerRequest(
    overrides: Partial<{
      id: number;
      name: string;
      surname: string;
      email: string | null;
      userId: number;
    }> = {}
  ): UpdateCollaboratorRequest {
    return new UpdateCollaboratorRequest(
      overrides.id ?? 1,
      overrides.name ?? 'John Updated',
      overrides.surname ?? 'Doe Updated',
      overrides.userId ?? 1
    );
  }

  // Request helpers - API Layer
  static createMockCreateApiRequest(
    overrides: Partial<{
      name: string;
      surname: string;
      email: string;
      userId: number;
    }> = {}
  ): CreateCollaboratorApiRequest {
    return {
      name: overrides.name ?? 'John',
      surname: overrides.surname ?? 'Doe',
      email: overrides.email ?? 'john@example.com',
      userId: overrides.userId ?? 1
    } as CreateCollaboratorApiRequest;
  }

  static createMockUpdateApiRequest(
    overrides: Partial<{
      id: number;
      name: string;
      surname: string;
      email: string;
    }> = {}
  ): UpdateCollaboratorApiRequest {
    return {
      id: overrides.id ?? 1,
      name: overrides.name ?? 'John Updated',
      surname: overrides.surname ?? 'Doe Updated',
      email: overrides.email ?? 'john.updated@example.com'
    } as UpdateCollaboratorApiRequest;
  }

  // Request mock helper
  static createMockRequest(userId: number = 1) {
    return {
      userId,
      user: TestHelpers.createMockAuthUser({
        id: userId,
        email: `user${userId}@test.com`
      }),
      headers: {
        authorization: 'Bearer mock-token'
      },
      method: 'GET',
      url: '/test',
      baseUrl: '/api'
    };
  }

  // Type validation helpers
  static validateCollaboratorAccessModel(
    model: any
  ): model is CollaboratorAccessModel {
    return (
      model instanceof CollaboratorAccessModel &&
      typeof model.id === 'number' &&
      typeof model.name === 'string' &&
      typeof model.surname === 'string' &&
      (typeof model.email === 'string' || model.email === null) &&
      typeof model.userId === 'number' &&
      typeof model.isActive === 'boolean' &&
      model.dateCreated instanceof Date &&
      (model.type === 'UNLINKED' || model.type === 'LINKED')
    );
  }

  static validateCreateAccessRequest(request: any): request is CreateCollaboratorAccessRequest {
    return (
      request instanceof CreateCollaboratorAccessRequest &&
      typeof request.name === 'string' &&
      typeof request.surname === 'string' &&
      typeof request.userId === 'number'
    );
  }

  static validateUpdateAccessRequest(request: any): request is UpdateCollaboratorAccessRequest {
    return (
      request instanceof UpdateCollaboratorAccessRequest &&
      typeof request.id === 'number' &&
      typeof request.name === 'string' &&
      typeof request.surname === 'string' &&
      typeof request.userId === 'number'
    );
  }

  // Data transformation helpers
  static apiToManagerRequest(
    apiRequest: CreateCollaboratorApiRequest,
    userId: number
  ): CreateCollaboratorRequest {
    return new CreateCollaboratorRequest(
      apiRequest.name,
      apiRequest.surname,
      userId
    );
  }

  static managerToAccessRequest(
    managerRequest: CreateCollaboratorRequest
  ): CreateCollaboratorAccessRequest {
    return new CreateCollaboratorAccessRequest(
      managerRequest.name,
      managerRequest.surname,
      managerRequest.userId
    );
  }

  static updateApiToManagerRequest(
    apiRequest: UpdateCollaboratorApiRequest
  ): UpdateCollaboratorRequest {
    return new UpdateCollaboratorRequest(
      apiRequest.id,
      apiRequest.name,
      apiRequest.surname,
      0 // Se sobrescribe en el access service como indica tu comentario
    );
  }
}
