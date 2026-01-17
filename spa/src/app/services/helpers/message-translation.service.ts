import { Injectable } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export interface BackendMessage {
  message?: string;
  messageKey?: string;
  messageParams?: Record<string, any>;
}

@Injectable({
  providedIn: 'root'
})
export class MessageTranslationService {

  constructor(private translate: TranslateService) {}

  /**
   * Translates a backend message that can come in different formats:
   * 1. Direct message (legacy format)
   * 2. Message key for translation
   * 3. Message key with parameters for interpolation
   */
  translateBackendMessage(
    backendMessage: string | BackendMessage, 
    fallbackKey?: string,
    fallbackParams?: Record<string, any>
  ): string {
    // If it's a simple string, check if it's a translation key
    if (typeof backendMessage === 'string') {
      // If it looks like a translation key (contains dots), try to translate it
      if (backendMessage.includes('.')) {
        const translated = this.translate.instant(backendMessage);
        // If translation exists and is different from key, use it
        if (translated !== backendMessage) {
          return translated;
        }
      }
      // Otherwise, return the string as-is (legacy hardcoded message)
      return backendMessage;
    }

    // If it's a BackendMessage object
    if (backendMessage && typeof backendMessage === 'object') {
      // Priority: messageKey > message
      if (backendMessage.messageKey) {
        return this.translate.instant(backendMessage.messageKey, backendMessage.messageParams || {});
      }
      
      if (backendMessage.message) {
        // Check if message is a translation key
        if (backendMessage.message.includes('.')) {
          const translated = this.translate.instant(backendMessage.message, backendMessage.messageParams || {});
          if (translated !== backendMessage.message) {
            return translated;
          }
        }
        return backendMessage.message;
      }
    }

    // Fallback to provided key
    if (fallbackKey) {
      return this.translate.instant(fallbackKey, fallbackParams || {});
    }

    // Last resort fallback
    return this.translate.instant('common.error');
  }

  /**
   * Handles error messages from backend API responses
   */
  translateErrorMessage(error: any): string {
    // Try to extract message from different error formats
    let errorMessage = error?.error?.message || error?.message || error;
    
    // Handle array of error messages (validation errors)
    if (Array.isArray(errorMessage)) {
      errorMessage = errorMessage[0];
    }

    return this.translateBackendMessage(
      errorMessage, 
      'common.error'
    );
  }

  /**
   * Handles success messages from backend API responses
   */
  translateSuccessMessage(response: any, fallbackKey?: string): string {
    let successMessage = response?.message || response;
    
    return this.translateBackendMessage(
      successMessage, 
      fallbackKey || 'common.success'
    );
  }
}