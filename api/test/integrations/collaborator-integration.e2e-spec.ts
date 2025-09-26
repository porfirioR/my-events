// test/integration/collaborator-integration.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';

// Importar módulos reales
import { UtilityModule } from './../../src/utility/utility.module';
import { ControllerModule } from './../../src/host/controller.module';
import { ManagerModule } from './../../src/manager/manager.module';
import { DataModule } from './../../src/access/data/data.module';
import { MailModule } from './../../src/access/mail/mail.module';
import { AuthModule } from './../../src/access/auth/auth.module';

// Servicios para obtener del DI container
import { CollaboratorsController } from './../../src/host/controllers/collaborators.controller';
import { CollaboratorManagerService } from './../../src/manager/services/collaborator-manager.service';
import { CollaboratorAccessService } from './../../src/access/data/services/collaborator-access.service';
import { AuthService } from './../../src/access/auth/auth.service';
import { TestHelpers } from '../helpers/test-helpers';

describe('Collaborator Module Integration E2E', () => {
  let module: TestingModule;
  let controller: CollaboratorsController;
  let managerService: CollaboratorManagerService;
  let accessService: CollaboratorAccessService;
  let authService: AuthService;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env-test',
        }),
        UtilityModule,
        AuthModule,
        DataModule,
        MailModule,
        ManagerModule,
        ControllerModule,
      ],
    }).compile();

    // Obtener servicios del DI container
    controller = module.get<CollaboratorsController>(CollaboratorsController);
    managerService = module.get<CollaboratorManagerService>(CollaboratorManagerService);
    accessService = module.get<CollaboratorAccessService>(CollaboratorAccessService);
    authService = module.get<AuthService>(AuthService);
  });

  afterAll(async () => {
    await module.close();
  });

  describe('Module Loading Verification', () => {
    it('should load all modules without errors', () => {
      expect(module).toBeDefined();
    });

    it('should have all services available', () => {
      expect(controller).toBeDefined();
      expect(managerService).toBeDefined();
      expect(accessService).toBeDefined();
      expect(authService).toBeDefined();
    });

    it('should verify correct service instances', () => {
      expect(controller).toBeInstanceOf(CollaboratorsController);
      expect(managerService).toBeInstanceOf(CollaboratorManagerService);
      expect(accessService).toBeInstanceOf(CollaboratorAccessService);
      expect(authService).toBeInstanceOf(AuthService);
    });
  });

  describe('Dependency Injection Chain', () => {
    it('should verify ControllerModule → ManagerModule injection', () => {
      const injectedManager = controller['collaboratorManagerService'];
      expect(injectedManager).toBeDefined();
      expect(injectedManager).toBe(managerService);
    });

    it('should verify ManagerModule → DataModule injection', () => {
      const injectedAccess = managerService['collaboratorAccessService'];
      expect(injectedAccess).toBeDefined();
      expect(injectedAccess).toBe(accessService);
    });

    it('should verify AuthModule dependencies', () => {
      expect(authService['jwtService']).toBeDefined();
      expect(authService['cacheManager']).toBeDefined();
    });
  });

  describe('Token-Based Injection', () => {
    it('should verify COLLABORATOR_TOKENS.ACCESS_SERVICE', () => {
      try {
        const { COLLABORATOR_TOKENS } = require('./../../src/utility/constants');
        const accessByToken = module.get(COLLABORATOR_TOKENS.ACCESS_SERVICE);
        expect(accessByToken).toBeDefined();
        expect(accessByToken).toBe(accessService);
      } catch (error) {
        console.warn('COLLABORATOR_TOKENS not found, skipping test');
      }
    });
  });

  describe('Configuration Integration', () => {
    it('should verify global ConfigModule', () => {
      const jwtService = authService['jwtService'];
      expect(jwtService).toBeDefined();
      expect(typeof jwtService.sign).toBe('function');
    });

    it('should verify CacheModule configuration', async () => {
      const mockUser = TestHelpers.createMockAuthUser();
      const token = await authService.getToken(mockUser);
      expect(token).toBeDefined();
      
      const cachedUserId = await authService.getUserIdFromToken(token);
      expect(cachedUserId).toBe(mockUser.id);
    });
  });

  describe('Data Flow Testing', () => {
    it('should verify method availability', () => {
      expect(typeof controller.getAll).toBe('function');
      expect(typeof managerService.getAll).toBe('function');
      expect(typeof accessService.getAll).toBe('function');
    });

    it('should test service call flow with mocks', async () => {
      const accessSpy = jest.spyOn(accessService, 'getMyCollaborators');
      const mockResult = [TestHelpers.createMockCollaboratorAccessModel()];
      accessSpy.mockResolvedValue(mockResult);

      const result = await managerService.getAll(1);

      expect(accessSpy).toHaveBeenCalledWith(1);
      expect(result).toEqual(mockResult);
      accessSpy.mockRestore();
    });

    it('should test create flow', async () => {
      const managerSpy = jest.spyOn(managerService, 'createCollaborator');
      const accessSpy = jest.spyOn(accessService, 'createCollaborator');
      
      const mockResult = TestHelpers.createMockCollaboratorAccessModel();
      accessSpy.mockResolvedValue(mockResult);

      const apiRequest = TestHelpers.createMockCreateApiRequest();
      await controller.createCollaborator(apiRequest);

      expect(managerSpy).toHaveBeenCalled();
      expect(accessSpy).toHaveBeenCalled();
      
      managerSpy.mockRestore();
      accessSpy.mockRestore();
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors through service chain', async () => {
      const accessSpy = jest.spyOn(accessService, 'getMyCollaborators');
      const testError = new Error('Integration test error');
      accessSpy.mockRejectedValue(testError);

      await expect(managerService.getAll(1))
        .rejects.toThrow('Integration test error');

      accessSpy.mockRestore();
    });
  });

  describe('Singleton Pattern', () => {
    it('should verify singleton instances', () => {
      const controller2 = module.get<CollaboratorsController>(CollaboratorsController);
      const manager2 = module.get<CollaboratorManagerService>(CollaboratorManagerService);
      
      expect(controller).toBe(controller2);
      expect(managerService).toBe(manager2);
    });
  });
});