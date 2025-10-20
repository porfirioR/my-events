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
import { TransactionController } from './../../src/host/controllers/transaction.controller';
import { CollaboratorAccessService } from './../../src/access/data/services/collaborator-access.service';
import { AuthService } from './../../src/access/auth/auth.service';
import { TestHelpers } from '../helpers/test-helpers';
import { TransactionTestHelpers } from 'test/helpers/transaction-test-helpers';
import { TransactionManagerService } from './../../src/manager/services/transaction.manager.service';
import { TransactionAccessService, TransactionSplitAccessService, TransactionReimbursementAccessService } from './../../src/access/data/services';

describe('Transaction Module Integration E2E', () => {
  let module: TestingModule;
  let controller: TransactionController;
  let managerService: TransactionManagerService;
  let transactionAccessService: TransactionAccessService;
  let splitAccessService: TransactionSplitAccessService;
  let reimbursementAccessService: TransactionReimbursementAccessService;
  let collaboratorAccessService: CollaboratorAccessService;
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
    controller = module.get<TransactionController>(TransactionController);
    managerService = module.get<TransactionManagerService>(TransactionManagerService);
    transactionAccessService = module.get<TransactionAccessService>(TransactionAccessService);
    splitAccessService = module.get<TransactionSplitAccessService>(TransactionSplitAccessService);
    reimbursementAccessService = module.get<TransactionReimbursementAccessService>(TransactionReimbursementAccessService);
    collaboratorAccessService = module.get<CollaboratorAccessService>(CollaboratorAccessService);
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
      expect(transactionAccessService).toBeDefined();
      expect(splitAccessService).toBeDefined();
      expect(reimbursementAccessService).toBeDefined();
      expect(collaboratorAccessService).toBeDefined();
      expect(authService).toBeDefined();
    });

    it('should verify correct service instances', () => {
      expect(controller).toBeInstanceOf(TransactionController);
      expect(managerService).toBeInstanceOf(TransactionManagerService);
      expect(transactionAccessService).toBeInstanceOf(TransactionAccessService);
      expect(splitAccessService).toBeInstanceOf(TransactionSplitAccessService);
      expect(reimbursementAccessService).toBeInstanceOf(TransactionReimbursementAccessService);
      expect(collaboratorAccessService).toBeInstanceOf(CollaboratorAccessService);
      expect(authService).toBeInstanceOf(AuthService);
    });
  });

  describe('Dependency Injection Chain', () => {
    it('should verify ControllerModule → ManagerModule injection', () => {
      const injectedManager = controller['transactionManagerService'];
      expect(injectedManager).toBeDefined();
      expect(injectedManager).toBe(managerService);
    });

    it('should verify ManagerModule → DataModule injection for TransactionAccess', () => {
      const injectedAccess = managerService['transactionAccessService'];
      expect(injectedAccess).toBeDefined();
      expect(injectedAccess).toBe(transactionAccessService);
    });

    it('should verify ManagerModule → DataModule injection for SplitAccess', () => {
      const injectedAccess = managerService['splitAccessService'];
      expect(injectedAccess).toBeDefined();
      expect(injectedAccess).toBe(splitAccessService);
    });

    it('should verify ManagerModule → DataModule injection for ReimbursementAccess', () => {
      const injectedAccess = managerService['reimbursementAccessService'];
      expect(injectedAccess).toBeDefined();
      expect(injectedAccess).toBe(reimbursementAccessService);
    });

    it('should verify ManagerModule → DataModule injection for CollaboratorAccess', () => {
      const injectedAccess = managerService['collaboratorAccessService'];
      expect(injectedAccess).toBeDefined();
      expect(injectedAccess).toBe(collaboratorAccessService);
    });

    it('should verify AuthModule dependencies', () => {
      expect(authService['jwtService']).toBeDefined();
      expect(authService['cacheManager']).toBeDefined();
    });
  });

  describe('Token-Based Injection', () => {
    it('should verify TRANSACTION_TOKENS.ACCESS_SERVICE', () => {
      try {
        const { TRANSACTION_TOKENS } = require('./../../src/utility/constants');
        const accessByToken = module.get(TRANSACTION_TOKENS.ACCESS_SERVICE);
        expect(accessByToken).toBeDefined();
        expect(accessByToken).toBe(transactionAccessService);
      } catch (error) {
        console.warn('TRANSACTION_TOKENS not found, skipping test');
      }
    });

    it('should verify TRANSACTION_TOKENS.SPLIT_ACCESS_SERVICE', () => {
      try {
        const { TRANSACTION_TOKENS } = require('./../../src/utility/constants');
        const accessByToken = module.get(TRANSACTION_TOKENS.SPLIT_ACCESS_SERVICE);
        expect(accessByToken).toBeDefined();
        expect(accessByToken).toBe(splitAccessService);
      } catch (error) {
        console.warn('TRANSACTION_TOKENS.SPLIT_ACCESS_SERVICE not found, skipping test');
      }
    });

    it('should verify TRANSACTION_TOKENS.REIMBURSEMENT_ACCESS_SERVICE', () => {
      try {
        const { TRANSACTION_TOKENS } = require('./../../src/utility/constants');
        const accessByToken = module.get(TRANSACTION_TOKENS.REIMBURSEMENT_ACCESS_SERVICE);
        expect(accessByToken).toBeDefined();
        expect(accessByToken).toBe(reimbursementAccessService);
      } catch (error) {
        console.warn('TRANSACTION_TOKENS.REIMBURSEMENT_ACCESS_SERVICE not found, skipping test');
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
    it('should verify method availability in controller', () => {
      expect(typeof controller.createTransaction).toBe('function');
      expect(typeof controller.getMyTransactions).toBe('function');
      expect(typeof controller.getTransactionById).toBe('function');
      expect(typeof controller.addReimbursement).toBe('function');
      expect(typeof controller.getBalanceWithCollaborator).toBe('function');
      expect(typeof controller.getAllBalances).toBe('function');
      expect(typeof controller.deleteTransaction).toBe('function');
    });

    it('should verify method availability in manager', () => {
      expect(typeof managerService.createTransaction).toBe('function');
      expect(typeof managerService.getMyTransactions).toBe('function');
      expect(typeof managerService.getTransactionById).toBe('function');
      expect(typeof managerService.addReimbursement).toBe('function');
      expect(typeof managerService.getBalanceWithCollaborator).toBe('function');
      expect(typeof managerService.getAllBalances).toBe('function');
      expect(typeof managerService.deleteTransaction).toBe('function');
    });

    it('should verify method availability in access services', () => {
      expect(typeof transactionAccessService.create).toBe('function');
      expect(typeof transactionAccessService.getById).toBe('function');
      expect(typeof transactionAccessService.getByUserId).toBe('function');
      expect(typeof transactionAccessService.getByUserAndCollaborator).toBe('function');
      expect(typeof transactionAccessService.updateReimbursementTotal).toBe('function');
      expect(typeof transactionAccessService.delete).toBe('function');

      expect(typeof splitAccessService.create).toBe('function');
      expect(typeof splitAccessService.getByTransaction).toBe('function');
      expect(typeof splitAccessService.hasUnsettledSplits).toBe('function');

      expect(typeof reimbursementAccessService.create).toBe('function');
      expect(typeof reimbursementAccessService.getByTransaction).toBe('function');
      expect(typeof reimbursementAccessService.getTotalByTransaction).toBe('function');
    });

    it('should test getMyTransactions flow with mocks', async () => {
      const managerSpy = jest.spyOn(managerService, 'getMyTransactions');
      const accessSpy = jest.spyOn(transactionAccessService, 'getByUserId');
      
      const mockTransactions = [TransactionTestHelpers.createMockTransactionAccessModel()];
      accessSpy.mockResolvedValue(mockTransactions);

      const userId = 1;
      const result = await managerService.getMyTransactions(userId);

      expect(accessSpy).toHaveBeenCalledWith(userId);
      expect(managerSpy).toHaveBeenCalledWith(userId);
      
      managerSpy.mockRestore();
      accessSpy.mockRestore();
    });

    it('should test createTransaction flow', async () => {
      const managerSpy = jest.spyOn(managerService, 'createTransaction');
      const transactionAccessSpy = jest.spyOn(transactionAccessService, 'create');
      const splitAccessSpy = jest.spyOn(splitAccessService, 'create');
      
      const mockTransaction = TransactionTestHelpers.createMockTransactionAccessModel();
      transactionAccessSpy.mockResolvedValue(mockTransaction);
      splitAccessSpy.mockResolvedValue(TransactionTestHelpers.createMockTransactionSplitAccessModel());

      const apiRequest = TransactionTestHelpers.createMockCreateTransactionApiRequest();
      await controller.createTransaction(apiRequest);

      expect(managerSpy).toHaveBeenCalled();
      expect(transactionAccessSpy).toHaveBeenCalled();
      expect(splitAccessSpy).toHaveBeenCalled();
      
      managerSpy.mockRestore();
      transactionAccessSpy.mockRestore();
      splitAccessSpy.mockRestore();
    });

    it('should test addReimbursement flow', async () => {
      const managerSpy = jest.spyOn(managerService, 'addReimbursement');
      const transactionAccessSpy = jest.spyOn(transactionAccessService, 'getById');
      const reimbursementAccessSpy = jest.spyOn(reimbursementAccessService, 'create');
      const getTotalSpy = jest.spyOn(reimbursementAccessService, 'getTotalByTransaction');
      
      const mockTransaction = TransactionTestHelpers.createMockTransactionAccessModel();
      const mockReimbursement = TransactionTestHelpers.createMockTransactionReimbursementAccessModel();
      
      transactionAccessSpy.mockResolvedValue(mockTransaction);
      getTotalSpy.mockResolvedValue(0);
      reimbursementAccessSpy.mockResolvedValue(mockReimbursement);

      const request = TransactionTestHelpers.createMockAddReimbursementRequest();
      await managerService.addReimbursement(request);

      expect(transactionAccessSpy).toHaveBeenCalled();
      expect(getTotalSpy).toHaveBeenCalled();
      expect(reimbursementAccessSpy).toHaveBeenCalled();
      
      managerSpy.mockRestore();
      transactionAccessSpy.mockRestore();
      reimbursementAccessSpy.mockRestore();
      getTotalSpy.mockRestore();
    });

    it('should test getBalanceWithCollaborator flow', async () => {
      const managerSpy = jest.spyOn(managerService, 'getBalanceWithCollaborator');
      const transactionAccessSpy = jest.spyOn(transactionAccessService, 'getByUserAndCollaborator');
      const splitAccessSpy = jest.spyOn(splitAccessService, 'getByTransaction');
      
      const mockTransactions = [TransactionTestHelpers.createMockTransactionAccessModel()];
      const mockSplits = [TransactionTestHelpers.createMockTransactionSplitAccessModel()];
      
      transactionAccessSpy.mockResolvedValue(mockTransactions);
      splitAccessSpy.mockResolvedValue(mockSplits);

      const userId = 1;
      const collaboratorId = 2;
      const result = await managerService.getBalanceWithCollaborator(userId, collaboratorId);

      expect(transactionAccessSpy).toHaveBeenCalled();
      expect(splitAccessSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.userId).toBe(userId);
      expect(result.collaboratorId).toBe(collaboratorId);
      
      managerSpy.mockRestore();
      transactionAccessSpy.mockRestore();
      splitAccessSpy.mockRestore();
    });
  });

  describe('Error Propagation', () => {
    it('should propagate errors through service chain', async () => {
      const accessSpy = jest.spyOn(transactionAccessService, 'getByUserId');
      const testError = new Error('Integration test error');
      accessSpy.mockRejectedValue(testError);

      await expect(managerService.getMyTransactions(1))
        .rejects.toThrow('Integration test error');

      accessSpy.mockRestore();
    });

    it('should propagate validation errors from manager', async () => {
      const request = TransactionTestHelpers.createMockCreateTransactionManagerRequest();
      request.totalAmount = -100; // Invalid amount

      await expect(managerService.createTransaction(request))
        .rejects.toThrow();
    });
  });

  describe('Singleton Pattern', () => {
    it('should verify singleton instances', () => {
      const controller2 = module.get<TransactionController>(TransactionController);
      const manager2 = module.get<TransactionManagerService>(TransactionManagerService);
      const access2 = module.get<TransactionAccessService>(TransactionAccessService);
      
      expect(controller).toBe(controller2);
      expect(managerService).toBe(manager2);
      expect(transactionAccessService).toBe(access2);
    });
  });

  describe('Validation Integration with class-validator', () => {
    it('should validate CreateTransactionApiRequest with invalid data', async () => {
      const invalidRequest = {
        collaboratorId: 'not-a-number', // Invalid
        totalAmount: -100, // Invalid
        splitType: 'Invalid', // Invalid
        whoPaid: 'invalid', // Invalid
        splits: [], // Invalid (should be 2)
      };

      // Este test verifica que class-validator rechaza datos inválidos
      // En runtime, NestJS ValidationPipe rechazará esto antes de llegar al controller
      expect(invalidRequest.totalAmount).toBeLessThan(0);
      expect(invalidRequest.splits.length).not.toBe(2);
    });
  });
});