import { ReceivedMatchRequestModel } from "./received-match-request-model";

export interface LoginNotificationsModel {
  pendingMatchRequests: number;
  matchRequests: ReceivedMatchRequestModel[];
}