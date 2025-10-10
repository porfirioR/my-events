import { SplitType, WhoPaid } from "../../src/utility/enums";

export class TransactionTestHelpers {
  static createMockTransactionAccessModel() {
    return {
      id: 1,
      userId: 1,
      collaboratorId: 2,
      totalAmount: 100000,
      description: 'Test transaction',
      splitType: SplitType.EQUAL,
      whoPaid: WhoPaid.USER,
      totalReimbursement: 0,
      netAmount: 100000,
      transactionDate: new Date('2025-01-01')
    };
  }

  static createMockTransactionSplitAccessModel() {
    return {
      id: 1,
      transactionId: 1,
      collaboratorId: null,
      userId: 1,
      amount: 50000,
      sharePercentage: 50,
      isPayer: true,
      isSettled: false
    };
  }

  static createMockTransactionReimbursementAccessModel() {
    return {
      id: 1,
      transactionId: 1,
      amount: 10000,
      description: 'Test reimbursement',
      reimbursementDate: new Date('2025-01-01')
    };
  }

  static createMockCreateTransactionApiRequest() {
    return {
      collaboratorId: 2,
      totalAmount: 100000,
      description: 'Test transaction',
      splitType: SplitType.EQUAL as const,
      whoPaid: WhoPaid.USER,
      splits: [
        {
          participantType: WhoPaid.USER,
          amount: 50000,
          sharePercentage: 50
        },
        {
          participantType: 'collaborator' as const,
          amount: 50000,
          sharePercentage: 50
        }
      ]
    };
  }

  static createMockCreateTransactionManagerRequest() {
    return {
      userId: 1,
      collaboratorId: 2,
      totalAmount: 100000,
      description: 'Test transaction',
      splitType: SplitType.EQUAL,
      whoPaid: WhoPaid.USER,
      splits: [
        {
          participantType: WhoPaid.USER,
          userId: 1,
          collaboratorId: null,
          amount: 50000,
          sharePercentage: 50,
          isPayer: true
        },
        {
          participantType: 'collaborator' as const,
          userId: null,
          collaboratorId: 2,
          amount: 50000,
          sharePercentage: 50,
          isPayer: false
        }
      ],
      reimbursement: null
    };
  }

  static createMockAddReimbursementRequest() {
    return {
      transactionId: 1,
      amount: 10000,
      description: 'Test reimbursement'
    };
  }

  static createMockBalanceManagerModel() {
    return {
      userId: 1,
      collaboratorId: 2,
      userOwes: 0,
      collaboratorOwes: 50000,
      netBalance: 50000
    };
  }

  static createMockTransactionViewManagerModel() {
    return {
      id: 1,
      description: 'Test transaction',
      totalAmount: 100000,
      netAmount: 100000,
      myCollaborator: {
        id: 2,
        name: 'Test',
        surname: 'Collaborator',
        email: 'test@example.com'
      },
      whoPaid: WhoPaid.USER,
      iPaid: 100000,
      iOwe: 0,
      theyOwe: 50000,
      theyPaid: 0,
      transactionDate: new Date('2025-01-01'),
      isSettled: false,
      createdByMe: true
    };
  }
}
