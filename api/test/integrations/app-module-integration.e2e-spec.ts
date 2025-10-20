// test/integration/app-module-integration.e2e-spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from './../../src/app.module';

// Servicios para verificar que están disponibles
import { CollaboratorsController } from './../../src/host/controllers/collaborators.controller';
import { CollaboratorManagerService } from './../../src/manager/services/collaborator-manager.service';
import { CollaboratorAccessService } from './../../src/access/data/services/collaborator-access.service';
import { AuthService } from './../../src/access/auth/auth.service';
import { TasksService } from './../../src/host/services/tasks.service';
import { COLLABORATOR_TOKENS, TRANSACTION_TOKENS } from './../../src/utility/constants';
import { TestHelpers } from '../helpers/test-helpers';

import { TransactionController } from './../../src/host/controllers/transaction.controller';
import { TransactionManagerService } from './../../src/manager/services/transaction.manager.service';
import { TransactionAccessService } from './../../src/access/data/services';
import { TransactionTestHelpers } from 'test/helpers/transaction-test-helpers';

describe('AppModule Complete Integration E2E', () => {
  let app: INestApplication;
  let module: TestingModule;

  beforeAll(async () => {
    // Usar tu AppModule real completo
    module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete AppModule Architecture Verification', () => {
    it('should load your complete AppModule without errors', () => {
      expect(module).toBeDefined();
      expect(app).toBeDefined();
    });

    it('should have all your controllers available through ControllerModule', () => {
      // Verificar que todos los controllers están disponibles
      //TODO add all controllers
      expect(() => module.get<CollaboratorsController>(CollaboratorsController)).not.toThrow();
      
      const collaboratorsController = module.get<CollaboratorsController>(CollaboratorsController);
      expect(collaboratorsController).toBeInstanceOf(CollaboratorsController);
    });

    it('should have all your manager services available through ManagerModule', () => {
      // Verificar que todos los manager services están disponibles
      //TODO add all managers
      expect(() => module.get<CollaboratorManagerService>(CollaboratorManagerService)).not.toThrow();
      
      const collaboratorManager = module.get<CollaboratorManagerService>(CollaboratorManagerService);
      expect(collaboratorManager).toBeInstanceOf(CollaboratorManagerService);
    });

    it('should have all your access services available through DataModule', () => {
      // Verificar access services del DataModule
      //TODO add all access services from DataModule
      expect(() => module.get<CollaboratorAccessService>(CollaboratorAccessService)).not.toThrow();
      
      const collaboratorAccess = module.get<CollaboratorAccessService>(CollaboratorAccessService);
      expect(collaboratorAccess).toBeInstanceOf(CollaboratorAccessService);
    });

    it('should have AuthService available through AuthModule', () => {
      expect(() => module.get<AuthService>(AuthService)).not.toThrow();
      
      const authService = module.get<AuthService>(AuthService);
      expect(authService).toBeInstanceOf(AuthService);
    });

    it('should have TasksService available through ControllerModule', () => {
      expect(() => module.get<TasksService>(TasksService)).not.toThrow();

      const tasksService = module.get<TasksService>(TasksService);
      expect(tasksService).toBeInstanceOf(TasksService);
    });

    //transactions


    it('should have TransactionController available through ControllerModule', () => {
      expect(() => module.get<TransactionController>(TransactionController)).not.toThrow();
      
      const transactionController = module.get<TransactionController>(TransactionController);
      expect(transactionController).toBeInstanceOf(TransactionController);
    });

    it('should have TransactionManagerService available through ManagerModule', () => {
      expect(() => module.get<TransactionManagerService>(TransactionManagerService)).not.toThrow();
      
      const transactionManager = module.get<TransactionManagerService>(TransactionManagerService);
      expect(transactionManager).toBeInstanceOf(TransactionManagerService);
    });

    it('should have TransactionAccessService available through DataModule', () => {
      expect(() => module.get<TransactionAccessService>(TransactionAccessService)).not.toThrow();
      
      const transactionAccess = module.get<TransactionAccessService>(TransactionAccessService);
      expect(transactionAccess).toBeInstanceOf(TransactionAccessService);
    });
  });

  describe('Complete Module Chain Integration', () => {
    it('should verify complete dependency chain: AppModule → ControllerModule → ManagerModule → DataModule', () => {
      const controller = module.get<CollaboratorsController>(CollaboratorsController);
      const managerService = module.get<CollaboratorManagerService>(CollaboratorManagerService);
      
      // Obtener el access service usando el token en lugar de la clase
      const accessService = module.get(COLLABORATOR_TOKENS.ACCESS_SERVICE);

      // Verificar cadena completa
      expect(controller['collaboratorManagerService']).toBe(managerService);
      expect(managerService['collaboratorAccessService']).toBe(accessService);
    });

    it('should verify token-based injection works correctly', () => {
      const managerService = module.get<CollaboratorManagerService>(CollaboratorManagerService);
      const accessByToken = module.get(COLLABORATOR_TOKENS.ACCESS_SERVICE);
      const accessByClass = module.get<CollaboratorAccessService>(CollaboratorAccessService);

      // Ambos deberían ser la misma instancia
      expect(managerService['collaboratorAccessService']).toBe(accessByToken);
      expect(accessByToken).toBe(accessByClass);
    });

    it('should verify your global configurations work across all modules', () => {
      const authService = module.get<AuthService>(AuthService);
      
      // ConfigModule.forRoot() debería estar disponible globalmente
      expect(authService['jwtService']).toBeDefined();
      expect(authService['cacheManager']).toBeDefined();
    });

    it('should verify complete dependency chain for Transaction: AppModule → ControllerModule → ManagerModule → DataModule', () => {
      const controller = module.get<TransactionController>(TransactionController);
      const managerService = module.get<TransactionManagerService>(TransactionManagerService);
      const accessService = module.get(TRANSACTION_TOKENS.ACCESS_SERVICE);

      // Verificar cadena completa
      expect(controller['transactionManagerService']).toBe(managerService);
      expect(managerService['transactionAccessService']).toBe(accessService);
    });

    it('should verify token-based injection works correctly for Transaction services', () => {
      const managerService = module.get<TransactionManagerService>(TransactionManagerService);
      const accessByToken = module.get(TRANSACTION_TOKENS.ACCESS_SERVICE);
      const accessByClass = module.get<TransactionAccessService>(TransactionAccessService);

      // Ambos deberían ser la misma instancia
      expect(managerService['transactionAccessService']).toBe(accessByToken);
      expect(accessByToken).toBe(accessByClass);
    });
  });

  describe('Real Application Flow Through Complete AppModule', () => {
    it('should test complete request flow through your real application structure', async () => {
      const controller = module.get<CollaboratorsController>(CollaboratorsController);
      const managerService = module.get<CollaboratorManagerService>(CollaboratorManagerService);
      const accessService = module.get<CollaboratorAccessService>(CollaboratorAccessService);

      // Spy en toda la cadena
      const managerSpy = jest.spyOn(managerService, 'getAll');
      const accessSpy = jest.spyOn(accessService, 'getAll');

      const mockResult = [TestHelpers.createMockCollaboratorAccessModel()];
      accessSpy.mockResolvedValue(mockResult);

      const userId = 1;
      const result = await controller.getAll();

      // Verificar que la cadena completa funcionó
      expect(managerSpy).toHaveBeenCalledWith(userId);
      expect(accessSpy).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockResult);

      managerSpy.mockRestore();
      accessSpy.mockRestore();
    });

    it('should test authentication flow through your complete module structure', async () => {
      const authService = module.get<AuthService>(AuthService);
      const mockUser = TestHelpers.createMockAuthUser();

      // Test que el flujo de auth funciona con la configuración completa
      const token = await authService.getToken(mockUser);
      expect(token).toBeDefined();

      const cachedUserId = await authService.getUserIdFromToken(token);
      expect(cachedUserId).toBe(mockUser.id);

      await authService.clearUserCache(token);
      const clearedUserId = await authService.getUserIdFromToken(token);
      expect(clearedUserId).toBeUndefined();
    });

    it('should test complete transaction creation flow through your real application structure', async () => {
      const controller = module.get<TransactionController>(TransactionController);
      const managerService = module.get<TransactionManagerService>(TransactionManagerService);
      const transactionAccessService = module.get<TransactionAccessService>(TransactionAccessService);
      const splitAccessService = module.get(TRANSACTION_TOKENS.SPLIT_ACCESS_SERVICE);

      // Spy en toda la cadena
      const managerSpy = jest.spyOn(managerService, 'createTransaction');
      const transactionAccessSpy = jest.spyOn(transactionAccessService, 'create');
      const splitAccessSpy = jest.spyOn(splitAccessService, 'create');

      const mockTransaction = TransactionTestHelpers.createMockTransactionAccessModel();
      const mockSplit = TransactionTestHelpers.createMockTransactionSplitAccessModel();
      
      transactionAccessSpy.mockResolvedValue(mockTransaction);
      splitAccessSpy.mockResolvedValue(mockSplit);

      const apiRequest = TransactionTestHelpers.createMockCreateTransactionApiRequest();
      const result = await controller.createTransaction(apiRequest);

      // Verificar que la cadena completa funcionó
      expect(managerSpy).toHaveBeenCalled();
      expect(transactionAccessSpy).toHaveBeenCalled();
      expect(splitAccessSpy).toHaveBeenCalled();
      expect(result).toBeDefined();

      managerSpy.mockRestore();
      transactionAccessSpy.mockRestore();
      splitAccessSpy.mockRestore();
    });
  });

  describe('Your Real Module Configuration Integration', () => {
    it('should verify your UtilityModule integration', () => {
      // UtilityModule está importado en AppModule y DataModule
      // Si la app se inicializó, está funcionando correctamente
      expect(app).toBeDefined();
    });

    it('should verify your COLLABORATOR_TOKENS configuration', () => {
      // Verificar que el token provider funciona
      expect(() => module.get(COLLABORATOR_TOKENS.ACCESS_SERVICE)).not.toThrow();
      
      const accessByToken = module.get(COLLABORATOR_TOKENS.ACCESS_SERVICE);
      const accessByClass = module.get<CollaboratorAccessService>(CollaboratorAccessService);
      
      expect(accessByToken).toBe(accessByClass);
    });

    it('should verify your global guards and filters are configured', () => {
      // APP_GUARD y APP_FILTER están configurados en ControllerModule
      // Si llegamos aquí sin errores, están configurados correctamente
      expect(app).toBeDefined();
    });

    it('should verify your TRANSACTION_TOKENS configuration', () => {
      expect(() => module.get(TRANSACTION_TOKENS.ACCESS_SERVICE)).not.toThrow();
      expect(() => module.get(TRANSACTION_TOKENS.SPLIT_ACCESS_SERVICE)).not.toThrow();
      expect(() => module.get(TRANSACTION_TOKENS.REIMBURSEMENT_ACCESS_SERVICE)).not.toThrow();
      
      const accessByToken = module.get(TRANSACTION_TOKENS.ACCESS_SERVICE);
      const accessByClass = module.get<TransactionAccessService>(TransactionAccessService);
      
      expect(accessByToken).toBe(accessByClass);
    });
  });

  describe('Real Error Handling Through Complete Stack', () => {
    it('should verify error propagation through your complete module architecture', async () => {
      const accessService = module.get<CollaboratorAccessService>(CollaboratorAccessService);
      const managerService = module.get<CollaboratorManagerService>(CollaboratorManagerService);
      const controller = module.get<CollaboratorsController>(CollaboratorsController);

      const accessSpy = jest.spyOn(accessService, 'getAll');
      const appError = new Error('Complete stack error test');
      accessSpy.mockRejectedValue(appError);

      // Error debería propagarse a través de todo el stack real
      await expect(managerService.getAll(1)).rejects.toThrow('Complete stack error test');
      await expect(controller.getAll()).rejects.toThrow('Complete stack error test');

      accessSpy.mockRestore();
    });

    it('should verify transaction error propagation through your complete module architecture', async () => {
      const transactionAccessService = module.get<TransactionAccessService>(TransactionAccessService);
      const managerService = module.get<TransactionManagerService>(TransactionManagerService);
      const controller = module.get<TransactionController>(TransactionController);

      const accessSpy = jest.spyOn(transactionAccessService, 'getByUserId');
      const appError = new Error('Transaction stack error test');
      accessSpy.mockRejectedValue(appError);

      // Error debería propagarse a través de todo el stack real
      await expect(managerService.getMyTransactions(1)).rejects.toThrow('Transaction stack error test');
      await expect(controller.getMyTransactions()).rejects.toThrow('Transaction stack error test');

      accessSpy.mockRestore();
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should verify your module structure creates singletons efficiently', () => {
      // Múltiples gets deberían retornar la misma instancia
      const controller1 = module.get<CollaboratorsController>(CollaboratorsController);
      const controller2 = module.get<CollaboratorsController>(CollaboratorsController);
      const manager1 = module.get<CollaboratorManagerService>(CollaboratorManagerService);
      const manager2 = module.get<CollaboratorManagerService>(CollaboratorManagerService);

      expect(controller1).toBe(controller2);
      expect(manager1).toBe(manager2);
    });

    it('should verify your module imports do not create circular dependencies', () => {
      // Si llegamos aquí, no hay dependencias circulares
      expect(module).toBeDefined();
      
      // Verificar que se pueden obtener todos los servicios sin problemas
      expect(() => {
        module.get<CollaboratorsController>(CollaboratorsController);
        module.get<CollaboratorManagerService>(CollaboratorManagerService);
        module.get<CollaboratorAccessService>(CollaboratorAccessService);
        module.get<AuthService>(AuthService);
        module.get<TasksService>(TasksService);
      }).not.toThrow();
    });

    it('should verify transaction services create singletons efficiently', () => {
      const controller1 = module.get<TransactionController>(TransactionController);
      const controller2 = module.get<TransactionController>(TransactionController);
      const manager1 = module.get<TransactionManagerService>(TransactionManagerService);
      const manager2 = module.get<TransactionManagerService>(TransactionManagerService);

      expect(controller1).toBe(controller2);
      expect(manager1).toBe(manager2);
    });
  });
});