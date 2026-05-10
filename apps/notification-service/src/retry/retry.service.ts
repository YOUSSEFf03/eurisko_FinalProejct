import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class RetryService {
  private readonly logger = new Logger(RetryService.name);

  private getDelay(attempt: number): number {
    // Exponential backoff: 10s, 60s, 300s
    const delays = [10_000, 60_000, 300_000];
    return delays[attempt - 1] ?? 300_000;
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number,
    onRetry: (attempt: number) => Promise<void>,
    onDead: (error: string) => Promise<void>,
  ): Promise<T | null> {
    let attempt = 0;

    while (attempt < maxAttempts) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        attempt++;
        const errorMessage =
          error instanceof Error ? error.message : String(error);

        if (attempt >= maxAttempts) {
          this.logger.error(
            `All ${maxAttempts} attempts failed. Moving to DLQ.`,
          );
          await onDead(errorMessage);
          return null;
        }

        const delay = this.getDelay(attempt);
        this.logger.warn(
          `Attempt ${attempt} failed. Retrying in ${delay / 1000}s. Error: ${errorMessage}`,
        );

        await onRetry(attempt);
        await this.sleep(delay);
      }
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
