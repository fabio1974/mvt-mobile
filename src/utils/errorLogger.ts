import AsyncStorage from '@react-native-async-storage/async-storage';

interface ErrorLog {
  timestamp: string;
  message: string;
  stack?: string;
  extra?: any;
}

const ERROR_LOG_KEY = '@error_logs';
const MAX_LOGS = 100;

export class ErrorLogger {
  static async logError(error: Error | string, extra?: any) {
    try {
      const errorLog: ErrorLog = {
        timestamp: new Date().toISOString(),
        message: typeof error === 'string' ? error : error.message,
        stack: typeof error === 'object' && error.stack ? error.stack : undefined,
        extra,
      };

      // Pega logs existentes
      const existingLogs = await this.getLogs();
      
      // Adiciona novo log
      const updatedLogs = [errorLog, ...existingLogs].slice(0, MAX_LOGS);
      
      // Salva
      await AsyncStorage.setItem(ERROR_LOG_KEY, JSON.stringify(updatedLogs));
      
      // Log no console também
      console.error('🔴 ERROR LOGGED:', errorLog);
    } catch (e) {
      console.error('Failed to log error:', e);
    }
  }

  static async getLogs(): Promise<ErrorLog[]> {
    try {
      const logs = await AsyncStorage.getItem(ERROR_LOG_KEY);
      return logs ? JSON.parse(logs) : [];
    } catch (e) {
      console.error('Failed to get error logs:', e);
      return [];
    }
  }

  static async clearLogs() {
    try {
      await AsyncStorage.removeItem(ERROR_LOG_KEY);
    } catch (e) {
      console.error('Failed to clear error logs:', e);
    }
  }

  static async getLogsAsText(): Promise<string> {
    const logs = await this.getLogs();
    return logs.map(log => 
      `[${log.timestamp}] ${log.message}\n${log.stack || ''}\n${log.extra ? JSON.stringify(log.extra) : ''}\n---`
    ).join('\n\n');
  }
}
